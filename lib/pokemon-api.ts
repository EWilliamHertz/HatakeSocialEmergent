// lib/pokemon-api.ts
// Pokemon TCG API using ScryDex exclusively (fast, pricing included)
// Uses language-specific endpoints for robust results

const SCRYDEX_API_KEY = process.env.SCRYDEX_API_KEY || '';
const SCRYDEX_TEAM_ID = process.env.SCRYDEX_TEAM_ID || '';
const SCRYDEX_BASE = 'https://api.scrydex.com/pokemon/v1';

export interface PokemonCard {
  id: string;
  name: string;
  supertype?: string;
  subtypes?: string[];
  hp?: string;
  types?: string[];
  attacks?: any[];
  weaknesses?: any[];
  resistances?: any[];
  retreatCost?: string[];
  convertedRetreatCost?: number;
  set: {
    id: string;
    name: string;
    series?: string;
    printedTotal?: number;
    total?: number;
    releaseDate?: string;
  };
  number: string;
  images: { 
    small: string; 
    large: string; 
  };
  lang?: string;
  language_code?: string;
  prices?: any;
  pricing?: any;
  translation?: any;
}

export interface PokemonSet {
  id: string;
  name: string;
  series?: string;
  releaseDate?: string;
  total?: number;
  printedTotal?: number;
  logo?: string;
  symbol?: string;
}

/**
 * Detects if a string contains Japanese characters.
 */
function isJapanese(text: string): boolean {
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uff00-\uffef]/.test(text);
}

/**
 * Extract the best price from ScryDex variants.
 */
function extractPrice(variants: any[]): number | null {
  if (!Array.isArray(variants)) return null;
  for (const variant of variants) {
    const prices = Array.isArray(variant.prices) ? variant.prices : Object.values(variant.prices || {});
    for (const p of prices as any[]) {
      const rawVal = p?.market ?? p?.mid ?? p?.low ?? p?.price ?? null;
      if (rawVal != null) return parseFloat(String(rawVal));
    }
  }
  return null;
}

/**
 * Maps Scrydex API response to the app's internal PokemonCard format.
 * Intercepts Japanese Yen and converts to USD for consistent frontend processing.
 */
function mapScrydexCard(card: any): PokemonCard {
  const images = Array.isArray(card.images) ? card.images : [];
  const frontImage = images.find((i: any) => i.type === 'front') ?? images[0];
  let price = extractPrice(card.variants ?? []);
  const langId = card.language?.id?.toLowerCase() || card.language_code?.toLowerCase() || '';

  // FIX: Convert Yen (JPY) to USD for Japanese cards (1 JPY ≈ 0.0067 USD)
  // This allows the frontend's price * 0.92 logic to show correct Euros.
  if (price !== null && (langId === 'ja' || langId === 'jp')) {
    price = parseFloat((price * 0.0067).toFixed(2));
  }

  return {
    id: card.id,
    name: card.name,
    supertype: card.supertype,
    subtypes: card.subtypes || [],
    hp: card.hp,
    types: card.types || [],
    attacks: card.attacks || [],
    weaknesses: card.weaknesses || [],
    resistances: card.resistances || [],
    retreatCost: card.retreat_cost || [],
    convertedRetreatCost: card.converted_retreat_cost,
    set: {
      id: card.set?.id || card.expansion?.id || '',
      name: card.set?.name || card.expansion?.name || '',
      series: card.set?.series || card.expansion?.series || '',
      printedTotal: card.set?.printedTotal || card.expansion?.printed_total,
      total: card.set?.total || card.expansion?.total,
      releaseDate: card.set?.releaseDate || card.expansion?.release_date,
    },
    number: card.number || '',
    images: {
      small: frontImage?.small || '',
      large: frontImage?.large || frontImage?.medium || '',
    },
    lang: langId,
    language_code: langId.toUpperCase(),
    translation: card.translation,
    pricing: price ? { usd: price } : null,
    prices: price ? { usd: price } : null,
  };
}

/**
 * Core search function. Hits both English and Japanese Scrydex endpoints 
 * in parallel when "all" is selected or Japanese is detected.
 */
export async function searchPokemonCards(
  query: string,
  page: number = 1,
  limit: number = 50,
  setCode?: string,
  cardNumber?: string,
  forceLang?: string
): Promise<{ data: PokemonCard[]; totalCount: number }> {
  if (!SCRYDEX_API_KEY || !SCRYDEX_TEAM_ID) {
    console.error('Scrydex credentials missing');
    return { data: [], totalCount: 0 };
  }

  try {
    const normalisedLang = forceLang && forceLang !== 'all' ? forceLang.toLowerCase() : 'all';
    const queryIsJapanese = isJapanese(query);
    const wantsJapanese = normalisedLang === 'all' || normalisedLang.includes('ja') || normalisedLang.includes('jp') || queryIsJapanese;
    const wantsEnglish  = normalisedLang === 'all' || normalisedLang.includes('en') || (!wantsJapanese);

    // Build filters using Scrydex-standard fields (set.id)
    const filters: string[] = [];
    if (setCode) filters.push(`expansion.id:${setCode.toLowerCase()}`);
    if (cardNumber) filters.push(`number:${cardNumber}`);

    const endpoints: Array<{ path: string; lang: string }> = [];
    if (wantsEnglish && normalisedLang !== 'ja') endpoints.push({ path: '/en/cards', lang: 'en' });
    if (wantsJapanese) endpoints.push({ path: '/ja/cards', lang: 'ja' });

    const cardMap = new Map<string, PokemonCard>();
    let totalCount = 0;

    const searchPromises = endpoints.map(async (ep) => {
      try {
        let luceneQuery = '';
        const terms = query.split(/\s+/).filter(Boolean);
        
        if (terms.length > 0) {
          luceneQuery = terms.map(t => {
            // For Japanese endpoint, we explicitly check translation.name for English name hits
            return ep.lang === 'ja' 
              ? `(name:${t}* OR translation.name:${t}*)` 
              : `name:${t}*`;
          }).join(' AND ');
          
          if (filters.length > 0) {
            luceneQuery = `(${luceneQuery}) AND ${filters.join(' AND ')}`;
          }
        } else if (filters.length > 0) {
          luceneQuery = filters.join(' AND ');
        }

        const url = new URL(`${SCRYDEX_BASE}${ep.path}`);
        if (luceneQuery) url.searchParams.append('q', luceneQuery);
        url.searchParams.append('pageSize', limit.toString());
        url.searchParams.append('page', page.toString());
        url.searchParams.append('include', 'prices');
        url.searchParams.append('casing', 'camel');

        const response = await fetch(url.toString(), {
          headers: { 
            'X-Api-Key': SCRYDEX_API_KEY, 
            'X-Team-ID': SCRYDEX_TEAM_ID 
          },
          signal: AbortSignal.timeout(15000)
        });

        if (!response.ok) return { cards: [], total: 0 };
        const json = await response.json();
        const rawCards = json?.data || [];
        
        return { 
          cards: rawCards.map((c: any) => mapScrydexCard(c)), 
          total: json?.total || rawCards.length 
        };
      } catch (e) {
        console.error(`Error in ${ep.lang} search:`, e);
        return { cards: [], total: 0 };
      }
    });

    const results = await Promise.all(searchPromises);
    
    for (const res of results) {
      for (const card of res.cards) {
        if (!cardMap.has(card.id)) {
          cardMap.set(card.id, card);
        }
      }
      totalCount += res.total;
    }

    return { data: Array.from(cardMap.values()), totalCount };
  } catch (error) {
    console.error('Search error:', error);
    return { data: [], totalCount: 0 };
  }
}

/**
 * Fetches all expansion sets.
 */
export async function getPokemonSets(): Promise<PokemonSet[]> {
  if (!SCRYDEX_API_KEY || !SCRYDEX_TEAM_ID) return [];
  try {
    const response = await fetch(`${SCRYDEX_BASE}/expansions?pageSize=250&casing=camel`, {
      headers: {
        'X-Api-Key': SCRYDEX_API_KEY,
        'X-Team-ID': SCRYDEX_TEAM_ID,
      },
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) return [];
    const json = await response.json();
    const sets = json?.data || [];
    return sets.map((set: any) => ({
      id: set.id,
      name: set.name,
      series: set.series,
      releaseDate: set.releaseDate,
      total: set.total,
      printedTotal: set.printedTotal,
      logo: set.images?.find((i: any) => i.type === 'logo')?.large,
      symbol: set.images?.find((i: any) => i.type === 'symbol')?.large,
    }));
  } catch (error) {
    console.error('Error getting Pokemon sets:', error);
    return [];
  }
}

/**
 * Fetches all cards from a specific set.
 */
export async function getCardsFromSet(setId: string): Promise<PokemonCard[]> {
  if (!SCRYDEX_API_KEY || !SCRYDEX_TEAM_ID) return [];
  try {
    const response = await fetch(`${SCRYDEX_BASE}/expansions/${setId}/cards?pageSize=250&include=prices&casing=camel`, {
      headers: {
        'X-Api-Key': SCRYDEX_API_KEY,
        'X-Team-ID': SCRYDEX_TEAM_ID,
      },
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) return [];
    const json = await response.json();
    const cards = json?.data || [];
    return cards.map((card: any) => mapScrydexCard(card));
  } catch (error) {
    console.error('Error getting cards from set:', error);
    return [];
  }
}