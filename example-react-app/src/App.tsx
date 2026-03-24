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
  LineChart,
  MetricRow,
  PieChart,
  Query,
} from "@austrade/chartkit/react";
import "@austrade/chartkit/style.css";
import datathingIcon from "../icon.svg";
import "./app.css";

const productScopeOptions = [
  { label: "All Products", value: "all" },
  { label: "Targeted Products", value: "targeted" },
];

const dimensionOptions = [
  { label: "Sector", value: "sector" },
  { label: "Product Group", value: "group" },
];

const measureOptions = [
  { label: "Export Value", value: "export_value" },
  { label: "Export Volume (kg)", value: "export_weight" },
  { label: "Exporters", value: "unique_traders" },
];

const queryDefinitions = [
  { id: "kpiTrendByYear", src: "/queries/kpi_trend_by_year.sql" },
  { id: "kpiLatestMetrics", src: "/queries/kpi_latest_metrics.sql" },
  { id: "chartDimensionSeries", src: "/queries/chart_dimension_series.sql" },
  { id: "pieDimensionShare", src: "/queries/pie_dimension_share.sql" },
  { id: "tableDimensionBreakdown", src: "/queries/table_dimension_breakdown.sql" },
];

function normalizeMarketId(rawValue: string | null): string | null {
  const normalized = (rawValue ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 2);
  return normalized === "" ? null : normalized;
}

function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const marketId = normalizeMarketId(urlParams.get("market"));
  const marketLabel = marketId ?? "All Markets";
  const currentYear = new Date().getFullYear();

  return (
    <main className="example-shell">
      <header className="example-hero">
        <div className="example-hero-brand">
          <div className="example-hero-mark" aria-hidden="true">
            <img src={datathingIcon} alt="Datathing" />
          </div>
          <div className="example-hero-copy">
            <h1>Datathing ChartKit</h1>
          </div>
        </div>
        <div className="example-hero-meta">
          <div className="example-meta-card">
            <span className="example-meta-label">Market</span>
            <strong>{marketLabel}</strong>
          </div>
          <div className="example-meta-card">
            <span className="example-meta-label">Try</span>
            <strong>?market=CN</strong>
          </div>
        </div>
      </header>

      <ChartKitConfig
        namespace="exports"
        theme="clarity"
        params={{
          marketId,
        }}
      >
        <DataSource
          id="m_exports_g"
          format="parquet"
          url="/data/m_exports_g.parquet"
          source="Austrade test dataset"
          refreshCadence="monthly"
        />
        {queryDefinitions.map((query) => (
          <Query key={query.id} id={query.id} src={query.src} />
        ))}
      </ChartKitConfig>

      <section className="ck-filter-row">
        <ButtonGroup
          namespace="exports"
          id="productScope"
          label="Product Scope"
          options={productScopeOptions}
          defaultValue="all"
        />
        <Dropdown
          namespace="exports"
          id="dimension"
          label="Dimension"
          title="Dimension"
          options={dimensionOptions}
          defaultValue="sector"
        />
        <Dropdown
          namespace="exports"
          id="measure"
          label="Measure"
          title="Measure"
          options={measureOptions}
          defaultValue="export_value"
        />
      </section>

      <MetricRow>
        <BigValue
          namespace="exports"
          title="Export Value"
          data="kpiLatestMetrics"
          value="export_value_m"
          fmt="currency_aud_m"
          comparison="export_value_cagr_5y_pct"
          comparisonFmt="pct1"
          comparisonTitle="CAGR/5yr"
          sparkline="fiscal_year"
          sparklineData="kpiTrendByYear"
        />
        <BigValue
          namespace="exports"
          title="Export Volume (kg)"
          data="kpiLatestMetrics"
          value="export_weight_kg"
          fmt="num0"
          comparison="export_weight_cagr_5y_pct"
          comparisonFmt="pct1"
          comparisonTitle="CAGR/5yr"
          sparkline="fiscal_year"
          sparklineData="kpiTrendByYear"
        />
        <BigValue
          namespace="exports"
          title="Exporters"
          data="kpiLatestMetrics"
          value="exporters"
          fmt="num0"
          comparison="exporters_cagr_5y_pct"
          comparisonFmt="pct1"
          comparisonTitle="CAGR/5yr"
          sparkline="fiscal_year"
          sparklineData="kpiTrendByYear"
        />
        <BigValue
          namespace="exports"
          title="Top 10 (%)"
          data="kpiLatestMetrics"
          value="top10_pct"
          fmt="pct1"
          sparkline="fiscal_year"
          sparklineData="kpiTrendByYear"
          description="Share captured by top 10 product groups"
        />
      </MetricRow>

      <Grid cols={2}>
        <Column>
          <Card
            namespace="exports"
            title="Merchandise Exports"
            subtitle="Stacked by selected dimension"
          >
            <BarChart
              namespace="exports"
              data="chartDimensionSeries"
              xValueField="fiscal_year"
              xLabelField="fiscal_year_label"
              yValueField="metric_value"
              seriesValueField="series_value"
              seriesLabelField="series_name"
              xAxisTitle="Financial Year"
              yAxisTitle="Selected Measure"
            />
          </Card>
        </Column>
        <Column>
          <Card namespace="exports" title="Trend by Dimension" subtitle="Same dataset in line form">
            <LineChart
              namespace="exports"
              data="chartDimensionSeries"
              xValueField="fiscal_year"
              xLabelField="fiscal_year_label"
              yValueField="metric_value"
              seriesValueField="series_value"
              seriesLabelField="series_name"
              xAxisTitle="Financial Year"
              yAxisTitle="Selected Measure"
            />
          </Card>
        </Column>
      </Grid>

      <Grid cols={2}>
        <Column>
          <Card namespace="exports" title="Latest Year Share">
            <PieChart
              namespace="exports"
              data="pieDimensionShare"
              xValueField="category"
              yValueField="pct_share"
              yLabelField="Share"
              yFmt="pct1"
            />
          </Card>
        </Column>
        <Column>
          <Card namespace="exports" title="Year-to-Date Merchandise Export Performance">
            <DataTable namespace="exports" data="tableDimensionBreakdown">
              <DataColumn field="rank" label="#" align="right" width="40px" minWidth="40px" />
              <DataColumn field="dimension_name" label="Dimension" minWidth="180px" />
              <DataColumn field="exporters" label="Exporters" fmt="num0" align="right" width="84px" minWidth="84px" />
              <DataColumn field="exporters_cagr_5y" label="CAGR/5yr" fmt="pct1" align="right" width="76px" minWidth="76px" />
              <DataColumn field="export_value_m" label="Value (A$M)" fmt="currency_aud_m" align="right" width="96px" minWidth="96px" />
              <DataColumn field="export_value_cagr_5y" label="Value CAGR/5yr" fmt="pct1" align="right" width="92px" minWidth="92px" />
              <DataColumn field="gms_pct" label="GMS" fmt="pct1" align="right" width="64px" minWidth="64px" />
              <DataColumn field="gr" label="GR" fmt="num0" align="right" width="48px" minWidth="48px" />
            </DataTable>
          </Card>
        </Column>
      </Grid>

      <footer className="example-footer">
        <div className="example-footer-copy">
          <p>Copyright © {currentYear} Australian Government</p>
          <p>Powered by Datathing</p>
        </div>
        <div className="example-footer-brand" aria-hidden="true">
          <img src={datathingIcon} alt="" />
        </div>
      </footer>
    </main>
  );
}

export default App;
