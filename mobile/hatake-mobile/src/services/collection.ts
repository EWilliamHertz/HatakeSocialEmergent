import api from './api';
import { API_ENDPOINTS } from './config';

export interface CollectionItem {
  item_id: string;
  card_id: string;
  card_data: any;
  game: 'mtg' | 'pokemon';
  quantity: number;
  condition: string;
  foil: boolean;
  purchase_price?: number;
  notes?: string;
  created_at: string;
}

export interface CollectionStats {
  totalCards: number;
  totalValue: number;
  uniqueCards: number;
  byGame: {
    mtg: number;
    pokemon: number;
  };
}

class CollectionService {
  // Get user's collection
  async getCollection(game?: string): Promise<CollectionItem[]> {
    try {
      const params = game ? { game } : {};
      const response = await api.get(API_ENDPOINTS.COLLECTION, { params });
      return response.data.items || [];
    } catch (error) {
      console.error('Get collection error:', error);
      return [];
    }
  }

  // Get collection stats
  async getStats(): Promise<CollectionStats | null> {
    try {
      const response = await api.get(`${API_ENDPOINTS.COLLECTION}/stats`);
      return response.data.stats;
    } catch (error) {
      console.error('Get stats error:', error);
      return null;
    }
  }

  // Add card to collection
  async addCard(card: {
    cardId: string;
    cardData: any;
    game: string;
    quantity?: number;
    condition?: string;
    foil?: boolean;
    purchasePrice?: number;
    notes?: string;
  }): Promise<{ success: boolean; itemId?: string; error?: string }> {
    try {
      const response = await api.post(API_ENDPOINTS.COLLECTION, card);
      return { success: true, itemId: response.data.itemId };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to add card' 
      };
    }
  }

  // Update card in collection
  async updateCard(
    itemId: string, 
    updates: Partial<CollectionItem>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await api.patch(API_ENDPOINTS.COLLECTION_ITEM(itemId), updates);
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to update card' 
      };
    }
  }

  // Remove card from collection
  async removeCard(itemId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await api.delete(API_ENDPOINTS.COLLECTION_ITEM(itemId));
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to remove card' 
      };
    }
  }
}

export const collectionService = new CollectionService();
