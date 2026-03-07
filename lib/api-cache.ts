// lib/api-cache.ts
import sql from './db';

interface CachedResponse {
  data: any;
  expires_at: Date;
}

// Cache TTL in seconds
const CACHE_TTL = {
  scryfall_card: 86400,      // 24 hours
  scryfall_search: 3600,     // 1 hour
  tcgdex_card: 86400,        // 24 hours
  tcgdex_search: 3600,       // 1 hour
  tcgdex_set: 86400,         // 24 hours
  scrydex_default: 3600      // 1 hour
};

// Initialize cache table
async function initCache() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS api_cache (
        cache_key VARCHAR(512) PRIMARY KEY,
        response_data JSONB NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_api_cache_expires ON api_cache(expires_at)`;
    console.log('[Cache] Initialized Neon cache table');
  } catch (e) {
    console.error('[Cache] Init error:', e);
  }
}

initCache();

export async function getFromCache(key: string): Promise<any | null> {
  try {
    const result = await sql`
      SELECT response_data 
      FROM api_cache 
      WHERE cache_key = ${key} AND expires_at > NOW()
    `;
    if (result.length > 0) {
      const data = result[0].response_data;
      return typeof data === 'string' ? JSON.parse(data) : data;
    }
    return null;
  } catch (e) {
    console.error('[Cache] Get error:', e);
    return null;
  }
}

export async function setToCache(key: string, data: any, ttlSeconds: number): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    await sql`
      INSERT INTO api_cache (cache_key, response_data, expires_at)
      VALUES (${key}, ${JSON.stringify(data)}, ${expiresAt})
      ON CONFLICT (cache_key) 
      DO UPDATE SET 
        response_data = EXCLUDED.response_data,
        expires_at = EXCLUDED.expires_at
    `;
  } catch (e) {
    console.error('[Cache] Set error:', e);
  }
}

export async function cleanExpiredCache(): Promise<number> {
  try {
    const result = await sql`DELETE FROM api_cache WHERE expires_at < NOW()`;
    return (result as any).count || 0;
  } catch (e) { return 0; }
}

export async function getCacheStats(): Promise<{ total: number; size: number }> {
  try {
    const result = await sql`
      SELECT COUNT(*) as total, COALESCE(SUM(LENGTH(response_data::text)), 0) as size
      FROM api_cache WHERE expires_at > NOW()
    `;
    return { total: Number(result[0]?.total || 0), size: Number(result[0]?.size || 0) };
  } catch (e) { return { total: 0, size: 0 }; }
}

/**
 * Robust Scrydex Fetcher
 * Includes Neon caching, X-Team-ID header, and casing normalization.
 */
export async function fetchScrydex(endpoint: string, queryParams: string = '', ttl: number = 3600): Promise<any | null> {
  // Normalize endpoint: ensure no double slashes and add casing
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  const separator = queryParams ? '&' : '';
  const url = `https://api.scrydex.com/pokemon/v1/${cleanEndpoint}?${queryParams}${separator}casing=camel`;
  const cacheKey = `scrydex:${url}`;

  // 1. Check Cache
  const cached = await getFromCache(cacheKey);
  if (cached) return cached;

  // 2. Fetch Fresh
  try {
    const res = await fetch(url, {
      headers: {
        'X-Api-Key': process.env.SCRYDEX_API_KEY || '',
        'X-Team-ID': process.env.SCRYDEX_TEAM_ID || 'hatakekb',
        'Accept': 'application/json',
      },
      next: { revalidate: 0 }
    });

    if (!res.ok) return null;
    const data = await res.json();
    
    // 3. Save to Neon
    await setToCache(cacheKey, data, ttl);
    return data;
  } catch (e) {
    console.error('[Scrydex Fetch Error]', e);
    return null;
  }
}

// Compatibility helpers for Scryfall/TCGdex
export async function fetchScryfallCached(url: string): Promise<any> {
  const cacheKey = `scryfall:${url}`;
  const cached = await getFromCache(cacheKey);
  if (cached) return cached;
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    const ttl = url.includes('/search') ? CACHE_TTL.scryfall_search : CACHE_TTL.scryfall_card;
    await setToCache(cacheKey, data, ttl);
    return data;
  } catch (e) { return null; }
}

export async function fetchTCGdexCached(url: string): Promise<any> {
  const cacheKey = `tcgdex:${url}`;
  const cached = await getFromCache(cacheKey);
  if (cached) return cached;
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    let ttl = CACHE_TTL.tcgdex_card;
    if (url.includes('/cards?') || url.includes('/search')) ttl = CACHE_TTL.tcgdex_search;
    await setToCache(cacheKey, data, ttl);
    return data;
  } catch (e) { return null; }
}

export async function fetchScrydexCached(url: string, headers: Record<string, string> = {}): Promise<any> {
    const cacheKey = `scrydex_raw:${url}`;
    const cached = await getFromCache(cacheKey);
    if (cached) return cached;
    try {
      const res = await fetch(url, { headers: { 'Accept': 'application/json', ...headers } });
      if (!res.ok) return null;
      const data = await res.json();
      await setToCache(cacheKey, data, 3600);
      return data;
    } catch (e) { return null; }
}