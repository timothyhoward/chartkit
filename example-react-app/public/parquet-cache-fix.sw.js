/**
 * Service worker that adds Cache-Control: no-cache to .parquet requests on Windows.
 *
 * Root cause: on Windows + Chromium, the browser can return a stale cached response
 * to a DuckDB WASM HTTP range request. The cached bytes don't align with the requested
 * range, so DuckDB's Thrift-based parquet reader receives misaligned data and throws
 * TProtocolException: Invalid data.
 *
 * Fix: force revalidation of .parquet requests on Windows so the cache is never stale.
 * Range requests still work — they just bypass the stale cache entry.
 *
 * See: https://github.com/duckdb/duckdb-wasm/issues/1658
 *      https://github.com/evidence-dev/evidence/pull/2327
 */

self.addEventListener("fetch", (event) => {
  if (!event.request.url.endsWith(".parquet")) return;

  const userAgent = event.request.headers.get("User-Agent") ?? "";
  if (!userAgent.includes("Windows")) return;

  const headers = new Headers(event.request.headers);
  headers.set("Cache-Control", "no-cache");

  event.respondWith(
    fetch(
      new Request(event.request.url, {
        headers,
        method: event.request.method,
        mode: event.request.mode,
        credentials: event.request.credentials,
        redirect: event.request.redirect,
      }),
    ),
  );
});
