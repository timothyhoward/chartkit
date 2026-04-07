import {
  createDuckDbRuntime,
  type DuckDbRuntime,
  type DuckDbRuntimeOptions,
} from "../duckdb";
import type { DataSourceDefinition } from "./definitions";

type TelemetryFn = (event: {
  type:
    | "wasm_init_ms"
    | "data_load_ms"
    | "query_ms"
    | "data_source_register_ms"
    | "data_source_register_error";
  ms?: number;
  queryId?: string;
  dataSourceId?: string;
  message?: string;
}) => void;

const runtimeByKey = new Map<string, Promise<DuckDbRuntime>>();

function runtimeKeyFromDataSources(
  _dataSources: DataSourceDefinition[],
  options?: DuckDbRuntimeOptions,
): string {
  return JSON.stringify(
    {
      bundleBaseUrl: options?.bundleBaseUrl ?? null,
    },
  );
}

export async function getSharedRuntime(
  dataSources: DataSourceDefinition[],
  onTelemetry?: TelemetryFn,
  options?: DuckDbRuntimeOptions,
): Promise<DuckDbRuntime> {
  const key = runtimeKeyFromDataSources(dataSources, options);
  const existing = runtimeByKey.get(key);
  if (existing) {
    const runtime = await existing;
    await runtime.registerDataSources(dataSources);
    return runtime;
  }

  // createDuckDbRuntime already calls registerDataSources with the initial
  // dataSources array, so we skip the redundant second call for new runtimes.
  const runtimePromise = createDuckDbRuntime(dataSources, onTelemetry, options).catch((error) => {
    runtimeByKey.delete(key);
    throw error;
  });
  runtimeByKey.set(key, runtimePromise);
  return runtimePromise;
}
