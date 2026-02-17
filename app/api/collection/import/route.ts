import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import sql from '@/lib/db';
import { fetchScryfallCached, fetchTCGdexCached } from '@/lib/api-cache';

// ManaBox format (MTG)
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

// Pokemon Export format
interface PokemonExportCard {
  Name: string;
  'Set Code': string;
  'Edition Name': string;
  'Collector Number': string;
  'Release Date': string;
  Price: string;
  Condition: string;
  Quantity: string;
}

type ParsedCard = ManaBoxCard | PokemonExportCard;

function detectFormat(headers: string[]): 'manabox' | 'pokemon' | 'unknown' {
  const headerSet = new Set(headers.map(h => h.toLowerCase().trim()));
  
  // ManaBox has specific headers
  if (headerSet.has('scryfall id') || headerSet.has('manabox id') || headerSet.has('purchase price currency')) {
    return 'manabox';
  }
  
  // Pokemon export has "Edition Name" and "Release Date"
  if (headerSet.has('edition name') || headerSet.has('release date')) {
    return 'pokemon';
  }
  
  // Fallback: if has "Set code" without Scryfall ID, might be custom
  if (headerSet.has('set code') && !headerSet.has('scryfall id')) {
    return 'pokemon';
  }
  
  return 'manabox'; // default
}

function parseCSV(csvText: string): { cards: any[], format: 'manabox' | 'pokemon' | 'unknown' } {
  console.log('[CSV Import] Starting CSV parse, length:', csvText.length);
  
  const lines = csvText.split('\n').filter(line => line.trim());
  console.log('[CSV Import] Found', lines.length, 'lines');
  
  if (lines.length < 2) {
    console.log('[CSV Import] Not enough lines, returning empty');
    return { cards: [], format: 'unknown' };
  }
  
  // Parse headers - handle both quoted and unquoted headers
  const headerLine = lines[0];
  const headers: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (const char of headerLine) {
    if (char === '"' && !inQuotes) {
      inQuotes = true;
    } else if (char === '"' && inQuotes) {
      inQuotes = false;
    } else if (char === ',' && !inQuotes) {
      headers.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  headers.push(current.trim().replace(/^"|"$/g, ''));
  
  console.log('[CSV Import] Parsed headers:', headers);
  
  const format = detectFormat(headers);
  console.log('[CSV Import] Detected format:', format);
  
  const cards: any[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let val = '';
    let inQuotes = false;
    
    for (const char of lines[i]) {
      if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === '"' && inQuotes) {
        inQuotes = false;
      } else if (char === ',' && !inQuotes) {
        values.push(val.trim().replace(/^"|"$/g, ''));
        val = '';
      } else {
        val += char;
      }
    }
    values.push(val.trim().replace(/^"|"$/g, ''));
    
    const card: any = {};
    headers.forEach((header, index) => {
      card[header] = values[index] || '';
    });
    
    // Log first card for debugging
    if (i === 1) {
      console.log('[CSV Import] First card parsed:', JSON.stringify(card));
    }
    
    cards.push(card);
  }
  
  console.log('[CSV Import] Parsed', cards.length, 'cards');
  return { cards, format };
}

function mapCondition(condition: string | undefined): string {
  if (!condition) return 'Near Mint';
  const conditionMap: { [key: string]: string } = {
    'near_mint': 'Near Mint',
    'near mint': 'Near Mint',
    'lightly_played': 'Lightly Played', 
    'lightly played': 'Lightly Played', 
    'moderately_played': 'Moderately Played',
    'moderately played': 'Moderately Played',
    'heavily_played': 'Heavily Played',
    'heavily played': 'Heavily Played',
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
    const { csvContent, action, gameType } = body;

    console.log('[CSV Import] Action:', action, 'GameType:', gameType);
    console.log('[CSV Import] CSV content length:', csvContent?.length || 0);

    if (!csvContent) {
      return NextResponse.json({ error: 'No CSV content provided' }, { status: 400 });
    }

    const { cards, format: detectedFormat } = parseCSV(csvContent);
    // IMPORTANT: For actual data parsing, use the detected format from CSV headers
    // The gameType is only for determining the game (pokemon vs mtg) when importing
    // If user says "pokemon" but CSV is manabox format, we import as MTG because that's what the data is
    const actualFormat = detectedFormat; // Use detected format for column access
    const targetGame = gameType || (detectedFormat === 'pokemon' ? 'pokemon' : 'mtg');
    console.log('[CSV Import] Total cards parsed:', cards.length, 'Detected format:', detectedFormat, 'Target game:', targetGame);

    if (action === 'preview') {
      // Return parsed cards for preview
      const previewCards = cards.map(card => {
        if (actualFormat === 'pokemon') {
          // Pokemon export format
          return {
            name: card['Name'] || 'Unknown Card',
            setCode: card['Set Code'] || '',
            setName: card['Edition Name'] || '',
            collectorNumber: card['Collector Number'] || '',
            foil: false,
            rarity: '',
            quantity: parseInt(card['Quantity']) || 1,
            scryfallId: '',
            purchasePrice: parseFloat(card['Price']) || 0,
            currency: 'USD', // Pokemon prices are typically USD from TCGPlayer
            condition: mapCondition(card['Condition']),
            language: 'English',
            misprint: false,
            altered: false,
            game: 'pokemon'
          };
        } else {
          // ManaBox format (MTG)
          return {
            name: card['Name'] || 'Unknown Card',
            setCode: card['Set code'] || '',
            setName: card['Set name'] || '',
            collectorNumber: card['Collector number'] || '',
            foil: card['Foil'] === 'foil',
            rarity: card['Rarity'] || '',
            quantity: parseInt(card['Quantity']) || 1,
            scryfallId: card['Scryfall ID'] || '',
            purchasePrice: parseFloat(card['Purchase price']) || 0,
            currency: card['Purchase price currency'] || 'USD',
            condition: mapCondition(card['Condition']),
            language: card['Language'] || 'English',
            misprint: card['Misprint'] === 'true',
            altered: card['Altered'] === 'true',
            game: 'mtg'
          };
        }
      });

      console.log('[CSV Import] Preview ready, first card:', previewCards[0]);

      return NextResponse.json({ 
        success: true, 
        cards: previewCards,
        totalCards: previewCards.length,
        totalQuantity: previewCards.reduce((sum, c) => sum + c.quantity, 0),
        format: detectedFormat
      });
    }

    if (action === 'import') {
      // Actually import the cards
      let imported = 0;
      let errors: string[] = [];

      console.log('[CSV Import] Starting import of', cards.length, 'cards, format:', actualFormat, 'game:', targetGame);

      for (let idx = 0; idx < cards.length; idx++) {
        const card = cards[idx];
        
        try {
          let cardData: any = null;
          let cardId: string;
          let game: string;
          let name: string;
          let setCode: string;
          let collectorNum: string;
          let quantity: number;
          let isFoil: boolean;
          let condition: string;
          let purchasePrice: number;
          let currency: string;
          
          if (actualFormat === 'pokemon') {
            // Pokemon export format
            game = 'pokemon';
            name = card['Name'] || '';
            setCode = card['Set Code'] || '';
            collectorNum = card['Collector Number'] || '';
            quantity = parseInt(card['Quantity']) || 1;
            isFoil = false;
            condition = mapCondition(card['Condition']);
            purchasePrice = parseFloat(card['Price']) || 0;
            currency = 'USD';
            
            // Build card ID for Pokemon
            cardId = setCode && collectorNum ? `${setCode.toLowerCase()}-${collectorNum}` : `pokemon-${Date.now()}-${idx}`;
            
            // Log key fields for debugging
            console.log(`[CSV Import] Processing Pokemon card ${idx + 1}:`, { name, setCode, collectorNum });
            
            // Try to fetch from TCGdex (with caching)
            let tcgdexData = null;
            if (setCode && collectorNum) {
              tcgdexData = await fetchTCGdexCached(`https://api.tcgdex.net/v2/en/cards/${setCode.toLowerCase()}-${collectorNum}`);
              if (tcgdexData) {
                console.log('[CSV Import] TCGdex fetch success for', name);
              }
            }
            
            // Build card data
            cardData = {
              id: cardId,
              name: name || tcgdexData?.name || 'Unknown Card',
              set: { id: setCode, name: card['Edition Name'] || '' },
              localId: collectorNum,
              image: tcgdexData?.image ? `${tcgdexData.image}/high.webp` : null,
              prices: tcgdexData?.prices || { firstEdition: { mid: purchasePrice } },
              purchase_price: purchasePrice,
              purchase_currency: currency
            };
          } else {
            // ManaBox format (MTG)
            game = 'mtg';
            name = card['Name'] || '';
            setCode = card['Set code'] || '';
            collectorNum = card['Collector number'] || '';
            quantity = parseInt(card['Quantity']) || 1;
            isFoil = card['Foil'] === 'foil';
            condition = mapCondition(card['Condition']);
            purchasePrice = parseFloat(card['Purchase price']) || 0;
            currency = card['Purchase price currency'] || 'USD';
            
            const scryfallId = card['Scryfall ID']?.trim();
            
            // Build card_id
            if (scryfallId) {
              cardId = scryfallId;
            } else if (setCode && collectorNum) {
              cardId = `${setCode}-${collectorNum}`;
            } else {
              cardId = `mtg-${Date.now()}-${idx}`;
            }
            
            console.log(`[CSV Import] Processing MTG card ${idx + 1}:`, { name, setCode, collectorNum, scryfallId });

            // Fetch card data from Scryfall using the Scryfall ID (with caching)
            let scryfallData = null;
            if (scryfallId) {
              console.log('[CSV Import] Fetching from Scryfall by ID:', scryfallId);
              scryfallData = await fetchScryfallCached(`https://api.scryfall.com/cards/${scryfallId}`);
              if (scryfallData) {
                console.log('[CSV Import] Scryfall fetch success for', name);
              }
            }

            // If no Scryfall data, search by name and set
            if (!scryfallData && name && setCode) {
              const searchQuery = encodeURIComponent(`!"${name}" set:${setCode}`);
              console.log('[CSV Import] Searching Scryfall by name/set');
              const searchResult = await fetchScryfallCached(`https://api.scryfall.com/cards/search?q=${searchQuery}`);
              if (searchResult?.data?.length > 0) {
                scryfallData = searchResult.data[0];
                console.log('[CSV Import] Scryfall search success for', name);
              }
            }

            // Build card_data object to store in JSONB
            cardData = {
              id: cardId,
              name: name || scryfallData?.name || 'Unknown Card',
              set: setCode,
              set_name: card['Set name'] || scryfallData?.set_name || '',
              collector_number: collectorNum,
              rarity: card['Rarity'] || scryfallData?.rarity || '',
              language: card['Language'] || 'English',
              image_uris: scryfallData?.image_uris || {
                small: scryfallData?.card_faces?.[0]?.image_uris?.small || null,
                normal: scryfallData?.card_faces?.[0]?.image_uris?.normal || null,
                large: scryfallData?.card_faces?.[0]?.image_uris?.large || null,
              },
              prices: scryfallData?.prices || null,
              purchase_price: purchasePrice,
              purchase_currency: currency,
              misprint: card['Misprint'] === 'true',
              altered: card['Altered'] === 'true',
            };
          }

          console.log('[CSV Import] Inserting card with data:', {
            cardId,
            game,
            name: cardData.name,
            hasImage: actualFormat === 'pokemon' ? !!cardData.image : !!cardData.image_uris?.normal
          });

          // Insert into collection_items table
          await sql`
            INSERT INTO collection_items (
              user_id, card_id, game, card_data, quantity, condition, foil, notes
            ) VALUES (
              ${user.user_id},
              ${cardId},
              ${game},
              ${JSON.stringify(cardData)},
              ${quantity},
              ${condition},
              ${isFoil},
              ${card['Altered'] === 'true' ? 'Altered card' : (card['Misprint'] === 'true' ? 'Misprint' : null)}
            )
          `;

          imported++;
          console.log('[CSV Import] Successfully imported card', imported, ':', name);
          
          // Add small delay to avoid rate limiting
          if (imported % 10 === 0) {
            console.log('[CSV Import] Rate limit pause at card', imported);
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (err: any) {
          console.error('[CSV Import] Import error for card:', card['Name'] || card['name'], err.message);
          errors.push(`Failed to import ${card['Name'] || card['name'] || 'Unknown'}: ${err.message}`);
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
