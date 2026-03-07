// lib/api-cache.ts — add these functions to your existing file
// Assumes you already have getFromCache() and setToCache() wired to your Neon `api_cache` table.

/**
 * Fetch from ScryDex API with Neon cache layer.
 * Results are cached for 24 hours to avoid hitting rate limits.
 *
 * @param endpoint  e.g. "products", "sets"
 * @param queryParams  raw query string without leading "?"
 */
export async function fetchScrydex(endpoint: string, queryParams: string = ''): Promise<any | null> {
  const url = `https://api.scrydex.com/pokemon/v1/${endpoint}?${queryParams}&casing=camel`;
  const cacheKey = `scrydex:${url}`;

  // 1. Try Neon cache first
  const cached = await getFromCache(cacheKey);
  if (cached) return cached;

  // 2. Hit the live API
  const res = await fetch(url, {
    headers: {
      'X-Api-Key': process.env.SCRYDEX_API_KEY || '',
      'Accept': 'application/json',
    },
    next: { revalidate: 0 }, // disable Next.js fetch cache — we manage caching ourselves
  });

  if (!res.ok) {
    console.error(`ScryDex ${endpoint} failed: ${res.status} ${res.statusText}`);
    return null;
  }

  const data = await res.json();

  // 3. Store in Neon for 24 hours
  await setToCache(cacheKey, data, 86400);

  return data;
}

// ─── Stub implementations (replace with your existing helpers) ────────────────
// If you already have getFromCache / setToCache in this file, remove these stubs.

async function getFromCache(key: string): Promise<any | null> {
  // TODO: query your `api_cache` table here, e.g.:
  // const row = await db.query('SELECT data FROM api_cache WHERE key=$1 AND expires_at > NOW()', [key]);
  // return row.rows[0]?.data ?? null;
  return null;
}

async function setToCache(key: string, data: any, ttlSeconds: number): Promise<void> {
  // TODO: upsert into your `api_cache` table here, e.g.:
  // await db.query(
  //   'INSERT INTO api_cache (key, data, expires_at) VALUES ($1, $2, NOW() + $3 * interval \'1 second\')
  //    ON CONFLICT (key) DO UPDATE SET data=$2, expires_at=NOW() + $3 * interval \'1 second\'',
  //   [key, JSON.stringify(data), ttlSeconds]
  // );
}
