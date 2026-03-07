// Pokemon TCG API using ScryDex exclusively (fast, pricing included)
// Uses language-specific endpoints: /en/ for English, /ja/ for Japanese, root for both

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
    images?: {
      symbol?: string;
      logo?: string;
    };
  };
  number: string;
  printedNumber?: string;
  artist?: string;
  rarity?: string;
  rarityCode?: string;
  images: {
    small: string;
    large: string;
  };
  image_uris?: {
    small: string;
    normal: string;
    large: string;
  };
  tcgplayer?: {
    url?: string;
    prices?: any;
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

// Detect Japanese characters to auto-apply filters if needed
function isJapanese(text: string): boolean {
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uff00-\uffef]/.test(text);
}

/**
 * Extract the best price from ScryDex variants[].prices[] response.
 */
function extractPrice(variants: any[]): number | null {
  if (!Array.isArray(variants)) return null;
  for (const variant of variants) {
    const pricesData = variant.prices;
    const prices: any[] = Array.isArray(pricesData)
      ? pricesData
      : (pricesData && typeof pricesData === 'object' ? Object.values(pricesData) : []);
    for (const p of prices) {
      const rawVal =
        p?.market ?? p?.marketPrice ?? p?.market_price ??
        p?.mid ?? p?.midPrice ?? p?.mid_price ??
        p?.low ?? p?.lowPrice ?? p?.low_price ??
        p?.value ?? p?.price ?? null;
      if (rawVal == null) continue;
      const val = parseFloat(String(rawVal));
      if (!isNaN(val) && val > 0) return val;
    }
  }
  return null;
}

// Map Scrydex card to standard format
function mapScrydexCard(card: any): PokemonCard {
  const images = Array.isArray(card.images) ? card.images : [];
  const frontImage = images.find((i: any) => i.type === 'front') ?? images[0];
  const price = extractPrice(card.variants ?? []);

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
      id: card.expansion?.id || '',
      name: card.expansion?.name || '',
      series: card.expansion?.series || '',
      printedTotal: card.expansion?.printed_total,
      total: card.expansion?.total,
      releaseDate: card.expansion?.release_date,
    },
    number: card.number || '',
    printedNumber: card.printed_number,
    artist: card.artist,
    rarity: card.rarity,
    rarityCode: card.rarity_code,
    images: {
      small: frontImage?.small || '',
      large: frontImage?.large || frontImage?.medium || '',
    },
    image_uris: {
      small: frontImage?.small || '',
      normal: frontImage?.medium || '',
      large: frontImage?.large || '',
    },
    lang: card.language?.id || card.language_code?.toLowerCase(),
    language_code: card.language?.id || card.language_code,
    translation: card.translation,
    pricing: price ? { usd: price } : null,
    prices: price ? { usd: price } : null,
  };
}

// Get a specific Pokemon card by ID
export async function getPokemonCard(cardId: string): Promise<PokemonCard | null> {
  if (!SCRYDEX_API_KEY || !SCRYDEX_TEAM_ID) return null;
  try {
    const response = await fetch(`${SCRYDEX_BASE}/cards/${cardId}?include=prices&casing=camel`, {
      headers: {
        'X-Api-Key': SCRYDEX_API_KEY,
        'X-Team-ID': SCRYDEX_TEAM_ID,
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) return null;
    const json = await response.json();
    const card = json?.data ?? json;
    return mapScrydexCard(card);
  } catch (error) {
    console.error('Error getting Pokemon card:', error);
    return null;
  }
}

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
    // 1. Properly handle 'all' and normalize 'jp' to 'ja'
    const normalisedLang = forceLang && forceLang !== 'all'
      ? forceLang.split(',').map(l => l.trim().toLowerCase() === 'jp' ? 'ja' : l.trim().toLowerCase()).join(',')
      : 'all';

    const queryIsJapanese = isJapanese(query);

    // 2. Set boolean flags correctly
    const wantsJapanese = normalisedLang === 'all' || normalisedLang.includes('ja') || queryIsJapanese;
    const wantsEnglish  = normalisedLang === 'all' || normalisedLang.includes('en') || (!wantsJapanese);
    const wantsJapaneseOnly = wantsJapanese && !wantsEnglish;

    // 3. Build the Lucene query
    let luceneQuery = '';
    if (query) {
      const terms = query.split(/\s+/).filter(Boolean);
      // We apply this broad search to BOTH English and Japanese so cross-language search always works
      luceneQuery = terms.map(t => `(name:${t}* OR translation.name:${t}* OR translation.en.name:${t}*)`).join(' AND ');
    }

    // 4. Add set and card number filters
    if (setCode) {
      luceneQuery = luceneQuery 
        ? `${luceneQuery} AND expansion.id:${setCode.toLowerCase()}`
        : `expansion.id:${setCode.toLowerCase()}`;
    }
    if (cardNumber) {
      luceneQuery = luceneQuery
        ? `${luceneQuery} AND number:${cardNumber}`
        : `number:${cardNumber}`;
    }

    // 5. Setup endpoints
    const endpoints: Array<{ url: string; lang: string; langFilter?: string }> = [];

    if (wantsEnglish && !wantsJapaneseOnly) {
      endpoints.push({
        url: `${SCRYDEX_BASE}/cards`,
        lang: 'en',
        langFilter: 'EN'
      });
    }

    if (wantsJapanese) {
      endpoints.push({
        url: `${SCRYDEX_BASE}/cards`,
        lang: 'ja',
        langFilter: 'JA'
      });
    }

    // 6. Execute queries in parallel
    const cardMap = new Map<string, PokemonCard>();
    let totalCount = 0;

    const searchPromises = endpoints.map(async (endpoint) => {
      try {
        const url = new URL(endpoint.url);
        
        // Wrap the entire luceneQuery in parentheses before appending the language filter
        let finalQuery = luceneQuery;
        if (endpoint.langFilter) {
          finalQuery = finalQuery 
            ? `(${finalQuery}) AND language_code:${endpoint.langFilter}` 
            : `language_code:${endpoint.langFilter}`;
        }
        
        if (finalQuery) url.searchParams.append('q', finalQuery);
        url.searchParams.append('page', page.toString());
        url.searchParams.append('pageSize', limit.toString());
        url.searchParams.append('include', 'prices');
        url.searchParams.append('casing', 'camel');

        const response = await fetch(url.toString(), {
          headers: {
            'X-Api-Key': SCRYDEX_API_KEY,
            'X-Team-ID': SCRYDEX_TEAM_ID,
          },
          signal: AbortSignal.timeout(15000)
        });

        if (!response.ok) {
          console.error(`Scrydex API error (${response.status}) for ${endpoint.lang} endpoint`);
          return { cards: [], total: 0 };
        }

        const json = await response.json();
        const rawCards = json?.data || [];
        const total = json?.total || rawCards.length;

        return {
          cards: rawCards.map((c: any) => mapScrydexCard(c)),
          total: total
        };
      } catch (error) {
        console.error(`Error searching ${endpoint.lang} cards:`, error);
        return { cards: [], total: 0 };
      }
    });

    const results = await Promise.all(searchPromises);

    // Combine results and deduplicate by card ID
    for (const result of results) {
      for (const card of result.cards) {
        if (!cardMap.has(card.id)) {
          cardMap.set(card.id, card);
        }
      }
      totalCount += result.total;
    }

    return {
      data: Array.from(cardMap.values()),
      totalCount: totalCount
    };
  } catch (error) {
    console.error('Error searching Pokemon cards:', error);
    return { data: [], totalCount: 0 };
  }
}
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