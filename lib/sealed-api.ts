// lib/sealed-api.ts
const SCRYDEX_API_KEY = process.env.SCRYDEX_API_KEY || '';
const SCRYDEX_TEAM_ID = process.env.SCRYDEX_TEAM_ID || '';
const SCRYDEX_BASE = 'https://api.scrydex.com/pokemon/v1';

export async function searchSealedProducts(
  query: string, 
  page: number = 1, 
  limit: number = 50, 
  setCode?: string
) {
  if (!SCRYDEX_API_KEY || !SCRYDEX_TEAM_ID) return { data: [], totalCount: 0 };

  try {
    // FIX: Sealed products endpoint is global (no /en/ or /ja/)
    const url = new URL(`${SCRYDEX_BASE}/sealed`);
    
    // FIX: Use plain text query string
    if (query.trim()) {
      url.searchParams.append('q', query.trim());
    }
    
    if (setCode) {
      url.searchParams.append('expansion.id', setCode.toLowerCase());
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
      next: { revalidate: 3600 }
    });

    if (!res.ok) {
      console.error('Sealed API error:', await res.text());
      return { data: [], totalCount: 0 };
    }
    
    const json = await res.json();
    return {
      data: json.data || [],
      totalCount: json.totalCount || json.total || 0
    };
  } catch (error) {
    console.error('Sealed fetch exception:', error);
    return { data: [], totalCount: 0 };
  }
}

export async function getSealedProductById(id: string) {
  if (!SCRYDEX_API_KEY) return null;
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
  } catch (e) { return null; }
}