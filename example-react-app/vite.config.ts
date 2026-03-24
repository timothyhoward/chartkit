import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("/node_modules/@duckdb/duckdb-wasm/") ||
            id.includes("/node_modules/apache-arrow/") ||
            id.includes("/node_modules/flatbuffers/")
          ) {
            return "duckdb-vendor";
          }
          if (
            id.includes("/node_modules/echarts/") ||
            id.includes("/node_modules/echarts-for-react/") ||
            id.includes("/node_modules/zrender/")
          ) {
            return "chart-vendor";
          }
          if (
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/react-dom/") ||
            id.includes("/node_modules/scheduler/")
          ) {
            return "react-vendor";
          }
          return undefined;
        },
      },
    },
  },
});
