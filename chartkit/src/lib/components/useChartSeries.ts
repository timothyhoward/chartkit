import { useMemo } from "react";
import { asNumber, asString } from "./utils";

export interface ChartSeriesEntry {
  seriesKey: string;
  seriesName: string;
  values: number[];
  total: number;
}

export interface ChartSeriesResult {
  xKeys: string[];
  xLabels: string[];
  rankedSeries: ChartSeriesEntry[];
}

interface ChartSeriesOptions {
  rows: Array<Record<string, unknown>>;
  xValueField: string;
  xLabelField?: string;
  yValueField: string;
  yLabelField?: string;
  yAxisTitle?: string;
  seriesValueField?: string;
  seriesLabelField?: string;
}

function pivotRows(options: ChartSeriesOptions): ChartSeriesResult {
  const {
    rows,
    xValueField,
    xLabelField,
    yValueField,
    yLabelField,
    yAxisTitle,
    seriesValueField,
    seriesLabelField,
  } = options;

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

  return { xKeys, xLabels, rankedSeries };
}

export function useChartSeries(options: ChartSeriesOptions): ChartSeriesResult {
  return useMemo(() => pivotRows(options), [
    options.rows,
    options.xValueField,
    options.xLabelField,
    options.yValueField,
    options.yLabelField,
    options.yAxisTitle,
    options.seriesValueField,
    options.seriesLabelField,
  ]);
}
