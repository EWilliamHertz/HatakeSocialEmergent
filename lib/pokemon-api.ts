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

// ─── Expansion ID resolution ───────────────────────────────────────────────
// ScryDex uses internal IDs like "sv1", "sv4a_ja", "swsh9" etc.
// Users typically type community shortcodes: "sv01", "sv4a", "jtg", "par" etc.
// We need to resolve those to the actual internal ID.

let _expansionMap: Map<string, string> | null = null;

async function getExpansionMap(): Promise<Map<string, string>> {
  if (_expansionMap) return _expansionMap;
  const map = new Map<string, string>();
  try {
    // Fetch all expansions in one shot (there are ~402, pageSize 500 covers them)
    const json = await fetchScrydex('expansions', 'pageSize=500&casing=camel');
    if (json?.data) {
      for (const exp of json.data as any[]) {
        if (!exp.id) continue;
        // Map internal ID → itself (case-insensitive)
        map.set(exp.id.toLowerCase(), exp.id);
        // Map official code → internal ID (e.g. "JTG" → "sv9", "SVI" → "sv1")
        if (exp.code) map.set(exp.code.toLowerCase(), exp.id);
      }
    }
  } catch (e) {
    console.error('Failed to load expansion map:', e);
  }
  _expansionMap = map;
  return map;
}

// Normalize user input to candidate ScryDex IDs.
// "sv01"  → ["sv01", "sv1", "sv01_ja", "sv1_ja"]
// "sv4a"  → ["sv4a", "sv4a_ja"]
// "jtg"   → ["jtg"]  (resolved via code map to "sv9")
function normalizeCandidates(code: string): string[] {
  const lower = code.toLowerCase().trim();
  const candidates: string[] = [lower];
  // Strip leading zeros in the numeric portion: sv01 → sv1, swsh01 → swsh1
  const noLeadingZero = lower.replace(/([a-z]+)0+(\d)/, '$1$2');
  if (noLeadingZero !== lower) candidates.push(noLeadingZero);
  // Add _ja variants for Japanese expansion lookup
  candidates.push(lower + '_ja');
  if (noLeadingZero !== lower) candidates.push(noLeadingZero + '_ja');
  return candidates;
}

async function resolveExpansionId(setCode: string): Promise<string | null> {
  const map = await getExpansionMap();
  for (const candidate of normalizeCandidates(setCode)) {
    if (map.has(candidate)) return map.get(candidate)!;
  }
  return null;
}
// ───────────────────────────────────────────────────────────────────────────

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

    // ── Path A: Set code provided → use expansion endpoint ──────────────────
    if (setCode) {
      const expansionId = await resolveExpansionId(setCode);
      if (expansionId) {
        // Japanese expansions have _ja suffix in their ID
        const isJaExp = expansionId.endsWith('_ja');
        const langPath = isJaExp ? 'ja' : 'en';

        const json = await fetchScrydex(
          `${langPath}/expansions/${expansionId}/cards`,
          'pageSize=500&include=prices&casing=camel'
        );

        let cards: PokemonCard[] = (json?.data || []).map((c: any) => mapScrydexCard(c));

        // Filter by card number client-side (ScryDex doesn't support this param)
        if (cardNumber) {
          const num = cardNumber.trim().replace(/^0+/, ''); // strip leading zeros
          cards = cards.filter(c => {
            const cn = (c.number || '').replace(/^0+/, '');
            return cn === num;
          });
        }

        // Filter by name if a text query was also provided
        if (normalizedQuery) {
          const qLower = normalizedQuery.toLowerCase();
          cards = cards.filter(c => {
            const name = (c.name || '').toLowerCase();
            const transName = (c.translation?.en?.name || '').toLowerCase();
            return name.includes(qLower) || transName.includes(qLower);
          });
        }

        return { data: cards, totalCount: cards.length };
      }
      // If expansion ID couldn't be resolved, fall through to text search
      // (handles cases like a user typing a partial set name etc.)
    }

    // ── Path B: Card number only (no set code) ──────────────────────────────
    // We can't filter by number alone in ScryDex — skip if no query or set
    if (cardNumber && !normalizedQuery && !setCode) {
      return { data: [], totalCount: 0 };
    }

    // ── Path C: Text search ─────────────────────────────────────────────────
    if (!normalizedQuery) return { data: [], totalCount: 0 };

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
      params.append('q', normalizedQuery);
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
