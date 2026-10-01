# `booba-shim` CHANGELOG

All notable changes to booba-shim are documented in this file.

## `v0.2.0` - 2026-09-30

 * Added [`booba-shim/flintchart`](./flintchart): compile a flint
   `ChartAssemblyInput` (JSON) into an ntcharts render envelope. The
   compiler is a self-contained bundle vendored from
   [flint-ntcharts v0.1.0](https://github.com/NimbleMarkets/flint-ntcharts/releases/tag/v0.1.0)
   (`flint-chart@0.5.1`; see `web/flintchart/PROVENANCE.txt`), so nothing is
   fetched at run time.
   * `examples/flintchart-compile`: minimal browser example proving the
     compile bridge
 * Update DuckDB-Wasm from `1.29.0` to stable `1.32.0`, including the
   embedded workers and WASM artifacts. Keep Apache Arrow JS at `17.0.0`.
 * Update EmbedPDF PDFium from `2.14.2` to `2.15.1`, with matching JS and
   WASM CDN pins. Verified both upgrades in Chrome using the Go/WASM SQL,
   Arrow IPC, and PDF rendering examples; no bridge API changes required.

## `v0.1.0` - 2026-06-13

 * Initial release of `booba-shim`
   * [`booba-shim/duckdb`](./duckdb): DuckDB-Wasm via `database/sql` driver + native Arrow API 
   * [`booba-shim/pdfium`](./pdfium): PDF rasterization to `*image.RGBA` via PDFium-Wasm
