import { expect, test } from "playwright/test";

test("loads only required datasource assets on initial render", async ({ page }) => {
  const requestedAssets = new Set<string>();
  const parquetRequests: Array<{
    path: string;
    method: string;
    range?: string;
  }> = [];
  const parquetResponses: Array<{
    path: string;
    method: string;
    status: number;
  }> = [];

  page.on("request", async (request) => {
    const url = request.url();
    const path = new URL(url).pathname;
    if (url.includes(".parquet") || url.includes(".csv")) {
      requestedAssets.add(path);
    }
    if (url.includes(".parquet")) {
      const headers = await request.allHeaders();
      parquetRequests.push({
        path,
        method: request.method(),
        range: headers["range"],
      });
    }
  });

  page.on("response", (response) => {
    const url = response.url();
    if (url.includes(".parquet")) {
      const request = response.request();
      const path = new URL(url).pathname;
      parquetResponses.push({
        path,
        method: request.method(),
        status: response.status(),
      });
    }
  });

  await page.goto("/");
  await page.locator(".ck-chart-echart").first().waitFor({ state: "visible", timeout: 20000 });
  await page.waitForTimeout(1500);

  expect(requestedAssets.has("/data/m_exports_g.parquet")).toBeTruthy();

  // Removed HS6 lookup datasource should never be fetched.
  expect(requestedAssets.has("/data/m_exports_g_sg_hs6.parquet")).toBeFalsy();

  // Dashboard parquet reads should not perform plain full-file GETs.
  const parquetGetRequests = parquetRequests.filter(
    (event) => event.path === "/data/m_exports_g.parquet" && event.method === "GET" && event.range !== undefined,
  );
  expect(parquetGetRequests.length).toBeGreaterThan(0);

  const hasPlainFullGet = parquetRequests.some(
    (event) => event.path === "/data/m_exports_g.parquet" && event.method === "GET" && event.range === undefined,
  );
  expect(hasPlainFullGet).toBeFalsy();

  const hasGet200 = parquetResponses.some(
    (event) => event.path === "/data/m_exports_g.parquet" && event.method === "GET" && event.status === 200,
  );
  expect(hasGet200).toBeFalsy();
});

test("supports byte-range requests for parquet endpoint", async ({ request }) => {
  const response = await request.get("/data/m_exports_g.parquet", {
    headers: {
      Range: "bytes=0-1023",
    },
  });

  expect(response.status()).toBe(206);
  const headers = response.headers();
  expect(headers["accept-ranges"]?.toLowerCase()).toBe("bytes");
  expect(headers["content-range"]).toMatch(/^bytes 0-1023\/\d+$/);
});
