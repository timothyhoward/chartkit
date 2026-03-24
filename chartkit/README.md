# Datathing ChartKit

Datathing ChartKit is a React package for embedding interactive trade analytics components backed by DuckDB-WASM, hosted flat files, and Apache ECharts.

The package is designed for host React applications that want:

- self-contained analytics components
- no separate API requirement
- one shared DuckDB runtime per browser tab
- SQL and data sources defined once, then reused across charts, tables, and KPIs

## Version

Current release: `1.0.0`.

## Install

```bash
npm install @austrade/chartkit
```

Peer dependencies:

- `react`
- `react-dom`

Required stylesheet:

```tsx
import "@austrade/chartkit/style.css";
```

## Mental Model

Datathing ChartKit uses a rootless, namespaced React API.

You declare shared configuration once with `ChartKitConfig`:

- namespace
- host params
- theme preset
- queries
- data sources

Then you place components anywhere in the host React tree:

- `BigValue`
- `BarChart`
- `LineChart`
- `PieChart`
- `DataTable`
- `Dropdown`
- `ButtonGroup`

All components in the same `namespace` share:

- control state
- query definitions
- data-source definitions
- theme preset
- one browser DuckDB runtime

## Quick Start

```tsx
import {
  BarChart,
  BigValue,
  ButtonGroup,
  Card,
  ChartKitConfig,
  Column,
  DataColumn,
  DataSource,
  DataTable,
  Dropdown,
  Grid,
  Query,
} from "@austrade/chartkit/react";
import "@austrade/chartkit/style.css";

export default function ExportsPage() {
  return (
    <>
      <ChartKitConfig
        namespace="exports"
        params={{ marketId: "CN" }}
        theme="austrade"
      >
        <DataSource id="mExports" format="parquet" url="/data/m_exports_g.parquet" />
        <Query id="kpiLatest" src="/queries/kpi_latest.sql" />
        <Query id="exportsByYear" src="/queries/exports_by_year.sql" />
        <Query id="tableBreakdown" src="/queries/table_breakdown.sql" />
      </ChartKitConfig>

      <ButtonGroup
        namespace="exports"
        id="productScope"
        label="Product Scope"
        options={[
          { label: "All Products", value: "all" },
          { label: "Targeted Products", value: "targeted" },
        ]}
        defaultValue="all"
      />

      <Dropdown
        namespace="exports"
        id="dimension"
        label="Dimension"
        options={[
          { label: "Sector", value: "sector" },
          { label: "Product Group", value: "group" },
        ]}
        defaultValue="sector"
      />

      <Grid cols={2}>
        <Column>
          <BigValue
            namespace="exports"
            title="Export Value"
            data="kpiLatest"
            value="export_value_m"
            fmt="currency_aud_m"
          />
        </Column>
        <Column>
          <Card namespace="exports" title="Exports Overview">
            <BarChart
              namespace="exports"
              data="exportsByYear"
              xValueField="fiscal_year"
              xLabelField="fiscal_year_label"
              yValueField="metric_value"
              seriesValueField="series_value"
              seriesLabelField="series_name"
              xAxisTitle="Financial Year"
              yAxisTitle="Export Value"
              yFmt="currency_aud_m"
            />
            <DataTable namespace="exports" data="tableBreakdown">
              <DataColumn field="dimension_name" label="Dimension" minWidth="180px" />
              <DataColumn field="export_value_m" label="Value (A$M)" fmt="currency_aud_m" width="96px" />
            </DataTable>
          </Card>
        </Column>
      </Grid>
    </>
  );
}
```

## Public API

Import from `@austrade/chartkit/react`.

Configuration:

- `ChartKitConfig`
- `DataSource`
- `Query`

Layout:

- `Grid`
- `Column`
- `MetricRow`
- `Card`

Inputs:

- `ButtonGroup`
- `Dropdown`

Visual components:

- `BigValue`
- `BarChart`
- `LineChart`
- `PieChart`
- `DataTable`
- `DataColumn`

Utilities:

- `formatChartKitDisplayValue`
- `formatChartKitNumber`

## Core Concepts

### `namespace`

Every ChartKit component belongs to a namespace.

Use the same namespace when components should share:

- params
- controls
- queries
- data sources
- theme

Use different namespaces when those things should remain isolated.

### `ChartKitConfig`

`ChartKitConfig` is the single source of truth for a namespace.

Props:

- `namespace: string`
- `params?: Record<string, string | number | boolean | null | undefined>`
- `theme?: "chartkit" | "austrade" | "clarity" | "accessible"`

Children:

- `DataSource`
- `Query`

### `Query`

`Query` registers an external SQL file.

Props:

- `id: string`
- `src: string`
- `dependsOn?: string[]`
- `excludeDependsOn?: string[]`

Example:

```tsx
<Query id="kpiLatest" src="/queries/kpi_latest.sql" />
<Query
  id="enriched"
  src="/queries/enriched.sql"
  dependsOn={["lookupTable"]}
  excludeDependsOn={["legacyTable"]}
/>
```

### `DataSource`

`DataSource` registers a flat-file source.

Props:

- `id: string`
- `format: "csv" | "parquet"`
- `url: string`
- `loadStrategy?: "on_demand" | "preload"`
- `source?: string`
- `refreshCadence?: "monthly"`

## Params and Controls

Control `id` values are also SQL placeholder keys.

If a control is:

```tsx
<Dropdown namespace="exports" id="dimension" ... />
```

Then SQL should use:

```sql
{{dimension}}
```

Resolution order:

1. user-selected control value
2. `ChartKitConfig.params`
3. control `defaultValue`
4. `NULL`

## Chart Authoring

### Bar and line charts

Use:

- `xValueField`
- `xLabelField`
- `yValueField`
- `seriesValueField`
- `seriesLabelField`
- `xAxisTitle`
- `yAxisTitle`
- `fmt`
- `yFmt`

`xLabelField` and `seriesLabelField` are used for user-facing labels.

Color behavior:

- all charts use the namespace theme palette
- colors are assigned by ranked magnitude
- the largest series/category gets the first palette color

### Pie charts

Use:

- `xValueField`
- `xLabelField`
- `yValueField`
- `yLabelField`
- `fmt`
- `yFmt`

Pie slices are ordered by value descending before palette assignment.

## Data Tables

`DataTable` can infer columns from data, but explicit `DataColumn` definitions are recommended for production use.

`DataColumn` props:

- `field`
- `label`
- `fmt`
- `align`
- `width`
- `minWidth`

Width guidance:

- use `width` for narrow fixed numeric columns such as rank, percentages, and short codes
- use `minWidth` for descriptive text columns such as sector names

Table behavior:

- compact default density
- fixed layout to prevent header text from driving oversized columns
- truncation with ChartKit overflow popovers for long headers/cells

## Themes

Theme presets:

- `chartkit`: purple-led default palette with cool secondary hues
- `austrade`: softer institutional palette
- `clarity`: balanced dashboard palette
- `accessible`: high-distinction palette for accessibility-sensitive use cases

Example:

```tsx
<ChartKitConfig namespace="exports" theme="clarity">
  ...
</ChartKitConfig>
```

## Formatting

Formatting is shared across KPIs, charts, and tables.

Common tokens:

- `num0`, `num1`, `num2`
- `pct0`, `pct1`, `pct2`
- `aud`, `aud0`, `aud1`
- `usd`, `usd0`, `usd1`
- `aud0k`, `usd0k`
- `currency_aud_m`, `currency_usd_m`
- `currency_aud_bn`, `currency_usd_bn`

## Runtime and Loading

DuckDB runtime behavior:

- one shared DuckDB runtime per browser tab/session
- SQL files are fetched lazily
- data sources are registered lazily
- parquet sources are opened over HTTP URL registration
- duplicate query and data-source work is deduped internally

Query dependencies:

- auto-detected from `FROM` and `JOIN`
- overridable with `dependsOn` and `excludeDependsOn`

## Hosting Requirements

For Azure Blob / ADLS hosting:

- allow request header `Range`
- expose response headers `Content-Range`, `Accept-Ranges`, and `Content-Length`
- do not serve parquet files with transparent HTTP compression
- validate behavior with browser network traces

Recommended data layout:

- partition by selective fields such as `country_id` and `fiscal_year`
- avoid monolithic parquet files when the dataset grows materially

## Distribution Notes

Package entry points:

- `@austrade/chartkit`
- `@austrade/chartkit/react`
- `@austrade/chartkit/style.css`

The package is built as ESM and expects a bundler-compatible React application.

## CI

Recommended verification flow:

- build the package
- build the example host app

Example commands:

```bash
cd chartkit
npm run build

cd ../example-react-app
npm run build
```

Primary workflow:

- `../.github/workflows/chartkit-ci.yml`

Reference checklist:

- `./docs/integration-checklist.md`

## npm Publish Checklist

Before publishing `@austrade/chartkit`:

1. Confirm version and changelog intent
   - verify `package.json` version
   - confirm the release should be `latest`
2. Build locally
   - run `npm run build` in `chartkit`
   - run `npm run build` in `example-react-app`
3. Verify GitHub Actions is green
   - `Build` job passes on Linux and Windows
4. Review published surface
   - check `README.md`
   - check `package.json` `exports`, `files`, `peerDependencies`
   - confirm no internal-only docs/files are included unintentionally
5. Check integration-critical assets
   - stylesheet import path is correct
   - example app still consumes the local package successfully
   - DuckDB bundle preparation is still valid for hosted deployments
6. Inspect the tarball
   - run `npm pack --dry-run`
   - confirm only the intended files are included
7. Publish
   - run `npm publish`
8. Post-publish verification
   - install the published package in a clean React app
   - verify `@austrade/chartkit/react` and `@austrade/chartkit/style.css` resolve correctly

## Example App

The companion example app lives in:

- `../example-react-app`

## Status

The package is structured for distribution and host-app integration testing.
