// API Configuration
// Update this to your production API URL when deploying
export const API_BASE_URL = 'https://hatake.eu';

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/signup',  // Backend uses 'signup' not 'register'
  LOGOUT: '/api/auth/logout',
  ME: '/api/auth/me',
  GOOGLE_AUTH: '/api/auth/google',
  
  // Collection
  COLLECTION: '/api/collection',
  COLLECTION_ITEM: (id: string) => `/api/collection/${id}`,
  COLLECTION_IMPORT: '/api/collection/import',
  
  // Search
  SEARCH: '/api/search',
  
  // Marketplace
  MARKETPLACE: '/api/marketplace',
  MARKETPLACE_ITEM: (id: string) => `/api/marketplace/${id}`,
  MY_LISTINGS: '/api/marketplace/my-listings',
  
  // Trades
  TRADES: '/api/trades',
  TRADE: (id: string) => `/api/trades/${id}`,
  
  // Sealed Products
  SEALED: '/api/sealed',
  SEALED_ITEM: (id: string) => `/api/sealed/${id}`,
  
  // Wishlists
  WISHLISTS: '/api/wishlists',
  WISHLIST: (id: string) => `/api/wishlists/${id}`,
  
  // Messages
  CONVERSATIONS: '/api/conversations',
  MESSAGES: (id: string) => `/api/messages/${id}`,
  
  // Notifications
  NOTIFICATIONS: '/api/notifications',
};

export const SCRYFALL_API = 'https://api.scryfall.com';
export const TCGDEX_API = 'https://api.tcgdex.net/v2/en';
