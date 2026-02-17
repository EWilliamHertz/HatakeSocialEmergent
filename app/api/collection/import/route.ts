import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
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
  console.log('[CSV Import] Starting CSV parse, length:', csvText.length);
  
  const lines = csvText.split('\n').filter(line => line.trim());
  console.log('[CSV Import] Found', lines.length, 'lines');
  
  if (lines.length < 2) {
    console.log('[CSV Import] Not enough lines, returning empty');
    return [];
  }
  
  // Parse headers - handle both quoted and unquoted headers
  const headerLine = lines[0];
  const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  console.log('[CSV Import] Parsed headers:', headers);
  
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
    
    // Log first card for debugging
    if (i === 1) {
      console.log('[CSV Import] First card parsed:', JSON.stringify(card));
    }
    
    cards.push(card as ManaBoxCard);
  }
  
  console.log('[CSV Import] Parsed', cards.length, 'cards');
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
    'mint': 'Mint',
    'nm': 'Near Mint',
    'lp': 'Lightly Played',
    'mp': 'Moderately Played',
    'hp': 'Heavily Played',
    'dmg': 'Damaged',
    'excellent': 'Excellent',
    'good': 'Good',
    'played': 'Played',
    'poor': 'Poor',
  };
  const normalizedCondition = condition.toLowerCase().trim();
  return conditionMap[normalizedCondition] || condition || 'Near Mint';
}

// POST - Preview or Import CSV
export async function POST(request: NextRequest) {
  console.log('[CSV Import] POST request received');
  
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      console.log('[CSV Import] No session token');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const user = await getSessionUser(sessionToken);
    if (!user) {
      console.log('[CSV Import] Invalid session');
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    
    console.log('[CSV Import] User authenticated:', user.user_id);

    const body = await request.json();
    const { csvContent, action } = body;

    console.log('[CSV Import] Action:', action);
    console.log('[CSV Import] CSV content length:', csvContent?.length || 0);

    if (!csvContent) {
      return NextResponse.json({ error: 'No CSV content provided' }, { status: 400 });
    }

    const cards = parseCSV(csvContent);
    console.log('[CSV Import] Total cards parsed:', cards.length);

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

      console.log('[CSV Import] Preview ready, first card:', previewCards[0]);

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

      console.log('[CSV Import] Starting import of', cards.length, 'cards');

      for (let idx = 0; idx < cards.length; idx++) {
        const card = cards[idx];
        
        try {
          // Log key fields for debugging
          console.log(`[CSV Import] Processing card ${idx + 1}:`, {
            name: card.Name,
            setCode: card['Set code'],
            collectorNumber: card['Collector number'],
            scryfallId: card['Scryfall ID']
          });

          // Fetch card data from Scryfall using the Scryfall ID
          let cardData: any = null;
          
          if (card['Scryfall ID']) {
            try {
              console.log('[CSV Import] Fetching from Scryfall by ID:', card['Scryfall ID']);
              const scryfallRes = await fetch(`https://api.scryfall.com/cards/${card['Scryfall ID']}`, {
                signal: AbortSignal.timeout(10000)
              });
              if (scryfallRes.ok) {
                cardData = await scryfallRes.json();
                console.log('[CSV Import] Scryfall fetch success for', card.Name);
              } else {
                console.log('[CSV Import] Scryfall fetch failed, status:', scryfallRes.status);
              }
            } catch (e: any) {
              console.log('[CSV Import] Scryfall fetch error for', card.Name, ':', e.message);
            }
          }

          // If no Scryfall data, search by name and set
          if (!cardData && card.Name && card['Set code']) {
            try {
              const searchQuery = encodeURIComponent(`!"${card.Name}" set:${card['Set code']}`);
              console.log('[CSV Import] Searching Scryfall by name/set:', searchQuery);
              const searchRes = await fetch(`https://api.scryfall.com/cards/search?q=${searchQuery}`, {
                signal: AbortSignal.timeout(10000)
              });
              if (searchRes.ok) {
                const searchData = await searchRes.json();
                if (searchData.data && searchData.data.length > 0) {
                  cardData = searchData.data[0];
                  console.log('[CSV Import] Scryfall search success for', card.Name);
                }
              } else {
                console.log('[CSV Import] Scryfall search failed, status:', searchRes.status);
              }
            } catch (e: any) {
              console.log('[CSV Import] Scryfall search error for', card.Name, ':', e.message);
            }
          }

          const quantity = parseInt(card.Quantity) || 1;
          const isFoil = card.Foil === 'foil';
          const condition = mapCondition(card.Condition);
          const purchasePrice = parseFloat(card['Purchase price']) || 0;
          const currency = card['Purchase price currency'] || 'USD';

          // Build card_id - ensure we have valid values
          const scryfallId = card['Scryfall ID']?.trim();
          const setCode = card['Set code']?.trim();
          const collectorNum = card['Collector number']?.trim();
          
          let cardId: string;
          if (scryfallId) {
            cardId = scryfallId;
          } else if (setCode && collectorNum) {
            cardId = `${setCode}-${collectorNum}`;
          } else {
            // Fallback to name-based ID if nothing else works
            cardId = `manual-${Date.now()}-${idx}`;
            console.log('[CSV Import] Using fallback ID for card:', card.Name);
          }
          
          console.log('[CSV Import] Card ID resolved to:', cardId);

          // Build card_data object to store in JSONB - ensure name is always present
          const cardDataToStore = {
            id: cardId,
            name: card.Name || 'Unknown Card',
            set: setCode || '',
            set_name: card['Set name'] || '',
            collector_number: collectorNum || '',
            rarity: card.Rarity || '',
            language: card.Language || 'English',
            // From Scryfall if available
            image_uris: cardData?.image_uris || {
              small: cardData?.card_faces?.[0]?.image_uris?.small || null,
              normal: cardData?.card_faces?.[0]?.image_uris?.normal || null,
              large: cardData?.card_faces?.[0]?.image_uris?.large || null,
            },
            prices: cardData?.prices || null,
            // Additional metadata
            purchase_price: purchasePrice,
            purchase_currency: currency,
            misprint: card.Misprint === 'true',
            altered: card.Altered === 'true',
          };

          console.log('[CSV Import] Inserting card with data:', {
            cardId,
            name: cardDataToStore.name,
            hasImageUris: !!cardDataToStore.image_uris?.normal
          });

          // Insert into collection_items table
          await sql`
            INSERT INTO collection_items (
              user_id, card_id, game, card_data, quantity, condition, foil, notes
            ) VALUES (
              ${user.user_id},
              ${cardId},
              'mtg',
              ${JSON.stringify(cardDataToStore)},
              ${quantity},
              ${condition},
              ${isFoil},
              ${card.Altered === 'true' ? 'Altered card' : (card.Misprint === 'true' ? 'Misprint' : null)}
            )
          `;

          imported++;
          console.log('[CSV Import] Successfully imported card', imported, ':', card.Name);
          
          // Add small delay to avoid rate limiting from Scryfall
          if (imported % 10 === 0) {
            console.log('[CSV Import] Rate limit pause at card', imported);
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        } catch (err: any) {
          console.error('[CSV Import] Import error for card:', card.Name, err.message, err.stack);
          errors.push(`Failed to import ${card.Name || 'Unknown'}: ${err.message}`);
        }
      }

      console.log('[CSV Import] Import complete. Imported:', imported, 'Errors:', errors.length);

      return NextResponse.json({ 
        success: true, 
        imported,
        errors: errors.length > 0 ? errors : undefined
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('[CSV Import] Fatal error:', error.message, error.stack);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
