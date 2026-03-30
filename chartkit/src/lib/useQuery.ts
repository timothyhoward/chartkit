import { useEffect, useMemo, useState } from "react";
import { getSharedRuntime } from "./runtime/db-manager";
import {
  getNamespaceSnapshot,
  resolveNamespaceParams,
  useNamespaceSnapshot,
} from "./runtime/registry";
import { loadQuerySql } from "./runtime/query-loader";
import {
  hashSqlTemplate,
  resolveQueryDataSourceDependencies,
} from "./runtime/query-dependencies";

export interface QueryState {
  loading: boolean;
  error: string | null;
  rows: Array<Record<string, unknown>>;
}

function hasOwnValue(target: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(target, key);
}

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "NULL";
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "NULL";
  }
  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

function compileSql(sql: string, params: Record<string, unknown>): string {
  return sql.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key: string) => {
    if (hasOwnValue(params, key)) {
      return sqlLiteral(params[key]);
    }
    return "NULL";
  });
}

function isMissingTableError(error: unknown): boolean {
  return error instanceof Error && /table with name .* does not exist/i.test(error.message);
}

const queryDependencyCache = new Map<string, string[]>();

async function runNamespacedQuery(
  namespace: string,
  queryId: string,
): Promise<Array<Record<string, unknown>>> {
  const snapshot = getNamespaceSnapshot(namespace);
  const queryDefinition = snapshot.queries.get(queryId);
  if (!snapshot.config) {
    throw new Error(`ChartKitConfig for namespace "${namespace}" is not registered.`);
  }
  if (!queryDefinition) {
    throw new Error(`Query "${queryId}" is not registered in namespace "${namespace}".`);
  }

  const sqlTemplate = await loadQuerySql(queryDefinition.src);
  const dataSources = Array.from(snapshot.dataSources.values());
  const dependencyCacheKey = `${namespace}:${queryId}:${hashSqlTemplate(sqlTemplate)}`;
  let dataSourceDependencies = queryDependencyCache.get(dependencyCacheKey);
  if (!dataSourceDependencies) {
    dataSourceDependencies = resolveQueryDataSourceDependencies(
      queryDefinition,
      sqlTemplate,
      dataSources,
    );
    queryDependencyCache.set(dependencyCacheKey, dataSourceDependencies);
  }

  const runtime = await getSharedRuntime(
    dataSources,
    undefined,
    snapshot.config.bundleBaseUrl ? { bundleBaseUrl: snapshot.config.bundleBaseUrl } : undefined,
  );
  await runtime.registerDataSources(dataSources);
  await runtime.ensureDataSourcesLoaded(dataSourceDependencies);

  const resolvedParams = resolveNamespaceParams(snapshot);
  const sql = compileSql(sqlTemplate, resolvedParams);
  try {
    return await runtime.query(sql, `${namespace}:${queryId}`);
  } catch (error) {
    if (isMissingTableError(error)) {
      throw new Error(
        `Query "${queryId}" in namespace "${namespace}" references a table that is not loaded. ` +
          `Add Query dependsOn/excludeDependsOn for this query. Original error: ${
            error instanceof Error ? error.message : String(error)
          }`,
      );
    }
    throw error;
  }
}

export function useQuery(namespace: string, queryId: string): QueryState {
  const snapshot = useNamespaceSnapshot(namespace);
  const [state, setState] = useState<QueryState>({
    loading: true,
    error: null,
    rows: [],
  });
  const queryInputsKey = useMemo(() => {
    return JSON.stringify({
      version: snapshot.version,
      params: snapshot.config?.params ?? {},
      controls: Array.from(snapshot.controls, ([id, control]) => [
        id,
        control.value,
        control.dirty,
      ]),
    });
  }, [snapshot]);
  useEffect(() => {
    let cancelled = false;

    if (!snapshot.config) {
      setState((current) => ({ ...current, loading: true, error: null }));
      return () => {
        cancelled = true;
      };
    }

    if (!snapshot.queries.has(queryId)) {
      setState({
        loading: false,
        error: `Query "${queryId}" is not registered in namespace "${namespace}".`,
        rows: [],
      });
      return () => {
        cancelled = true;
      };
    }

    setState((current) => ({ ...current, loading: true, error: null }));
    runNamespacedQuery(namespace, queryId)
      .then((rows) => {
        if (!cancelled) {
          setState({ loading: false, error: null, rows });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            loading: false,
            error: error instanceof Error ? error.message : "Query failed",
            rows: [],
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [namespace, queryId, queryInputsKey, snapshot.config, snapshot.queries]);

  return state;
}
