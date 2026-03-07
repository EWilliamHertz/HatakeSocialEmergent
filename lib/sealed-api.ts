import { fetchScrydexCached } from './api-cache';

const SCRYDEX_BASE = 'https://api.scrydex.com/pokemon/v1';

export async function searchPokemonProducts(query: string) {
  // JustTCG/ScryDex uses the /products endpoint for sealed items
  const url = `${SCRYDEX_BASE}/products?q=${encodeURIComponent(query)}&include=prices&casing=camel`;
  const data = await fetchScrydexCached(url);
  
  return (data?.data || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    type: p.productType,
    setName: p.expansion?.name,
    setCode: p.expansion?.id,
    imageUrl: p.images?.find((i: any) => i.type === 'front')?.medium || p.images?.[0]?.url,
    price: p.variants?.[0]?.prices?.[0]?.market || 0
  }));
}