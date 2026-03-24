import { useQuery } from "../useQuery";
import { formatChartKitDisplayValue } from "../format";
import { asNumber, asString } from "./utils";
import { chartKitTooltipBase } from "./chartTooltip";
import { echarts, ReactEChartsCore } from "./echartsCore";
import { themeVars } from "./themeVars";
import { useChartKitNamespace } from "./useChartKitNamespace";

export interface PieChartProps {
  namespace: string;
  data: string;
  xValueField: string;
  xLabelField?: string;
  yValueField: string;
  yLabelField?: string;
  fmt?: string;
  yFmt?: string;
}

export function PieChart({
  namespace,
  data,
  xValueField,
  xLabelField,
  yValueField,
  yLabelField,
  fmt,
  yFmt,
}: PieChartProps) {
  const theme = useChartKitNamespace(namespace).theme;
  const { loading, error, rows } = useQuery(namespace, data);

  if (loading) {
    return <div className="ck-inline-status">Loading...</div>;
  }
  if (error) {
    return <div className="ck-inline-status">Error: {error}</div>;
  }

  const valueFmt = yFmt ?? fmt;
  const valueLabel = yLabelField ?? yValueField;
  const palette = theme.charts.palette;
  const buckets = new Map<string, number>();

  for (const row of rows) {
    const xValue = asString(row[xValueField]);
    const xLabelCandidate = xLabelField ? asString(row[xLabelField]) : "";
    const xLabel = xLabelCandidate || xValue;
    buckets.set(xLabel, (buckets.get(xLabel) ?? 0) + asNumber(row[yValueField]));
  }

  const dataRows = Array.from(buckets.entries()).sort((left, right) => right[1] - left[1]);

  const coloredRows = dataRows.map(([name, value], index) => ({
    name,
    value,
    itemStyle: { color: palette[index % palette.length] },
  }));

  const option = {
    animationDuration: 250,
    tooltip: {
      ...chartKitTooltipBase(theme),
      trigger: "item",
      formatter: (params: { marker: string; name: string; value: unknown; percent: number }) =>
        `${params.marker}${params.name}<br/>${valueLabel}: ${formatChartKitDisplayValue(params.value, valueFmt)} (${params.percent}%)`,
    },
    legend: {
      top: 0,
      left: "center",
      type: "scroll" as const,
      textStyle: { color: theme.colors.muted, fontFamily: theme.typography.fontFamily },
    },
    series: [
      {
        type: "pie",
        radius: ["40%", "72%"],
        center: ["50%", "58%"],
        data: coloredRows,
        label: {
          color: theme.colors.muted,
          formatter: (params: { name: string; value: unknown }) =>
            `${params.name}: ${formatChartKitDisplayValue(params.value, valueFmt)}`,
        },
        labelLine: {
          lineStyle: { color: theme.colors.borderStrong },
        },
      },
    ],
  };

  return (
    <div className="ck-chart-content" style={themeVars(theme)}>
      <ReactEChartsCore echarts={echarts} option={option} className="ck-chart-echart" />
    </div>
  );
}
