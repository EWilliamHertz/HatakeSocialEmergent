import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { generateId } from '@/lib/utils';
import sql from '@/lib/db';

interface ManaBoxCard {
  Name: string;
  'Set code': string;
  'Set name': string;
  'Collector number': string;
  Foil: string;
  Rarity: string;
  Quantity: string;
  'ManaBox ID': string;
  'Scryfall ID': string;
  'Purchase price': string;
  Misprint: string;
  Altered: string;
  Condition: string;
  Language: string;
  'Purchase price currency': string;
}

function parseCSV(csvText: string): ManaBoxCard[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const cards: ManaBoxCard[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of lines[i]) {
      if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === '"' && inQuotes) {
        inQuotes = false;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const card: any = {};
    headers.forEach((header, index) => {
      card[header] = values[index] || '';
    });
    cards.push(card as ManaBoxCard);
  }
  
  return cards;
}

function mapCondition(condition: string | undefined): string {
  if (!condition) return 'Near Mint';
  const conditionMap: { [key: string]: string } = {
    'near_mint': 'Near Mint',
    'lightly_played': 'Lightly Played', 
    'moderately_played': 'Moderately Played',
    'heavily_played': 'Heavily Played',
    'damaged': 'Damaged',
    'mint': 'Near Mint',
    'nm': 'Near Mint',
    'lp': 'Lightly Played',
    'mp': 'Moderately Played',
    'hp': 'Heavily Played',
    'dmg': 'Damaged',
  };
  const normalizedCondition = condition.toLowerCase().trim();
  return conditionMap[normalizedCondition] || condition || 'Near Mint';
}

// POST - Preview CSV import
export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const user = await getSessionUser(sessionToken);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const body = await request.json();
    const { csvContent, action } = body;

    if (!csvContent) {
      return NextResponse.json({ error: 'No CSV content provided' }, { status: 400 });
    }

    const cards = parseCSV(csvContent);

    if (action === 'preview') {
      // Return parsed cards for preview
      const previewCards = cards.map(card => ({
        name: card.Name || 'Unknown Card',
        setCode: card['Set code'] || '',
        setName: card['Set name'] || '',
        collectorNumber: card['Collector number'] || '',
        foil: card.Foil === 'foil',
        rarity: card.Rarity || '',
        quantity: parseInt(card.Quantity) || 1,
        scryfallId: card['Scryfall ID'] || '',
        purchasePrice: parseFloat(card['Purchase price']) || 0,
        currency: card['Purchase price currency'] || 'USD',
        condition: mapCondition(card.Condition),
        language: card.Language || 'English',
        misprint: card.Misprint === 'true',
        altered: card.Altered === 'true',
      }));

      return NextResponse.json({ 
        success: true, 
        cards: previewCards,
        totalCards: previewCards.length,
        totalQuantity: previewCards.reduce((sum, c) => sum + c.quantity, 0)
      });
    }

    if (action === 'import') {
      // Actually import the cards
      let imported = 0;
      let errors: string[] = [];

      for (const card of cards) {
        try {
          // Fetch card data from Scryfall using the Scryfall ID
          let cardData: any = null;
          
          if (card['Scryfall ID']) {
            try {
              const scryfallRes = await fetch(`https://api.scryfall.com/cards/${card['Scryfall ID']}`);
              if (scryfallRes.ok) {
                cardData = await scryfallRes.json();
              }
            } catch (e) {
              console.log('Scryfall fetch failed for', card.Name);
            }
          }

          // If no Scryfall data, search by name and set
          if (!cardData && card.Name) {
            try {
              const searchQuery = encodeURIComponent(`!"${card.Name}" set:${card['Set code']}`);
              const searchRes = await fetch(`https://api.scryfall.com/cards/search?q=${searchQuery}`);
              if (searchRes.ok) {
                const searchData = await searchRes.json();
                if (searchData.data && searchData.data.length > 0) {
                  cardData = searchData.data[0];
                }
              }
            } catch (e) {
              console.log('Scryfall search failed for', card.Name);
            }
          }

          // Insert into collection
          const collectionId = generateId('collection');
          const quantity = parseInt(card.Quantity) || 1;
          const isFoil = card.Foil === 'foil';
          const condition = mapCondition(card.Condition);
          const purchasePrice = parseFloat(card['Purchase price']) || null;

          // Get card image and price from Scryfall data
          const imageUrl = cardData?.image_uris?.normal || cardData?.card_faces?.[0]?.image_uris?.normal || null;
          const marketPrice = cardData?.prices?.usd || cardData?.prices?.usd_foil || null;

          await sql`
            INSERT INTO collections (
              collection_id, user_id, card_id, card_name, card_image,
              set_code, set_name, collector_number, quantity, condition,
              is_foil, purchase_price, market_price, notes, game
            ) VALUES (
              ${collectionId}, ${user.user_id}, ${card['Scryfall ID'] || generateId('card')},
              ${card.Name}, ${imageUrl}, ${card['Set code']}, ${card['Set name']},
              ${card['Collector number']}, ${quantity}, ${condition},
              ${isFoil}, ${purchasePrice}, ${marketPrice ? parseFloat(marketPrice) : null},
              ${card.Altered === 'true' ? 'Altered' : (card.Misprint === 'true' ? 'Misprint' : null)},
              'mtg'
            )
          `;

          imported++;
          
          // Add small delay to avoid rate limiting
          if (imported % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (err: any) {
          errors.push(`Failed to import ${card.Name}: ${err.message}`);
        }
      }

      return NextResponse.json({ 
        success: true, 
        imported,
        errors: errors.length > 0 ? errors : undefined
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
