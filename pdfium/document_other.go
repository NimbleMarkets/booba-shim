//go:build !js

package pdfium

import (
	"context"
	"image"
)

// Document is the handle to a loaded PDF. Under GOOS!=js it is an
// opaque, non-functional placeholder.
type Document struct{}

// Load returns ErrNonJSPlatform on non-js builds.
func Load(_ context.Context, _ []byte) (*Document, error) { return nil, ErrNonJSPlatform }

// Close is a no-op on non-js builds.
func (*Document) Close() error { return nil }

// NumPages returns ErrNonJSPlatform on non-js builds.
func (*Document) NumPages() (int, error) { return 0, ErrNonJSPlatform }

// PageSize returns ErrNonJSPlatform on non-js builds.
func (*Document) PageSize(_ int) (float64, float64, error) { return 0, 0, ErrNonJSPlatform }

// RenderPage returns ErrNonJSPlatform on non-js builds.
func (*Document) RenderPage(_ context.Context, _, _ int) (*image.RGBA, error) {
	return nil, ErrNonJSPlatform
}
