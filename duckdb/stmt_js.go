//go:build js

package duckdb

import (
	"context"
	"database/sql/driver"
	"errors"
)

type jsStmt struct {
	conn  *jsConn
	query string
}

// Close is a no-op — we don't hold any JS-side state for the prepared
// statement; DuckDB-Wasm re-prepares on each call.
func (s *jsStmt) Close() error { return nil }

// NumInput tells database/sql that we don't know the input count.
func (s *jsStmt) NumInput() int { return -1 }

// Exec runs the statement for side effect.
func (s *jsStmt) Exec(args []driver.Value) (driver.Result, error) {
	return s.ExecContext(context.Background(), namedFromValues(args))
}

func (s *jsStmt) ExecContext(_ context.Context, args []driver.NamedValue) (driver.Result, error) {
	if !s.conn.open {
		return nil, errors.New("duckdb: connection closed")
	}
	jsArgs, err := marshalArgs(args)
	if err != nil {
		return nil, err
	}
	res, err := awaitPromise(bridge().Call("exec", s.conn.handle, s.query, jsArgs))
	if err != nil {
		return nil, err
	}
	affected := int64(res.Get("rowsAffected").Int())
	return execResult{rowsAffected: affected}, nil
}

// Query runs the statement and returns Rows backed by Arrow IPC.
func (s *jsStmt) Query(args []driver.Value) (driver.Rows, error) {
	return s.QueryContext(context.Background(), namedFromValues(args))
}

func (s *jsStmt) QueryContext(_ context.Context, args []driver.NamedValue) (driver.Rows, error) {
	if !s.conn.open {
		return nil, errors.New("duckdb: connection closed")
	}
	jsArgs, err := marshalArgs(args)
	if err != nil {
		return nil, err
	}
	res, err := awaitPromise(bridge().Call("query", s.conn.handle, s.query, jsArgs))
	if err != nil {
		return nil, err
	}
	return newJSRows(res)
}

type execResult struct{ rowsAffected int64 }

func (r execResult) LastInsertId() (int64, error) { return 0, errors.New("duckdb: LastInsertId unsupported") }
func (r execResult) RowsAffected() (int64, error) { return r.rowsAffected, nil }

func namedFromValues(args []driver.Value) []driver.NamedValue {
	out := make([]driver.NamedValue, len(args))
	for i, v := range args {
		out[i] = driver.NamedValue{Ordinal: i + 1, Value: v}
	}
	return out
}
