import { useSyncExternalStore } from "react";
import type {
  QueryDefinition,
  DataSourceDefinition,
  HostParams,
} from "./definitions";
import type { ChartKitThemeName } from "./theme";

export type ChartKitControlType = "button_group" | "dropdown";

export interface ChartKitControlOption {
  label: string;
  value: string;
}

export interface ChartKitControlDefinition {
  id: string;
  type: ChartKitControlType;
  label: string;
  title?: string;
  options: ChartKitControlOption[];
  defaultValue: string;
}

interface OwnedDefinition<T> {
  value: T;
  owners: Set<symbol>;
  signature: string;
}

interface ControlStateEntry {
  definition: OwnedDefinition<ChartKitControlDefinition>;
  value: string;
  dirty: boolean;
}

interface NamespaceConfig {
  namespace: string;
  params: HostParams;
  theme: ChartKitThemeName;
  bundleBaseUrl?: string;
}

interface NamespaceState {
  listeners: Set<() => void>;
  version: number;
  config: OwnedDefinition<NamespaceConfig> | null;
  queries: Map<string, OwnedDefinition<QueryDefinition>>;
  dataSources: Map<string, OwnedDefinition<DataSourceDefinition>>;
  controls: Map<string, ControlStateEntry>;
  cachedSnapshot: NamespaceSnapshot | null;
}

export interface NamespaceSnapshot {
  namespace: string;
  version: number;
  config: NamespaceConfig | null;
  queries: Map<string, QueryDefinition>;
  dataSources: Map<string, DataSourceDefinition>;
  controls: Map<
    string,
    {
      definition: ChartKitControlDefinition;
      value: string;
      dirty: boolean;
    }
  >;
}

const namespaces = new Map<string, NamespaceState>();

function ensureNamespace(namespace: string): NamespaceState {
  const trimmed = namespace.trim();
  if (!trimmed) {
    throw new Error("ChartKit namespace is required.");
  }
  const existing = namespaces.get(trimmed);
  if (existing) {
    return existing;
  }
  const created: NamespaceState = {
    listeners: new Set(),
    version: 0,
    config: null,
    queries: new Map(),
    dataSources: new Map(),
    controls: new Map(),
    cachedSnapshot: null,
  };
  namespaces.set(trimmed, created);
  return created;
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function emit(namespaceState: NamespaceState): void {
  namespaceState.version += 1;
  namespaceState.cachedSnapshot = null;
  for (const listener of namespaceState.listeners) {
    listener();
  }
}

function registerOwnedDefinition<T>(
  current: OwnedDefinition<T> | undefined | null,
  incoming: T,
  owner: symbol,
  errorPrefix: string,
): OwnedDefinition<T> {
  const signature = stableSerialize(incoming);
  if (!current) {
    return {
      value: incoming,
      owners: new Set([owner]),
      signature,
    };
  }
  if (current.signature !== signature) {
    throw new Error(`${errorPrefix} must be identical within the same namespace.`);
  }
  current.owners.add(owner);
  return current;
}

function unregisterOwnedDefinition<T>(
  current: OwnedDefinition<T> | undefined | null,
  owner: symbol,
): OwnedDefinition<T> | null {
  if (!current) {
    return null;
  }
  current.owners.delete(owner);
  return current.owners.size > 0 ? current : null;
}

export function registerNamespaceConfig(
  namespace: string,
  config: Omit<NamespaceConfig, "namespace">,
  owner: symbol,
): () => void {
  const state = ensureNamespace(namespace);
  const nextConfig: NamespaceConfig = {
    namespace,
    params: config.params,
    theme: config.theme,
    bundleBaseUrl: config.bundleBaseUrl,
  };
  state.config = registerOwnedDefinition(
    state.config,
    nextConfig,
    owner,
    `ChartKitConfig for namespace "${namespace}"`,
  );
  emit(state);
  return () => {
    const currentState = ensureNamespace(namespace);
    currentState.config = unregisterOwnedDefinition(currentState.config, owner);
    emit(currentState);
  };
}

export function registerQueryDefinition(
  namespace: string,
  query: QueryDefinition,
  owner: symbol,
): () => void {
  const state = ensureNamespace(namespace);
  const existing = state.queries.get(query.id);
  const next = registerOwnedDefinition(
    existing,
    query,
    owner,
    `Query "${query.id}" in namespace "${namespace}"`,
  );
  state.queries.set(query.id, next);
  emit(state);
  return () => {
    const currentState = ensureNamespace(namespace);
    const current = currentState.queries.get(query.id);
    const updated = unregisterOwnedDefinition(current, owner);
    if (updated) {
      currentState.queries.set(query.id, updated);
    } else {
      currentState.queries.delete(query.id);
    }
    emit(currentState);
  };
}

export function registerDataSourceDefinition(
  namespace: string,
  dataSource: DataSourceDefinition,
  owner: symbol,
): () => void {
  const state = ensureNamespace(namespace);
  const existing = state.dataSources.get(dataSource.id);
  const next = registerOwnedDefinition(
    existing,
    dataSource,
    owner,
    `Data source "${dataSource.id}" in namespace "${namespace}"`,
  );
  state.dataSources.set(dataSource.id, next);
  emit(state);
  return () => {
    const currentState = ensureNamespace(namespace);
    const current = currentState.dataSources.get(dataSource.id);
    const updated = unregisterOwnedDefinition(current, owner);
    if (updated) {
      currentState.dataSources.set(dataSource.id, updated);
    } else {
      currentState.dataSources.delete(dataSource.id);
    }
    emit(currentState);
  };
}

export function registerControlDefinition(
  namespace: string,
  control: ChartKitControlDefinition,
  owner: symbol,
): () => void {
  const state = ensureNamespace(namespace);
  const existing = state.controls.get(control.id);
  const nextDefinition = registerOwnedDefinition(
    existing?.definition,
    control,
    owner,
    `Control "${control.id}" in namespace "${namespace}"`,
  );
  if (existing) {
    existing.definition = nextDefinition;
  } else {
    state.controls.set(control.id, {
      definition: nextDefinition,
      value: control.defaultValue,
      dirty: false,
    });
  }
  emit(state);
  return () => {
    const currentState = ensureNamespace(namespace);
    const current = currentState.controls.get(control.id);
    if (!current) {
      return;
    }
    const updated = unregisterOwnedDefinition(current.definition, owner);
    if (!updated) {
      currentState.controls.delete(control.id);
    } else {
      current.definition = updated;
    }
    emit(currentState);
  };
}

export function setNamespaceControlValue(namespace: string, controlId: string, value: string): void {
  const state = ensureNamespace(namespace);
  const current = state.controls.get(controlId);
  if (!current) {
    throw new Error(
      `Control "${controlId}" is not registered in namespace "${namespace}".`,
    );
  }
  if (current.value === value && current.dirty) {
    return;
  }
  current.value = value;
  current.dirty = true;
  emit(state);
}

export function resetNamespaceControlValue(namespace: string, controlId: string): void {
  const state = ensureNamespace(namespace);
  const current = state.controls.get(controlId);
  if (!current) {
    return;
  }
  current.value = current.definition.value.defaultValue;
  current.dirty = false;
  emit(state);
}

export function getNamespaceSnapshot(namespace: string): NamespaceSnapshot {
  const state = ensureNamespace(namespace);
  if (state.cachedSnapshot) {
    return state.cachedSnapshot;
  }
  const snapshot: NamespaceSnapshot = {
    namespace,
    version: state.version,
    config: state.config?.value ?? null,
    queries: new Map(Array.from(state.queries, ([id, definition]) => [id, definition.value])),
    dataSources: new Map(
      Array.from(state.dataSources, ([id, definition]) => [id, definition.value]),
    ),
    controls: new Map(
      Array.from(state.controls, ([id, entry]) => [
        id,
        {
          definition: entry.definition.value,
          value: entry.value,
          dirty: entry.dirty,
        },
      ]),
    ),
  };
  state.cachedSnapshot = snapshot;
  return snapshot;
}

export function subscribeToNamespace(namespace: string, listener: () => void): () => void {
  const state = ensureNamespace(namespace);
  state.listeners.add(listener);
  return () => {
    state.listeners.delete(listener);
  };
}

export function useNamespaceSnapshot(namespace: string): NamespaceSnapshot {
  return useSyncExternalStore(
    (listener) => subscribeToNamespace(namespace, listener),
    () => getNamespaceSnapshot(namespace),
    () => getNamespaceSnapshot(namespace),
  );
}

export function resolveNamespaceParams(snapshot: NamespaceSnapshot): HostParams {
  const resolved: HostParams = { ...(snapshot.config?.params ?? {}) };
  for (const [controlId, control] of snapshot.controls) {
    if (control.dirty) {
      resolved[controlId] = control.value;
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(resolved, controlId)) {
      resolved[controlId] = control.definition.defaultValue;
    }
  }
  return resolved;
}
