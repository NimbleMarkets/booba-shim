//go:build js

package duckdb

import (
	"database/sql/driver"
	"fmt"
	"syscall/js"
	"time"
)

// marshalArgs converts a slice of database/sql NamedValues into a JS Array
// of values suitable for DuckDB-Wasm's prepared-statement params.
//
// Type coverage matches what dank-bubbler's loader queries against
// duckdb-go/v2 on the host side: nil, bool, int64, float64, string,
// []byte, time.Time.
func marshalArgs(args []driver.NamedValue) (js.Value, error) {
	arr := js.Global().Get("Array").New(len(args))
	for i, a := range args {
		v, err := marshalValue(a.Value)
		if err != nil {
			return js.Value{}, fmt.Errorf("arg %d: %w", i, err)
		}
		arr.SetIndex(i, v)
	}
	return arr, nil
}

func marshalValue(v driver.Value) (js.Value, error) {
	switch x := v.(type) {
	case nil:
		return js.Null(), nil
	case bool:
		return js.ValueOf(x), nil
	case int64:
		return js.ValueOf(x), nil
	case float64:
		return js.ValueOf(x), nil
	case string:
		return js.ValueOf(x), nil
	case []byte:
		buf := js.Global().Get("Uint8Array").New(len(x))
		js.CopyBytesToJS(buf, x)
		return buf, nil
	case time.Time:
		// ISO-8601 in UTC; DuckDB will cast on the SQL side.
		return js.ValueOf(x.UTC().Format(time.RFC3339Nano)), nil
	default:
		return js.Value{}, fmt.Errorf("unsupported arg type %T", v)
	}
}
