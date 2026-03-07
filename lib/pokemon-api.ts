// lib/pokemon-api.ts
import { fetchScrydex } from './api-cache';

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

// Returns price normalised to USD (converts JPY → USD using live-ish rate)
function extractPrice(variants: any[]): number | null {
  if (!Array.isArray(variants)) return null;
  for (const variant of variants) {
    const prices = Array.isArray(variant.prices) ? variant.prices : Object.values(variant.prices || {});
    for (const p of prices as any[]) {
      const rawVal = p?.market ?? p?.mid ?? p?.low ?? p?.price ?? null;
      if (rawVal != null) {
        const val = parseFloat(String(rawVal));
        const currency = (p?.currency || '').toUpperCase();
        // Convert JPY → USD so the UI's standard ×0.92 gives correct EUR
        if (currency === 'JPY') return parseFloat((val * 0.0067).toFixed(4));
        return val; // USD (or unknown — treat as USD)
      }
    }
  }
  return null;
}

function mapScrydexCard(card: any): PokemonCard {
  const images = Array.isArray(card.images) ? card.images : [];
  const frontImage = images.find((i: any) => i.type === 'front') ?? images[0];
  // extractPrice now returns a USD-normalised value (JPY already converted → USD)
  const priceUsd = extractPrice(card.variants ?? []);

  const langCode = (
    card.languageCode ||
    card.language_code ||
    (card.language === 'Japanese' ? 'JA' : '') ||
    ''
  ).toLowerCase();

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
    retreatCost: card.retreat_cost || card.retreatCost || [],
    convertedRetreatCost: card.converted_retreat_cost || card.convertedRetreatCost,
    set: {
      id: card.set?.id || card.expansion?.id || '',
      name: card.set?.name || card.expansion?.name || '',
      series: card.set?.series || card.expansion?.series || '',
      printedTotal: card.set?.printedTotal || card.expansion?.printed_total || card.expansion?.printedTotal,
      total: card.set?.total || card.expansion?.total,
      releaseDate: card.set?.releaseDate || card.expansion?.release_date || card.expansion?.releaseDate,
    },
    number: card.number || '',
    images: {
      small: frontImage?.small || '',
      large: frontImage?.large || frontImage?.medium || '',
    },
    lang: langCode,
    language_code: langCode.toUpperCase(),
    translation: card.translation,
    // Store as 'usd' — the UI reads pricing.usd and multiplies by 0.92 to get EUR.
    // extractPrice already normalised JPY → USD, so this is always USD.
    pricing: priceUsd ? { usd: priceUsd } : null,
    prices: priceUsd ? { usd: priceUsd } : null,
  };
}

export async function searchPokemonCards(
  query: string,
  page: number = 1,
  limit: number = 50,
  setCode?: string,
  cardNumber?: string,
  forceLang?: string
): Promise<{ data: PokemonCard[]; totalCount: number }> {
  try {
    const normalizedQuery = query.trim();
    const normalisedLang = forceLang && forceLang !== 'all' ? forceLang.toLowerCase() : 'all';
    
    // Detect Japanese set codes to force JA endpoint (e.g. sv4a, s12a, jtg)
    const isJapaneseSet = setCode && (
      setCode.toLowerCase().endsWith('a') || 
      setCode.toLowerCase().startsWith('s') ||
      ['jtg', 'cp'].includes(setCode.toLowerCase())
    );

    const wantsJapanese = normalisedLang === 'all' || normalisedLang.includes('ja') || isJapaneseSet || isJapanese(normalizedQuery);
    const wantsEnglish  = (normalisedLang === 'all' || normalisedLang.includes('en')) && !isJapaneseSet;

    const endpoints: Array<{ path: string; lang: string }> = [];
    if (wantsEnglish) endpoints.push({ path: 'en/cards', lang: 'en' });
    if (wantsJapanese) endpoints.push({ path: 'ja/cards', lang: 'ja' });

    const cardMap = new Map<string, PokemonCard>();
    let apiTotal = 0;

    const searchPromises = endpoints.map(async (ep) => {
      const params = new URLSearchParams();
      // Plain text query — ScryDex does not support Lucene field syntax
      if (normalizedQuery) params.append('q', normalizedQuery);
      if (setCode) params.append('expansion.id', setCode.toLowerCase());
      if (cardNumber) params.append('number', cardNumber);

      params.append('pageSize', limit.toString());
      params.append('page', page.toString());
      params.append('include', 'prices');

      const json = await fetchScrydex(ep.path, params.toString());
      if (!json) return { cards: [], total: 0 };
      const rawCards = json?.data || [];
      
      return { 
        cards: rawCards.map((c: any) => mapScrydexCard(c)), 
        total: json?.totalCount || json?.total || rawCards.length 
      };
    });

    const results = await Promise.all(searchPromises);
    for (const res of results) {
      for (const card of res.cards) {
        // Unique key by ID + Lang to allow EN/JP versions to coexist
        const cardKey = `${card.id}-${card.lang}`; 
        if (!cardMap.has(cardKey)) {
          cardMap.set(cardKey, card);
        }
      }
      apiTotal += res.total;
    }

    return { data: Array.from(cardMap.values()), totalCount: cardMap.size || apiTotal };
  } catch (error) {
    console.error('Search error:', error);
    return { data: [], totalCount: 0 };
  }
}

export async function getPokemonSets(): Promise<PokemonSet[]> {
  const json = await fetchScrydex('expansions', 'pageSize=250');
  if (!json) return [];
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
}

export async function getCardsFromSet(setId: string): Promise<PokemonCard[]> {
  const json = await fetchScrydex(`expansions/${setId}/cards`, 'pageSize=250&include=prices');
  if (!json) return [];
  const cards = json?.data || [];
  return cards.map((card: any) => mapScrydexCard(card));
}
