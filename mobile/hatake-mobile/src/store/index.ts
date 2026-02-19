import { create } from 'zustand';
import { User, authService } from '../services/auth';
import { CollectionItem, collectionService } from '../services/collection';
import { MarketplaceListing, marketplaceService } from '../services/marketplace';
import { Trade, tradeService } from '../services/trades';

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Collection
  collection: CollectionItem[];
  collectionLoading: boolean;
  
  // Marketplace
  listings: MarketplaceListing[];
  myListings: MarketplaceListing[];
  marketplaceLoading: boolean;
  
  // Trades
  trades: Trade[];
  tradesLoading: boolean;
  
  // Selected game filter
  selectedGame: 'all' | 'mtg' | 'pokemon';
  
  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setSelectedGame: (game: 'all' | 'mtg' | 'pokemon') => void;
  
  // Auth actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  
  // Collection actions
  fetchCollection: (game?: string) => Promise<void>;
  addToCollection: (card: any) => Promise<{ success: boolean; error?: string }>;
  removeFromCollection: (itemId: string) => Promise<{ success: boolean; error?: string }>;
  
  // Marketplace actions
  fetchListings: (game?: string) => Promise<void>;
  fetchMyListings: () => Promise<void>;
  createListing: (listing: any) => Promise<{ success: boolean; error?: string }>;
  deleteListing: (listingId: string) => Promise<{ success: boolean; error?: string }>;
  
  // Trade actions
  fetchTrades: (status?: string) => Promise<void>;
  createTrade: (trade: any) => Promise<{ success: boolean; error?: string }>;
  updateTradeStatus: (tradeId: string, status: 'accepted' | 'rejected' | 'cancelled') => Promise<{ success: boolean; error?: string }>;
}

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  isLoading: true,
  collection: [],
  collectionLoading: false,
  listings: [],
  myListings: [],
  marketplaceLoading: false,
  trades: [],
  tradesLoading: false,
  selectedGame: 'all',
  
  // Basic setters
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setLoading: (loading) => set({ isLoading: loading }),
  setSelectedGame: (game) => set({ selectedGame: game }),
  
  // Auth actions
  login: async (email, password) => {
    set({ isLoading: true });
    const result = await authService.login({ email, password });
    if (result.success && result.user) {
      set({ user: result.user, isAuthenticated: true });
    }
    set({ isLoading: false });
    return result;
  },
  
  register: async (email, password, name) => {
    set({ isLoading: true });
    const result = await authService.register({ email, password, name });
    if (result.success && result.user) {
      set({ user: result.user, isAuthenticated: true });
    }
    set({ isLoading: false });
    return result;
  },
  
  logout: async () => {
    await authService.logout();
    set({ 
      user: null, 
      isAuthenticated: false,
      collection: [],
      myListings: [],
      trades: []
    });
  },
  
  restoreSession: async () => {
    set({ isLoading: true });
    const user = await authService.restoreSession();
    set({ 
      user, 
      isAuthenticated: !!user,
      isLoading: false 
    });
  },
  
  // Collection actions
  fetchCollection: async (game) => {
    set({ collectionLoading: true });
    const collection = await collectionService.getCollection(game);
    set({ collection, collectionLoading: false });
  },
  
  addToCollection: async (card) => {
    const result = await collectionService.addCard(card);
    if (result.success) {
      await get().fetchCollection();
    }
    return result;
  },
  
  removeFromCollection: async (itemId) => {
    const result = await collectionService.removeCard(itemId);
    if (result.success) {
      set({ collection: get().collection.filter(c => c.item_id !== itemId) });
    }
    return result;
  },
  
  // Marketplace actions
  fetchListings: async (game) => {
    set({ marketplaceLoading: true });
    const listings = await marketplaceService.getListings({ game });
    set({ listings, marketplaceLoading: false });
  },
  
  fetchMyListings: async () => {
    const myListings = await marketplaceService.getMyListings();
    set({ myListings });
  },
  
  createListing: async (listing) => {
    const result = await marketplaceService.createListing(listing);
    if (result.success) {
      await get().fetchMyListings();
    }
    return result;
  },
  
  deleteListing: async (listingId) => {
    const result = await marketplaceService.deleteListing(listingId);
    if (result.success) {
      set({ myListings: get().myListings.filter(l => l.listing_id !== listingId) });
    }
    return result;
  },
  
  // Trade actions
  fetchTrades: async (status) => {
    set({ tradesLoading: true });
    const trades = await tradeService.getTrades(status);
    set({ trades, tradesLoading: false });
  },
  
  createTrade: async (trade) => {
    const result = await tradeService.createTrade(trade);
    if (result.success) {
      await get().fetchTrades();
    }
    return result;
  },
  
  updateTradeStatus: async (tradeId, status) => {
    const result = await tradeService.updateTradeStatus(tradeId, status);
    if (result.success) {
      await get().fetchTrades();
    }
    return result;
  },
}));
