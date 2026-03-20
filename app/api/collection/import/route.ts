import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
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
  'swsh12': 'swsh12', 'crs': 'swsh12', 'sil': 'swsh12',
  'swsh11': 'swsh11', 'loi': 'swsh11', 'lor': 'swsh11',
  'swsh10': 'swsh10', 'asr': 'swsh10',
  'swsh9': 'swsh9', 'brs': 'swsh9',
  'swsh8': 'swsh8', 'fus': 'swsh8', 'fsn': 'swsh8',
  'swsh7': 'swsh7', 'evs': 'swsh7',
  'swsh6': 'swsh6', 'cre': 'swsh6',
  'swsh5': 'swsh5', 'bst': 'swsh5',
  'swsh4': 'swsh4', 'viv': 'swsh4',
  'swsh3': 'swsh3', 'dab': 'swsh3',
  'swsh2': 'swsh2', 'reb': 'swsh2',
  'swsh1': 'swsh1',
  'swshp': 'swshp',
  // Sun & Moon Era
  'sm12': 'sm12', 'cec': 'sm12',
  'sm11': 'sm11', 'unm': 'sm11',
  'sm10': 'sm10', 'unb': 'sm10',
  'sm9': 'sm9', 'det': 'sm9',
  'sm8': 'sm8', 'lot': 'sm8',
  'sm7': 'sm7', 'cel': 'sm7',
  'sm6': 'sm6', 'fli': 'sm6',
  'sm5': 'sm5', 'ula': 'sm5',
  'sm4': 'sm4', 'cri': 'sm4',
  'sm3': 'sm3', 'bus': 'sm3',
  'sm2': 'sm2', 'gri': 'sm2',
  'sm1': 'sm1',
  'smp': 'smp',
  // XY Era
  'xy12': 'xy12', 'evo': 'xy12',
  'xy11': 'xy11', 'stc': 'xy11',
  'xy10': 'xy10', 'fco': 'xy10',
  'xy9': 'xy9', 'bkp': 'xy9',
  'xy8': 'xy8', 'bkt': 'xy8',
  'xy7': 'xy7', 'aor': 'xy7',
  'xy6': 'xy6', 'ros': 'xy6',
  'xy5': 'xy5', 'prc': 'xy5',
  'xy4': 'xy4', 'phf': 'xy4',
  'xy3': 'xy3', 'ffi': 'xy3',
  'xy2': 'xy2', 'flf': 'xy2',
  'xy1': 'xy1',
  'xyp': 'xyp',
};

function mapPokemonSetCode(setCode: string): string {
  const code = setCode.toLowerCase().replace(/[^a-z0-9]/g, '');
  return POKEMON_SET_ALIASES[code] || code;
}

function mapCondition(condition: string | undefined): string {
  if (!condition) return 'Near Mint';
  const c = condition.toLowerCase().trim();
  if (c === 'nm' || c.includes('near mint') || c.includes('near')) return 'Near Mint';
  if (c === 'ex' || c === 'excellent') return 'Excellent';
  if (c === 'gd' || c === 'good') return 'Good';
  if (c === 'lp' || c.includes('light')) return 'Lightly Played';
  if (c === 'mp' || c.includes('moderate')) return 'Moderately Played';
  if (c === 'hp' || c.includes('heavy')) return 'Heavily Played';
  if (c === 'dmg' || c.includes('damag') || c === 'poor') return 'Poor';
  return 'Near Mint';
}

// Robust CSV Parser (Handles quoted fields containing commas)
function parseCSV(csvText: string): {
  cards: Record<string, string>[];
  format: 'cardmarket' | 'manabox' | 'pokemon' | 'unknown';
} {
  let cleanText = csvText;
  if (cleanText.charCodeAt(0) === 0xFEFF) cleanText = cleanText.slice(1);
  cleanText = cleanText.replace(/^\ufeff/, '').replace(/^ï»¿/, '');

  const lines = cleanText.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return { cards: [], format: 'unknown' };

  const headerRegex = /(?:"([^"]*(?:""[^"]*)*)")|([^",]+)/g;
  const headers: string[] = [];
  let match;
  while ((match = headerRegex.exec(lines[0])) !== null) {
    headers.push((match[1] ?? match[2] ?? '').trim());
  }

  const headerSet = new Set(headers.map(h => h.toLowerCase()));

  // Detect format: CardMarket exports have 'cardmarketId' column
  let format: 'cardmarket' | 'manabox' | 'pokemon' | 'unknown' = 'unknown';
  if (headerSet.has('cardmarketid')) format = 'cardmarket';
  else if (headerSet.has('manabox id') || headerSet.has('scryfall id')) format = 'manabox';
  else if (headerSet.has('edition name') && headerSet.has('set code')) format = 'pokemon';
  else if (headerSet.has('set code')) format = 'pokemon';

  const cards: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    headerRegex.lastIndex = 0;
    while ((match = headerRegex.exec(lines[i])) !== null) {
      values.push((match[1] ?? match[2] ?? '').trim());
    }
    if (values.length === 0) continue;
    const card: Record<string, string> = {};
    headers.forEach((h, index) => { card[h] = values[index] ?? ''; });
    cards.push(card);
  }
  return { cards, format };
}

// Batch Scryfall lookup via /cards/collection endpoint (75 cards per request)
async function batchScryfallLookup(
  uniqueCards: Array<{ name: string; setCode: string }>
): Promise<Map<string, any>> {
  const resultMap = new Map<string, any>();
  const BATCH_SIZE = 75;

  for (let i = 0; i < uniqueCards.length; i += BATCH_SIZE) {
    const batch = uniqueCards.slice(i, i + BATCH_SIZE);
    const identifiers = batch.map(c => ({
      name: c.name,
      set: c.setCode.toLowerCase()
    }));

    try {
      const res = await fetch('https://api.scryfall.com/cards/collection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Hatake/1.0'
        },
        body: JSON.stringify({ identifiers })
      });

      if (res.ok) {
        const data = await res.json();
        for (const card of (data.data || [])) {
          const key = `${card.name.toLowerCase()}|${(card.set || '').toUpperCase()}`;
          resultMap.set(key, card);
          // Also index by name alone as fallback
          if (!resultMap.has(card.name.toLowerCase())) {
            resultMap.set(card.name.toLowerCase(), card);
          }
        }
      }
    } catch (e) {
      console.error(`Scryfall batch ${i}–${i + BATCH_SIZE} failed:`, e);
    }

    // Respect Scryfall rate limit (100ms between batches)
    if (i + BATCH_SIZE < uniqueCards.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return resultMap;
}

// --- Main Route Handler ---

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();
    const { csvContent, action, gameType } = body;
    if (!csvContent) return NextResponse.json({ error: 'No CSV content' }, { status: 400 });

    const { cards, format } = parseCSV(csvContent);
    const actualFormat = format === 'unknown'
      ? (gameType === 'pokemon' ? 'pokemon' : 'manabox')
      : format;

    // Helpers to extract name/qty from a row regardless of format
    const getRowName = (card: Record<string, string>): string =>
      actualFormat === 'cardmarket' ? (card['name'] || '') : (card['Name'] || '');
    const getRowQty = (card: Record<string, string>): number =>
      parseInt((actualFormat === 'cardmarket' ? card['quantity'] : card['Quantity']) || '1') || 1;

    // Summary counts (used in both preview and import responses)
    const uniqueCardCount = new Set(cards.map(c => getRowName(c).toLowerCase()).filter(Boolean)).size;
    const totalCopies = cards.reduce((sum, c) => sum + getRowQty(c), 0);

    // --- PREVIEW ACTION ---
    if (action === 'preview') {
      const previewCards = cards.slice(0, 50).map(card => {
        if (actualFormat === 'cardmarket') {
          return {
            name: card['name'] || '',
            setCode: card['setCode'] || '',
            setName: card['set'] || '',
            collectorNumber: card['cn'] || '',
            foil: card['isFoil'] === 'foil' || card['isFoil'] === 'true' || card['isFoil'] === '1',
            rarity: card['rarity'] || '',
            quantity: parseInt(card['quantity']) || 1,
            scryfallId: '',
            purchasePrice: parseFloat(card['price'] || '0') || 0,
            currency: 'EUR',
            condition: mapCondition(card['condition']),
            language: card['language'] || 'English',
            misprint: false,
            altered: false,
          };
        } else if (actualFormat === 'pokemon') {
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
          // manabox
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

      return NextResponse.json({
        success: true,
        preview: previewCards,
        cards: previewCards,
        totalCards: cards.length,
        uniqueCards: uniqueCardCount,
        totalCopies,
        format: actualFormat
      });
    }

    // --- IMPORT ACTION ---
    if (action === 'import') {
      let imported = 0;
      const errors: string[] = [];

      if (actualFormat === 'cardmarket') {
        // ── CardMarket MTG export ──
        // Step 1: Build unique name+setCode list for batch Scryfall lookup
        const uniqueSet = new Map<string, { name: string; setCode: string }>();
        for (const card of cards) {
          const name = card['name'];
          const setCode = card['setCode'] || '';
          if (name) {
            const key = `${name.toLowerCase()}|${setCode.toUpperCase()}`;
            if (!uniqueSet.has(key)) uniqueSet.set(key, { name, setCode });
          }
        }

        // Step 2: Batch Scryfall lookup (uses /cards/collection, 75 at a time)
        const scryfallMap = await batchScryfallLookup(Array.from(uniqueSet.values()));

        // Step 3: Insert each row
        for (const card of cards) {
          try {
            const name = card['name'] || '';
            const setCode = card['setCode'] || '';
            const setName = card['set'] || '';
            const cn = card['cn'] || '';
            const quantity = parseInt(card['quantity']) || 1;
            const isFoil = card['isFoil'] === 'foil' || card['isFoil'] === 'true' || card['isFoil'] === '1';
            const condition = mapCondition(card['condition']);

            const sfKey = `${name.toLowerCase()}|${setCode.toUpperCase()}`;
            const sfData = scryfallMap.get(sfKey) || scryfallMap.get(name.toLowerCase());

            const cardId = sfData?.id
              || `${setCode.toLowerCase()}-${cn || name.slice(0, 20).toLowerCase().replace(/\s+/g, '-')}`;

            const cardData = {
              id: cardId,
              name: sfData?.name || name,
              set_code: sfData?.set?.toUpperCase() || setCode,
              set_name: sfData?.set_name || setName,
              collector_number: sfData?.collector_number || cn,
              rarity: sfData?.rarity || 'unknown',
              type_line: sfData?.type_line || '',
              mana_cost: sfData?.mana_cost || '',
              image_uris: sfData?.image_uris || null,
              prices: sfData?.prices || null,
              purchase_price: parseFloat(card['price'] || '0') || 0,
            };

            await sql`
              INSERT INTO collection_items (
                user_id, card_id, game, card_data, quantity, condition, foil, notes
              ) VALUES (
                ${user.user_id}, ${cardId}, 'mtg', ${JSON.stringify(cardData)},
                ${quantity}, ${condition}, ${isFoil}, 'Imported via CSV'
              )
            `;
            imported++;
          } catch (e: any) {
            console.error(`CardMarket row error:`, e.message);
            errors.push(`Row ${imported + 1}: ${e.message}`);
          }
        }

      } else {
        // ── Existing Pokemon + ManaBox logic ──
        for (const card of cards) {
          try {
            let cardData: any = null;
            let cardId: string;
            let game = actualFormat === 'pokemon' ? 'pokemon' : 'mtg';
            let quantity = parseInt(card['Quantity']) || 1;
            const rawPrice = card[actualFormat === 'pokemon' ? 'Price' : 'Purchase price'] || '0';
            let purchasePrice = parseFloat(rawPrice.toString().replace(',', '.')) || 0;
            let condition = mapCondition(card['Condition']);
            let isFoil = card['Foil'] === 'true' || card['Foil'] === 'foil';

            if (game === 'pokemon') {
              const name = card['Name'];
              const setCode = card['Set Code'] || '';
              const setName = card['Edition Name'] || '';
              const collectorNum = card['Collector Number'] || '';
              const mappedSetCode = mapPokemonSetCode(setCode);
              const cleanNum = collectorNum.replace(/^0+/, '');
              cardId = `${mappedSetCode}-${cleanNum}`;

              let tcgdexData = null;
              tcgdexData = await fetchTCGdexCached(`https://api.tcgdex.net/v2/en/cards/${mappedSetCode}-${collectorNum}`);
              if (!tcgdexData) {
                tcgdexData = await fetchTCGdexCached(`https://api.tcgdex.net/v2/en/cards/${mappedSetCode}-${cleanNum}`);
              }
              if (!tcgdexData && name) {
                const searchResults = await fetchTCGdexCached(`https://api.tcgdex.net/v2/en/cards?name=${encodeURIComponent(name)}`);
                if (Array.isArray(searchResults)) {
                  tcgdexData = searchResults.find((c: any) => {
                    const apiSet = (c.set?.name || '').toLowerCase();
                    const csvSet = setName.toLowerCase();
                    return apiSet.includes(csvSet) || csvSet.includes(apiSet);
                  });
                  if (!tcgdexData) {
                    tcgdexData = searchResults.find((c: any) => {
                      const resNum = (c.localId || '').replace(/^0+/, '');
                      return resNum === cleanNum;
                    });
                  }
                  if (!tcgdexData && searchResults.length > 0 && searchResults.length < 3) {
                    tcgdexData = searchResults[0];
                  }
                  if (tcgdexData) cardId = tcgdexData.id;
                }
              }

              const imageBase = tcgdexData?.image;
              const tcgPrices = tcgdexData?.pricing?.tcgplayer || {};
              const cmPrices = tcgdexData?.pricing?.cardmarket || {};
              cardData = {
                id: cardId,
                name: name || tcgdexData?.name,
                set: { id: setCode, name: setName || tcgdexData?.set?.name },
                localId: collectorNum,
                rarity: tcgdexData?.rarity || 'Unknown',
                images: imageBase ? {
                  small: `${imageBase}/low.webp`,
                  large: `${imageBase}/high.webp`
                } : null,
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
              // ManaBox MTG
              const name = card['Name'];
              const setCode = card['Set code'];
              const collectorNum = card['Collector number'];
              cardId = card['Scryfall ID'] || `${setCode?.toLowerCase()}-${collectorNum}`;

              let scryfallData = null;
              if (card['Scryfall ID']) {
                scryfallData = await fetchScryfallCached(`https://api.scryfall.com/cards/${card['Scryfall ID']}`);
              }
              if (!scryfallData && name && setCode) {
                const q = encodeURIComponent(`!"${name}" set:${setCode}`);
                const res = await fetchScryfallCached(`https://api.scryfall.com/cards/search?q=${q}`);
                if (res?.data?.length > 0) scryfallData = res.data[0];
              }

              cardData = {
                id: cardId,
                name: name || scryfallData?.name,
                set: { id: setCode, name: card['Set name'] || scryfallData?.set_name },
                set_name: card['Set name'] || scryfallData?.set_name,
                set_code: setCode,
                collector_number: collectorNum,
                rarity: scryfallData?.rarity || 'Unknown',
                type_line: scryfallData?.type_line || '',
                mana_cost: scryfallData?.mana_cost || '',
                image_uris: scryfallData?.image_uris || null,
                prices: scryfallData?.prices || {
                  usd: purchasePrice.toString(),
                  eur: purchasePrice.toString()
                },
                purchase_price: purchasePrice
              };
            }

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
      }

      return NextResponse.json({ success: true, imported, uniqueCards: uniqueCardCount, totalCopies, errors });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
