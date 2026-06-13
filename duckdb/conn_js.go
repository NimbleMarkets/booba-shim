//go:build js

package duckdb

import (
	"context"
	"database/sql/driver"
	"errors"
	"syscall/js"
)

type jsConn struct {
	handle js.Value // opaque connection ID from the bridge
	open   bool
}

// Close releases the JS-side connection. The Go side is marked closed
// only after the JS close promise resolves: the bridge removes its
// handle entry after conn.close() resolves, so a rejected close leaves
// the connection open on both sides and the caller can retry.
func (c *jsConn) Close() error {
	if !c.open {
		return nil
	}
	if _, err := awaitPromise(bridge().Call("close", c.handle)); err != nil {
		return err
	}
	c.open = false
	return nil
}

// Prepare returns a Stmt. We don't round-trip to the bridge here;
// DuckDB-Wasm prepares lazily on Exec/Query.
func (c *jsConn) Prepare(query string) (driver.Stmt, error) {
	if !c.open {
		return nil, errors.New("duckdb: connection closed")
	}
	return &jsStmt{conn: c, query: query}, nil
}

// Begin is unsupported in v0.1 (no transactions).
func (c *jsConn) Begin() (driver.Tx, error) {
	return nil, errors.New("duckdb: transactions not supported in v0.1")
}

// Compile-time assertion that we satisfy driver.Conn.
var _ driver.Conn = (*jsConn)(nil)

// Suppress unused-import warning for context — it shows up once we add
// QueryContext on the conn level.
var _ = context.Background
