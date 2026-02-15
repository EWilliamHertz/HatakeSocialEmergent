import { config } from './config';

export interface PokemonCard {
  id: string;
  name: string;
  supertype: string;
  subtypes: string[];
  hp?: string;
  types?: string[];
  attacks?: any[];
  weaknesses?: any[];
  retreatCost?: string[];
  set: {
    id: string;
    name: string;
    series: string;
    printedTotal: number;
    total: number;
    legalities: any;
    ptcgoCode?: string;
    releaseDate: string;
    updatedAt: string;
    images: {
      symbol: string;
      logo: string;
    };
  };
  number: string;
  artist?: string;
  rarity?: string;
  nationalPokedexNumbers?: number[];
  legalities?: any;
  images: {
    small: string;
    large: string;
  };
  tcgplayer?: {
    url: string;
    updatedAt: string;
    prices?: {
      normal?: {
        low?: number;
        mid?: number;
        high?: number;
        market?: number;
      };
      holofoil?: {
        low?: number;
        mid?: number;
        high?: number;
        market?: number;
      };
      reverseHolofoil?: {
        low?: number;
        mid?: number;
        high?: number;
        market?: number;
      };
    };
  };
}

export interface PokemonSearchOptions {
  name?: string;
  setId?: string;
  number?: string;
  page?: number;
  pageSize?: number;
}

// Build Lucene-style query for Pokemon TCG API
function buildPokemonQuery(options: PokemonSearchOptions): string {
  const parts: string[] = [];
  
  if (options.name) {
    // Use wildcard for partial matching
    parts.push(`name:${options.name}*`);
  }
  
  if (options.setId) {
    parts.push(`set.id:${options.setId}`);
  }
  
  if (options.number) {
    parts.push(`number:${options.number}`);
  }
  
  return parts.join(' ');
}

export async function searchPokemonCards(
  query: string,
  page: number = 1,
  pageSize: number = 50,
  setId?: string,
  number?: string
): Promise<{ data: PokemonCard[]; totalCount: number }> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (config.pokemon.apiKey) {
    headers['X-Api-Key'] = config.pokemon.apiKey;
  }

  // Build the search query using Pokemon TCG API Lucene syntax
  const searchQuery = buildPokemonQuery({
    name: query,
    setId,
    number,
  });

  const url = `${config.pokemon.baseUrl}/cards?q=${encodeURIComponent(searchQuery)}&page=${page}&pageSize=${pageSize}`;
  
  console.log('[Pokemon API] Searching with URL:', url);
  console.log('[Pokemon API] API Key present:', !!config.pokemon.apiKey);

  const response = await fetch(url, { 
    headers,
    signal: AbortSignal.timeout(30000) // 30 second timeout
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Pokemon API] Error response:', response.status, errorText);
    throw new Error(`Pokemon API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log('[Pokemon API] Found', data.totalCount || 0, 'cards');
  
  return {
    data: data.data || [],
    totalCount: data.totalCount || 0,
  };
}

export async function getPokemonCardById(cardId: string): Promise<PokemonCard> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (config.pokemon.apiKey) {
    headers['X-Api-Key'] = config.pokemon.apiKey;
  }

  const url = `${config.pokemon.baseUrl}/cards/${cardId}`;
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Pokemon API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data;
}