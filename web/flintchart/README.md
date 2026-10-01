# booba-shim/flintchart JS bridge

This directory ships in the asset tool. End users do not edit these files
directly — they run `go tool booba-shim-assets <web-dir> --shim=flintchart`,
which writes them to `<web-dir>/booba-shim/flintchart/`.

Unlike `pdfium` and `duckdb`, this bridge is not built against a pinned
upstream npm package fetched at asset-install time — the ntcharts backend
for flint-chart lives in flint-ntcharts and is not published to npm, so
there is no CDN URL to point at. `flintchart-shim.js` is instead a single
self-contained bundle vendored verbatim from a tagged release of
[flint-ntcharts](https://github.com/NimbleMarkets/flint-ntcharts)
(`js/dist/flintchart-shim.mjs`, built by `make browser-shim` there). It has
no runtime imports (no CDN fetch, no wasm) — loading the file synchronously
sets `window.boobaShim.flintchart` (aka `globalThis.boobaShim.flintchart`)
to an object with `compile`, `version`, and an already-resolved `ready`
promise.

`PROVENANCE.txt` records the flint-ntcharts tag and commit, the flint-chart
version, and the file's sha256 and size; `go test ./flintchart/` checks the
bundle against it and that both vendored copies are identical.

To re-vendor, build from a clean clone of the flint-ntcharts release tag —
never from a working tree with local edits:

```sh
git clone --branch vX.Y.Z https://github.com/NimbleMarkets/flint-ntcharts.git
cd flint-ntcharts && (cd js && npm ci) && make browser-shim
```

Copy `js/dist/flintchart-shim.mjs` over `flintchart-shim.js` here and over
the mirror under `cmd/booba-shim-assets/assets/flintchart/`, and update both
`PROVENANCE.txt` files with the tag, commit, sha256 and byte count that
`make browser-shim` prints.
