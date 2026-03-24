import type { DataSourceDefinition } from "./runtime/definitions";

type DuckDbModule = typeof import("@duckdb/duckdb-wasm");
type AsyncDuckDB = import("@duckdb/duckdb-wasm").AsyncDuckDB;
type DuckDBBundles = import("@duckdb/duckdb-wasm").DuckDBBundles;

interface SelectedBundle {
  mainModule: string;
  mainWorker: string;
  pthreadWorker?: string;
}

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

export interface DuckDbRuntime {
  registerDataSources: (sources: DataSourceDefinition[]) => Promise<void>;
  ensureDataSourcesLoaded: (ids: string[]) => Promise<void>;
  query: (sql: string, queryId?: string) => Promise<Array<Record<string, unknown>>>;
  close: () => Promise<void>;
}

export interface DuckDbRuntimeOptions {
  bundleBaseUrl?: string;
}

const SAFE_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const QUERY_CACHE_TTL_MS = 30_000;

const bundlePromiseByKey = new Map<string, Promise<SelectedBundle>>();

function ensureIdentifier(id: string): string {
  if (!SAFE_IDENTIFIER.test(id)) {
    throw new Error(`Invalid identifier "${id}"`);
  }
  return id;
}

function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

function readRow(row: unknown): Record<string, unknown> {
  if (typeof row !== "object" || row === null) {
    return {};
  }
  return { ...(row as Record<string, unknown>) };
}

function normalizeHttpUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  const path = url.startsWith("/") ? url : `/${url}`;
  return new URL(path, window.location.origin).toString();
}

function toSelectedBundle(bundle: {
  mainModule: string;
  mainWorker: string | null;
  pthreadWorker?: string | null;
}): SelectedBundle {
  if (!bundle.mainWorker) {
    throw new Error("DuckDB bundle is missing worker URL");
  }
  return {
    mainModule: bundle.mainModule,
    mainWorker: bundle.mainWorker,
    pthreadWorker: bundle.pthreadWorker ?? undefined,
  };
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
}

async function loadDuckDbModule(): Promise<DuckDbModule> {
  return import("@duckdb/duckdb-wasm");
}

function normalizeBundleBaseUrl(baseUrl?: string): string | null {
  if (!baseUrl) {
    return null;
  }
  const trimmed = baseUrl.trim();
  if (!trimmed) {
    return null;
  }
  const normalized = trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }
  return new URL(
    normalized.startsWith("/") ? normalized : `/${normalized}`,
    window.location.origin,
  ).toString();
}

function resolveBundleUrl(baseUrl: string, fileName: string): string {
  return `${baseUrl}/${fileName}`;
}

function getDuckDbBundles(duckdb: DuckDbModule, baseUrl?: string): DuckDBBundles {
  const normalizedBaseUrl = normalizeBundleBaseUrl(baseUrl);
  if (!normalizedBaseUrl) {
    return duckdb.getJsDelivrBundles();
  }
  return {
    mvp: {
      mainModule: resolveBundleUrl(normalizedBaseUrl, "duckdb-mvp.wasm"),
      mainWorker: resolveBundleUrl(normalizedBaseUrl, "duckdb-browser-mvp.worker.js"),
    },
    eh: {
      mainModule: resolveBundleUrl(normalizedBaseUrl, "duckdb-eh.wasm"),
      mainWorker: resolveBundleUrl(normalizedBaseUrl, "duckdb-browser-eh.worker.js"),
    },
  };
}

async function selectBundleOnce(
  duckdb: DuckDbModule,
  bundles: DuckDBBundles,
  bundleCacheKey: string,
): Promise<SelectedBundle> {
  const existing = bundlePromiseByKey.get(bundleCacheKey);
  if (existing) {
    return existing;
  }

  const created = (async () => {
    try {
      const features = await duckdb.getPlatformFeatures();
      if (features.wasmExceptions && bundles.eh) {
        return toSelectedBundle(bundles.eh);
      }
      if (bundles.mvp) {
        return toSelectedBundle(bundles.mvp);
      }
    } catch {
      // Fall back to duckdb's built-in selector
    }
    const selected = await duckdb.selectBundle(bundles);
    return toSelectedBundle(selected);
  })();
  bundlePromiseByKey.set(bundleCacheKey, created);

  try {
    return await created;
  } catch (error) {
    bundlePromiseByKey.delete(bundleCacheKey);
    throw error;
  }
}

async function createDatabase(
  onTelemetry?: TelemetryFn,
  options?: DuckDbRuntimeOptions,
): Promise<{
  db: AsyncDuckDB;
  duckdb: DuckDbModule;
}> {
  const started = performance.now();
  const duckdb = await loadDuckDbModule();
  const bundles = getDuckDbBundles(duckdb, options?.bundleBaseUrl);
  const bundleCacheKey = JSON.stringify({
    bundleBaseUrl: normalizeBundleBaseUrl(options?.bundleBaseUrl),
  });
  const bundle = await selectBundleOnce(duckdb, bundles, bundleCacheKey);

  const workerUrl = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`], {
      type: "text/javascript",
    }),
  );
  const worker = new Worker(workerUrl);
  const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
  const db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  await db.open({
    filesystem: {
      // Keep HTTP parquet reads in range mode and do not fall back to full-file downloads.
      reliableHeadRequests: true,
      forceFullHTTPReads: false,
      allowFullHTTPReads: false,
    },
  });
  const bootstrapConnection = await db.connect();
  try {
    // Best-effort runtime hints to reduce repeated remote metadata/object fetches.
    await bootstrapConnection.query("SET enable_object_cache = true");
    await bootstrapConnection.query("SET enable_http_metadata_cache = true");
  } catch {
    // Older DuckDB builds may not expose one of these settings.
  } finally {
    await bootstrapConnection.close();
  }
  URL.revokeObjectURL(workerUrl);

  onTelemetry?.({ type: "wasm_init_ms", ms: performance.now() - started });
  return { db, duckdb };
}

async function registerDataSource(
  db: AsyncDuckDB,
  duckdb: DuckDbModule,
  source: DataSourceDefinition,
  onTelemetry?: TelemetryFn,
): Promise<void> {
  const viewName = ensureIdentifier(source.id);
  const started = performance.now();
  const connection = await db.connect();
  try {
    if (source.format === "csv") {
      const csvText = await fetchText(source.url);
      const virtualPath = `${viewName}.csv`;
      await db.registerFileText(virtualPath, csvText);
      await connection.query(
        `CREATE OR REPLACE VIEW ${viewName} AS SELECT * FROM read_csv_auto('${escapeSqlString(
          virtualPath,
        )}', HEADER=true, SAMPLE_SIZE=-1)`,
      );
    } else if (source.format === "parquet") {
      const virtualPath = `${viewName}.parquet`;
      const parquetUrl = normalizeHttpUrl(source.url);
      await db.registerFileURL(
        virtualPath,
        parquetUrl,
        duckdb.DuckDBDataProtocol.HTTP,
        false,
      );
      await connection.query(
        `CREATE OR REPLACE VIEW ${viewName} AS SELECT * FROM read_parquet('${escapeSqlString(
          virtualPath,
        )}')`,
      );
    }

    onTelemetry?.({
      type: "data_source_register_ms",
      dataSourceId: source.id,
      ms: performance.now() - started,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown data source registration error";
    onTelemetry?.({
      type: "data_source_register_error",
      dataSourceId: source.id,
      message,
    });
    throw error;
  } finally {
    await connection.close();
  }
}

export async function createDuckDbRuntime(
  dataSources: DataSourceDefinition[],
  onTelemetry?: TelemetryFn,
  options?: DuckDbRuntimeOptions,
): Promise<DuckDbRuntime> {
  const { db, duckdb } = await createDatabase(onTelemetry, options);

  const dataSourceById = new Map<string, DataSourceDefinition>();
  const loadedDataSources = new Set<string>();
  const sourceLoadsInFlight = new Map<string, Promise<void>>();

  const registerDataSources = async (sources: DataSourceDefinition[]): Promise<void> => {
    for (const source of sources) {
      const existing = dataSourceById.get(source.id);
      if (existing) {
        const existingSignature = JSON.stringify(existing);
        const incomingSignature = JSON.stringify(source);
        if (existingSignature !== incomingSignature) {
          throw new Error(
            `Conflicting data source definition for "${source.id}". ` +
              "Data sources with the same id must be identical.",
          );
        }
        continue;
      }
      dataSourceById.set(source.id, source);
    }

    const preloadIds = sources
      .filter((source) => source.loadStrategy === "preload")
      .map((source) => source.id);
    if (preloadIds.length > 0) {
      await ensureDataSourcesLoaded(preloadIds);
    }
  };

  const loadDataSourceById = async (dataSourceId: string): Promise<void> => {
    if (loadedDataSources.has(dataSourceId)) {
      return;
    }
    const source = dataSourceById.get(dataSourceId);
    if (!source) {
      throw new Error(`Unknown data source "${dataSourceId}"`);
    }
    const existing = sourceLoadsInFlight.get(dataSourceId);
    if (existing) {
      return existing;
    }
    const request = registerDataSource(db, duckdb, source, onTelemetry)
      .then(() => {
        loadedDataSources.add(dataSourceId);
      })
      .finally(() => {
        sourceLoadsInFlight.delete(dataSourceId);
      });
    sourceLoadsInFlight.set(dataSourceId, request);
    return request;
  };

  const ensureDataSourcesLoaded = async (ids: string[]): Promise<void> => {
    const uniqueIds = Array.from(new Set(ids));
    if (uniqueIds.length === 0) {
      return;
    }
    const started = performance.now();
    await Promise.all(uniqueIds.map((dataSourceId) => loadDataSourceById(dataSourceId)));
    onTelemetry?.({ type: "data_load_ms", ms: performance.now() - started });
  };

  await registerDataSources(dataSources);

  const inFlight = new Map<string, Promise<Array<Record<string, unknown>>>>();
  const resultCache = new Map<string, { expiresAt: number; rows: Array<Record<string, unknown>> }>();

  return {
    registerDataSources,
    ensureDataSourcesLoaded,
    async query(sql: string, queryId?: string) {
      const key = `${queryId ?? "anonymous"}::${sql}`;
      const now = Date.now();
      const cached = resultCache.get(key);
      if (cached && cached.expiresAt > now) {
        return cached.rows;
      }

      const existing = inFlight.get(key);
      if (existing) {
        return existing;
      }

      const request = (async () => {
        const started = performance.now();
        const connection = await db.connect();
        try {
          const table = await connection.query(sql);
          const rows = table.toArray().map((row) => readRow(row));
          onTelemetry?.({
            type: "query_ms",
            ms: performance.now() - started,
            queryId,
          });
          resultCache.set(key, {
            expiresAt: Date.now() + QUERY_CACHE_TTL_MS,
            rows,
          });
          return rows;
        } finally {
          await connection.close();
        }
      })();

      inFlight.set(key, request);
      try {
        return await request;
      } finally {
        inFlight.delete(key);
      }
    },
    async close() {
      await db.terminate();
    },
  };
}
