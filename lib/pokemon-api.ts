// lib/pokemon-api.ts
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

function isJapanese(text: string): boolean {
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uff00-\uffef]/.test(text);
}

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

// Part 2: Convert JPY to USD for Japanese cards before returning
function mapScrydexCard(card: any): PokemonCard {
  const images = Array.isArray(card.images) ? card.images : [];
  const frontImage = images.find((i: any) => i.type === 'front') ?? images[0];
  let price = extractPrice(card.variants ?? []);
  const langId = card.language?.id?.toLowerCase() || card.language_code?.toLowerCase() || '';

  // Part 2: Detect Japanese language and convert JPY → USD (rate: 1 JPY = 0.0067 USD)
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

// Part 1: Fix Japanese Card & English Translation Search
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
    const normalisedLang = forceLang && forceLang !== 'all' ? forceLang.toLowerCase() : 'all';

    // Part 1: Detect Japanese set codes (e.g., SV4A, JTG, S12A)
    const isJapaneseSet = setCode && (
      setCode.toLowerCase().endsWith('a') ||
      setCode.toLowerCase().startsWith('s') ||
      ['jtg', 'cp'].includes(setCode.toLowerCase())
    );

    // Part 1: Determine which language endpoints to query
    const wantsJapanese = normalisedLang === 'all' || normalisedLang === 'ja' || isJapaneseSet || isJapanese(query);
    const wantsEnglish  = normalisedLang === 'all' || normalisedLang === 'en' || (normalisedLang !== 'ja' && !isJapaneseSet);

    const filters: string[] = [];
    if (setCode) filters.push(`expansion.id:${setCode.toLowerCase()}`);
    if (cardNumber) filters.push(`number:${cardNumber}`);

    const endpoints: Array<{ path: string; lang: string }> = [];
    if (wantsEnglish)  endpoints.push({ path: '/en/cards', lang: 'en' });
    if (wantsJapanese) endpoints.push({ path: '/ja/cards', lang: 'ja' });

    if (endpoints.length === 0) {
      endpoints.push({ path: '/en/cards', lang: 'en' });
      endpoints.push({ path: '/ja/cards', lang: 'ja' });
    }

    // Part 1: De-duplication using composite key card.id + card.lang
    const cardMap = new Map<string, PokemonCard>();
    let apiTotal = 0;

    const searchPromises = endpoints.map(async (ep) => {
      try {
        let luceneParts: string[] = [];
        const terms = query.split(/\s+/).filter(Boolean);

        if (terms.length > 0) {
          // Part 1: Japanese endpoint checks both native name and English translation
          const termQuery = terms.map(t => {
            if (ep.lang === 'ja') {
              return `(name:${t}* OR translation.en.name:${t}*)`;
            } else {
              return `name:${t}*`;
            }
          }).join(' AND ');
          luceneParts.push(`(${termQuery})`);
        }

        if (filters.length > 0) luceneParts.push(...filters);

        const url = new URL(`${SCRYDEX_BASE}${ep.path}`);
        if (luceneParts.length > 0) url.searchParams.append('q', luceneParts.join(' AND '));
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
        return {
          cards: (json?.data || []).map((c: any) => mapScrydexCard(c)),
          total: json?.totalCount || json?.total || 0
        };
      } catch (e) {
        return { cards: [], total: 0 };
      }
    });

    const results = await Promise.all(searchPromises);
    for (const res of results) {
      for (const card of res.cards) {
        // Part 1: Composite key prevents same-name cards in different languages overwriting each other
        const cardKey = `${card.id}-${card.lang}`;
        if (!cardMap.has(cardKey)) cardMap.set(cardKey, card);
      }
      apiTotal += res.total;
    }

    return { data: Array.from(cardMap.values()), totalCount: cardMap.size || apiTotal };
  } catch (error) {
    return { data: [], totalCount: 0 };
  }
}

export async function getCardById(id: string, lang: string = 'en'): Promise<PokemonCard | null> {
  if (!SCRYDEX_API_KEY) return null;
  try {
    const response = await fetch(`${SCRYDEX_BASE}/${lang.toLowerCase()}/cards/${id}?include=prices&casing=camel`, {
      headers: { 'X-Api-Key': SCRYDEX_API_KEY, 'X-Team-ID': SCRYDEX_TEAM_ID }
    });
    if (!response.ok) return null;
    const json = await response.json();
    return mapScrydexCard(json.data);
  } catch (error) {
    return null;
  }
}

export async function getPokemonSets(): Promise<PokemonSet[]> {
  try {
    const response = await fetch(`${SCRYDEX_BASE}/expansions?pageSize=250&casing=camel`, {
      headers: { 'X-Api-Key': SCRYDEX_API_KEY, 'X-Team-ID': SCRYDEX_TEAM_ID }
    });
    const json = await response.json();
    return (json?.data || []).map((set: any) => ({
      id: set.id,
      name: set.name,
      series: set.series,
      releaseDate: set.releaseDate,
      total: set.total,
      printedTotal: set.printedTotal,
      logo: set.images?.find((i: any) => i.type === 'logo')?.large,
      symbol: set.images?.find((i: any) => i.type === 'symbol')?.large,
    }));
  } catch (e) { return []; }
}

export async function getCardsFromSet(setId: string, lang: string = 'en'): Promise<PokemonCard[]> {
  try {
    const response = await fetch(`${SCRYDEX_BASE}/${lang}/expansions/${setId}/cards?pageSize=250&include=prices&casing=camel`, {
      headers: { 'X-Api-Key': SCRYDEX_API_KEY, 'X-Team-ID': SCRYDEX_TEAM_ID }
    });
    const json = await response.json();
    return (json?.data || []).map((card: any) => mapScrydexCard(card));
  } catch (e) { return []; }
}
