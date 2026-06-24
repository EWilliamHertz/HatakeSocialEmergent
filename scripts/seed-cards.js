const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function fetchMtgCards() {
  console.log('Fetching MTG cards from Scryfall...');
  
  // We'll just fetch a few iconic cards for demonstration because the full Scryfall bulk data is massive.
  const cardsToFetch = [
    'Black Lotus',
    'Lightning Bolt',
    'Jace, the Mind Sculptor',
    'Tarmogoyf',
    'Force of Will'
  ];

  for (const cardName of cardsToFetch) {
    try {
      const encodedName = encodeURIComponent(cardName);
      const res = await fetch(`https://api.scryfall.com/cards/named?exact=${encodedName}`, {
        headers: { 'User-Agent': 'HatakeSocial/1.0' }
      });
      if (!res.ok) {
        console.error(`Scryfall API returned ${res.status} for ${cardName}`);
        continue;
      }
      
      const cardData = await res.json();
      
      await prisma.cardReference.upsert({
        where: { apiId: cardData.id },
        update: {},
        create: {
          game: 'MTG',
          apiId: cardData.id,
          name: cardData.name,
          imageUrl: cardData.image_uris?.normal || '',
          setCode: cardData.set,
          rarity: cardData.rarity,
          apiPayload: cardData,
        }
      });
      console.log(`✓ Added MTG card: ${cardData.name} ($${cardData.prices.usd || 0})`);
    } catch (e) {
      console.error(`Failed to fetch ${cardName}`, e);
    }
  }
}

async function fetchPokemonCards() {
  console.log('Fetching Pokémon cards from Pokémon TCG API...');
  
  try {
    const res = await fetch('https://api.pokemontcg.io/v2/cards?q=set.id:base1&pageSize=5', {
      headers: {
        'X-Api-Key': 'YOUR_POKEMON_API_KEY_HERE' // Optional for small requests
      }
    });
    if (!res.ok) throw new Error('Pokemon API returned ' + res.status);
    
    const data = await res.json();
    for (const cardData of data.data) {
      await prisma.cardReference.upsert({
        where: { apiId: cardData.id },
        update: {},
        create: {
          game: 'POKEMON',
          apiId: cardData.id,
          name: cardData.name,
          imageUrl: cardData.images.large || cardData.images.small || '',
          setCode: cardData.set.id,
          rarity: cardData.rarity,
          apiPayload: cardData,
        }
      });
      console.log(`✓ Added Pokémon card: ${cardData.name}`);
    }
  } catch (e) {
    console.error('Failed to fetch Pokemon cards', e);
  }
}

async function main() {
  await fetchMtgCards();
  await fetchPokemonCards();
  console.log('Finished seeding CardReference database.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
