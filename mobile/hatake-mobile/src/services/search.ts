import { SCRYFALL_API, TCGDEX_API } from './config';
import { API_ENDPOINTS, API_BASE_URL } from './config';
import { getToken } from './api';

export interface CardSearchResult {
  id: string;
  name: string;
  image_uris?: {
    small: string;
    normal: string;
    large: string;
  };
  images?: {
    small: string;
    large: string;
  };
  set_name?: string;
  set?: string;
  rarity?: string;
  type_line?: string;
  mana_cost?: string;
  prices?: {
    usd?: string;
    eur?: string;
  };
  game: 'mtg' | 'pokemon';
}

// Helper to make API calls with fetch
async function fetchJson(url: string, options?: RequestInit): Promise<any> {
  const response = await fetch(url, options);
  return response.json();
}

class SearchService {
  // Search cards using the backend API (recommended)
  async searchCards(query: string, game: 'mtg' | 'pokemon' = 'mtg'): Promise<CardSearchResult[]> {
    try {
      const token = await getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetchJson(
        `${API_BASE_URL}${API_ENDPOINTS.SEARCH}?q=${encodeURIComponent(query)}&game=${game}`,
        { headers }
      );
      
      if (response.success) {
        return response.results.map((card: any) => ({
          ...card,
          game
        }));
      }
      return [];
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  // Search MTG cards directly from Scryfall
  async searchMTG(query: string): Promise<CardSearchResult[]> {
    try {
      const response = await fetchJson(
        `${SCRYFALL_API}/cards/search?q=${encodeURIComponent(query)}`
      );
      
      return (response.data || []).map((card: any) => ({
        id: card.id,
        name: card.name,
        image_uris: card.image_uris || card.card_faces?.[0]?.image_uris,
        set_name: card.set_name,
        set: card.set,
        rarity: card.rarity,
        type_line: card.type_line,
        mana_cost: card.mana_cost,
        prices: card.prices,
        game: 'mtg' as const
      }));
    } catch (error) {
      console.error('Scryfall search error:', error);
      return [];
    }
  }

  // Search Pokemon cards directly from TCGdex
  async searchPokemon(query: string): Promise<CardSearchResult[]> {
    try {
      const response = await fetchJson(
        `${TCGDEX_API}/cards?name=${encodeURIComponent(query)}`
      );
      
      const cards = Array.isArray(response) ? response : [response];
      
      return cards.filter(Boolean).map((card: any) => ({
        id: card.id,
        name: card.name,
        images: {
          small: card.image ? `${card.image}/low.webp` : '',
          large: card.image ? `${card.image}/high.webp` : ''
        },
        set_name: card.set?.name,
        set: card.set?.id,
        rarity: card.rarity,
        game: 'pokemon' as const
      }));
    } catch (error) {
      console.error('TCGdex search error:', error);
      return [];
    }
  }

  // Get card by ID
  async getCardById(id: string, game: 'mtg' | 'pokemon'): Promise<CardSearchResult | null> {
    try {
      if (game === 'mtg') {
        const card = await fetchJson(`${SCRYFALL_API}/cards/${id}`);
        return {
          id: card.id,
          name: card.name,
          image_uris: card.image_uris || card.card_faces?.[0]?.image_uris,
          set_name: card.set_name,
          set: card.set,
          rarity: card.rarity,
          type_line: card.type_line,
          mana_cost: card.mana_cost,
          prices: card.prices,
          game: 'mtg'
        };
      } else {
        const card = await fetchJson(`${TCGDEX_API}/cards/${id}`);
        return {
          id: card.id,
          name: card.name,
          images: {
            small: card.image ? `${card.image}/low.webp` : '',
            large: card.image ? `${card.image}/high.webp` : ''
          },
          set_name: card.set?.name,
          set: card.set?.id,
          rarity: card.rarity,
          game: 'pokemon'
        };
      }
    } catch (error) {
      console.error('Get card error:', error);
      return null;
    }
  }
}

export const searchService = new SearchService();
