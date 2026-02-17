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
    // Create index for cleanup
    await sql`CREATE INDEX IF NOT EXISTS idx_api_cache_expires ON api_cache(expires_at)`;
    console.log('[Cache] Initialized cache table');
  } catch (e) {
    console.error('[Cache] Init error:', e);
  }
}

// Initialize on module load
initCache();

// Get from cache
export async function getFromCache(key: string): Promise<any | null> {
  try {
    const result = await sql`
      SELECT response_data, expires_at 
      FROM api_cache 
      WHERE cache_key = ${key} AND expires_at > NOW()
    `;
    
    if (result.length > 0) {
      console.log('[Cache] HIT:', key);
      return typeof result[0].response_data === 'string' 
        ? JSON.parse(result[0].response_data) 
        : result[0].response_data;
    }
    
    console.log('[Cache] MISS:', key);
    return null;
  } catch (e) {
    console.error('[Cache] Get error:', e);
    return null;
  }
}

// Set to cache
export async function setToCache(key: string, data: any, ttlSeconds: number): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    
    await sql`
      INSERT INTO api_cache (cache_key, response_data, expires_at)
      VALUES (${key}, ${JSON.stringify(data)}, ${expiresAt})
      ON CONFLICT (cache_key) 
      DO UPDATE SET 
        response_data = ${JSON.stringify(data)},
        expires_at = ${expiresAt}
    `;
    
    console.log('[Cache] SET:', key);
  } catch (e) {
    console.error('[Cache] Set error:', e);
  }
}

// Clean expired entries (run periodically)
export async function cleanExpiredCache(): Promise<number> {
  try {
    const result = await sql`DELETE FROM api_cache WHERE expires_at < NOW()`;
    const count = result.count || 0;
    if (count > 0) {
      console.log('[Cache] Cleaned', count, 'expired entries');
    }
    return count;
  } catch (e) {
    console.error('[Cache] Clean error:', e);
    return 0;
  }
}

// Cached fetch helper for Scryfall
export async function fetchScryfallCached(url: string): Promise<any> {
  const cacheKey = `scryfall:${url}`;
  
  // Check cache first
  const cached = await getFromCache(cacheKey);
  if (cached) return cached;
  
  // Fetch from API
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'Accept': 'application/json' }
    });
    
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Scryfall error: ${res.status}`);
    }
    
    const data = await res.json();
    
    // Determine TTL based on URL
    const ttl = url.includes('/search') ? CACHE_TTL.scryfall_search : CACHE_TTL.scryfall_card;
    await setToCache(cacheKey, data, ttl);
    
    return data;
  } catch (e: any) {
    console.error('[Cache] Scryfall fetch error:', e.message);
    return null;
  }
}

// Cached fetch helper for TCGdex
export async function fetchTCGdexCached(url: string): Promise<any> {
  const cacheKey = `tcgdex:${url}`;
  
  // Check cache first
  const cached = await getFromCache(cacheKey);
  if (cached) return cached;
  
  // Fetch from API
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'Accept': 'application/json' }
    });
    
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`TCGdex error: ${res.status}`);
    }
    
    const data = await res.json();
    
    // Determine TTL based on URL
    let ttl = CACHE_TTL.tcgdex_card;
    if (url.includes('/cards?') || url.includes('/search')) {
      ttl = CACHE_TTL.tcgdex_search;
    } else if (url.includes('/sets/')) {
      ttl = CACHE_TTL.tcgdex_set;
    }
    
    await setToCache(cacheKey, data, ttl);
    
    return data;
  } catch (e: any) {
    console.error('[Cache] TCGdex fetch error:', e.message);
    return null;
  }
}

// Cache stats
export async function getCacheStats(): Promise<{ total: number; size: number }> {
  try {
    const result = await sql`
      SELECT 
        COUNT(*) as total,
        COALESCE(SUM(LENGTH(response_data::text)), 0) as size
      FROM api_cache 
      WHERE expires_at > NOW()
    `;
    return {
      total: Number(result[0]?.total || 0),
      size: Number(result[0]?.size || 0)
    };
  } catch (e) {
    return { total: 0, size: 0 };
  }
}
