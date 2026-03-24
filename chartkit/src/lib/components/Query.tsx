import { useLayoutEffect, useRef } from "react";
import { registerQueryDefinition } from "../runtime/registry";
import { useChartKitConfigNamespace } from "./ChartKitConfig";

export interface QueryProps {
  id: string;
  src: string;
  dependsOn?: string[];
  excludeDependsOn?: string[];
}

export function Query({ id, src, dependsOn, excludeDependsOn }: QueryProps) {
  const namespace = useChartKitConfigNamespace("Query");
  const ownerRef = useRef<symbol | null>(null);
  if (!ownerRef.current) {
    ownerRef.current = Symbol(`query:${namespace}:${id}`);
  }

  const dependsOnKey = JSON.stringify(dependsOn ?? []);
  const excludeDependsOnKey = JSON.stringify(excludeDependsOn ?? []);

  useLayoutEffect(() => {
    return registerQueryDefinition(
      namespace,
      {
        id,
        src,
        dependsOn,
        excludeDependsOn,
      },
      ownerRef.current as symbol,
    );
  }, [dependsOnKey, excludeDependsOnKey, id, namespace, src]);

  return null;
}
