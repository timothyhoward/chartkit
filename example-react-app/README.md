# ChartKit Example React App

This app demonstrates the current ChartKit integration model:

- configure a namespace with `ChartKitConfig`
- register `DataSource` and `Query` once
- place charts, metrics, tables, and controls directly in the normal React tree
- use SQL files from `public/queries`

## Run

```bash
cd example-react-app
npm install
npm run prepare:duckdb
npm run dev
```

`predev` builds the local package in `../chartkit` first.

To force ChartKit to use locally hosted DuckDB wasm/worker bundles, set:

```bash
VITE_CHARTKIT_DUCKDB_BUNDLE_BASE_URL=/duckdb
```

`npm run prepare:duckdb` copies these files into `public/duckdb` and creates Brotli variants (`.wasm.br`) for deployment pipelines that serve precompressed assets.

Use URL params to simulate route-level context:

- `http://localhost:5173/?market=CN`
- `http://localhost:5173/?market=US`

## Build

```bash
npm run build
```
