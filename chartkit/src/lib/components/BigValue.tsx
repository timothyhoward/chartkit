import { useQuery } from "../useQuery";
import { formatChartKitDisplayValue } from "../format";
import { chartKitTooltipBase } from "./chartTooltip";
import { echarts, ReactEChartsCore } from "./echartsCore";
import { InfoTooltip } from "./InfoTooltip";
import { themeVars } from "./themeVars";
import { useChartKitNamespace } from "./useChartKitNamespace";
import {
  asNumber,
  asString,
  getDeltaStatus,
  deltaSymbol,
  type DeltaStatus,
} from "./utils";

export interface BigValueProps {
  namespace: string;
  title?: string;
  data: string;
  value: string;
  fmt?: string;
  comparison?: string;
  comparisonFmt?: string;
  comparisonTitle?: string;
  comparisonDelta?: boolean;
  downIsGood?: boolean;
  neutralMin?: number;
  neutralMax?: number;
  sparkline?: string;
  sparklineData?: string;
  sparklineType?: "line" | "area" | "bar";
  description?: string;
  minWidth?: string;
  maxWidth?: string;
}

function classForStatus(status: DeltaStatus, downIsGood: boolean): string {
  if (status === "neutral") {
    return "ck-delta-neutral";
  }
  if (downIsGood) {
    return status === "positive" ? "ck-delta-negative" : "ck-delta-positive";
  }
  return status === "positive" ? "ck-delta-positive" : "ck-delta-negative";
}

export function BigValue({
  namespace,
  title,
  data,
  value,
  fmt,
  comparison,
  comparisonFmt,
  comparisonTitle,
  comparisonDelta = true,
  downIsGood = false,
  neutralMin = 0,
  neutralMax = 0,
  sparkline,
  sparklineData,
  sparklineType = "line",
  description,
  minWidth = "18%",
  maxWidth = "none",
}: BigValueProps) {
  const theme = useChartKitNamespace(namespace).theme;
  const valueQuery = useQuery(namespace, data);
  const trendQuery = useQuery(namespace, sparklineData ?? data);

  if (valueQuery.loading || trendQuery.loading) {
    return <article className="ck-bigvalue-card">Loading...</article>;
  }
  if (valueQuery.error || trendQuery.error) {
    return <article className="ck-bigvalue-card">Error: {valueQuery.error ?? trendQuery.error}</article>;
  }

  const row = valueQuery.rows[0] ?? {};
  const mainValue = row[value];
  const comparisonValueRaw = comparison ? row[comparison] : null;
  const comparisonValue = comparison ? asNumber(comparisonValueRaw) : null;
  const status =
    comparisonValue === null || !comparisonDelta
      ? "neutral"
      : getDeltaStatus(comparisonValue, neutralMin, neutralMax);
  const deltaClass = classForStatus(status, downIsGood);

  let sparklineOption: Record<string, unknown> | null = null;
  if (sparkline && trendQuery.rows.length > 0) {
    const points = trendQuery.rows
      .map((entry) => ({
        x: entry[sparkline],
        y: asNumber(entry[value]),
      }))
      .sort((a, b) => {
        const leftTime = new Date(asString(a.x)).getTime();
        const rightTime = new Date(asString(b.x)).getTime();
        if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) {
          return leftTime - rightTime;
        }
        return asString(a.x).localeCompare(asString(b.x), undefined, {
          numeric: true,
          sensitivity: "base",
        });
      });

    sparklineOption = {
      animation: false,
      grid: { left: 0, right: 0, top: 0, bottom: 0 },
      xAxis: {
        type: "category",
        data: points.map((point) => asString(point.x)),
        splitLine: { show: false },
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { show: false },
        boundaryGap: "2%",
      },
      yAxis: {
        type: "value",
        splitLine: { show: false },
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { show: false },
        boundaryGap: ["1%", "1%"],
      },
      series: [
        {
          type: sparklineType === "area" ? "line" : sparklineType,
          data: points.map((point) => point.y),
          smooth: false,
          showSymbol: false,
          symbolSize: 0,
          connectNulls: false,
          emphasis: { disabled: true },
          lineStyle: { width: 1, color: theme.bigValue.sparklineStroke },
          areaStyle:
            sparklineType === "area"
              ? { color: theme.bigValue.sparklineFill }
              : undefined,
          itemStyle: { color: theme.bigValue.sparklineStroke },
          barWidth: sparklineType === "bar" ? 3 : undefined,
        },
      ],
      tooltip: {
        ...chartKitTooltipBase(theme),
        trigger: "axis",
        axisPointer: { type: "line", lineStyle: { width: 0.5 } },
        formatter: (
          params:
            | {
                value?: unknown;
                axisValueLabel?: string;
                axisValue?: string;
              }
            | Array<{
                value?: unknown;
                axisValueLabel?: string;
                axisValue?: string;
              }>,
        ) => {
          const point = Array.isArray(params) ? params[0] : params;
          const xLabel = sparkline ?? "Value";
          const xValue = point?.axisValueLabel ?? point?.axisValue ?? "";
          const yLabel = title ?? value;
          const yValue = formatChartKitDisplayValue(point?.value, fmt);
          return `${xLabel}: ${xValue}<br/>${yLabel}: ${yValue}`;
        },
      },
    };
  }

  return (
    <article className="ck-bigvalue-card" style={{ ...themeVars(theme), minWidth, maxWidth }}>
      <p className="ck-bigvalue-title">
        {title ?? value}
        {description ? <InfoTooltip text={description} /> : null}
      </p>
      <div className="ck-bigvalue-main">
        <span className="ck-bigvalue-value">{formatChartKitDisplayValue(mainValue, fmt)}</span>
        {sparklineOption ? (
          <span className="ck-bigvalue-sparkline">
            <ReactEChartsCore
              echarts={echarts}
              option={sparklineOption}
              style={{ width: 50, height: 15 }}
              opts={{ renderer: "svg" }}
            />
          </span>
        ) : null}
      </div>
      {comparison ? (
        comparisonDelta ? (
          <p className={`ck-bigvalue-comparison ck-bigvalue-comparison-delta ${deltaClass}`}>
            <span className="ck-bigvalue-symbol">{deltaSymbol(status)}</span>
            <span>{formatChartKitDisplayValue(comparisonValueRaw, comparisonFmt ?? fmt)}</span>
            {comparisonTitle ? <span>{comparisonTitle}</span> : null}
          </p>
        ) : (
          <p className="ck-bigvalue-comparison ck-bigvalue-comparison-plain">
            <span>{formatChartKitDisplayValue(comparisonValueRaw, comparisonFmt ?? fmt)}</span>
            {comparisonTitle ? <span>{comparisonTitle}</span> : null}
          </p>
        )
      ) : null}
    </article>
  );
}
