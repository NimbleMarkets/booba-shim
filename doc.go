// Package boobashim is the root of the github.com/NimbleMarkets/booba-shim
// module. The module hosts browser shims that Go-WASM programs hosted by
// github.com/NimbleMarkets/go-booba commonly need.
//
// Each shim is a subpackage with its own Go side (build-tagged for js) and
// a paired JS bridge file under web/<shim>/. The cmd/booba-shim-assets tool
// copies the JS side into a consumer's site directory.
//
// First shim: booba-shim/duckdb (DuckDB-Wasm via database/sql + Arrow).
package boobashim
