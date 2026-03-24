import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { HostParams } from "../runtime/definitions";
import { registerNamespaceConfig } from "../runtime/registry";
import type { ChartKitThemeName } from "../runtime/theme";

interface ChartKitConfigContextValue {
  namespace: string;
}

const ChartKitConfigContext = createContext<ChartKitConfigContextValue | null>(null);

export interface ChartKitConfigProps {
  namespace: string;
  params?: HostParams;
  theme?: ChartKitThemeName;
  children?: ReactNode;
}

export function ChartKitConfig({
  namespace,
  params,
  theme = "chartkit",
  children,
}: ChartKitConfigProps) {
  const ownerRef = useRef<symbol>();
  if (!ownerRef.current) {
    ownerRef.current = Symbol(`chartkit-config:${namespace}`);
  }

  const paramsKey = useMemo(
    () =>
      JSON.stringify(
        Object.entries(params ?? {}).sort(([left], [right]) => left.localeCompare(right)),
      ),
    [params],
  );

  const normalizedParams = useMemo<HostParams>(() => {
    if (!params) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(params).sort(([left], [right]) => left.localeCompare(right)),
    );
  }, [paramsKey]);

  useLayoutEffect(() => {
    return registerNamespaceConfig(
      namespace,
      { params: normalizedParams, theme },
      ownerRef.current as symbol,
    );
  }, [namespace, paramsKey, normalizedParams, theme]);

  const value = useMemo(() => ({ namespace }), [namespace]);

  return (
    <ChartKitConfigContext.Provider value={value}>
      {children}
    </ChartKitConfigContext.Provider>
  );
}

export function useChartKitConfigNamespace(componentName: string): string {
  const value = useContext(ChartKitConfigContext);
  if (!value) {
    throw new Error(`${componentName} must be used inside ChartKitConfig.`);
  }
  return value.namespace;
}
