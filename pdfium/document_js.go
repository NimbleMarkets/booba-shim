//go:build js

package pdfium

import (
	"context"
	"errors"
	"fmt"
	"image"
	"runtime"
	"sync"
	"syscall/js"
)

// Document is a loaded PDF held by the JS-side bridge. Methods are safe
// for concurrent use: a mutex serializes rendering against Close so
// closing can never free PDFium-heap memory mid-render.
type Document struct {
	mu      sync.Mutex
	bridge  js.Value
	handle  js.Value
	cleanup runtime.Cleanup
	closed  bool
}

// Load copies data into the PDFium wasm heap and opens it as a
// document. The first call per process downloads and instantiates the
// PDFium wasm module (by awaiting the bridge's ready promise).
//
// Returns ErrBridgeMissing when the host page did not load
// pdfium-shim.js. ctx is reserved for cancellation in a future release.
func Load(ctx context.Context, data []byte) (*Document, error) {
	_ = ctx
	if len(data) == 0 {
		return nil, errors.New("pdfium: empty PDF data")
	}
	bridge, err := ensureReady()
	if err != nil {
		return nil, err
	}
	handle, err := awaitPromise(bridge.Call("loadDocument", goBytesToJS(data)))
	if err != nil {
		return nil, err
	}
	d := &Document{bridge: bridge, handle: handle}
	// Leak guard: release the JS-side document if d is GC'd without
	// Close. Close stops it. The args must not reference d itself or
	// the cleanup would never run.
	d.cleanup = runtime.AddCleanup(d, releaseHandle, cleanupArgs{bridge: bridge, handle: handle})
	return d, nil
}

type cleanupArgs struct {
	bridge js.Value
	handle js.Value
}

func releaseHandle(args cleanupArgs) {
	_, _ = callSync(args.bridge, "closeDocument", args.handle)
}

// Close releases the JS-side document and its PDFium-heap buffer.
// Idempotent. Blocks until any in-flight RenderPage finishes.
func (d *Document) Close() error {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.closed {
		return nil
	}
	d.closed = true
	d.cleanup.Stop()
	_, err := callSync(d.bridge, "closeDocument", d.handle)
	d.handle = js.Null()
	return err
}

// NumPages returns the document's page count.
func (d *Document) NumPages() (int, error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.closed {
		return 0, errors.New("pdfium: document closed")
	}
	res, err := callSync(d.bridge, "numPages", d.handle)
	if err != nil {
		return 0, err
	}
	return res.Int(), nil
}

// PageSize returns the page's dimensions in PostScript points
// (1/72 inch). Pages are 0-indexed.
func (d *Document) PageSize(page int) (wPt, hPt float64, err error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.closed {
		return 0, 0, errors.New("pdfium: document closed")
	}
	if page < 0 {
		return 0, 0, fmt.Errorf("pdfium: invalid page index %d", page)
	}
	res, err := callSync(d.bridge, "pageSize", d.handle, page)
	if err != nil {
		return 0, 0, err
	}
	return res.Get("widthPt").Float(), res.Get("heightPt").Float(), nil
}

// RenderPage rasterizes a 0-indexed page at dpi and returns the pixels
// as a fresh *image.RGBA copied out of the JS heap. ctx is reserved for
// cancellation in a future release.
func (d *Document) RenderPage(ctx context.Context, page, dpi int) (*image.RGBA, error) {
	_ = ctx
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.closed {
		return nil, errors.New("pdfium: document closed")
	}
	if page < 0 {
		return nil, fmt.Errorf("pdfium: invalid page index %d", page)
	}
	if dpi <= 0 {
		return nil, fmt.Errorf("pdfium: invalid dpi %d", dpi)
	}
	// renderPage is an async JS function — failures arrive as
	// rejections through awaitPromise, never synchronous throws.
	res, err := awaitPromise(d.bridge.Call("renderPage", d.handle, page, dpi))
	if err != nil {
		return nil, err
	}
	w := res.Get("width").Int()
	h := res.Get("height").Int()
	if w <= 0 || h <= 0 {
		return nil, &Error{Message: fmt.Sprintf("renderPage returned invalid dims %dx%d", w, h)}
	}
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	if n := js.CopyBytesToGo(img.Pix, res.Get("data")); n != len(img.Pix) {
		return nil, &Error{Message: fmt.Sprintf("renderPage copied %d bytes, want %d (mismatched RGBA layout)", n, len(img.Pix))}
	}
	return img, nil
}
