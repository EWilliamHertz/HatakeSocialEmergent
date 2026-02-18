import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import sql from '@/lib/db';
import { fetchScryfallCached, fetchTCGdexCached } from '@/lib/api-cache';

// --- Helper Functions ---

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
  const lines = csvText.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return { cards: [], format: 'unknown' };

  // Robust Header Parsing
  const headerRegex = /(?:\"([^\"]*(?:\"\"[^\"]*)*)\")|([^\",]+)/g;
  const headers: string[] = [];
  let match;
  while ((match = headerRegex.exec(lines[0])) !== null) {
    headers.push((match[1] || match[2]).trim());
  }

  const headerSet = new Set(headers.map(h => h.toLowerCase()));
  let format: 'manabox' | 'pokemon' | 'unknown' = 'unknown';
  
  if (headerSet.has('manabox id') || headerSet.has('scryfall id')) format = 'manabox';
  else if (headerSet.has('edition name') || headerSet.has('set code')) format = 'pokemon';

  const cards = [];

  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    headerRegex.lastIndex = 0;
    while ((match = headerRegex.exec(lines[i])) !== null) {
      values.push((match[1] || match[2] || '').trim());
    }
    if (values.length === 0) continue;
    const card: any = {};
    headers.forEach((h, index) => { card[h] = values[index] || ''; });
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

    // --- IMPORT LOGIC ---
    if (action === 'import') {
      let imported = 0;
      let errors = [];

      for (const card of cards) {
        try {
          let cardData: any = null;
          let cardId: string;
          let game = actualFormat === 'pokemon' ? 'pokemon' : 'mtg';
          let quantity = parseInt(card['Quantity']) || 1;
          // Clean price string (remove currency symbols if present)
          let priceStr = (card[actualFormat === 'pokemon' ? 'Price' : 'Purchase price'] || '0').toString().replace(/[^0-9.]/g, '');
          let purchasePrice = parseFloat(priceStr) || 0;
          let condition = mapCondition(card['Condition']);
          let isFoil = card['Foil'] === 'true' || card['Foil'] === 'foil';

          if (game === 'pokemon') {
            const name = card['Name'];
            const setCode = card['Set Code'] || ''; // e.g. "ASR"
            const setName = card['Edition Name'] || ''; // e.g. "Astral Radiance"
            const collectorNum = card['Collector Number'] || ''; // e.g. "148"
            
            // Clean components for API matching
            const cleanSet = setCode.toLowerCase().replace(/[^a-z0-9]/g, '');
            const cleanNum = collectorNum.replace(/^0+/, ''); 
            
            // Fallback ID
            cardId = `${cleanSet}-${cleanNum}`;

            // --- TCGDex Strategy ---
            let tcgdexData = null;
            
            // 1. Try fetching exact ID (rarely works with CSV export codes)
            tcgdexData = await fetchTCGdexCached(`https://api.tcgdex.net/v2/en/cards/${cleanSet}-${collectorNum}`);
            
            // 2. Search Fallback (Main Strategy)
            if (!tcgdexData && name) {
               const searchResults = await fetchTCGdexCached(`https://api.tcgdex.net/v2/en/cards?name=${encodeURIComponent(name)}`);
               
               if (Array.isArray(searchResults)) {
                 // Find best match in results
                 const match = searchResults.find((c: any) => {
                    const apiSet = (c.set?.name || '').toLowerCase();
                    const csvSet = setName.toLowerCase();
                    // Match if Set Names overlap
                    const setMatch = apiSet && csvSet && (apiSet.includes(csvSet) || csvSet.includes(apiSet));
                    
                    // Match if numbers match (ignoring leading zeros)
                    const resNum = (c.localId || '').toString().replace(/^0+/, '');
                    const numMatch = resNum === cleanNum;

                    return setMatch || numMatch;
                 });

                 if (match) {
                     // IMPORTANT: Fetch the FULL details for the matched card to get the image/price
                     tcgdexData = await fetchTCGdexCached(`https://api.tcgdex.net/v2/en/cards/${match.id}`);
                     if (tcgdexData) cardId = tcgdexData.id;
                 } else if (searchResults.length > 0) {
                     // Loose fallback: take first result if name is exact
                     if (searchResults[0].name.toLowerCase() === name.toLowerCase()) {
                         tcgdexData = await fetchTCGdexCached(`https://api.tcgdex.net/v2/en/cards/${searchResults[0].id}`);
                         if (tcgdexData) cardId = tcgdexData.id;
                     }
                 }
               }
            }

            // Construct Data (With strict Price/Image fallbacks)
            const imageBase = tcgdexData?.image;
            cardData = {
              id: cardId,
              name: name || tcgdexData?.name,
              set: { id: setCode, name: setName || tcgdexData?.set?.name },
              localId: collectorNum,
              // Frontend expects 'images' object
              images: imageBase ? { 
                small: `${imageBase}/low.webp`, 
                large: `${imageBase}/high.webp` 
              } : null,
              // Frontend expects 'pricing' object
              pricing: {
                 cardmarket: {
                    avg: purchasePrice, // Use CSV price
                    trend: purchasePrice
                 }
              },
              purchase_price: purchasePrice
            };

          } else {
             // MTG Logic (Working correctly)
             const name = card['Name'];
             const setCode = card['Set code'];
             const collectorNum = card['Collector number'];
             cardId = card['Scryfall ID'] || `${setCode?.toLowerCase()}-${collectorNum}`;

             let scryfallData = null;
             if (card['Scryfall ID']) {
                scryfallData = await fetchScryfallCached(`https://api.scryfall.com/cards/${card['Scryfall ID']}`);
             } else if (name) {
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
               prices: scryfallData?.prices || { usd: purchasePrice.toString(), eur: purchasePrice.toString() },
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
              ${isFoil},
              'Imported via CSV'
            )
          `;
          imported++;
        } catch (e: any) {
          console.error(`Row error:`, e.message);
          errors.push(`Row ${imported + 1}: ${e.message}`);
        }
      }

      return NextResponse.json({ success: true, imported, errors });
    }

    // Preview Action
    if (action === 'preview') {
       // ... existing preview logic ...
       const previewCards = cards.slice(0, 50).map(card => ({
           name: card['Name'],
           setCode: card[actualFormat === 'pokemon' ? 'Set Code' : 'Set code'],
           game: actualFormat === 'pokemon' ? 'pokemon' : 'mtg',
           quantity: parseInt(card['Quantity']) || 1
       }));
       return NextResponse.json({ success: true, cards: previewCards, format: actualFormat });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}