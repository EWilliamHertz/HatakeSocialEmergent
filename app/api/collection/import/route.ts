import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import sql from '@/lib/db';
import { fetchScryfallCached, fetchTCGdexCached } from '@/lib/api-cache';

// --- Interfaces ---

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

// --- Helper Functions ---

function detectFormat(headers: string[]): 'manabox' | 'pokemon' | 'unknown' {
  const headerSet = new Set(headers.map(h => h.toLowerCase().trim()));
  
  // ManaBox unique headers
  if (headerSet.has('manabox id') || headerSet.has('scryfall id')) return 'manabox';
  
  // Pokemon Export unique headers
  if (headerSet.has('edition name') && headerSet.has('set code')) return 'pokemon';
  
  return 'unknown';
}

function mapCondition(condition: string | undefined): string {
  if (!condition) return 'Near Mint';
  const c = condition.toLowerCase().trim();
  if (c.includes('near') || c === 'nm') return 'Near Mint';
  if (c.includes('light') || c === 'lp') return 'Lightly Played';
  if (c.includes('moderate') || c === 'mp') return 'Moderately Played';
  if (c.includes('heavy') || c === 'hp') return 'Heavily Played';
  if (c.includes('damag') || c === 'dmg') return 'Damaged';
  return 'Near Mint';
}

function parseCSV(csvText: string) {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return { cards: [], format: 'unknown' };

  // Parse Headers
  const headers = lines[0].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map(h => h.replace(/^"|"$/g, '').trim()) || [];
  const format = detectFormat(headers);

  const cards = [];

  for (let i = 1; i < lines.length; i++) {
    // Regex to split by comma ONLY if not inside quotes
    const values = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/^"|"$/g, '').trim()) || [];
    
    if (values.length === 0) continue;

    const card: any = {};
    headers.forEach((h, index) => {
      card[h] = values[index] || '';
    });
    cards.push(card);
  }

  return { cards, format };
}

// --- Main Route Handler ---

export async function POST(request: NextRequest) {
  try {
    // 1. Auth Check
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const user = await getSessionUser(sessionToken);
    if (!user) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    // 2. Parse Request
    const body = await request.json();
    const { csvContent, action, gameType } = body;

    if (!csvContent) return NextResponse.json({ error: 'No CSV content' }, { status: 400 });

    const { cards, format } = parseCSV(csvContent);
    const actualFormat = format === 'unknown' ? (gameType === 'pokemon' ? 'pokemon' : 'manabox') : format;

    // 3. Handle PREVIEW Action
    if (action === 'preview') {
      const previewCards = cards.slice(0, 50).map(card => { // Limit preview to 50
        if (actualFormat === 'pokemon') {
          return {
            name: card['Name'],
            setCode: card['Set Code'],
            setName: card['Edition Name'],
            collectorNumber: card['Collector Number'],
            quantity: parseInt(card['Quantity']) || 1,
            price: parseFloat(card['Price']) || 0,
            condition: mapCondition(card['Condition']),
            game: 'pokemon'
          };
        } else {
          return {
            name: card['Name'],
            setCode: card['Set code'],
            setName: card['Set name'],
            collectorNumber: card['Collector number'],
            quantity: parseInt(card['Quantity']) || 1,
            price: parseFloat(card['Purchase price']) || 0,
            condition: mapCondition(card['Condition']),
            game: 'mtg'
          };
        }
      });
      return NextResponse.json({ success: true, cards: previewCards, format: actualFormat });
    }

    // 4. Handle IMPORT Action
    if (action === 'import') {
      let imported = 0;
      let errors = [];

      for (const card of cards) {
        try {
          let cardData: any = null;
          let cardId: string;
          let game = actualFormat === 'pokemon' ? 'pokemon' : 'mtg';
          let quantity = parseInt(card['Quantity']) || 1;
          let purchasePrice = parseFloat(card[actualFormat === 'pokemon' ? 'Price' : 'Purchase price']) || 0;
          let condition = mapCondition(card['Condition']);
          
          if (game === 'pokemon') {
            const name = card['Name'];
            const setCode = card['Set Code'] || '';
            const collectorNum = card['Collector Number'] || '';
            
            // Generate a temporary ID in case API fails
            const cleanSet = setCode.toLowerCase().replace(/[^a-z0-9]/g, '');
            const cleanNum = collectorNum.toLowerCase().replace(/[^a-z0-9]/g, '');
            cardId = `${cleanSet}-${cleanNum}`;

            // --- TCGDex API Fetch ---
            let tcgdexData = null;
            
            // Strategy A: Direct ID fetch
            if (cleanSet && cleanNum) {
               tcgdexData = await fetchTCGdexCached(`https://api.tcgdex.net/v2/en/cards/${cardId}`);
            }

            // Strategy B: Search by Name (Fallback)
            if (!tcgdexData && name) {
               console.log(`[Import] Searching fallback for: ${name}`);
               const searchResults = await fetchTCGdexCached(`https://api.tcgdex.net/v2/en/cards?name=${encodeURIComponent(name)}`);
               if (Array.isArray(searchResults)) {
                 // Try to find matching set
                 tcgdexData = searchResults.find((c: any) => 
                   c.localId === collectorNum || 
                   (c.set?.id && c.set.id.toLowerCase() === cleanSet)
                 );
                 // If strict match fails, just take the first result with matching name
                 if (!tcgdexData) tcgdexData = searchResults[0];
                 
                 if (tcgdexData) cardId = tcgdexData.id; // Update ID to real API ID
               }
            }

            // Construct Data
            const imageBase = tcgdexData?.image;
            cardData = {
              id: cardId,
              name: name || tcgdexData?.name,
              set: { id: setCode, name: card['Edition Name'] || tcgdexData?.set?.name },
              localId: collectorNum,
              // FIX: Ensure images object exists for frontend
              images: imageBase ? { 
                small: `${imageBase}/low.webp`, 
                large: `${imageBase}/high.webp` 
              } : null,
              // FIX: Use CSV price if API price is missing
              cardmarket: { 
                prices: { 
                  averageSellPrice: purchasePrice 
                } 
              },
              tcgplayer: {
                prices: {
                   holofoil: { market: purchasePrice },
                   normal: { market: purchasePrice }
                }
              },
              purchase_price: purchasePrice
            };

          } else {
             // MTG Logic (Keep existing logic if working, or simplified here)
             const name = card['Name'];
             const setCode = card['Set code'];
             const collectorNum = card['Collector number'];
             cardId = card['Scryfall ID'] || `${setCode?.toLowerCase()}-${collectorNum}`;

             // Simple Scryfall fetch
             let scryfallData = null;
             if (card['Scryfall ID']) {
                scryfallData = await fetchScryfallCached(`https://api.scryfall.com/cards/${card['Scryfall ID']}`);
             }

             cardData = {
               id: cardId,
               name: name,
               set: setCode,
               set_name: card['Set name'],
               collector_number: collectorNum,
               image_uris: scryfallData?.image_uris || null,
               prices: scryfallData?.prices || null,
               purchase_price: purchasePrice
             };
          }

          // SQL Insert
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
              ${card['Foil'] === 'true' || card['Foil'] === 'foil'},
              'Imported via CSV'
            )
          `;
          imported++;

        } catch (e: any) {
          console.error(`Failed to import ${card['Name']}:`, e.message);
          errors.push(`Row ${imported + 1}: ${e.message}`);
        }
      }

      return NextResponse.json({ success: true, imported, errors });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}