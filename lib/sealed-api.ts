// lib/sealed-api.ts
const SCRYDEX_API_KEY = process.env.SCRYDEX_API_KEY || '';
const SCRYDEX_TEAM_ID = process.env.SCRYDEX_TEAM_ID || '';
const SCRYDEX_BASE = 'https://api.scrydex.com/pokemon/v1';

export async function searchSealedProducts(query: string, page: number = 1, limit: number = 50, setCode?: string) {
  if (!SCRYDEX_API_KEY || !SCRYDEX_TEAM_ID) return { data: [], totalCount: 0 };

  try {
    // CORRECT ENDPOINT: No /en/ or /ja/ prefix for sealed!
    const url = new URL(`${SCRYDEX_BASE}/sealed`);
    
    const filters: string[] = [];
    if (query) filters.push(`name:${query}*`);
    if (setCode) filters.push(`expansion.id:${setCode.toLowerCase()}`);
    
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
      next: { revalidate: 3600 }
    });

    if (!res.ok) return { data: [], totalCount: 0 };
    
    const json = await res.json();
    return {
      data: json.data || [],
      totalCount: json.totalCount || 0
    };
  } catch (error) {
    console.error('Sealed search error:', error);
    return { data: [], totalCount: 0 };
  }
}