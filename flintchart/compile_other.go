//go:build !js

package flintchart

import "context"

// Compile returns ErrNonJSPlatform on non-js builds.
func Compile(_ context.Context, _ []byte) ([]byte, error) { return nil, ErrNonJSPlatform }

// Version returns ErrNonJSPlatform on non-js builds.
func Version() (string, error) { return "", ErrNonJSPlatform }
