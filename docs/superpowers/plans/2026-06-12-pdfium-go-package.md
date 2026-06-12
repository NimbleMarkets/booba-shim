# booba-shim/pdfium Go Package + ntcharts-pdf Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Go half of the pdfium shim to booba-shim (Document API over the JS bridge), then migrate ntcharts-pdf's browser backend onto it, deleting its private bridge copies.

**Architecture:** booba-shim gains a `pdfium` package mirroring the `duckdb` package layout: js-only bridge plumbing + a `Document` object carrying mutex/cleanup safety, with `ErrNonJSPlatform` stubs for host builds. ntcharts-pdf's `pdfview/jsrenderer_js.go` shrinks to a thin adapter and all its JS-side vendoring (npm, importmap, Pages workflow steps, dependabot npm rule) is deleted in favor of `go tool booba-shim-assets`.

**Tech Stack:** Go 1.25 (`syscall/js`, `runtime.AddCleanup`), @embedpdf/pdfium 2.14.2 via the already-committed `pdfium-shim.js` bridge, Taskfile, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-06-12-pdfium-go-package-design.md`

**Repos:** Tasks 1–5 run in `/Users/evan/projects/booba-shim`. Tasks 6–9 run in `/Users/evan/projects/ntcharts-pdf`. Task 10 is a manual browser checkpoint.

**Release-order constraint:** booba-shim has never been pushed to GitHub. ntcharts-pdf development uses a local `replace` directive. Do NOT push ntcharts-pdf main until booba-shim is pushed and tagged and the `replace` is dropped — its CI cannot resolve the module before then.

---

### Task 1: pdfium package skeleton (errors + host stubs)

**Files:**
- Create: `pdfium/errors.go`
- Create: `pdfium/doc.go`
- Create: `pdfium/document_other.go`
- Test: `pdfium/stubs_test.go`

- [ ] **Step 1: Write the failing test**

Create `pdfium/stubs_test.go`:

```go
//go:build !js

package pdfium_test

import (
	"context"
	"errors"
	"testing"

	"github.com/NimbleMarkets/booba-shim/pdfium"
)

func TestLoadReturnsErrNonJSPlatform(t *testing.T) {
	_, err := pdfium.Load(context.Background(), []byte("%PDF-1.4"))
	if !errors.Is(err, pdfium.ErrNonJSPlatform) {
		t.Fatalf("Load err = %v, want ErrNonJSPlatform", err)
	}
}

func TestDocumentMethodsReturnErrNonJSPlatform(t *testing.T) {
	var d pdfium.Document
	if _, err := d.NumPages(); !errors.Is(err, pdfium.ErrNonJSPlatform) {
		t.Fatalf("NumPages err = %v, want ErrNonJSPlatform", err)
	}
	if _, _, err := d.PageSize(0); !errors.Is(err, pdfium.ErrNonJSPlatform) {
		t.Fatalf("PageSize err = %v, want ErrNonJSPlatform", err)
	}
	if _, err := d.RenderPage(context.Background(), 0, 72); !errors.Is(err, pdfium.ErrNonJSPlatform) {
		t.Fatalf("RenderPage err = %v, want ErrNonJSPlatform", err)
	}
	if err := d.Close(); err != nil {
		t.Fatalf("Close err = %v, want nil", err)
	}
}

func TestErrorFormatsWithPrefix(t *testing.T) {
	e := &pdfium.Error{Message: "boom"}
	if got, want := e.Error(), "pdfium: boom"; got != want {
		t.Fatalf("Error() = %q, want %q", got, want)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./pdfium/`
Expected: FAIL — `no required module provides package` / `undefined: pdfium` (package does not exist yet)

- [ ] **Step 3: Write the implementation**

Create `pdfium/errors.go`:

```go
package pdfium

import (
	"errors"
	"fmt"
)

// ErrNonJSPlatform is returned by every entry point when the package is
// imported under a GOOS other than js. It exists so that consumers can
// run host-side `go test ./...` without panicking on missing JS globals.
var ErrNonJSPlatform = errors.New("booba-shim/pdfium: only usable under GOOS=js")

// ErrBridgeMissing is returned by Load when the host page did not load
// pdfium-shim.js before the WASM main ran. Unlike booba-shim/duckdb
// (which panics on a missing shim), this is an error so consumers can
// degrade gracefully — e.g. a PDF viewer falling back to text mode.
var ErrBridgeMissing = errors.New("booba-shim/pdfium: window.boobaShim.pdfium is undefined; load pdfium-shim.js before app.wasm")

// Error is the typed error returned for failures originating in the JS
// bridge (PDFium errors, render failures, etc.).
type Error struct {
	// Message is the human-readable error from PDFium or the bridge.
	Message string
}

func (e *Error) Error() string {
	return fmt.Sprintf("pdfium: %s", e.Message)
}
```

Create `pdfium/doc.go`:

```go
// Package pdfium is a booba-shim that exposes upstream @embedpdf/pdfium
// (a PDFium WebAssembly build) to Go-WASM programs as a Document type
// that loads PDFs from memory and rasterizes pages to *image.RGBA.
//
// Under GOOS=js:
//
//	doc, err := pdfium.Load(ctx, pdfBytes)
//	defer doc.Close()
//	img, err := doc.RenderPage(ctx, 0, 144) // page 0 at 144 DPI
//
// Pages are 0-indexed; page sizes are PostScript points (1/72 inch).
//
// On any other GOOS, every public entry point returns ErrNonJSPlatform
// so host-side test binaries can import the package without panicking.
//
// The page must load booba-shim/pdfium/pdfium-shim.js (via go tool
// booba-shim-assets) before the WASM main runs; otherwise Load returns
// ErrBridgeMissing.
package pdfium
```

Create `pdfium/document_other.go`:

```go
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./pdfium/`
Expected: PASS (3 tests)

- [ ] **Step 5: Vet and commit**

```bash
go vet ./pdfium/
git add pdfium/
git commit -m "feat(pdfium): package skeleton — errors + non-js stubs"
```

---

### Task 2: js bridge plumbing

**Files:**
- Create: `pdfium/bridge_js.go`

There is no host-runnable test for js-only files; verification is the wasm build (the same regime the duckdb package uses).

- [ ] **Step 1: Write bridge_js.go**

Create `pdfium/bridge_js.go`:

```go
//go:build js

package pdfium

import (
	"strings"
	"sync"
	"syscall/js"
)

var (
	bridgeOnce sync.Once
	bridgeErr  error
	bridgeVal  js.Value
)

// ensureReady resolves window.boobaShim.pdfium and awaits its ready
// promise. Idempotent: the PDFium wasm download/instantiate happens
// once per process. Returns ErrBridgeMissing when the page did not
// load pdfium-shim.js before the WASM main ran.
func ensureReady() (js.Value, error) {
	bridgeOnce.Do(func() {
		root := js.Global().Get("boobaShim")
		if root.IsUndefined() {
			bridgeErr = ErrBridgeMissing
			return
		}
		shim := root.Get("pdfium")
		if shim.IsUndefined() {
			bridgeErr = ErrBridgeMissing
			return
		}
		if _, err := awaitPromise(shim.Get("ready")); err != nil {
			bridgeErr = err
			return
		}
		bridgeVal = shim
	})
	return bridgeVal, bridgeErr
}

// awaitPromise blocks the calling goroutine until p resolves or rejects.
// Go's WASM scheduler yields to JS while the goroutine is parked on the
// channel, so JS callbacks fire and the promise settles.
//
// On reject, returns a *Error whose Message is the rejected value's
// .message (or its String() form if .message is missing).
func awaitPromise(p js.Value) (js.Value, error) {
	done := make(chan struct{})
	var resolved, rejected js.Value
	var ok bool

	thenFn := js.FuncOf(func(_ js.Value, args []js.Value) any {
		if len(args) > 0 {
			resolved = args[0]
		}
		ok = true
		close(done)
		return nil
	})
	catchFn := js.FuncOf(func(_ js.Value, args []js.Value) any {
		if len(args) > 0 {
			rejected = args[0]
		}
		close(done)
		return nil
	})
	defer thenFn.Release()
	defer catchFn.Release()

	p.Call("then", thenFn).Call("catch", catchFn)
	<-done

	if !ok {
		return js.Value{}, mapJSError(rejected)
	}
	return resolved, nil
}

// mapJSError converts a thrown/rejected JS Error (or any value) into a
// *Error. The bridge prefixes its own messages with "pdfium: ", which
// Error() re-adds — trim it to avoid "pdfium: pdfium: ...".
func mapJSError(v js.Value) error {
	if v.IsUndefined() || v.IsNull() {
		return &Error{Message: "unknown rejection"}
	}
	msg := v.Get("message")
	if msg.IsUndefined() {
		return &Error{Message: strings.TrimPrefix(v.String(), "pdfium: ")}
	}
	return &Error{Message: strings.TrimPrefix(msg.String(), "pdfium: ")}
}

// callSync invokes a synchronous bridge function, converting a JS throw
// (which syscall/js surfaces as a Go panic) into a *Error. duckdb's
// bridge calls are all Promise-based so failures arrive as rejections
// via awaitPromise; pdfium's numPages/pageSize/closeDocument throw
// synchronously instead.
func callSync(recv js.Value, method string, args ...any) (res js.Value, err error) {
	defer func() {
		if r := recover(); r != nil {
			switch e := r.(type) {
			case js.Error:
				err = mapJSError(e.Value)
			case *js.Error:
				err = mapJSError(e.Value)
			default:
				panic(r)
			}
		}
	}()
	return recv.Call(method, args...), nil
}

// goBytesToJS allocates a Uint8Array on the JS side and copies src into
// it. The returned js.Value is owned by the JS GC.
func goBytesToJS(src []byte) js.Value {
	u8 := js.Global().Get("Uint8Array").New(len(src))
	js.CopyBytesToJS(u8, src)
	return u8
}
```

- [ ] **Step 2: Verify both build targets**

Run: `GOOS=js GOARCH=wasm go build ./pdfium/ && go build ./pdfium/ && go vet ./pdfium/`
Expected: success, no output. (Host build must stay green — bridge_js.go is js-only. The js vet pass for unused helpers comes in Task 3 when document_js.go uses them; if `go vet` complains about unused symbols here, proceed — Task 3 resolves it before commit.)

Note: plain `go build`/`go vet` do not flag unused package-level funcs, so this should already be clean.

- [ ] **Step 3: Commit**

```bash
git add pdfium/bridge_js.go
git commit -m "feat(pdfium): js bridge plumbing — ensureReady, awaitPromise, callSync"
```

---

### Task 3: Document API (js)

**Files:**
- Create: `pdfium/document_js.go`

- [ ] **Step 1: Write document_js.go**

Create `pdfium/document_js.go`:

```go
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
```

NOTE on `runtime.AddCleanup(d, ...)`: this is the same pattern ntcharts-pdf's jsRenderer uses (`runtime.AddCleanup(r, cleanUpJSRenderer, jsCleanupArgs{...})`) — cleanup attached to the object, args holding only the js.Values needed to release the handle, never `d` itself.

- [ ] **Step 2: Verify builds and host tests**

Run: `GOOS=js GOARCH=wasm go build ./... && go test ./... && go vet ./...`
Expected: wasm build success; host tests PASS (pdfium stub tests + duckdb tests).

- [ ] **Step 3: Commit**

```bash
git add pdfium/document_js.go
git commit -m "feat(pdfium): Document API — Load/Close/NumPages/PageSize/RenderPage"
```

---

### Task 4: package README + root README

**Files:**
- Create: `pdfium/README.md`
- Modify: `README.md` (shim table + pinned versions)

- [ ] **Step 1: Write pdfium/README.md**

```markdown
# booba-shim/pdfium

Render PDFs in Go-WASM programs via [@embedpdf/pdfium](https://www.embedpdf.com/docs/pdfium)
(a PDFium WebAssembly build). Loads documents from memory and
rasterizes pages to `*image.RGBA`.

## Quickstart

**main.go** (GOOS=js GOARCH=wasm):

```go
doc, err := pdfium.Load(ctx, pdfBytes)
if err != nil { /* errors.Is(err, pdfium.ErrBridgeMissing) ⇒ no shim on page */ }
defer doc.Close()

n, _ := doc.NumPages()                  // page count
w, h, _ := doc.PageSize(0)              // points (1/72 inch), 0-indexed
img, err := doc.RenderPage(ctx, 0, 144) // *image.RGBA at 144 DPI
```

**index.html** (excerpt):

```html
<script src="wasm_exec.js"></script>
<script type="module">
  import './booba-shim/pdfium/pdfium-shim.js';
  const go = new Go();
  const wasm = await WebAssembly.instantiateStreaming(fetch('app.wasm'), go.importObject);
  go.run(wasm.instance);
</script>
```

The Go side awaits the bridge's `ready` promise on first `Load`, so the
page does not need to await it (unlike booba-shim/duckdb).

**Assets:** `go tool booba-shim-assets <web-dir> --shim=pdfium`

## Semantics

- Pages are 0-indexed. Page sizes are PostScript points.
- `Document` methods are safe for concurrent use; rendering and Close
  are serialized internally.
- `Close` is idempotent. A `Document` dropped without `Close` is
  reclaimed by a GC cleanup, but call `Close` — the PDF bytes stay
  pinned in the PDFium heap until then.
- Under GOOS != js every entry point returns `ErrNonJSPlatform`.
- DPI limits / pixel budgets are the caller's policy; PDFium's wasm
  heap is fixed-size, so very large renders (e.g. Letter @ 300 DPI ≈
  34 MB) can fail — catch the error or clamp DPI using `PageSize`.

## Pinned upstream version

- `@embedpdf/pdfium@2.14.2` — bump in `web/pdfium/pdfium-shim.js`.
```

- [ ] **Step 2: Update root README.md**

In the Shims table, add a row after the duckdb row:

```markdown
| [`booba-shim/pdfium`](./pdfium) | PDF rasterization to `*image.RGBA` via PDFium-Wasm |
```

In the "Pinned upstream versions" section, add:

```markdown
- `@embedpdf/pdfium@2.14.2` (pdfium shim; tracked in `web/pdfium/pdfium-shim.js`)
```

- [ ] **Step 3: Commit**

```bash
git add pdfium/README.md README.md
git commit -m "docs(pdfium): package README + root shim table row"
```

---

### Task 5: example app + Taskfile + CI

**Files:**
- Create: `examples/pdfium-render/main.go`
- Create: `examples/pdfium-render/index.html`
- Create: `examples/pdfium-render/Taskfile.yml`
- Create: `examples/pdfium-render/.gitignore`
- Create: `examples/pdfium-render/testdata/Example.pdf` (copied)
- Create: `examples/pdfium-render/README.md`
- Modify: `Taskfile.yml` (root — examples task)
- Modify: `.github/workflows/ci.yml` (examples build)

- [ ] **Step 1: Copy the test PDF**

```bash
mkdir -p examples/pdfium-render/testdata
cp /Users/evan/projects/ntcharts-pdf/examples/pdfview/testdata/Example.pdf examples/pdfium-render/testdata/Example.pdf
```

- [ ] **Step 2: Write main.go**

Create `examples/pdfium-render/main.go`:

```go
//go:build js

package main

import (
	"bytes"
	"context"
	_ "embed"
	"encoding/base64"
	"fmt"
	"image/png"
	"syscall/js"

	"github.com/NimbleMarkets/booba-shim/pdfium"
)

//go:embed testdata/Example.pdf
var examplePDF []byte

func main() {
	out := func(s string) {
		div := js.Global().Get("document").Call("getElementById", "out")
		div.Set("innerHTML", div.Get("innerHTML").String()+s+"<br/>")
	}

	ctx := context.Background()
	doc, err := pdfium.Load(ctx, examplePDF)
	if err != nil {
		out("ERROR load: " + err.Error())
		return
	}
	defer doc.Close()

	n, err := doc.NumPages()
	if err != nil {
		out("ERROR numPages: " + err.Error())
		return
	}
	w, h, err := doc.PageSize(0)
	if err != nil {
		out("ERROR pageSize: " + err.Error())
		return
	}
	out(fmt.Sprintf("pages=%d page0=%.1fx%.1fpt", n, w, h))

	img, err := doc.RenderPage(ctx, 0, 144)
	if err != nil {
		out("ERROR render: " + err.Error())
		return
	}
	out(fmt.Sprintf("rendered %dx%dpx", img.Rect.Dx(), img.Rect.Dy()))

	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		out("ERROR png: " + err.Error())
		return
	}
	js.Global().Get("document").Call("getElementById", "page").
		Set("src", "data:image/png;base64,"+base64.StdEncoding.EncodeToString(buf.Bytes()))
	select {}
}
```

- [ ] **Step 3: Write index.html, Taskfile.yml, .gitignore, README.md**

Create `examples/pdfium-render/index.html`:

```html
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>booba-shim/pdfium — render demo</title>
<style>body{font-family:monospace;margin:24px}img{border:1px solid #ccc;max-width:100%}</style></head><body>
<h1>booba-shim/pdfium — render demo</h1>
<div id="out">loading…<br/></div>
<img id="page" alt="rendered page appears here"/>
<script src="wasm_exec.js"></script>
<script type="module">
  import './booba-shim/pdfium/pdfium-shim.js';
  const go = new Go();
  const wasm = await WebAssembly.instantiateStreaming(fetch('app.wasm'), go.importObject);
  go.run(wasm.instance);
</script>
</body></html>
```

Create `examples/pdfium-render/Taskfile.yml`:

```yaml
version: '3'
tasks:
  build:
    cmds:
      - GOOS=js GOARCH=wasm go build -o app.wasm .
      - cp "$(go env GOROOT)/lib/wasm/wasm_exec.js" .
      - go tool booba-shim-assets . --shim=pdfium
  serve:
    deps: [build]
    cmds:
      - echo 'Open http://localhost:8000/'
      - python3 -m http.server 8000
  clean:
    cmds:
      - rm -rf booba-shim app.wasm wasm_exec.js
```

Create `examples/pdfium-render/.gitignore`:

```
app.wasm
wasm_exec.js
booba-shim/
```

Create `examples/pdfium-render/README.md`:

```markdown
# pdfium-render example

Loads an embedded PDF, prints page count + size, renders page 0 at
144 DPI, and displays the PNG in the page.

    task serve    # then open http://localhost:8000/
```

- [ ] **Step 4: Wire into root Taskfile.yml**

In the root `Taskfile.yml`, add to the `examples` task's cmds list:

```yaml
      - task: examples-pdfium-render
```

and add the task definition after `examples-duckdb-arrow` (match the existing examples-* shape):

```yaml
  examples-pdfium-render:
    dir: examples/pdfium-render
    cmds:
      - GOOS=js GOARCH=wasm go build -o app.wasm .
      - go tool booba-shim-assets . --shim=pdfium
```

- [ ] **Step 5: Wire into CI**

In `.github/workflows/ci.yml`, extend the `Examples build` step:

```yaml
      - name: Examples build
        run: |
          cd examples/duckdb-sql   && GOOS=js GOARCH=wasm go build -o app.wasm .
          cd ../duckdb-arrow       && GOOS=js GOARCH=wasm go build -o app.wasm .
          cd ../pdfium-render      && GOOS=js GOARCH=wasm go build -o app.wasm .
```

- [ ] **Step 6: Verify example builds**

Run: `cd examples/pdfium-render && GOOS=js GOARCH=wasm go build -o app.wasm . && go tool booba-shim-assets . --shim=pdfium && ls booba-shim/pdfium/ && cd ../..`
Expected: build succeeds; `pdfium-shim.js pdfium-shim.d.ts` listed.

- [ ] **Step 7: Commit**

```bash
git add examples/pdfium-render Taskfile.yml .github/workflows/ci.yml
git commit -m "feat(examples): pdfium-render — load, measure, render, display"
```

---

### Task 6: ntcharts-pdf module wiring

**Working directory: `/Users/evan/projects/ntcharts-pdf`** (this and all later tasks)

**Files:**
- Modify: `go.mod`

- [ ] **Step 1: Add dependency + tool + local replace**

```bash
cd /Users/evan/projects/ntcharts-pdf
go mod edit -require=github.com/NimbleMarkets/booba-shim@v0.0.0 \
  -replace=github.com/NimbleMarkets/booba-shim=../booba-shim \
  -tool=github.com/NimbleMarkets/booba-shim/cmd/booba-shim-assets
go mod tidy
```

Expected: go.mod gains the require, replace, and tool directives; `go mod tidy` pulls arrow-go etc. into go.sum (module-level deps of booba-shim; the pdfium package itself does not import them, so no binary bloat).

- [ ] **Step 2: Verify build is still green**

Run: `go build ./... && go test ./...`
Expected: PASS (nothing imports booba-shim yet).

- [ ] **Step 3: Commit**

```bash
git add go.mod go.sum
git commit -m "chore: depend on booba-shim (local replace until first booba-shim release)"
```

---

### Task 7: pdfview adapter over booba-shim/pdfium

**Files:**
- Delete: `pdfview/jsbridge_js.go`
- Rewrite: `pdfview/jsrenderer_js.go`

- [ ] **Step 1: Delete jsbridge_js.go and rewrite jsrenderer_js.go**

```bash
git rm pdfview/jsbridge_js.go
```

Replace the entire contents of `pdfview/jsrenderer_js.go` with:

```go
// pdfview/jsrenderer_js.go: browser-WASM Renderer backed by
// booba-shim/pdfium (the @embedpdf/pdfium JS bridge installed by
// `go tool booba-shim-assets --shim=pdfium`).
//
// Conforms to the same pdfview.Renderer contract as the native
// pdfium-via-wazero implementation. Mutex serialization, idempotent
// Close, and the GC leak guard live in pdfium.Document; this file is
// only the 1-indexed-page / DPI-budget adapter.

//go:build js && wasm

package pdfview

import (
	"context"
	"fmt"
	"image"
	"math"

	"github.com/NimbleMarkets/booba-shim/pdfium"
)

// jsRenderer adapts a pdfium.Document to the Renderer interface.
type jsRenderer struct {
	doc             *pdfium.Document
	maxRenderPixels int
}

// DefaultRendererFactory returns a RendererFactory that delegates to
// the booba-shim/pdfium bridge. The first factory call (per process)
// initialises the JS bridge; subsequent calls just open new documents
// against the already-loaded PDFium runtime.
//
// If the host page hasn't loaded pdfium-shim.js, every factory
// invocation returns an error (pdfium.ErrBridgeMissing) and ImageMode
// degrades to TextMode.
func DefaultRendererFactory() RendererFactory {
	return DefaultRendererFactoryWithLimits(Limits{})
}

// DefaultRendererFactoryWithLimits is the same factory parameterised
// by resource caps. MaxRenderPixels is enforced inside the renderer
// (it queries page size via the bridge); MaxRenderDPI is enforced by
// the withLimits wrapper NewWithConfig applies upstream.
func DefaultRendererFactoryWithLimits(limits Limits) RendererFactory {
	limits.applyDefaults()
	return func(name string, data []byte) (Renderer, error) {
		if len(data) == 0 {
			return nil, fmt.Errorf("empty PDF data for %q", name)
		}
		doc, err := pdfium.Load(context.Background(), data)
		if err != nil {
			return nil, fmt.Errorf("booba-shim/pdfium load %q: %w", name, err)
		}
		return &jsRenderer{doc: doc, maxRenderPixels: limits.MaxRenderPixels}, nil
	}
}

// RenderPage rasterizes a 1-indexed page. MaxRenderPixels enforcement:
// when the projected pixel count exceeds the budget, DPI is reduced to
// fit (graceful degradation matching the native implementation).
func (r *jsRenderer) RenderPage(pageNum, dpi int) (image.Image, error) {
	if pageNum < 1 {
		return nil, fmt.Errorf("invalid page %d (1-indexed)", pageNum)
	}
	if dpi <= 0 {
		dpi = DefaultRenderDPI
	}
	if r.maxRenderPixels > 0 {
		dpi = r.clampDPIToBudget(pageNum, dpi)
	}
	return r.doc.RenderPage(context.Background(), pageNum-1, dpi)
}

// clampDPIToBudget queries the page's size in points and returns a DPI
// clamped so the rendered bitmap won't exceed r.maxRenderPixels.
// Returns the original DPI if page dims are unavailable — best-effort,
// mirroring native behavior.
func (r *jsRenderer) clampDPIToBudget(pageNum, dpi int) int {
	wPt, hPt, err := r.doc.PageSize(pageNum - 1)
	if err != nil || wPt <= 0 || hPt <= 0 {
		return dpi
	}
	wIn := wPt / 72.0
	hIn := hPt / 72.0
	projected := wIn * hIn * float64(dpi) * float64(dpi)
	if projected <= float64(r.maxRenderPixels) {
		return dpi
	}
	maxDPI := math.Sqrt(float64(r.maxRenderPixels) / (wIn * hIn))
	if maxDPI < 1 {
		maxDPI = 1
	}
	return int(maxDPI)
}

// Close releases the document. Idempotent; serialization against an
// in-flight RenderPage is handled inside pdfium.Document.
func (r *jsRenderer) Close() error { return r.doc.Close() }
```

- [ ] **Step 2: Verify wasm build and host tests**

Run: `GOOS=js GOARCH=wasm go build ./... && go test ./... && go vet ./...`
Expected: all green. The pdfview host test suite is untouched by this change (jsrenderer is js/wasm-only).

- [ ] **Step 3: Commit**

```bash
git add pdfview/jsrenderer_js.go
git commit -m "refactor(pdfview): js renderer is now a thin adapter over booba-shim/pdfium"
```

---

### Task 8: ntcharts-pdf web assets + build plumbing

**Files:**
- Delete: `web/pdfium-bridge.js`
- Delete: `web/vendor/` (entire directory)
- Modify: `web/index.html`
- Modify: `Taskfile.yml`
- Modify: `.github/workflows/pages.yml`
- Modify: `.github/dependabot.yml`

- [ ] **Step 1: Delete the private bridge + npm vendoring**

```bash
git rm web/pdfium-bridge.js
git rm -r web/vendor
```

(If `web/vendor/node_modules` or `web/vendor/embedpdf-pdfium` are untracked build outputs, `rm -rf` the leftovers after `git rm`.)

- [ ] **Step 2: Update web/index.html**

Remove the importmap block from `<head>` (the `<script type="importmap">` element resolving `@embedpdf/pdfium` to `./vendor/embedpdf-pdfium/dist/index.js`, including its explanatory comment).

In the module script at the bottom, change:

```js
        // Side-effect import: installs window.ntchartsPDFium and
        // memoises the PDFium init() so the Go side's first
        // setupBridge() call resolves quickly.
        import './pdfium-bridge.js';
```

to:

```js
        // Side-effect import: installs window.boobaShim.pdfium and
        // starts the PDFium wasm download so the Go side's first
        // pdfium.Load() call resolves quickly.
        import './booba-shim/pdfium/pdfium-shim.js';
```

and change:

```js
            const pdfiumReady = window.ntchartsPDFium.init();
```

to:

```js
            const pdfiumReady = window.boobaShim.pdfium.ready;
```

(The `pdfiumReady.catch(...)` console-surface line stays as-is.)

- [ ] **Step 3: Update Taskfile.yml**

In `build-wasm-site`: change deps from `[go-tidy, ensure-pdfium-bridge]` to `[go-tidy]`, and add the asset-tool command after `go tool booba-assets web/`:

```yaml
  build-wasm-site:
    desc: 'Build the WASM demo site into web/'
    deps: [go-tidy]
    cmds:
      - GOARCH=wasm GOOS=js go build -o web/app.wasm ./examples/pdfview/
      - go tool booba-assets web/
      - go tool booba-shim-assets web/ --shim=pdfium
    generates:
      - web/app.wasm
```

Delete the `ensure-pdfium-bridge` and `install-pdfium-bridge` tasks entirely.

In `clean-wasm-site`, add:

```yaml
      - rm -rf web/booba-shim
```

- [ ] **Step 4: Update .github/workflows/pages.yml**

- Remove the npm cache config from the setup-node/setup step (`cache: npm` and `cache-dependency-path: web/vendor/package-lock.json` lines — if the whole step exists only for npm, remove the step).
- Remove the entire "Vendor @embedpdf/pdfium for the browser bridge" step (the `npm ci` / `cp -R` / cleanup block).
- Ensure the site build invokes the asset tool. If pages.yml shells out to `task build-wasm-site`, nothing more is needed; if it runs raw commands, add after the wasm build:

```yaml
      - name: Install booba-shim pdfium assets
        run: go tool booba-shim-assets web/ --shim=pdfium
```

- [ ] **Step 5: Update .github/dependabot.yml**

Remove the npm package-ecosystem entry for `/web/vendor` (including its explanatory comment block). The @embedpdf/pdfium pin now lives in booba-shim's `pdfium-shim.js`.

- [ ] **Step 6: Verify the site builds**

Run: `task build-wasm-site && ls web/booba-shim/pdfium/`
Expected: build succeeds; `pdfium-shim.js pdfium-shim.d.ts` present. Also check nothing references the old names: `grep -rn "ntchartsPDFium\|pdfium-bridge\|vendor/embedpdf" web/index.html Taskfile.yml .github/ pdfview/ examples/` → no matches.

- [ ] **Step 7: Commit**

```bash
git add -A web/index.html Taskfile.yml .github/workflows/pages.yml .github/dependabot.yml
git commit -m "chore(web): replace private pdfium bridge + npm vendoring with booba-shim assets"
```

---

### Task 9: CHANGELOG + full verification

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add CHANGELOG entry**

At the top of `CHANGELOG.md` (after the `# CHANGELOG` heading), add:

```markdown
## Unreleased

### Changed
- **Browser renderer via booba-shim**: The browser-WASM backend now uses
  [`booba-shim/pdfium`](https://github.com/NimbleMarkets/booba-shim)
  instead of a private JS bridge. The bridge global moved from
  `window.ntchartsPDFium` to `window.boobaShim.pdfium` (`ready` promise
  instead of `init()`), assets are installed by
  `go tool booba-shim-assets web/ --shim=pdfium`, and the PDFium wasm is
  loaded from the jsDelivr CDN — the npm vendoring pipeline
  (`web/vendor/`, the Pages workflow npm steps, the dependabot npm rule)
  is gone. Host pages embedding the demo must update their script
  imports accordingly. The Go `pdfview` API is unchanged.
```

- [ ] **Step 2: Full verification, both repos**

```bash
cd /Users/evan/projects/booba-shim && go test ./... && GOOS=js GOARCH=wasm go build ./... && go vet ./...
cd /Users/evan/projects/ntcharts-pdf && go test ./... && GOOS=js GOARCH=wasm go build ./... && go vet ./... && task build-wasm-site
```

Expected: everything green.

- [ ] **Step 3: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: changelog for booba-shim/pdfium migration"
```

---

### Task 10: manual browser smoke (checkpoint — requires the user or a browser tool)

- [ ] **Step 1: booba-shim example**

```bash
cd /Users/evan/projects/booba-shim/examples/pdfium-render && task serve
```

Open http://localhost:8000/ — expect `pages=N page0=WxHpt`, `rendered WxHpx`, and the rendered page image visible. No console errors.

- [ ] **Step 2: ntcharts-pdf demo**

```bash
cd /Users/evan/projects/ntcharts-pdf && task serve-wasm-site
```

Open http://localhost:8000/ntcharts-pdf/ — expect the TUI to boot; toggle ImageMode and confirm the PDF page renders. No `ntchartsPDFium` errors in the console.

- [ ] **Step 3: Record results**

If either smoke fails, debug before declaring the migration done (superpowers:systematic-debugging). Browser smoke is the only end-to-end test of the JS↔Go contract — CI only proves builds.

---

## Deferred (explicitly out of plan)

- Pushing/tagging booba-shim and dropping the ntcharts-pdf `replace` —
  release mechanics, after both repos are verified locally.
- `window.ntchartsPDFium` compat alias — rejected in the spec.
- Any bridge surface beyond the existing five calls.
