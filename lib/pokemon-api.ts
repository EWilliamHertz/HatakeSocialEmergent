// Pokemon TCG API using TCGdex (free, no API key required)

export interface PokemonCard {
  id: string;
  name: string;
  supertype?: string;
  subtypes?: string[];
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

const TCGDEX_BASE = 'https://api.tcgdex.net/v2/en';

// Search for Pokemon cards by name
export async function searchPokemonCards(query: string): Promise<PokemonCard[]> {
  try {
    const response = await fetch(`${TCGDEX_BASE}/cards?name=${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(15000)
    });
    
    if (!response.ok) {
      console.error('TCGdex API error:', response.status);
      return [];
    }
    
    const cards = await response.json();
    
    // Map TCGdex format to our standard format
    return cards.map((card: any) => ({
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
      }
    }));
  } catch (error) {
    console.error('Error searching Pokemon cards:', error);
    return [];
  }
}

// Get a specific Pokemon card by ID
export async function getPokemonCard(cardId: string): Promise<PokemonCard | null> {
  try {
    const response = await fetch(`${TCGDEX_BASE}/cards/${cardId}`, {
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      return null;
    }
    
    const card = await response.json();
    
    return {
      id: card.id,
      name: card.name,
      supertype: card.category || 'Pokemon',
      subtypes: card.stage ? [card.stage] : [],
      hp: card.hp?.toString(),
      types: card.types || [],
      set: {
        id: card.set?.id || '',
        name: card.set?.name || '',
        series: card.set?.serie || '',
      },
      number: card.localId || '',
      artist: card.illustrator,
      rarity: card.rarity,
      images: {
        small: card.image ? `${card.image}/low.webp` : '',
        large: card.image ? `${card.image}/high.webp` : '',
      }
    };
  } catch (error) {
    console.error('Error getting Pokemon card:', error);
    return null;
  }
}

// Get all Pokemon sets
export async function getPokemonSets(): Promise<PokemonSet[]> {
  try {
    const response = await fetch(`${TCGDEX_BASE}/sets`, {
      signal: AbortSignal.timeout(15000)
    });
    
    if (!response.ok) {
      return [];
    }
    
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
    console.error('Error getting Pokemon sets:', error);
    return [];
  }
}

// Search cards within a specific set
export async function getCardsFromSet(setId: string): Promise<PokemonCard[]> {
  try {
    const response = await fetch(`${TCGDEX_BASE}/sets/${setId}`, {
      signal: AbortSignal.timeout(15000)
    });
    
    if (!response.ok) {
      return [];
    }
    
    const setData = await response.json();
    const cards = setData.cards || [];
    
    return cards.map((card: any) => ({
      id: card.id,
      name: card.name,
      set: {
        id: setId,
        name: setData.name || '',
      },
      number: card.localId || '',
      images: {
        small: card.image ? `${card.image}/low.webp` : '',
        large: card.image ? `${card.image}/high.webp` : '',
      }
    }));
  } catch (error) {
    console.error('Error getting cards from set:', error);
    return [];
  }
}
