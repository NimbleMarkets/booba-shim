//go:build !js

package duckdb

import (
	"context"

	"github.com/apache/arrow-go/v18/arrow/ipc"
)

// Client is the native (non-database/sql) handle to a DuckDB-Wasm connection.
// Under GOOS!=js it is an opaque, non-functional placeholder.
type Client struct{}

// Open returns ErrNonJSPlatform on non-js builds.
func Open(_ context.Context, _ string) (*Client, error) { return nil, ErrNonJSPlatform }

// Close is a no-op on non-js builds.
func (*Client) Close() error { return nil }

// QueryArrow returns ErrNonJSPlatform on non-js builds.
func (*Client) QueryArrow(_ context.Context, _ string, _ ...any) (*ipc.Reader, error) {
	return nil, ErrNonJSPlatform
}

// Exec returns ErrNonJSPlatform on non-js builds.
func (*Client) Exec(_ context.Context, _ string, _ ...any) (int64, error) {
	return 0, ErrNonJSPlatform
}
