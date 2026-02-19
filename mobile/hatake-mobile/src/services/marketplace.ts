import api from './api';
import { API_ENDPOINTS } from './config';

export interface MarketplaceListing {
  listing_id: string;
  user_id: string;
  card_id: string;
  card_data: any;
  game: 'mtg' | 'pokemon';
  price: number;
  currency: string;
  condition: string;
  foil: boolean;
  quantity: number;
  description?: string;
  status: string;
  created_at: string;
  name?: string; // seller name
  picture?: string; // seller picture
}

class MarketplaceService {
  // Get marketplace listings
  async getListings(params?: { 
    game?: string; 
    limit?: number; 
    offset?: number;
    search?: string;
  }): Promise<MarketplaceListing[]> {
    try {
      const response = await api.get(API_ENDPOINTS.MARKETPLACE, { params });
      return response.data.listings || [];
    } catch (error) {
      console.error('Get listings error:', error);
      return [];
    }
  }

  // Get user's own listings
  async getMyListings(): Promise<MarketplaceListing[]> {
    try {
      const response = await api.get(API_ENDPOINTS.MY_LISTINGS);
      return response.data.listings || [];
    } catch (error) {
      console.error('Get my listings error:', error);
      return [];
    }
  }

  // Create a new listing
  async createListing(listing: {
    cardId: string;
    game: string;
    cardData: any;
    price: number;
    pricePercentage?: number; // Optional: set as % of market value
    currency?: string;
    condition?: string;
    foil?: boolean;
    quantity?: number;
    description?: string;
  }): Promise<{ success: boolean; listingId?: string; error?: string }> {
    try {
      const response = await api.post(API_ENDPOINTS.MARKETPLACE, listing);
      return { success: true, listingId: response.data.listingId };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to create listing' 
      };
    }
  }

  // Update a listing
  async updateListing(
    listingId: string, 
    updates: Partial<MarketplaceListing>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await api.patch(API_ENDPOINTS.MARKETPLACE_ITEM(listingId), updates);
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to update listing' 
      };
    }
  }

  // Delete a listing
  async deleteListing(listingId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await api.delete(API_ENDPOINTS.MARKETPLACE_ITEM(listingId));
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to delete listing' 
      };
    }
  }
}

export const marketplaceService = new MarketplaceService();
