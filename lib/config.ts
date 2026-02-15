export const config = {
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  pokemon: {
    apiKey: process.env.POKEMON_TCG_API_KEY || '',
    baseUrl: 'https://api.pokemontcg.io/v2',
  },
  scryfall: {
    baseUrl: process.env.SCRYFALL_API_BASE || 'https://api.scryfall.com',
  },
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
  features: {
    social: process.env.NEXT_PUBLIC_ENABLE_SOCIAL === 'true',
    marketplace: process.env.NEXT_PUBLIC_ENABLE_MARKETPLACE === 'true',
    trades: process.env.NEXT_PUBLIC_ENABLE_TRADES === 'true',
  },
};