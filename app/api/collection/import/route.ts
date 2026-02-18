import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import sql from '@/lib/db';
import { fetchScryfallCached, fetchTCGdexCached } from '@/lib/api-cache';

// --- Interfaces ---

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

// Robust CSV Parser (Handles quoted fields containing commas)
function parseCSV(csvText: string) {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return { cards: [], format: 'unknown' };

  // Parse Header Line
  // This regex matches: quoted strings OR non-comma sequences
  const headerRegex = /(?:\"([^\"]*(?:\"\"[^\"]*)*)\")|([^\",]+)/g;
  const headers: string[] = [];
  let match;
  while ((match = headerRegex.exec(lines[0])) !== null) {
    // match[1] is quoted content, match[2] is unquoted
    headers.push((match[1] || match[2]).trim());
  }

  // Detect Format
  const headerSet = new Set(headers.map(h => h.toLowerCase()));
  let format: 'manabox' | 'pokemon' | 'unknown' = 'unknown';
  
  if (headerSet.has('manabox id') || headerSet.has('scryfall id')) format = 'manabox';
  else if (headerSet.has('edition name') && headerSet.has('set code')) format = 'pokemon';
  else if (headerSet.has('set code')) format = 'pokemon'; // Fallback for simple exports

  const cards = [];

  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    // Reset regex index for each line
    headerRegex.lastIndex = 0;
    
    while ((match = headerRegex.exec(lines[i])) !== null) {
      values.push((match[1] || match[2] || '').trim());
    }

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
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const user = await getSessionUser(sessionToken);
    if (!user) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const body = await request.json();
    const { csvContent, action, gameType } = body;

    if (!csvContent) return NextResponse.json({ error: 'No CSV content' }, { status: 400 });

    const { cards, format } = parseCSV(csvContent);
    const actualFormat = format === 'unknown' ? (gameType === 'pokemon' ? 'pokemon' : 'manabox') : format;

    // --- PREVIEW ---
    if (action === 'preview') {
      const previewCards = cards.slice(0, 50).map(card => {
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

    // --- IMPORT ---
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
          let isFoil = card['Foil'] === 'true' || card['Foil'] === 'foil';

          if (game === 'pokemon') {
            const name = card['Name'];
            const setCode = card['Set Code'] || '';
            const collectorNum = card['Collector Number'] || '';
            
            // Clean ID components
            const cleanSet = setCode.toLowerCase().replace(/[^a-z0-9]/g, '');
            const cleanNum = collectorNum.replace(/^0+/, ''); // Remove leading zeros
            
            // Default ID (Fallback)
            cardId = `${cleanSet}-${cleanNum}`;

            // --- TCGDex API Strategy ---
            let tcgdexData = null;
            
            // 1. Try Direct ID (Exact)
            tcgdexData = await fetchTCGdexCached(`https://api.tcgdex.net/v2/en/cards/${cleanSet}-${collectorNum}`);
            
            // 2. Try Direct ID (No Zeros)
            if (!tcgdexData) {
               tcgdexData = await fetchTCGdexCached(`https://api.tcgdex.net/v2/en/cards/${cleanSet}-${cleanNum}`);
            }

            // 3. Fallback: Search by Name (Crucial for Set Code mismatches like ASR vs swsh10)
            if (!tcgdexData && name) {
               const searchResults = await fetchTCGdexCached(`https://api.tcgdex.net/v2/en/cards?name=${encodeURIComponent(name)}`);
               if (Array.isArray(searchResults)) {
                 // Fuzzy match the set or number
                 tcgdexData = searchResults.find((c: any) => {
                    const resSet = (c.set?.id || c.id.split('-')[0] || '').toLowerCase();
                    const resNum = (c.localId || c.id.split('-').pop() || '').replace(/^0+/, '');
                    
                    // Match number OR set (relaxed matching)
                    return resNum === cleanNum || resSet.includes(cleanSet);
                 });
                 
                 // If no specific match, take the first result (better than nothing)
                 if (!tcgdexData && searchResults.length > 0) tcgdexData = searchResults[0];
                 
                 if (tcgdexData) cardId = tcgdexData.id; // Update to real ID
               }
            }

            // Construct Data with Price Fallback
            const imageBase = tcgdexData?.image;
            cardData = {
              id: cardId,
              name: name || tcgdexData?.name,
              set: { id: setCode, name: card['Edition Name'] || tcgdexData?.set?.name },
              localId: collectorNum,
              images: imageBase ? { 
                small: `${imageBase}/low.webp`, 
                large: `${imageBase}/high.webp` 
              } : null,
              // FORCE the CSV price if API price is missing
              pricing: {
                 cardmarket: {
                    avg: purchasePrice, // Use CSV price here
                    trend: purchasePrice
                 }
              },
              // Legacy structure
              tcgplayer: {
                prices: {
                   holofoil: { market: purchasePrice },
                   normal: { market: purchasePrice }
                }
              },
              purchase_price: purchasePrice
            };

          } else {
             // MTG Logic
             const name = card['Name'];
             const setCode = card['Set code'];
             const collectorNum = card['Collector number'];
             cardId = card['Scryfall ID'] || `${setCode?.toLowerCase()}-${collectorNum}`;

             let scryfallData = null;
             if (card['Scryfall ID']) {
                scryfallData = await fetchScryfallCached(`https://api.scryfall.com/cards/${card['Scryfall ID']}`);
             } else if (name && setCode) {
                // Search fallback for MTG
                const q = encodeURIComponent(`!"${name}" set:${setCode}`);
                const res = await fetchScryfallCached(`https://api.scryfall.com/cards/search?q=${q}`);
                if (res?.data?.length > 0) scryfallData = res.data[0];
             }

             cardData = {
               id: cardId,
               name: name || scryfallData?.name,
               set: setCode,
               set_name: card['Set name'],
               collector_number: collectorNum,
               image_uris: scryfallData?.image_uris || null,
               // FORCE CSV Price fallback
               prices: scryfallData?.prices || {
                 usd: purchasePrice.toString(),
                 eur: purchasePrice.toString()
               },
               purchase_price: purchasePrice
             };
          }

          // Insert
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
              'Imported via CSV'
            )
          `;
          imported++;
        } catch (e: any) {
          console.error(`Row error:`, e.message);
          errors.push(`Row ${imported}: ${e.message}`);
        }
      }

      return NextResponse.json({ success: true, imported, errors });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}