import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: "demo",
  resolve: {
    alias: {
      "@pdfstart/core": fileURLToPath(new URL("../core/src/index.ts", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    fs: { allow: [".."] },
  },
  build: {
    outDir: "../dist-web",
    emptyOutDir: true,
  },
});
