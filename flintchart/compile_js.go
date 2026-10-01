//go:build js

package flintchart

import (
	"context"
	"syscall/js"
)

// Compile submits a flint ChartAssemblyInput (or any document the
// compiler accepts) and returns the raw envelope JSON: {"spec",...} on
// success, {"error":{"message"}} for compile failures. The latter is
// returned as data, not error — callers parse it (flint-ntcharts's
// envelope.Parse surfaces it as a Go error). A JS-level throw (broken
// bundle, OOM) returns a *Error.
func Compile(ctx context.Context, input []byte) ([]byte, error) {
	bridge, err := ensureReady()
	if err != nil {
		return nil, err
	}
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	res, err := callSync(bridge, "compile", string(input))
	if err != nil {
		return nil, err
	}
	return []byte(res.String()), nil
}

// Version reports the vendored bundle's version string.
func Version() (string, error) {
	bridge, err := ensureReady()
	if err != nil {
		return "", err
	}
	v := bridge.Get("version")
	if v.Type() != js.TypeString {
		return "", &Error{Message: "bridge has no version string"}
	}
	return v.String(), nil
}
