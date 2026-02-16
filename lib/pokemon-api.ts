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

// Map TCGdex card to our standard format
function mapTCGdexCard(card: any): PokemonCard {
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
    }
  };
}

// Search for Pokemon cards (compatible with old API signature)
export async function searchPokemonCards(
  query: string, 
  page: number = 1, 
  limit: number = 50,
  setCode?: string,
  cardNumber?: string
): Promise<{ data: PokemonCard[]; totalCount: number }> {
  try {
    let url = `${TCGDEX_BASE}/cards`;
    
    if (query) {
      url += `?name=${encodeURIComponent(query)}`;
    }
    
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000)
    });
    
    if (!response.ok) {
      console.error('TCGdex API error:', response.status);
      return { data: [], totalCount: 0 };
    }
    
    let cards = await response.json();
    
    // Filter by set code if provided
    if (setCode) {
      const setLower = setCode.toLowerCase();
      cards = cards.filter((card: any) => 
        card.id?.toLowerCase().includes(setLower) ||
        card.set?.id?.toLowerCase() === setLower
      );
    }
    
    // Filter by card number if provided
    if (cardNumber) {
      cards = cards.filter((card: any) => 
        card.localId === cardNumber || 
        card.id?.endsWith('-' + cardNumber)
      );
    }
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const paginatedCards = cards.slice(startIndex, startIndex + limit);
    
    // Map to standard format
    const mappedCards = paginatedCards.map(mapTCGdexCard);
    
    return {
      data: mappedCards,
      totalCount: cards.length
    };
  } catch (error) {
    console.error('Error searching Pokemon cards:', error);
    return { data: [], totalCount: 0 };
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
