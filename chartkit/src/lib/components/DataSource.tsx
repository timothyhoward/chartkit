import { useLayoutEffect, useRef } from "react";
import type { DataFormat, DataLoadStrategy } from "../runtime/definitions";
import { registerDataSourceDefinition } from "../runtime/registry";
import { useChartKitConfigNamespace } from "./ChartKitConfig";

export interface DataSourceProps {
  id: string;
  format: DataFormat;
  url: string;
  loadStrategy?: DataLoadStrategy;
  source?: string;
  refreshCadence?: "monthly";
}

export function DataSource({
  id,
  format,
  url,
  loadStrategy = "on_demand",
  source,
  refreshCadence,
}: DataSourceProps) {
  const namespace = useChartKitConfigNamespace("DataSource");
  const ownerRef = useRef<symbol | null>(null);
  if (!ownerRef.current) {
    ownerRef.current = Symbol(`data-source:${namespace}:${id}`);
  }

  useLayoutEffect(() => {
    return registerDataSourceDefinition(
      namespace,
      {
        id,
        format,
        url,
        loadStrategy,
        source,
        refreshCadence,
      },
      ownerRef.current as symbol,
    );
  }, [format, id, loadStrategy, namespace, refreshCadence, source, url]);

  return null;
}
