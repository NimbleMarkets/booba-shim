//go:build !js

package duckdb

import (
	"database/sql"
	"database/sql/driver"
)

func init() {
	sql.Register("duckdb", stubDriver{})
}

type stubDriver struct{}

func (stubDriver) Open(name string) (driver.Conn, error) { return nil, ErrNonJSPlatform }
