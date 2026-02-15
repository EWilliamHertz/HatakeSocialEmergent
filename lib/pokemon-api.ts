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

export async function searchPokemonCards(
  query: string,
  page: number = 1,
  pageSize: number = 50
): Promise<{ data: PokemonCard[]; totalCount: number }> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (config.pokemon.apiKey) {
    headers['X-Api-Key'] = config.pokemon.apiKey;
  }

  const url = `${config.pokemon.baseUrl}/cards?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`;

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Pokemon API error: ${response.statusText}`);
  }

  const data = await response.json();
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