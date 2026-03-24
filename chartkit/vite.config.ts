import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  build: {
    emptyOutDir: false,
    lib: {
      entry: {
        index: resolve(__dirname, "src/lib/index.ts"),
        react: resolve(__dirname, "src/lib/react.ts"),
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "@duckdb/duckdb-wasm",
        /^echarts(?:\/.*)?$/,
        /^echarts-for-react(?:\/.*)?$/,
      ],
    },
  },
});
