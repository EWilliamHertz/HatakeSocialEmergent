import { NextRequest, NextResponse } from 'next/server';

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
      try {
        const res = await fetch(`https://api.scryfall.com/cards/${scryfallId}`, {
          signal: AbortSignal.timeout(10000)
        });
        if (res.ok) {
          const card = await res.json();
          return NextResponse.json({ success: true, cards: [card] });
        }
        return NextResponse.json({ success: true, cards: [] });
      } catch (e) {
        console.error('Scryfall ID lookup error:', e);
        return NextResponse.json({ success: true, cards: [] });
      }
    }

    // Direct card lookup by set + number (e.g., /cards/2xm/117)
    if (setCode && cardNumber && !query) {
      try {
        // Try exact number first
        let res = await fetch(`https://api.scryfall.com/cards/${setCode.toLowerCase()}/${cardNumber}`, {
          signal: AbortSignal.timeout(10000)
        });
        
        if (res.ok) {
          const card = await res.json();
          return NextResponse.json({ success: true, cards: [card] });
        }
        
        // Try with padded number (some sets need leading zeros)
        const paddedNum = cardNumber.padStart(3, '0');
        res = await fetch(`https://api.scryfall.com/cards/${setCode.toLowerCase()}/${paddedNum}`, {
          signal: AbortSignal.timeout(10000)
        });
        
        if (res.ok) {
          const card = await res.json();
          return NextResponse.json({ success: true, cards: [card] });
        }
        
        return NextResponse.json({ success: true, cards: [] });
      } catch (e) {
        console.error('Scryfall set/number lookup error:', e);
        return NextResponse.json({ success: true, cards: [] });
      }
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

    const res = await fetch(
      `https://api.scryfall.com/cards/search?q=${encodeURIComponent(scryfallQuery)}&unique=prints&order=released`,
      { signal: AbortSignal.timeout(15000) }
    );

    if (!res.ok) {
      if (res.status === 404) {
        // No cards found
        return NextResponse.json({ success: true, cards: [] });
      }
      console.error('[MTG Proxy] Scryfall error:', res.status, res.statusText);
      return NextResponse.json({ success: true, cards: [] });
    }

    const data = await res.json();
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
