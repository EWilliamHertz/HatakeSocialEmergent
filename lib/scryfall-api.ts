import { config } from './config';

export interface ScryfallCard {
  id: string;
  name: string;
  mana_cost?: string;
  cmc?: number;
  type_line: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  colors?: string[];
  color_identity?: string[];
  keywords?: string[];
  rarity: string;
  set: string;
  set_name: string;
  collector_number: string;
  image_uris?: {
    small: string;
    normal: string;
    large: string;
    png: string;
    art_crop: string;
    border_crop: string;
  };
  prices: {
    usd?: string;
    usd_foil?: string;
    eur?: string;
    eur_foil?: string;
  };
  purchase_uris?: {
    tcgplayer?: string;
    cardmarket?: string;
    cardhoarder?: string;
  };
}

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 100; // 100ms between requests

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => 
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
    );
  }
  
  lastRequestTime = Date.now();
  return fetch(url);
}

export async function searchScryfallCards(
  query: string,
  page: number = 1
): Promise<{ data: ScryfallCard[]; total_cards: number; has_more: boolean }> {
  const url = `${config.scryfall.baseUrl}/cards/search?q=${encodeURIComponent(query)}&page=${page}&unique=prints`;

  const response = await rateLimitedFetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      return { data: [], total_cards: 0, has_more: false };
    }
    throw new Error(`Scryfall API error: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    data: data.data || [],
    total_cards: data.total_cards || 0,
    has_more: data.has_more || false,
  };
}

export async function getScryfallCardById(cardId: string): Promise<ScryfallCard> {
  const url = `${config.scryfall.baseUrl}/cards/${cardId}`;
  const response = await rateLimitedFetch(url);

  if (!response.ok) {
    throw new Error(`Scryfall API error: ${response.statusText}`);
  }

  return response.json();
}

export async function getScryfallCardByName(name: string): Promise<ScryfallCard> {
  const url = `${config.scryfall.baseUrl}/cards/named?exact=${encodeURIComponent(name)}`;
  const response = await rateLimitedFetch(url);

  if (!response.ok) {
    throw new Error(`Scryfall API error: ${response.statusText}`);
  }

  return response.json();
}