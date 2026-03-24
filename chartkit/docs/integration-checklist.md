# Datathing ChartKit Integration Checklist

Use this checklist before distribution or host-app integration testing.

## Package

- `npm run build` passes in the package root
- package version and docs describe the same API generation
- no stale page/dashboard API references remain in source or docs
- public exports match the documented API

## Host App

- host imports `@austrade/chartkit/react`
- host imports `@austrade/chartkit/style.css`
- related ChartKit components share the same `namespace`
- queries and data sources are registered inside `ChartKitConfig`

## Controls and Params

- control `id` values match SQL placeholders exactly
- missing host params resolve to `NULL`
- control changes update every component in the namespace
- host app does not duplicate ChartKit control state unnecessarily

## Data and Queries

- SQL files are reachable by the host app
- data source ids match SQL table references or `dependsOn`
- parquet files are hosted over HTTP/HTTPS and accessible from the browser
- unused data sources are not loaded on first render

## Browser Runtime

- only one DuckDB runtime starts per browser tab/session
- DuckDB WASM/worker assets resolve correctly
- charts render in Chrome, Firefox, Safari, and Edge
- mobile widths do not overflow cards or grids

## Azure Storage

- CORS allows request header `Range`
- response exposes `Content-Range`, `Accept-Ranges`, and `Content-Length`
- parquet files are not transparently gzip-compressed
- network traces confirm range-capable parquet access where expected

## Visual Validation

- all charts use the selected theme preset
- ranked palette ordering looks correct for dominant series
- tooltips are fully visible and use ChartKit styling
- `DataTable` headers and cells truncate only when needed
- `BigValue` layout is compact and aligned across the row

## Regression Pass

- market or route-level params still filter correctly
- query loading errors show actionable messages
- missing data-source dependencies fail clearly
- package build output imports cleanly into the example app
