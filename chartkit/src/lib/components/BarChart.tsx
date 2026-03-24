import { useQuery } from "../useQuery";
import { formatChartKitDisplayValue } from "../format";
import { asNumber, asString } from "./utils";
import { chartKitTooltipBase } from "./chartTooltip";
import { echarts, ReactEChartsCore } from "./echartsCore";
import { themeVars } from "./themeVars";
import { useChartKitNamespace } from "./useChartKitNamespace";

export interface BarChartProps {
  namespace: string;
  data: string;
  xValueField: string;
  xLabelField?: string;
  yValueField: string;
  yLabelField?: string;
  seriesValueField?: string;
  seriesLabelField?: string;
  xAxisTitle?: string;
  yAxisTitle?: string;
  type?: "stacked" | "grouped";
  fmt?: string;
  yFmt?: string;
}

export function BarChart({
  namespace,
  data,
  xValueField,
  xLabelField,
  yValueField,
  yLabelField,
  seriesValueField,
  seriesLabelField,
  xAxisTitle,
  yAxisTitle,
  type = "stacked",
  fmt,
  yFmt,
}: BarChartProps) {
  const theme = useChartKitNamespace(namespace).theme;
  const { loading, error, rows } = useQuery(namespace, data);

  if (loading) {
    return <div className="ck-inline-status">Loading...</div>;
  }
  if (error) {
    return <div className="ck-inline-status">Error: {error}</div>;
  }

  const xValues = new Map<string, string>();
  const seriesLabels = new Map<string, string>();
  const matrix = new Map<string, Map<string, number>>();

  for (const row of rows) {
    const xValue = asString(row[xValueField]);
    const xLabelCandidate = xLabelField ? asString(row[xLabelField]) : "";
    const xLabel = xLabelCandidate || xValue;
    if (!xValues.has(xValue)) {
      xValues.set(xValue, xLabel);
    }

    const seriesValue = seriesValueField ? asString(row[seriesValueField]) : "__single";
    const seriesLabelCandidate = seriesLabelField ? asString(row[seriesLabelField]) : "";
    const fallbackSeriesLabel = yAxisTitle ?? yLabelField ?? "Value";
    const seriesLabel = seriesValueField
      ? seriesLabelCandidate || seriesValue
      : fallbackSeriesLabel;
    if (!seriesLabels.has(seriesValue)) {
      seriesLabels.set(seriesValue, seriesLabel);
    }

    const yValue = asNumber(row[yValueField]);
    const currentSeries = matrix.get(seriesValue) ?? new Map<string, number>();
    currentSeries.set(xValue, (currentSeries.get(xValue) ?? 0) + yValue);
    matrix.set(seriesValue, currentSeries);
  }

  const xKeys = Array.from(xValues.keys());
  const xLabels = xKeys.map((key) => xValues.get(key) ?? key);
  const shouldRotate = xLabels.length > 8 || xLabels.some((label) => label.length > 10);
  const valueFmt = yFmt ?? fmt;
  const palette = theme.charts.palette;

  const rankedSeries = Array.from(seriesLabels.entries())
    .map(([seriesKey, seriesName]) => ({
      seriesKey,
      seriesName,
      values: xKeys.map((xKey) => matrix.get(seriesKey)?.get(xKey) ?? 0),
    }))
    .map((entry) => ({
      ...entry,
      total: entry.values.reduce((sum, value) => sum + value, 0),
    }))
    .sort((left, right) => right.total - left.total || left.seriesName.localeCompare(right.seriesName));

  const series = rankedSeries.map(({ seriesName, values }, index) => ({
    name: seriesName,
    type: "bar",
    stack: type === "stacked" ? "total" : undefined,
    emphasis: { focus: "series" as const },
    itemStyle: {
      color: palette[index % palette.length],
    },
    data: values,
  }));

  const option = {
    animationDuration: 250,
    tooltip: {
      ...chartKitTooltipBase(theme),
      trigger: "axis",
      axisPointer: { type: "shadow" as const },
      order: "valueDesc" as const,
      formatter: (
        params: Array<{
          marker: string;
          seriesName: string;
          value: unknown;
          axisValueLabel?: string;
          axisValue?: string;
        }>,
      ) => {
        const xValue = params[0]?.axisValueLabel ?? params[0]?.axisValue ?? "";
        const xAxisLabel = xAxisTitle ?? xLabelField ?? xValueField;
        const lines = [`${xAxisLabel}: ${xValue}`];
        for (const item of params) {
          lines.push(
            `${item.marker}${item.seriesName}: ${formatChartKitDisplayValue(item.value, valueFmt)}`,
          );
        }
        return lines.join("<br/>");
      },
    },
    legend: seriesValueField ? { top: 6, type: "scroll" as const } : undefined,
    grid: {
      left: 14,
      right: 14,
      top: seriesValueField ? 44 : 20,
      bottom: 56,
      containLabel: true,
    },
    xAxis: {
      type: "category" as const,
      data: xLabels,
      axisLine: { lineStyle: { color: theme.colors.borderStrong } },
      axisTick: { lineStyle: { color: theme.colors.borderStrong } },
      splitLine: { show: false },
      name: xAxisTitle,
      nameLocation: "middle" as const,
      nameGap: 36,
      axisLabel: {
        color: theme.colors.muted,
        rotate: shouldRotate ? 35 : 0,
        formatter: (value: string) => (value.length > 18 ? `${value.slice(0, 18)}...` : value),
      },
      nameTextStyle: {
        color: theme.colors.muted,
        fontFamily: theme.typography.fontFamily,
      },
    },
    yAxis: {
      type: "value" as const,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: theme.colors.border } },
      name: yAxisTitle,
      nameLocation: "middle" as const,
      nameGap: 52,
      axisLabel: {
        color: theme.colors.muted,
        formatter: (value: number) => formatChartKitDisplayValue(value, valueFmt),
      },
      nameTextStyle: {
        color: theme.colors.muted,
        fontFamily: theme.typography.fontFamily,
      },
    },
    series,
  };

  return (
    <div className="ck-chart-content" style={themeVars(theme)}>
      <ReactEChartsCore echarts={echarts} option={option} className="ck-chart-echart" />
    </div>
  );
}
