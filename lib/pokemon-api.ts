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

function mapScrydexCard(card: any): PokemonCard {
  const images = Array.isArray(card.images) ? card.images : [];
  const frontImage = images.find((i: any) => i.type === 'front') ?? images[0];
  
  let price = extractPrice(card.variants ?? []);
  const langId = card.language?.id?.toLowerCase() || card.language_code?.toLowerCase() || '';

  // 1 JPY ≈ 0.0067 USD. Frontend (price * 0.92) will then output correct Euros.
  if (price !== null && (langId === 'ja' || langId === 'jp' || langId === 'japanese')) {
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
    lang: langId,
    language_code: langId.toUpperCase(),
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
  if (!SCRYDEX_API_KEY || !SCRYDEX_TEAM_ID) return { data: [], totalCount: 0 };

  try {
    const normalisedLang = forceLang && forceLang !== 'all'
      ? forceLang.split(',').map(l => l.trim().toLowerCase() === 'jp' ? 'ja' : l.trim().toLowerCase()).join(',')
      : 'all';

    const wantsJapanese = normalisedLang === 'all' || normalisedLang.includes('ja') || isJapanese(query);
    const wantsEnglish  = normalisedLang === 'all' || normalisedLang.includes('en') || !wantsJapanese;

    // Build base filters using correct Scrydex field names
    const filters: string[] = [];
    if (setCode) filters.push(`set.id:${setCode.toLowerCase()}`);
    if (cardNumber) filters.push(`number:${cardNumber}`);

    const endpoints = [];
    if (wantsEnglish && normalisedLang !== 'ja') endpoints.push({ path: '/en/cards', lang: 'en' });
    if (wantsJapanese) endpoints.push({ path: '/ja/cards', lang: 'ja' });

    const cardMap = new Map<string, PokemonCard>();
    let totalCount = 0;

    const searchPromises = endpoints.map(async (ep) => {
      try {
        let q = '';
        const terms = query.split(/\s+/).filter(Boolean);
        if (terms.length > 0) {
          q = terms.map(t => {
            // Searching without a prefix (naked term) forces Scrydex to check all text fields (including translation)
            return `(${t}* OR name:${t}* OR translation.name:${t}*)`;
          }).join(' AND ');
          if (filters.length > 0) q = `(${q}) AND ${filters.join(' AND ')}`;
        } else if (filters.length > 0) {
          q = filters.join(' AND ');
        }

        const url = new URL(`${SCRYDEX_BASE}${ep.path}`);
        if (q) url.searchParams.append('q', q);
        url.searchParams.append('pageSize', limit.toString());
        url.searchParams.append('page', page.toString());
        url.searchParams.append('include', 'prices');
        url.searchParams.append('casing', 'camel');

        const response = await fetch(url.toString(), {
          headers: { 'X-Api-Key': SCRYDEX_API_KEY, 'X-Team-ID': SCRYDEX_TEAM_ID },
          signal: AbortSignal.timeout(15000)
        });

        if (!response.ok) return { cards: [], total: 0 };
        const json = await response.json();
        return { cards: (json?.data || []).map((c: any) => mapScrydexCard(c)), total: json?.total || 0 };
      } catch (e) { return { cards: [], total: 0 }; }
    });

    const results = await Promise.all(searchPromises);
    results.forEach(res => {
      res.cards.forEach(card => { if (!cardMap.has(card.id)) cardMap.set(card.id, card); });
      totalCount += res.total;
    });

    return { data: Array.from(cardMap.values()), totalCount };
  } catch (error) { return { data: [], totalCount: 0 }; }
}

    const results = await Promise.all(searchPromises);
   results.forEach((res: any) => {
  res.cards.forEach((card: any) => { 
    if (!cardMap.has(card.id)) cardMap.set(card.id, card); 
  });
  totalCount += res.total;
});

    return { data: Array.from(cardMap.values()), totalCount };
  } catch (error) {
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