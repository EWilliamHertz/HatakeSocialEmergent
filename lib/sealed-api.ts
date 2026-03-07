// lib/sealed-api.ts
const SCRYDEX_API_KEY = process.env.SCRYDEX_API_KEY || '';
const SCRYDEX_TEAM_ID = process.env.SCRYDEX_TEAM_ID || '';
const SCRYDEX_BASE = 'https://api.scrydex.com/pokemon/v1';

export interface SealedProduct {
  id: string;
  name: string;
  type: string;
  images: {
    type: string;
    small: string;
    medium: string;
    large: string;
  }[];
  expansion: {
    id: string;
    name: string;
    series: string;
    language: string;
    language_code: string;
    release_date: string;
  };
  variants?: any[];
}

/**
 * Searches for sealed products across the whole database or a specific set.
 */
export async function searchSealedProducts(
  query: string,
  page: number = 1,
  limit: number = 50,
  setCode?: string
): Promise<{ data: SealedProduct[]; totalCount: number }> {
  if (!SCRYDEX_API_KEY || !SCRYDEX_TEAM_ID) {
    console.error('Sealed API: Missing Credentials');
    return { data: [], totalCount: 0 };
  }

  try {
    // IMPORTANT: Sealed endpoint is global. NO /en/ or /ja/ prefix.
    const url = new URL(`${SCRYDEX_BASE}/sealed`);
    
    const filters: string[] = [];
    if (query) {
      // Use wildcard search for partial names
      filters.push(`name:${query}*`);
    }
    if (setCode) {
      filters.push(`expansion.id:${setCode.toLowerCase()}`);
    }

    if (filters.length > 0) {
      url.searchParams.append('q', filters.join(' AND '));
    }

    url.searchParams.append('page', page.toString());
    url.searchParams.append('pageSize', limit.toString());
    url.searchParams.append('include', 'prices');
    url.searchParams.append('casing', 'camel');

    const res = await fetch(url.toString(), {
      headers: {
        'X-Api-Key': SCRYDEX_API_KEY,
        'X-Team-ID': SCRYDEX_TEAM_ID,
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('ScryDex Sealed API Error:', err);
      return { data: [], totalCount: 0 };
    }

    const json = await res.json();
    return {
      data: json.data || [],
      totalCount: json.totalCount || json.total || 0
    };
  } catch (error) {
    console.error('Sealed search fetch error:', error);
    return { data: [], totalCount: 0 };
  }
}

/**
 * Fetches a single sealed product by its ID.
 */
export async function getSealedProductById(id: string): Promise<SealedProduct | null> {
  if (!SCRYDEX_API_KEY || !SCRYDEX_TEAM_ID) return null;
  
  try {
    const res = await fetch(`${SCRYDEX_BASE}/sealed/${id}?include=prices&casing=camel`, {
      headers: {
        'X-Api-Key': SCRYDEX_API_KEY,
        'X-Team-ID': SCRYDEX_TEAM_ID,
      }
    });
    
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch (e) {
    return null;
  }
}