import * as esbuild from "esbuild";
import { fileURLToPath } from "node:url";

const coreDirAbs = fileURLToPath(new URL("../core/src/index.ts", import.meta.url));
const shared = {
  bundle: true,
  format: "esm",
  logLevel: "warning",
  loader: { ".typ": "text" },
  alias: {
    "@pdfstart/core": coreDirAbs,
    "@pdfstart/core/styles": fileURLToPath(
      new URL("../core/src/styles", import.meta.url)
    ),
  },
};

// Entry 1: node-target CLI (unchanged behavior).
await esbuild.build({
  ...shared,
  entryPoints: ["src/cli.ts"],
  platform: "node",
  outfile: "dist/cli.js",
});

// Entry 2: browser-target web entry. Self-contained: typst.ts is bundled
// in (pure JS); the wasm module stays out of the bundle and is provided
// by the consumer at runtime as a URL (see initTypst({ wasmUrl })).
// The optional typst-ts-renderer (artifact preview only, never used by
// this package's compiler pipeline) is left external; it is lazy-imported
// by typst.ts and never resolved at runtime here.
await esbuild.build({
  ...shared,
  entryPoints: ["src/web.ts"],
  platform: "browser",
  external: ["@myriaddreamin/typst-ts-renderer"],
  outfile: "dist/web.js",
});
