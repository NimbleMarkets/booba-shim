// Command booba-shim-assets copies the JS-side bridge files for one or
// more booba-shim subpackages into a target site directory.
//
// Usage:
//
//	booba-shim-assets <web-dir> --shim=duckdb [--shim=…] [--cdn|--vendored]
//
// Outputs land under <web-dir>/booba-shim/<shim>/.
package main

import (
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"

	flag "github.com/spf13/pflag"
)

func main() {
	var (
		shims    []string
		cdn      bool
		vendored bool
	)
	flag.StringSliceVar(&shims, "shim", nil, "Shim to install (repeat for multiple). Required.")
	flag.BoolVar(&cdn, "cdn", true, "Load DuckDB-Wasm + apache-arrow from JSDelivr (default)")
	flag.BoolVar(&vendored, "vendored", false, "Copy pinned bundles into <web-dir>/booba-shim/<shim>/")
	flag.Parse()

	if flag.NArg() != 1 {
		fmt.Fprintln(os.Stderr, "usage: booba-shim-assets <web-dir> --shim=NAME [--shim=NAME ...]")
		os.Exit(2)
	}
	if len(shims) == 0 {
		fmt.Fprintln(os.Stderr, "error: at least one --shim is required")
		os.Exit(2)
	}
	if vendored {
		cdn = false
	}
	_ = cdn // reserved for future use; flag still surfaces in --help

	webDir := flag.Arg(0)
	for _, shim := range shims {
		if err := installShim(shim, webDir, vendored); err != nil {
			fmt.Fprintf(os.Stderr, "installing %s: %v\n", shim, err)
			os.Exit(1)
		}
	}
}

func installShim(shim, webDir string, vendored bool) error {
	srcRoot := filepath.Join("assets", shim)
	if _, err := fs.Stat(shimAssets, srcRoot); err != nil {
		return fmt.Errorf("unknown shim %q (no embedded assets under %s)", shim, srcRoot)
	}
	dstRoot := filepath.Join(webDir, "booba-shim", shim)
	if err := os.MkdirAll(dstRoot, 0o755); err != nil {
		return err
	}
	return fs.WalkDir(shimAssets, srcRoot, func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel(srcRoot, p)
		if d.IsDir() {
			if rel == "." {
				return nil
			}
			return os.MkdirAll(filepath.Join(dstRoot, rel), 0o755)
		}
		// In --cdn mode skip files under a "vendored/" subdirectory.
		if !vendored && strings.HasPrefix(rel, "vendored"+string(filepath.Separator)) {
			return nil
		}
		data, err := fs.ReadFile(shimAssets, p)
		if err != nil {
			return err
		}
		out := filepath.Join(dstRoot, rel)
		fmt.Printf("write %s\n", out)
		return os.WriteFile(out, data, 0o644)
	})
}
