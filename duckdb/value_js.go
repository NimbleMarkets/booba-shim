//go:build js

package duckdb

import (
	"database/sql/driver"
	"fmt"
	"syscall/js"
	"time"

	"github.com/apache/arrow-go/v18/arrow"
	"github.com/apache/arrow-go/v18/arrow/array"
)

// marshalArgs converts a slice of database/sql NamedValues into a JS Array
// of values suitable for DuckDB-Wasm's prepared-statement params.
//
// Type coverage: nil, bool, signed/unsigned ints (int through int64,
// uint through uint64), float32/64, string, []byte, time.Time.
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
	case int:
		return js.ValueOf(int64(x)), nil
	case int8:
		return js.ValueOf(int64(x)), nil
	case int16:
		return js.ValueOf(int64(x)), nil
	case int32:
		return js.ValueOf(int64(x)), nil
	case uint:
		return js.ValueOf(int64(x)), nil
	case uint8:
		return js.ValueOf(int64(x)), nil
	case uint16:
		return js.ValueOf(int64(x)), nil
	case uint32:
		return js.ValueOf(int64(x)), nil
	case uint64:
		// May truncate for values > MaxInt64; acceptable for v0.1.
		return js.ValueOf(int64(x)), nil
	case float32:
		return js.ValueOf(float64(x)), nil
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

// decodeColumn reads one row from an Arrow column and returns the
// corresponding driver.Value. v0.1 covers the types dank-bubbler's queries
// produce: int/float numerics, bool, string, binary, date, timestamp.
//
// Unsupported Arrow types return an error rather than zero-value; we want
// integration failures to be loud, not silent.
func decodeColumn(col arrow.Array, row int) (driver.Value, error) {
	if col.IsNull(row) {
		return nil, nil
	}
	switch a := col.(type) {
	case *array.Boolean:
		return a.Value(row), nil
	case *array.Int8:
		return int64(a.Value(row)), nil
	case *array.Int16:
		return int64(a.Value(row)), nil
	case *array.Int32:
		return int64(a.Value(row)), nil
	case *array.Int64:
		return a.Value(row), nil
	case *array.Uint8:
		return int64(a.Value(row)), nil
	case *array.Uint16:
		return int64(a.Value(row)), nil
	case *array.Uint32:
		return int64(a.Value(row)), nil
	case *array.Uint64:
		// May truncate for values > MaxInt64; acceptable for v0.1.
		return int64(a.Value(row)), nil
	case *array.Float32:
		return float64(a.Value(row)), nil
	case *array.Float64:
		return a.Value(row), nil
	case *array.String:
		return a.Value(row), nil
	case *array.LargeString:
		return a.Value(row), nil
	case *array.Binary:
		return append([]byte(nil), a.Value(row)...), nil
	case *array.LargeBinary:
		return append([]byte(nil), a.Value(row)...), nil
	case *array.Date32:
		return a.Value(row).ToTime(), nil
	case *array.Date64:
		return a.Value(row).ToTime(), nil
	case *array.Timestamp:
		dt := a.DataType().(*arrow.TimestampType)
		return a.Value(row).ToTime(dt.Unit), nil
	default:
		return nil, fmt.Errorf("unsupported arrow type %s", col.DataType())
	}
}
