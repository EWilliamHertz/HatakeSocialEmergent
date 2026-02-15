'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Search, Grid, List, Plus } from 'lucide-react';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

interface Card {
  id: string;
  name: string;
  game: string;
  images?: { small?: string; large?: string };
  image_uris?: { small?: string; normal?: string; large?: string };
  set?: { name?: string };
  set_name?: string;
  rarity?: string;
  tcgplayer?: { prices?: any };
  prices?: any;
}

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const [game, setGame] = useState('all');
  const [results, setResults] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    if (searchParams) {
      const q = searchParams.get('q');
      if (q) {
        setQuery(q);
        performSearch(q);
      }
    }
  }, [searchParams]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&game=${game}`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setResults(data.results || []);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  const addToCollection = async (card: Card) => {
    try {
      await fetch('/api/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          cardId: card.id,
          game: card.game,
          cardData: card,
          quantity: 1,
        }),
      });
      alert('Added to collection!');
    } catch (error) {
      console.error('Add to collection error:', error);
    }
  };

  const getCardImage = (card: Card) => {
    if (card.images?.small) return card.images.small;
    if (card.image_uris?.small) return card.image_uris.small;
    if (card.images?.large) return card.images.large;
    if (card.image_uris?.normal) return card.image_uris.normal;
    return '/placeholder-card.png';
  };

  const getPrice = (card: Card) => {
    if (card.game === 'pokemon' && card.tcgplayer?.prices) {
      const prices = card.tcgplayer.prices;
      if (prices.holofoil?.market) return `$${prices.holofoil.market.toFixed(2)}`;
      if (prices.normal?.market) return `$${prices.normal.market.toFixed(2)}`;
    }
    if (card.game === 'mtg' && card.prices) {
      if (card.prices.usd) return `$${card.prices.usd}`;
    }
    return 'N/A';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Pokemon, Magic, or any TCG card..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={game}
              onChange={(e) => setGame(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Games</option>
              <option value="pokemon">Pokemon</option>
              <option value="mtg">Magic: The Gathering</option>
            </select>
            <button
              type="submit"
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Search
            </button>
          </form>
        </div>

        {/* View Toggle */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">
            {loading ? 'Searching...' : `${results.length} results found`}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setView('grid')}
              className={`p-2 rounded-lg ${view === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded-lg ${view === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : results.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No results found. Try a different search term!</p>
          </div>
        ) : (
          <div className={view === 'grid' ? 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4' : 'space-y-4'}>
            {results.map((card) => (
              <div key={card.id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition">
                <div className="relative aspect-[2/3]">
                  <Image
                    src={getCardImage(card)}
                    alt={card.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm mb-1 truncate">{card.name}</h3>
                  <p className="text-xs text-gray-500 mb-2">
                    {card.set?.name || card.set_name || 'Unknown Set'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-blue-600">{getPrice(card)}</span>
                    <button
                      onClick={() => addToCollection(card)}
                      className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
