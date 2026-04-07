import { useQuery } from "../useQuery";
import { formatChartKitDisplayValue } from "../format";
import { chartKitTooltipBase } from "./chartTooltip";
import { echarts, ReactEChartsCore } from "./echartsCore";
import { themeVars } from "./themeVars";
import { useChartKitNamespace } from "./useChartKitNamespace";
import { useChartSeries } from "./useChartSeries";

export interface LineChartProps {
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
  fmt?: string;
  yFmt?: string;
}

export function LineChart({
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
  fmt,
  yFmt,
}: LineChartProps) {
  const theme = useChartKitNamespace(namespace).theme;
  const { loading, error, rows } = useQuery(namespace, data);
  const { xLabels, rankedSeries } = useChartSeries({
    rows,
    xValueField,
    xLabelField,
    yValueField,
    yLabelField,
    yAxisTitle,
    seriesValueField,
    seriesLabelField,
  });

  if (loading) {
    return <div className="ck-inline-status">Loading...</div>;
  }
  if (error) {
    return <div className="ck-inline-status">Error: {error}</div>;
  }
  const shouldRotate = xLabels.length > 10 || xLabels.some((label) => label.length > 11);
  const valueFmt = yFmt ?? fmt;
  const palette = theme.charts.palette;

  const series = rankedSeries.map(({ seriesName, values }, index) => {
    const color = palette[index % palette.length];

    return {
      name: seriesName,
      type: "line",
      smooth: true,
      symbol: "circle",
      symbolSize: 5,
      itemStyle: {
        color,
      },
      lineStyle: {
        width: 2.2,
        color,
      },
      areaStyle: !seriesValueField && index === 0 ? { opacity: 0.05 } : undefined,
      data: values,
    };
  });

  const option = {
    animationDuration: 250,
    tooltip: {
      ...chartKitTooltipBase(theme),
      trigger: "axis",
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
      boundaryGap: false,
      axisLine: { lineStyle: { color: theme.colors.borderStrong } },
      axisTick: { lineStyle: { color: theme.colors.borderStrong } },
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
