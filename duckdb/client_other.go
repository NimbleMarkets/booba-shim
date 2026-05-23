//go:build !js

package duckdb

import "context"

// Client is the native (non-database/sql) handle to a DuckDB-Wasm connection.
// Under GOOS!=js it is an opaque, non-functional placeholder.
type Client struct{}

// Open returns ErrNonJSPlatform on non-js builds.
func Open(_ context.Context, _ string) (*Client, error) { return nil, ErrNonJSPlatform }

// Close is a no-op on non-js builds.
func (*Client) Close() error { return nil }
