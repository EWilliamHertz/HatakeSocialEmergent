import { NextRequest, NextResponse } from 'next/server';

// Proxy endpoint for Scryfall API to avoid iOS network issues
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const setCode = searchParams.get('set');
    const collectorNum = searchParams.get('cn');

    // Direct card lookup by set/collector number
    if (setCode && collectorNum) {
      const response = await fetch(
        `https://api.scryfall.com/cards/${setCode.toLowerCase()}/${collectorNum}`,
        {
          headers: {
            'User-Agent': 'HatakeSocial/1.0',
            'Accept': 'application/json',
          },
        }
      );
      
      if (response.ok) {
        const card = await response.json();
        return NextResponse.json({ success: true, cards: [card] });
      } else if (response.status === 404) {
        return NextResponse.json({ success: true, cards: [] });
      } else {
        return NextResponse.json(
          { error: `Scryfall error: ${response.status}` },
          { status: response.status }
        );
      }
    }

    // Search by query
    if (query) {
      const scryfallUrl = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&unique=prints&order=released`;
      
      const response = await fetch(scryfallUrl, {
        headers: {
          'User-Agent': 'HatakeSocial/1.0',
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({ 
          success: true, 
          cards: data.data || [],
          total: data.total_cards || 0,
        });
      } else if (response.status === 404) {
        return NextResponse.json({ success: true, cards: [], total: 0 });
      } else {
        const errorText = await response.text();
        console.error('Scryfall search error:', response.status, errorText);
        return NextResponse.json(
          { error: `Scryfall error: ${response.status}` },
          { status: response.status }
        );
      }
    }

    return NextResponse.json(
      { error: 'Query parameter (q) or set/cn required' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Scryfall proxy error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
