import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { createReadStream, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Serves pre-compressed .wasm.br files in the Vite dev server when the browser
 * sends Accept-Encoding: br. Without this, the dev server serves the raw ~38 MB
 * WASM binaries; with it, the browser downloads the ~5 MB brotli versions.
 */
function brotliWasmPlugin(): Plugin {
  return {
    name: "brotli-wasm-dev",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0] ?? "";
        if (!url.endsWith(".wasm")) return next();

        const acceptEncoding = req.headers["accept-encoding"] ?? "";
        if (!acceptEncoding.includes("br")) return next();

        const brPath = join(process.cwd(), "public", decodeURIComponent(url) + ".br");
        if (!existsSync(brPath)) return next();

        res.statusCode = 200;
        res.setHeader("Content-Encoding", "br");
        res.setHeader("Content-Type", "application/wasm");
        res.setHeader("Cache-Control", "no-cache");
        createReadStream(brPath).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), brotliWasmPlugin()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, "/");
          if (
            normalizedId.includes("/node_modules/@duckdb/duckdb-wasm/") ||
            normalizedId.includes("/node_modules/apache-arrow/") ||
            normalizedId.includes("/node_modules/flatbuffers/")
          ) {
            return "duckdb-vendor";
          }
          if (
            normalizedId.includes("/node_modules/echarts/") ||
            normalizedId.includes("/node_modules/echarts-for-react/") ||
            normalizedId.includes("/node_modules/zrender/")
          ) {
            return "chart-vendor";
          }
          if (
            normalizedId.includes("/node_modules/react/") ||
            normalizedId.includes("/node_modules/react-dom/") ||
            normalizedId.includes("/node_modules/scheduler/")
          ) {
            return "react-vendor";
          }
          return undefined;
        },
      },
    },
  },
});
