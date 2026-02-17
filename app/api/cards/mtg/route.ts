import { NextRequest, NextResponse } from 'next/server';
import { fetchScryfallCached } from '@/lib/api-cache';

// API route to proxy Scryfall requests to avoid client-side CORS issues

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const setCode = searchParams.get('set') || '';
    const cardNumber = searchParams.get('number') || '';
    const scryfallId = searchParams.get('id') || '';

    // Direct card lookup by Scryfall ID
    if (scryfallId) {
      const card = await fetchScryfallCached(`https://api.scryfall.com/cards/${scryfallId}`);
      if (card) {
        return NextResponse.json({ success: true, cards: [card] });
      }
      return NextResponse.json({ success: true, cards: [] });
    }

    // Direct card lookup by set + number (e.g., /cards/2xm/117)
    if (setCode && cardNumber && !query) {
      // Try exact number first
      let card = await fetchScryfallCached(`https://api.scryfall.com/cards/${setCode.toLowerCase()}/${cardNumber}`);
      
      if (!card) {
        // Try with padded number (some sets need leading zeros)
        const paddedNum = cardNumber.padStart(3, '0');
        card = await fetchScryfallCached(`https://api.scryfall.com/cards/${setCode.toLowerCase()}/${paddedNum}`);
      }
      
      if (card) {
        return NextResponse.json({ success: true, cards: [card] });
      }
      return NextResponse.json({ success: true, cards: [] });
    }

    // Build search query
    let scryfallQuery = query;
    if (setCode) {
      scryfallQuery += ` set:${setCode.toLowerCase()}`;
    }
    if (cardNumber) {
      scryfallQuery += ` cn:${cardNumber}`;
    }

    if (!scryfallQuery.trim()) {
      return NextResponse.json({ error: 'Query or set/number required' }, { status: 400 });
    }

    console.log('[MTG Proxy] Searching Scryfall:', scryfallQuery);

    const data = await fetchScryfallCached(
      `https://api.scryfall.com/cards/search?q=${encodeURIComponent(scryfallQuery)}&unique=prints&order=released`
    );

    if (!data) {
      return NextResponse.json({ success: true, cards: [] });
    }

    const cards = data.data?.slice(0, 30) || [];

    return NextResponse.json({ success: true, cards });
  } catch (error: any) {
    console.error('[MTG Proxy] Error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
