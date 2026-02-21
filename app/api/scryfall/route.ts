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

    // Search by query - fetch multiple pages to get all editions
    if (query) {
      const allCards: any[] = [];
      let nextPageUrl: string | null = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&unique=prints&order=released`;
      let pageCount = 0;
      const maxPages = 3; // Limit to 3 pages (175 cards max) to avoid timeout
      
      while (nextPageUrl && pageCount < maxPages) {
        const currentUrl = nextPageUrl;
        const fetchResponse: Response = await fetch(currentUrl, {
          headers: {
            'User-Agent': 'HatakeSocial/1.0',
            'Accept': 'application/json',
          },
        });

        if (fetchResponse.ok) {
          const data = await fetchResponse.json();
          if (data.data) {
            allCards.push(...data.data);
          }
          // Check if there's a next page
          nextPageUrl = data.has_more ? data.next_page : null;
          pageCount++;
        } else if (fetchResponse.status === 404) {
          break;
        } else {
          const errorText = await fetchResponse.text();
          console.error('Scryfall search error:', fetchResponse.status, errorText);
          return NextResponse.json(
            { error: `Scryfall error: ${fetchResponse.status}` },
            { status: fetchResponse.status }
          );
        }
      }

      return NextResponse.json({ 
        success: true, 
        cards: allCards,
        total: allCards.length,
      });
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
