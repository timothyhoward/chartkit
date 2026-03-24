import { useMemo } from "react";
import { useNamespaceSnapshot } from "../runtime/registry";
import { resolveChartKitTheme } from "../runtime/theme";

export function useChartKitNamespace(namespace: string) {
  const snapshot = useNamespaceSnapshot(namespace);
  const theme = useMemo(
    () => resolveChartKitTheme(snapshot.config?.theme),
    [snapshot.config?.theme],
  );
  return {
    snapshot,
    theme,
  };
}
