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
  language?: string;
  language_code?: string;
}

/**
 * Searches for sealed Pokémon products.
 * Part 3: Uses the language-agnostic /pokemon/v1/sealed endpoint (no /en/ or /ja/ prefix).
 */
export async function searchSealedProducts(
  query: string,
  page: number = 1,
  limit: number = 50,
  setCode?: string,
  forceLang?: string
): Promise<{ data: SealedProduct[]; totalCount: number }> {
  if (!SCRYDEX_API_KEY || !SCRYDEX_TEAM_ID) {
    console.error('Sealed API: Missing Credentials');
    return { data: [], totalCount: 0 };
  }

  try {
    // Part 3: No language prefix — use /pokemon/v1/sealed directly
    const url = new URL(`${SCRYDEX_BASE}/sealed`);

    const filters: string[] = [];

    if (query) {
      // Part 3: Lucene query with wildcard support for partial name matches
      // Include both name and translatedName to match any language variation
      const terms = query.split(/\s+/).filter(Boolean);
      if (terms.length > 0) {
        const termQuery = terms.map(t => `(name:${t}* OR translatedName:${t}*)`).join(' AND ');
        filters.push(`(${termQuery})`);
      }
    }

    // Part 3: Use expansion.id filter when a set code is provided
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

    // Part 3: Include both X-Api-Key and X-Team-ID headers
    const res = await fetch(url.toString(), {
      headers: {
        'X-Api-Key': SCRYDEX_API_KEY,
        'X-Team-ID': SCRYDEX_TEAM_ID,
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('ScryDex Sealed API Error:', err);
      return { data: [], totalCount: 0 };
    }

    const json = await res.json();
    const data: SealedProduct[] = json?.data || [];

    return {
      data,
      totalCount: json?.totalCount || json?.total || 0,
    };
  } catch (error) {
    console.error('Sealed search error:', error);
    return { data: [], totalCount: 0 };
  }
}

/**
 * Fetches a single sealed product by its ID.
 * Part 3: Uses the language-agnostic /pokemon/v1/sealed/{id} endpoint.
 */
export async function getSealedProductById(id: string): Promise<SealedProduct | null> {
  if (!SCRYDEX_API_KEY || !SCRYDEX_TEAM_ID) return null;

  try {
    // Part 3: No language prefix for sealed endpoint
    const res = await fetch(`${SCRYDEX_BASE}/sealed/${id}?include=prices&casing=camel`, {
      headers: {
        'X-Api-Key': SCRYDEX_API_KEY,
        'X-Team-ID': SCRYDEX_TEAM_ID,
      },
    });

    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch (e) {
    return null;
  }
}
