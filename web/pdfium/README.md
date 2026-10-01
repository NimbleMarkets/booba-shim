# booba-shim/pdfium JS bridge

This directory ships in the asset tool. End users do not edit these files
directly — they run `go tool booba-shim-assets <web-dir> --shim=pdfium`,
which writes them to `<web-dir>/booba-shim/pdfium/`.

The bridge sets `window.boobaShim.pdfium` and a `ready` promise. The page
does not need to await it — the Go side awaits `ready` itself on the first
`pdfium.Load` call (unlike the duckdb shim, where the page awaits `ready`
before instantiating `app.wasm`).

Pinned dependencies (bump in `pdfium-shim.js`):
- `@embedpdf/pdfium@2.15.1`
