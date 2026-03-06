// Pokemon TCG API using ScryDex exclusively (fast, pricing included)
// Supports English and Japanese card searches

export interface PokemonCard {
  id: string;
  name: string;
  supertype?: string;
  subtypes?: string[]
  hp?: string;
  types?: string[];
  attacks?: any[];
  weaknesses?: any[];
  retreatCost?: string[];
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
  artist?: string;
  rarity?: string;
  images: {
    small: string;
    large: string;
  };
  tcgplayer?: {
    url?: string;
    prices?: any;
  };
  lang?: string; 
  prices?: any;  
  pricing?: any; 
}

export interface PokemonSet {
  id: string;
  name: string;
  series?: string;
  releaseDate?: string;
  total?: number;
  logo?: string;
  symbol?: string;
}

// Detect Japanese characters
function isJapanese(text: string): boolean {
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uff00-\uffef]/.test(text);
}

// Route to correct API base
function getLangBase(lang: string): string {
  // Use ScryDex for EVERYTHING to avoid TCGdex rate limits and get inline pricing
  return 'https://api.scrydex.com/v1'; 
}

// Map card to standard format
function mapTCGdexCard(card: any, lang = 'en'): PokemonCard {
  return {
    id: card.id,
    name: card.name,
    supertype: card.category || 'Pokemon',
    subtypes: card.stage ? [card.stage] : [],
    hp: card.hp?.toString(),
    types: card.types || [],
    set: {
      id: card.set?.id || card.id?.split('-')[0] || '',
      name: card.set?.name || '',
      series: card.set?.serie || '',
    },
    number: card.localId || card.id?.split('-').pop() || '',
    artist: card.illustrator,
    rarity: card.rarity,
    images: {
      small: card.image ? `${card.image}/low.webp` : '',
      large: card.image ? `${card.image}/high.webp` : '',
    },
    tcgplayer: card.pricing?.tcgplayer ? {
      url: '',
      prices: card.pricing.tcgplayer
    } : (card.tcgplayer || undefined),
    prices: card.prices || card.pricing || undefined,
    pricing: card.pricing || card.prices || undefined,
    lang,
  };
}

// Get a specific Pokemon card by ID
export async function getPokemonCard(cardId: string, lang: string = 'en'): Promise<PokemonCard | null> {
  try {
    const response = await fetch(`${getLangBase(lang)}/cards/${cardId}`, {
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) return null;
    const card = await response.json();
    return mapTCGdexCard(card, card.lang || lang);
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
  forceLang?: 'en' | 'ja'
): Promise<{ data: PokemonCard[]; totalCount: number }> {
  try {
    const lang = forceLang || (isJapanese(query) ? 'ja' : 'en');
    const base = getLangBase(lang);

    let url = `${base}/cards`;
    if (query) url += `?name=${encodeURIComponent(query)}`;

    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) return { data: [], totalCount: 0 };

    let cards = await response.json();

    if (setCode) {
      const setLower = setCode.toLowerCase();
      cards = cards.filter((card: any) =>
        card.id?.toLowerCase().includes(setLower) ||
        card.set?.id?.toLowerCase() === setLower
      );
    }

    if (cardNumber) {
      cards = cards.filter((card: any) =>
        card.localId === cardNumber ||
        card.id?.endsWith('-' + cardNumber)
      );
    }

    const startIndex = (page - 1) * limit;
    const paginatedCards = cards.slice(startIndex, startIndex + limit);

    // Map cards directly. No 50x fetch loop needed since ScryDex provides pricing in the array!
    const mappedCards = paginatedCards.map((c: any) => mapTCGdexCard(c, lang));

    return {
      data: mappedCards,
      totalCount: cards.length
    };
  } catch (error) {
    console.error('Error searching Pokemon cards:', error);
    return { data: [], totalCount: 0 };
  }
}

export async function searchJapanesePokemonCards(query: string, page: number = 1, limit: number = 50) {
  return searchPokemonCards(query, page, limit, undefined, undefined, 'ja');
}

export async function getPokemonSets(): Promise<PokemonSet[]> {
  try {
    const response = await fetch(`${getLangBase('en')}/sets`, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) return [];
    const sets = await response.json();
    return sets.map((set: any) => ({
      id: set.id,
      name: set.name,
      series: set.serie,
      releaseDate: set.releaseDate,
      total: set.cardCount?.total,
      logo: set.logo ? `${set.logo}/high.webp` : undefined,
      symbol: set.symbol ? `${set.symbol}/high.webp` : undefined,
    }));
  } catch (error) {
    return [];
  }
}

export async function getCardsFromSet(setId: string): Promise<PokemonCard[]> {
  try {
    const response = await fetch(`${getLangBase('en')}/sets/${setId}`, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) return [];
    const setData = await response.json();
    const cards = setData.cards || [];
    return cards.map((card: any) => ({
      id: card.id,
      name: card.name,
      set: { id: setId, name: setData.name || '' },
      number: card.localId || '',
      images: {
        small: card.image ? `${card.image}/low.webp` : '',
        large: card.image ? `${card.image}/high.webp` : '',
      }
    }));
  } catch (error) {
    return [];
  }
}