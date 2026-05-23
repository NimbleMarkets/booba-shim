# booba-shim

Browser shims for Go-WASM TUIs hosted by [go-booba](https://github.com/NimbleMarkets/go-booba).

## Shims

| Subpackage | What it does |
|---|---|
| [`booba-shim/duckdb`](./duckdb) | DuckDB-Wasm via `database/sql` driver + native Arrow API |

## Asset tool

```sh
go tool booba-shim-assets <web-dir> --shim=duckdb [--cdn|--vendored]
```

Writes `<web-dir>/booba-shim/duckdb/duckdb-shim.js` (CDN mode) plus pinned bundles (vendored mode). Multiple `--shim` flags install several at once.

## License

[MIT](./LICENSE.txt) — Copyright (c) 2026 Neomantra Corp.
