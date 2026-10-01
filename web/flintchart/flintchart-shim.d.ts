// booba-shim/flintchart — TypeScript types for the JS bridge.

declare global {
    interface Window {
        boobaShim?: BoobaShim;
    }

    /** Declaration-merged across every booba-shim bridge type file —
     *  each shim contributes its own optional member. */
    interface BoobaShim {
        flintchart?: BoobaShimFlintchart;
    }
}

export interface BoobaShimFlintchart {
    /** Resolves once the bundle is initialized. The bundle is fully
     *  synchronous (no wasm/network fetch), so this is already-resolved. */
    ready: Promise<void>;

    /** Compiles a flint ChartAssemblyInput (JSON-encoded) into an
     *  ntcharts render envelope, also JSON-encoded: `{"spec",...}` on
     *  success, `{"error":{"message"}}` on a compile failure — the
     *  latter is returned as data, not thrown. */
    compile(inputJSON: string): string;

    /** The vendored bundle's version string, e.g.
     *  "flint-ntcharts flint-chart@0.5.1". */
    version: string;
}

export {};
