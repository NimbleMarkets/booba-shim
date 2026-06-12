# booba-shim/pdfium Go package + ntcharts-pdf migration — Design

Date: 2026-06-12
Status: approved

## Goal

Add the missing Go half of the pdfium shim to booba-shim, then migrate
ntcharts-pdf's browser backend onto it in tandem. After this work, the
JS bridge (`pdfium-shim.js`, committed 2026-06-12) and a `pdfium` Go
package both live in booba-shim, and ntcharts-pdf's `pdfview` browser
backend shrinks to a thin adapter.

## Background

Every booba-shim capability has two halves: a JS bridge file installed
by `booba-shim-assets` that exposes `window.boobaShim.<shim>`, and a Go
package that calls it via `syscall/js`. The pdfium JS half exists; the
Go half does not. ntcharts-pdf currently carries private copies of both
halves (`web/pdfium-bridge.js`, `pdfview/jsbridge_js.go`,
`pdfview/jsrenderer_js.go`) using the old `window.ntchartsPDFium`
contract with an explicit `init()`; the new bridge uses
`window.boobaShim.pdfium` with a `ready` promise. The call surface is
otherwise identical.

Decision (approach A): a Document-object API with the safety machinery
baked in, not flat bridge-mirror functions. This matches duckdb's
Client-object style and lets consumers delete, not duplicate, the
close-vs-render race protection and leak guard.

## Part 1 — booba-shim `pdfium` package

```
pdfium/
  doc.go             package docs (all platforms)
  errors.go          ErrNonJSPlatform, ErrBridgeMissing, *Error (all platforms)
  bridge_js.go       bridge lookup, awaitPromise, mapJSError, ensureReady,
                     callSync                                      [js only]
  document_js.go     Document + Load/Close/NumPages/PageSize/RenderPage
                                                                    [js only]
  document_other.go  stubs returning ErrNonJSPlatform               [!js]
  stubs_test.go      host tests for the stubs
```

### API

```go
func Load(ctx context.Context, data []byte) (*Document, error)

func (d *Document) Close() error                                  // idempotent
func (d *Document) NumPages() (int, error)
func (d *Document) PageSize(page int) (wPt, hPt float64, err error) // points
func (d *Document) RenderPage(ctx context.Context, page, dpi int) (*image.RGBA, error)
```

- Pages are 0-indexed (the bridge's convention). Page-numbering policy
  (e.g. pdfview's 1-indexed API) belongs to consumers.
- `ctx` is accepted but reserved, matching duckdb (`_ = ctx`).
- `PageSize` returns PostScript points (1/72 inch).
- `RenderPage` returns a fresh `*image.RGBA`; pixel data is copied out
  of the JS heap via `js.CopyBytesToGo`, with a copied-length check.

### Document internals (safety machinery)

Adopted from ntcharts-pdf's proven `jsRenderer`:

- `sync.Mutex` serializes RenderPage/PageSize/NumPages against Close so
  closing cannot free pdfium-heap memory mid-render.
- `closed` flag; Close is idempotent; calls on a closed Document return
  an error.
- `runtime.AddCleanup` releases the JS-side document handle if a
  Document is garbage-collected without Close; Close stops the cleanup.

### Bridge mechanics

- `ensureReady()`: sync.Once-gated; looks up `window.boobaShim.pdfium`
  and awaits its `ready` promise. Looked up lazily at first Load, not
  package init.
- Missing bridge script → `Load` returns `ErrBridgeMissing` (sentinel).
  Deliberate divergence from duckdb's panic: pdfview relies on a factory
  error to degrade ImageMode → TextMode. duckdb is unchanged.
- duckdb's bridge calls are all async; pdfium's `numPages` / `pageSize`
  / `closeDocument` are synchronous, and a JS throw in a synchronous
  call panics `syscall/js`. A `callSync` helper wraps sync calls with
  `recover()` and converts throws to `*Error`.

### Errors

- `*Error{Message string}` for failures originating in the bridge or
  PDFium (messages prefixed `pdfium:` by Error()).
- `ErrBridgeMissing` — shim script not loaded by the host page.
- `ErrNonJSPlatform` — any entry point under GOOS != js.
- Plain `errors.New` for Go-side misuse (closed document, negative page
  index where checkable before crossing the boundary).

## Part 2 — booba-shim example + docs

- `examples/pdfium-render/`: loads a bundled test PDF (copied from
  ntcharts-pdf `examples/pdfview/testdata/Example.pdf`), prints page
  count and page size, renders page 0, PNG-encodes it, and displays it
  by setting an `<img>` src to a data URL. Same Taskfile / index.html /
  asset-tool pattern as the duckdb examples; added to CI's example
  builds.
- `pdfium/README.md` with quickstart (modeled on `duckdb/README.md`).
- Root `README.md`: add `booba-shim/pdfium` row to the shim table.

## Part 3 — ntcharts-pdf migration

- Delete `pdfview/jsbridge_js.go` and `web/pdfium-bridge.js` (plus any
  vendored pdfium assets).
- Rewrite `pdfview/jsrenderer_js.go` as a thin adapter (~40 lines):
  - factory: empty-data check, then `pdfium.Load`; all errors
    (including `ErrBridgeMissing`) flow out so the existing
    TextMode fallback is unchanged.
  - `RenderPage`: keeps 1-indexed pages and default-DPI handling;
    DPI-budget clamp now uses `doc.PageSize` (proper error return —
    eliminates the old sync-throw panic risk); render via
    `doc.RenderPage(ctx, page-1, dpi)`.
  - `Close` → `doc.Close()`. Local mutex / cleanup / awaitPromise
    plumbing deleted (now provided by the shim).
- `web/index.html` loads `booba-shim/pdfium/pdfium-shim.js`; Taskfile
  gains `go tool booba-shim-assets web --shim=pdfium`.
- Public `pdfview` API unchanged. Native and WASI backends untouched.
  CHANGELOG entry.

### Module plumbing

booba-shim has never been pushed or tagged. During development
ntcharts-pdf uses:

```
replace github.com/NimbleMarkets/booba-shim => ../booba-shim
```

Release order: push booba-shim main, tag v0.2.0, then replace the
`replace` directive with a real require in ntcharts-pdf.

## Testing

- booba-shim: host stub tests (`go test ./...`); GOOS=js GOARCH=wasm
  build of all packages and the new example in CI.
- ntcharts-pdf: existing pdfview test suite must pass unchanged (host
  paths untouched); wasm build check.
- Manual browser smoke: booba-shim `examples/pdfium-render` and the
  ntcharts-pdf pdfview demo both render Example.pdf.

## Out of scope

- Compat alias `window.ntchartsPDFium` (rejected: permanent second
  public name to avoid a ~5-line consumer change).
- Text extraction, search, or any bridge surface beyond the existing
  five calls.
- DPI/pixel-budget policy in the shim (stays in pdfview).
- duckdb behavior changes.
