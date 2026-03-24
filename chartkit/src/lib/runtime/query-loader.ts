const inFlightSqlFetches = new Map<string, Promise<string>>();
const sqlTextCache = new Map<string, string>();

export async function loadQuerySql(src: string): Promise<string> {
  const cachedText = sqlTextCache.get(src);
  if (cachedText) {
    return cachedText;
  }

  const cached = inFlightSqlFetches.get(src);
  if (cached) {
    return cached;
  }

  const request = fetch(src, { cache: "no-store" }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Failed to fetch SQL "${src}": ${response.status}`);
    }
    const text = await response.text();
    sqlTextCache.set(src, text);
    return text;
  });

  inFlightSqlFetches.set(src, request);
  try {
    return await request;
  } finally {
    inFlightSqlFetches.delete(src);
  }
}
