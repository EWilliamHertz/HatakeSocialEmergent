// lib/sealed-api.ts
import { fetchScrydex } from './api-cache';

export async function searchSealedProducts(
  query: string, 
  page: number = 1, 
  limit: number = 50, 
  setCode?: string
) {
  try {
    const params = new URLSearchParams();
    
    // FIX: Using plain text query string
    if (query.trim()) {
      params.append('q', query.trim());
    }
    
    if (setCode) {
      params.append('expansion.id', setCode.toLowerCase());
    }

    params.append('page', page.toString());
    params.append('pageSize', limit.toString());
    params.append('include', 'prices');

    // SEALED ENDPOINT IS GLOBAL: hit /sealed directly via cached fetcher
    // This removes the /en/ prefix that causes empty results
    const json = await fetchScrydex('sealed', params.toString(), 3600);
    
    if (!json) return { data: [], totalCount: 0 };

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
  // Global endpoint for single product
  const json = await fetchScrydex(`sealed/${id}`, 'include=prices');
  return json?.data || null;
}