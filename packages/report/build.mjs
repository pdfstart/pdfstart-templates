import * as esbuild from "esbuild";
import { fileURLToPath } from "node:url";

const coreDir = new URL("../core/src/index.ts", import.meta.url);
const coreDirAbs = fileURLToPath(coreDir);

await esbuild.build({
  entryPoints: ["src/cli.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "dist/cli.js",
  logLevel: "warning",
  loader: { ".typ": "text" },
  alias: {
    "@pdfstart/core": coreDirAbs,
    "@pdfstart/core/styles": fileURLToPath(new URL("../core/src/styles", import.meta.url)),
  },
});
