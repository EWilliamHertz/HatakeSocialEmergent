'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import AuthPromptModal from '@/components/AuthPromptModal';
import { Search, Grid, List, Plus, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';

export const dynamic = 'force-dynamic';

interface Card {
  id: string;
  name: string;
  game: string;
  number?: string;
  collector_number?: string;
  images?: { small?: string; large?: string };
  image_uris?: { small?: string; normal?: string; large?: string; png?: string };
  set?: { name?: string; id?: string };
  set_name?: string;
  set_code?: string;
  rarity?: string;
  tcgplayer?: { prices?: any };
  prices?: any;
}

interface UserResult {
  user_id: string;
  name: string;
  email: string;
  picture?: string;
  type: 'user';
}

interface PostResult {
  post_id: string;
  content: string;
  created_at: string;
  user_id: string;
  name: string;
  picture?: string;
  type: 'post';
}

interface DeckResult {
  deck_id: string;
  name: string;
  description?: string;
  format?: string;
  created_at: string;
  user_id: string;
  creator_name: string;
  creator_picture?: string;
  type: 'deck';
}

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const [game, setGame] = useState('all');
  const [setCode, setSetCode] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [results, setResults] = useState<Card[]>([]);
  const [users, setUsers] = useState<UserResult[]>([]);
  const [posts, setPosts] = useState<PostResult[]>([]);
  const [decks, setDecks] = useState<DeckResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [authPromptAction, setAuthPromptAction] = useState('');

  useEffect(() => {
    // Check auth status
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => setIsAuthenticated(res.ok))
      .catch(() => setIsAuthenticated(false));
  }, []);

  useEffect(() => {
    if (searchParams) {
      const q = searchParams.get('q');
      const set = searchParams.get('set');
      const num = searchParams.get('number');
      const gameParam = searchParams.get('game');
      
      if (q) setQuery(q);
      if (set) setSetCode(set);
      if (num) setCardNumber(num);
      if (gameParam) setGame(gameParam);
      
      if (q || set || num) {
        // Use the game param directly to avoid stale state
        performSearch(q || '', set || '', num || '', gameParam || 'all');
      }
    }
  }, [searchParams]);

  const performSearch = async (searchQuery: string, set?: string, num?: string, gameType?: string) => {
    if (!searchQuery.trim() && !set && !num) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      params.append('game', gameType || game);
      params.append('type', 'all'); // Search everything
      if (set) params.append('set', set);
      if (num) params.append('number', num);
      
      const res = await fetch(`/api/search?${params.toString()}`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setResults(data.results || []);
        setUsers(data.users || []);
        setPosts(data.posts || []);
        setDecks(data.decks || []);
      } else {
        console.error('Search failed:', data.error);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query, setCode, cardNumber, game);
    
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (game && game !== 'all') params.append('game', game);
    if (setCode) params.append('set', setCode);
    if (cardNumber) params.append('number', cardNumber);
    router.push(`/search?${params.toString()}`);
  };

  const addToCollection = async (card: Card) => {
    if (!isAuthenticated) {
      setAuthPromptAction('add cards to your collection');
      setShowAuthPrompt(true);
      return;
    }

    try {
      const res = await fetch('/api/collection', {
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
      const data = await res.json();
      if (data.success) {
        toast.success('Added to collection!');
      } else {
        toast.error(data.error || 'Failed to add to collection');
      }
    } catch (error) {
      console.error('Add to collection error:', error);
      toast.error('Failed to add to collection');
    }
  };

  const getCardImage = (card: Card, size: 'small' | 'large' = 'small') => {
    if (size === 'large') {
      if (card.image_uris?.png) return card.image_uris.png;
      if (card.image_uris?.large) return card.image_uris.large;
      if (card.image_uris?.normal) return card.image_uris.normal;
      if (card.images?.large) return card.images.large;
    }
    if (card.images?.small) return card.images.small;
    if (card.image_uris?.small) return card.image_uris.small;
    if (card.images?.large) return card.images.large;
    if (card.image_uris?.normal) return card.image_uris.normal;
    return '/placeholder-card.png';
  };

  const getSetCode = (card: Card) => {
    return card.set_code || card.set?.id || '';
  };

  const getCollectorNumber = (card: Card) => {
    return card.collector_number || card.number || '';
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {isAuthenticated && <Navbar />}
      
      {/* Simple header for unauthenticated users */}
      {!isAuthenticated && (
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <a href="/" className="flex items-center gap-3">
                <Image
                  src="https://i.imgur.com/B06rBhI.png"
                  alt="Logo"
                  width={40}
                  height={40}
                  className="rounded-lg"
                />
                <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Hatake.Social
                </span>
              </a>
              <div className="flex items-center gap-3">
                <a
                  href="/auth/login"
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
                >
                  Sign In
                </a>
                <a
                  href="/auth/signup"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Get Started
                </a>
              </div>
            </div>
          </div>
        </header>
      )}
      
      <div className="container mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <form onSubmit={handleSearch}>
            <div className="flex gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search Pokemon, Magic, or any TCG card..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  data-testid="search-input"
                />
              </div>
              <select
                value={game}
                onChange={(e) => setGame(e.target.value)}
                className="px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                data-testid="game-select"
              >
                <option value="all">All Games</option>
                <option value="pokemon">Pokemon</option>
                <option value="mtg">Magic: The Gathering</option>
              </select>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                data-testid="advanced-filters-toggle"
              >
                <Filter className="w-5 h-5" />
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <button
                type="submit"
                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                data-testid="search-button"
              >
                Search
              </button>
            </div>
            
            {/* Advanced Filters */}
            {showAdvanced && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Set Code (Pokemon: e.g., swsh4, base1)
                  </label>
                  <input
                    type="text"
                    value={setCode}
                    onChange={(e) => setSetCode(e.target.value)}
                    placeholder="Enter set code..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    data-testid="set-code-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Collector Number
                  </label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="Enter card number..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    data-testid="card-number-input"
                  />
                </div>
              </div>
            )}
          </form>
        </div>

        {/* View Toggle */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600 dark:text-gray-400" data-testid="results-count">
            {loading ? 'Searching...' : `${results.length} cards, ${users.length} users, ${decks.length} decks, ${posts.length} posts found`}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setView('grid')}
              className={`p-2 rounded-lg ${view === 'grid' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
              data-testid="grid-view-btn"
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded-lg ${view === 'list' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
              data-testid="list-view-btn"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Users Section */}
        {users.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4 dark:text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              Users
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((user) => (
                <div 
                  key={user.user_id}
                  onClick={() => router.push(`/profile/${user.user_id}`)}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 flex items-center gap-4 hover:shadow-lg transition cursor-pointer"
                >
                  {user.picture ? (
                    <Image src={user.picture} alt={user.name} width={48} height={48} className="rounded-full" />
                  ) : (
                    <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white text-lg font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold dark:text-white">{user.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Decks Section */}
        {decks.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4 dark:text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Decks
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {decks.map((deck) => (
                <div 
                  key={deck.deck_id}
                  onClick={() => router.push(`/decks/${deck.deck_id}`)}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 hover:shadow-lg transition cursor-pointer"
                >
                  <h3 className="font-semibold dark:text-white mb-1">{deck.name}</h3>
                  {deck.format && (
                    <span className="inline-block px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs rounded mb-2">
                      {deck.format}
                    </span>
                  )}
                  {deck.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">{deck.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                    {deck.creator_picture ? (
                      <Image src={deck.creator_picture} alt={deck.creator_name} width={20} height={20} className="rounded-full" />
                    ) : (
                      <div className="w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                    )}
                    <span>by {deck.creator_name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Posts Section */}
        {posts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4 dark:text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Posts
            </h2>
            <div className="space-y-4">
              {posts.map((post) => (
                <div 
                  key={post.post_id}
                  onClick={() => router.push(`/feed?post=${post.post_id}`)}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 hover:shadow-lg transition cursor-pointer"
                >
                  <div className="flex items-center gap-3 mb-2">
                    {post.picture ? (
                      <Image src={post.picture} alt={post.name} width={32} height={32} className="rounded-full" />
                    ) : (
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {post.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium dark:text-white">{post.name}</span>
                    <span className="text-sm text-gray-400">
                      {new Date(post.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 line-clamp-3">{post.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cards Section */}
        {results.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-4 dark:text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              Cards
            </h2>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <>
            {/* Users Section */}
            {users.length > 0 && (
            {results.map((card) => (
              <div key={card.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition group" data-testid={`card-${card.id}`}>
                {/* Full Card Image */}
                <div className="relative aspect-[488/680] bg-gray-100 dark:bg-gray-700">
                  <Image
                    src={getCardImage(card, 'large')}
                    alt={card.name}
                    fill
                    className="object-contain p-1"
                    unoptimized
                  />
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => addToCollection(card)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2"
                      data-testid={`add-collection-${card.id}`}
                    >
                      <Plus className="w-4 h-4" />
                      Add to Collection
                    </button>
                  </div>
                </div>
                
                {/* Card Info - Set Code & Collector Number */}
                <div className="p-3 border-t border-gray-100 dark:border-gray-700">
                  <h3 className="font-semibold text-sm mb-1 truncate text-gray-900 dark:text-white" title={card.name}>
                    {card.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getSetCode(card) && (
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs font-mono uppercase">
                          {getSetCode(card)}
                        </span>
                      )}
                      {getCollectorNumber(card) && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                          #{getCollectorNumber(card)}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{getPrice(card)}</span>
                  </div>
                  {(card.set?.name || card.set_name) && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate" title={card.set?.name || card.set_name}>
                      {card.set?.name || card.set_name}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Empty State */}
        {!loading && results.length === 0 && users.length === 0 && decks.length === 0 && posts.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
            <Search className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No results found. Try a different search term!</p>
          </div>
        )}
      </div>

      {/* Auth Prompt Modal */}
      <AuthPromptModal
        isOpen={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        action={authPromptAction}
        feature="your collection"
      />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
