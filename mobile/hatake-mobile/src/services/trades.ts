import api from './api';
import { API_ENDPOINTS } from './config';

export interface Trade {
  trade_id: string;
  initiator_id: string;
  recipient_id: string;
  initiator_cards: any[];
  recipient_cards: any[];
  initiator_cash: number;
  recipient_cash: number;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  initiator_name?: string;
  recipient_name?: string;
}

class TradeService {
  // Get user's trades
  async getTrades(status?: string): Promise<Trade[]> {
    try {
      const params = status ? { status } : {};
      const response = await api.get(API_ENDPOINTS.TRADES, { params });
      return response.data.trades || [];
    } catch (error) {
      console.error('Get trades error:', error);
      return [];
    }
  }

  // Get single trade
  async getTrade(tradeId: string): Promise<Trade | null> {
    try {
      const response = await api.get(API_ENDPOINTS.TRADE(tradeId));
      return response.data.trade;
    } catch (error) {
      console.error('Get trade error:', error);
      return null;
    }
  }

  // Create a new trade
  async createTrade(trade: {
    recipientId: string;
    initiatorCards: string[];
    recipientCards: string[];
    initiatorCash?: number;
    recipientCash?: number;
    message?: string;
  }): Promise<{ success: boolean; tradeId?: string; error?: string }> {
    try {
      const response = await api.post(API_ENDPOINTS.TRADES, trade);
      return { success: true, tradeId: response.data.tradeId };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to create trade' 
      };
    }
  }

  // Update trade status
  async updateTradeStatus(
    tradeId: string, 
    status: 'accepted' | 'rejected' | 'cancelled'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await api.patch(API_ENDPOINTS.TRADE(tradeId), { status });
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to update trade' 
      };
    }
  }

  // Rate a completed trade
  async rateTrade(trade: {
    tradeId: string;
    rating: number;
    comment?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      await api.post('/api/trades/ratings', trade);
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to rate trade' 
      };
    }
  }
}

export const tradeService = new TradeService();
