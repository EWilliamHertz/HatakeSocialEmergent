import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import sql from '@/lib/db';
import { fetchScryfallCached, fetchTCGdexCached } from '@/lib/api-cache';

// --- Helper Functions ---

// Pokemon TCG set code mappings (common export codes -> TCGdex codes)
const POKEMON_SET_ALIASES: Record<string, string> = {
  // Scarlet & Violet Era
  'sv09': 'sv09', 'jtg': 'sv09', // Journey Together
  'sv08': 'sv08', 'ssp': 'sv08', // Surging Sparks
  'sv07': 'sv07', 'scr': 'sv07', // Stellar Crown
  'sv06': 'sv06', 'twm': 'sv06', // Twilight Masquerade
  'sv05': 'sv05', 'tef': 'sv05', // Temporal Forces
  'sv04': 'sv04', 'par': 'sv04', // Paradox Rift
  'sv03': 'sv03', 'obf': 'sv03', // Obsidian Flames
  'sv02': 'sv02', 'pal': 'sv02', // Paldea Evolved
  'sv01': 'sv01', 'svi': 'sv01', // Scarlet & Violet Base
  'svp': 'svp', // SV Promo
  
  // Sword & Shield Era
  'swsh12': 'swsh12', 'crs': 'swsh12', 'sil': 'swsh12', // Crown Zenith / Silver Tempest
  'swsh11': 'swsh11', 'loi': 'swsh11', 'lor': 'swsh11', // Lost Origin
  'swsh10': 'swsh10', 'asr': 'swsh10', // Astral Radiance
  'swsh9': 'swsh9', 'brs': 'swsh9', // Brilliant Stars
  'swsh8': 'swsh8', 'fus': 'swsh8', 'fsn': 'swsh8', // Fusion Strike
  'swsh7': 'swsh7', 'evo': 'swsh7', 'evs': 'swsh7', // Evolving Skies
  'swsh6': 'swsh6', 'cre': 'swsh6', // Chilling Reign
  'swsh5': 'swsh5', 'bst': 'swsh5', // Battle Styles
  'swsh4': 'swsh4', 'viv': 'swsh4', // Vivid Voltage
  'swsh3': 'swsh3', 'dab': 'swsh3', // Darkness Ablaze
  'swsh2': 'swsh2', 'reb': 'swsh2', // Rebel Clash
  'swsh1': 'swsh1', // Sword & Shield Base
  'swshp': 'swshp', // SW&SH Promo
  
  // Sun & Moon Era
  'sm12': 'sm12', 'cec': 'sm12', // Cosmic Eclipse
  'sm11': 'sm11', 'unm': 'sm11', // Unified Minds
  'sm10': 'sm10', 'unb': 'sm10', // Unbroken Bonds
  'sm9': 'sm9', 'det': 'sm9', // Detective Pikachu
  'sm8': 'sm8', 'lot': 'sm8', // Lost Thunder
  'sm7': 'sm7', 'cel': 'sm7', // Celestial Storm
  'sm6': 'sm6', 'fli': 'sm6', // Forbidden Light
  'sm5': 'sm5', 'ula': 'sm5', // Ultra Prism
  'sm4': 'sm4', 'cri': 'sm4', // Crimson Invasion
  'sm3': 'sm3', 'bus': 'sm3', // Burning Shadows
  'sm2': 'sm2', 'gri': 'sm2', // Guardians Rising
  'sm1': 'sm1', // Sun & Moon Base
  'smp': 'smp', // SM Promo
  
  // XY Era
  'xy12': 'xy12', 'evo': 'xy12', // Evolutions
  'xy11': 'xy11', 'stc': 'xy11', // Steam Siege
  'xy10': 'xy10', 'fco': 'xy10', // Fates Collide
  'xy9': 'xy9', 'bkp': 'xy9', // BREAKpoint
  'xy8': 'xy8', 'bkt': 'xy8', // BREAKthrough
  'xy7': 'xy7', 'aor': 'xy7', // Ancient Origins
  'xy6': 'xy6', 'ros': 'xy6', // Roaring Skies
  'xy5': 'xy5', 'prc': 'xy5', // Primal Clash
  'xy4': 'xy4', 'phf': 'xy4', // Phantom Forces
  'xy3': 'xy3', 'ffi': 'xy3', // Furious Fists
  'xy2': 'xy2', 'flf': 'xy2', // Flashfire
  'xy1': 'xy1', // XY Base
  'xyp': 'xyp', // XY Promo
};

// Map a set code from CSV to TCGdex format
function mapPokemonSetCode(setCode: string): string {
  const code = setCode.toLowerCase().replace(/[^a-z0-9]/g, '');
  return POKEMON_SET_ALIASES[code] || code;
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

// Robust CSV Parser (Handles quoted fields containing commas)
function parseCSV(csvText: string) {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return { cards: [], format: 'unknown' };

  // Parse Header Line
  const headerRegex = /(?:\"([^\"]*(?:\"\"[^\"]*)*)\")|([^\",]+)/g;
  const headers: string[] = [];
  let match;
  while ((match = headerRegex.exec(lines[0])) !== null) {
    headers.push((match[1] || match[2]).trim());
  }

  // Detect Format
  const headerSet = new Set(headers.map(h => h.toLowerCase()));
  let format: 'manabox' | 'pokemon' | 'unknown' = 'unknown';
  
  if (headerSet.has('manabox id') || headerSet.has('scryfall id')) format = 'manabox';
  else if (headerSet.has('edition name') && headerSet.has('set code')) format = 'pokemon';
  else if (headerSet.has('set code')) format = 'pokemon'; 

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

    // --- PREVIEW ACTION ---
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

    // --- IMPORT ACTION ---
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
            const setName = card['Edition Name'] || '';
            const collectorNum = card['Collector Number'] || '';
            
            // Map CSV set code to TCGdex format (e.g., ASR -> swsh10)
            const mappedSetCode = mapPokemonSetCode(setCode);
            const cleanNum = collectorNum.replace(/^0+/, ''); 
            
            // Default ID (Fallback)
            cardId = `${mappedSetCode}-${cleanNum}`;

            // --- TCGDex Lookup Strategy ---
            let tcgdexData = null;
            
            // 1. Try with mapped set code + collector number (with/without padding)
            tcgdexData = await fetchTCGdexCached(`https://api.tcgdex.net/v2/en/cards/${mappedSetCode}-${collectorNum}`);
            if (!tcgdexData) {
              tcgdexData = await fetchTCGdexCached(`https://api.tcgdex.net/v2/en/cards/${mappedSetCode}-${cleanNum}`);
            }
            
            // 2. Try Fallback Search by name (Critical for edge cases)
            if (!tcgdexData && name) {
               const searchResults = await fetchTCGdexCached(`https://api.tcgdex.net/v2/en/cards?name=${encodeURIComponent(name)}`);
               if (Array.isArray(searchResults)) {
                 // Fuzzy match: Look for matching Set Name (e.g. "Astral Radiance")
                 tcgdexData = searchResults.find((c: any) => {
                    const apiSet = (c.set?.name || '').toLowerCase();
                    const csvSet = setName.toLowerCase();
                    // Match if CSV set name is inside API set name (or vice versa)
                    return apiSet.includes(csvSet) || csvSet.includes(apiSet);
                 });
                 
                 // If Set Name match fails, try relaxed Number match within same set
                 if (!tcgdexData) {
                    tcgdexData = searchResults.find((c: any) => {
                         const resNum = (c.localId || '').replace(/^0+/, '');
                         return resNum === cleanNum;
                    });
                 }

                 // Last resort: Take first result if name is unique enough
                 if (!tcgdexData && searchResults.length > 0 && searchResults.length < 3) {
                     tcgdexData = searchResults[0];
                 }
                 
                 if (tcgdexData) cardId = tcgdexData.id; // Use the REAL ID from API
               }
            }

            // Construct Data (Force CSV Price if needed)
            const imageBase = tcgdexData?.image;
            
            // Extract prices from TCGdex if available, otherwise use CSV price
            const tcgPrices = tcgdexData?.pricing?.tcgplayer || {};
            const cmPrices = tcgdexData?.pricing?.cardmarket || {};
            
            cardData = {
              id: cardId,
              name: name || tcgdexData?.name,
              set: { id: setCode, name: setName || tcgdexData?.set?.name },
              localId: collectorNum,
              // Include rarity from TCGdex API
              rarity: tcgdexData?.rarity || 'Unknown',
              // FIX: Ensure correct image URL format (TCGdex 'image' field is the base URL)
              images: imageBase ? { 
                small: `${imageBase}/low.webp`, 
                large: `${imageBase}/high.webp` 
              } : null,
              // FIX: Ensure pricing structure matches what the frontend expects
              pricing: {
                 ...tcgdexData?.pricing,
                 cardmarket: {
                    ...cmPrices,
                    avg: cmPrices.avg || purchasePrice,
                    trend: cmPrices.trend || purchasePrice
                 }
              },
              tcgplayer: {
                ...tcgdexData?.pricing?.tcgplayer,
                prices: tcgPrices.normal || tcgPrices.holofoil || {
                   normal: { market: purchasePrice },
                   holofoil: { market: purchasePrice }
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
             } 
             // Search Fallback for MTG (if set code mismatch)
             if (!scryfallData && name && setCode) {
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
               // Force CSV Price for MTG
               prices: scryfallData?.prices || {
                 usd: purchasePrice.toString(),
                 eur: purchasePrice.toString()
               },
               purchase_price: purchasePrice
             };
          }

          // Insert into Database
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

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}