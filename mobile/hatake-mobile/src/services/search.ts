import axios from 'axios';
import { SCRYFALL_API, TCGDEX_API } from './config';
import api from './api';
import { API_ENDPOINTS } from './config';

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

class SearchService {
  // Search cards using the backend API (recommended)
  async searchCards(query: string, game: 'mtg' | 'pokemon' = 'mtg'): Promise<CardSearchResult[]> {
    try {
      const response = await api.get(API_ENDPOINTS.SEARCH, {
        params: { q: query, game }
      });
      
      if (response.data.success) {
        return response.data.results.map((card: any) => ({
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
      const response = await axios.get(`${SCRYFALL_API}/cards/search`, {
        params: { q: query }
      });
      
      return response.data.data.map((card: any) => ({
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
      const response = await axios.get(`${TCGDEX_API}/cards`, {
        params: { name: query }
      });
      
      const cards = Array.isArray(response.data) ? response.data : [response.data];
      
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
        const response = await axios.get(`${SCRYFALL_API}/cards/${id}`);
        const card = response.data;
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
        const response = await axios.get(`${TCGDEX_API}/cards/${id}`);
        const card = response.data;
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
