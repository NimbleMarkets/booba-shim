# booba-shim

Browser shims that let Go-WASM TUIs hosted by [go-booba](https://github.com/NimbleMarkets/go-booba) access browser-only capabilities. Currently DuckDB-Wasm; more shims planned.

## Shims

| Subpackage | What it does |
|---|---|
| [`booba-shim/duckdb`](./duckdb) | DuckDB-Wasm via `database/sql` driver + native Arrow API |
| [`booba-shim/pdfium`](./pdfium) | PDF rasterization to `*image.RGBA` via PDFium-Wasm |

## Install

Add to your `go.mod`:

```go
require github.com/NimbleMarkets/booba-shim v0.1.0

tool github.com/NimbleMarkets/booba-shim/cmd/booba-shim-assets
```

Then `go mod download` and `go tool booba-shim-assets` to populate your HTML directory.

## Quickstart — minimal browser SQL demo

The smallest working example using `booba-shim/duckdb` via `database/sql`:

**main.go** (GOOS=js GOARCH=wasm):

```go
package main

import (
	"database/sql"
	"fmt"
	"syscall/js"

	_ "github.com/NimbleMarkets/booba-shim/duckdb"
)

func main() {
	db, err := sql.Open("duckdb", ":memory:")
	if err != nil {
		panic(err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		panic(err)
	}

	if _, err := db.Exec(`CREATE TABLE t (id INT64, name VARCHAR)`); err != nil {
		panic(err)
	}

	var id int64
	var name string
	if err := db.QueryRow(`SELECT 1 as id, 'hello' as name`).Scan(&id, &name); err != nil {
		panic(err)
	}

	js.Global().Call("alert", fmt.Sprintf("Got: %d, %s", id, name))
	select {}
}
```

**index.html** (excerpt):

```html
<div id="output"></div>
<script src="wasm_exec.js"></script>
<script type="module">
  import './booba-shim/duckdb/duckdb-shim.js';
  await window.boobaShim.duckdb.ready;
  const wasm = await WebAssembly.instantiateStreaming(fetch('app.wasm'), new Go().importObject);
  new Go().run(wasm.instance);
</script>
```

**Taskfile.yml** (excerpt):

```yaml
tasks:
  build:
    cmds:
      - GOOS=js GOARCH=wasm go build -o app.wasm .
      - cp "$(go env GOROOT)/lib/wasm/wasm_exec.js" .
      - go tool booba-shim-assets . --shim=duckdb
```

## Asset tool

```sh
go tool booba-shim-assets <web-dir> --shim=duckdb [--cdn|--vendored]
```

Writes `<web-dir>/booba-shim/duckdb/duckdb-shim.js` plus dependencies. Use `--cdn` (default) to fetch from CDN; `--vendored` embeds local bundles (see below).

### Vendored mode

`--vendored` is structurally wired up in v0.1.0 but the vendored bridge is a stub — it embeds the upstream bundles but throws an explanatory error on every call. Use `--cdn` (the default) for production. See `web/duckdb/duckdb-shim-vendored.js` for the technical details and the path to a real implementation in a future release.

### Pinned upstream versions

- `@duckdb/duckdb-wasm@1.29.0` (duckdb shim; tracked in `web/duckdb/duckdb-shim.js`)
- `apache-arrow@17.0.0` (duckdb shim)
- `@embedpdf/pdfium@2.14.2` (pdfium shim; tracked in `web/pdfium/pdfium-shim.js`)

## License

[MIT](./LICENSE.txt) — Copyright (c) 2026 Neomantra Corp.
