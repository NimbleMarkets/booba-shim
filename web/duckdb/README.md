# booba-shim/duckdb JS bridge

This directory ships in the asset tool. End users do not edit these files
directly — they run `go tool booba-shim-assets <web-dir> --shim=duckdb`,
which writes them to `<web-dir>/booba-shim/duckdb/`.

The bridge sets `window.boobaShim.duckdb` and a `ready` promise. The page
must await that promise before instantiating `app.wasm`.

Pinned dependencies (bump in `duckdb-shim.js`):
- `@duckdb/duckdb-wasm@1.32.0`
- `apache-arrow@17.0.0`
