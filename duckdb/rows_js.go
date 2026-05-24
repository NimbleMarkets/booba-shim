//go:build js

package duckdb

import (
	"bytes"
	"database/sql/driver"
	"fmt"
	"io"
	"syscall/js"

	"github.com/apache/arrow-go/v18/arrow"
	"github.com/apache/arrow-go/v18/arrow/ipc"
)

// jsRows is a driver.Rows implementation that walks an Arrow IPC stream
// returned by the bridge. The stream is read into memory at construction
// (DuckDB-Wasm's tableToIPC already materialized the table); record
// batches are walked lazily during Next.
type jsRows struct {
	reader  *ipc.Reader
	cur     arrow.Record
	curRow  int // index into cur
	curRows int // cached cur.NumRows() as int
	schema  *arrow.Schema
	cols    []string
}

func newJSRows(jsBytes js.Value) (*jsRows, error) {
	n := jsBytes.Get("length").Int()
	buf := make([]byte, n)
	js.CopyBytesToGo(buf, jsBytes)

	r, err := ipc.NewReader(bytes.NewReader(buf))
	if err != nil {
		return nil, fmt.Errorf("duckdb: arrow ipc reader: %w", err)
	}
	schema := r.Schema()
	cols := make([]string, schema.NumFields())
	for i, f := range schema.Fields() {
		cols[i] = f.Name
	}
	return &jsRows{reader: r, schema: schema, cols: cols}, nil
}

func (r *jsRows) Columns() []string { return r.cols }

func (r *jsRows) Close() error {
	if r.cur != nil {
		r.cur.Release()
		r.cur = nil
	}
	if r.reader != nil {
		r.reader.Release()
		r.reader = nil
	}
	return nil
}

// Next advances to the next row. Returns io.EOF when the stream is
// exhausted (database/sql treats that as a normal end).
func (r *jsRows) Next(dest []driver.Value) error {
	if err := r.ensureCurrentBatch(); err != nil {
		return err
	}
	for i := range dest {
		v, err := decodeColumn(r.cur.Column(i), r.curRow)
		if err != nil {
			return fmt.Errorf("col %d (%s): %w", i, r.cols[i], err)
		}
		dest[i] = v
	}
	r.curRow++
	return nil
}

func (r *jsRows) ensureCurrentBatch() error {
	for r.cur == nil || r.curRow >= r.curRows {
		if r.cur != nil {
			r.cur.Release()
			r.cur = nil
		}
		if !r.reader.Next() {
			if err := r.reader.Err(); err != nil {
				return err
			}
			return io.EOF
		}
		r.cur = r.reader.Record()
		r.cur.Retain()
		r.curRow = 0
		r.curRows = int(r.cur.NumRows())
	}
	return nil
}
