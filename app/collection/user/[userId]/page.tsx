'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Package, BookOpen, LayoutGrid, List as ListIcon, Star, Loader2, Search } from 'lucide-react';
import Image from 'next/image';

interface CollectionItem {
  id: number;
  card_id: string;
  game: string;
  card_data: any;
  quantity: number;
  condition?: string;
  is_foil?: boolean;
}

interface UserInfo {
  id: string;
  username: string;
  profile_picture_url?: string;
}

export default function UserCollectionPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.userId as string;

  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'binder'>('grid');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (userId) {
      loadCollection();
      checkIfBookmarked();
    }
  }, [userId, filter]);

  const loadCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data);
      }
    } catch (error) {
      console.error('Load current user error:', error);
    }
  };

  const loadCollection = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/collection/user/${userId}?game=${filter === 'all' ? '' : filter}`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
        setUserInfo(data.user || null);
      }
    } catch (error) {
      console.error('Load collection error:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkIfBookmarked = async () => {
    try {
      const res = await fetch(`/api/bookmarks/check/${userId}`, { credentials: 'include' });
      const data = await res.json();
      setIsBookmarked(data.isBookmarked || false);
    } catch (error) {
      console.error('Check bookmark error:', error);
    }
  };

  const toggleBookmark = async () => {
    if (!currentUser) {
      router.push('/auth/login');
      return;
    }

    setBookmarkLoading(true);
    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          targetUserId: userId,
          action: isBookmarked ? 'unbookmark' : 'bookmark'
        })
      });

      if (res.ok) {
        setIsBookmarked(!isBookmarked);
      }
    } catch (error) {
      console.error('Toggle bookmark error:', error);
    } finally {
      setBookmarkLoading(false);
    }
  };

  const getCardImage = (item: CollectionItem) => {
    const card = item.card_data || {};
    if (card.images?.small) return card.images.small;
    if (card.image_uris?.small) return card.image_uris.small;
    if (card.images?.large) return card.images.large;
    if (card.image_uris?.normal) return card.image_uris.normal;
    return '/placeholder-card.png';
  };

  const getCardPrice = (item: CollectionItem) => {
    const card = item.card_data;
    if (item.game === 'pokemon') {
      if (card.pricing?.cardmarket) {
        return { value: card.pricing.cardmarket.avg || card.pricing.cardmarket.trend || 0, currency: 'EUR' };
      }
      if (card.tcgplayer?.prices) {
        const prices = card.tcgplayer.prices;
        const usdPrice = prices.holofoil?.market || prices.normal?.market || 0;
        return { value: usdPrice * 0.92, currency: 'EUR' };
      }
    } else if (item.game === 'mtg') {
      if (card.prices?.eur) return { value: parseFloat(card.prices.eur), currency: 'EUR' };
      if (card.prices?.eur_foil && item.is_foil) return { value: parseFloat(card.prices.eur_foil), currency: 'EUR' };
      if (card.prices?.usd) return { value: parseFloat(card.prices.usd) * 0.92, currency: 'EUR' };
    }
    return { value: 0, currency: 'EUR' };
  };

  const calculateTotalValue = () => {
    let totalEUR = 0;
    items.forEach(item => {
      const price = getCardPrice(item);
      totalEUR += price.value * item.quantity;
    });
    return totalEUR > 0 ? `€${totalEUR.toFixed(2)}` : '€0.00';
  };

  const filteredItems = items.filter(item => {
    if (!searchQuery) return true;
    return item.card_data.name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold dark:text-white">
                {userInfo?.username || 'User'}'s Collection
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {items.length} cards • Total Value: {calculateTotalValue()}
              </p>
            </div>
            <button
              onClick={toggleBookmark}
              disabled={bookmarkLoading}
              className={`px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2 ${
                isBookmarked
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              } disabled:opacity-50`}
            >
              <Star className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
              {bookmarkLoading ? 'Loading...' : isBookmarked ? 'Bookmarked' : 'Bookmark'}
            </button>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('pokemon')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === 'pokemon'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              Pokémon
            </button>
            <button
              onClick={() => setFilter('mtg')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === 'mtg'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              Magic
            </button>
          </div>

          {/* Search */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cards..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex justify-end mb-4">
          <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-600 shadow text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('binder')}
              className={`p-2 rounded-md transition ${
                viewMode === 'binder'
                  ? 'bg-white dark:bg-gray-600 shadow text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Binder View"
            >
              <BookOpen className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-600 shadow text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="List View"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Collection Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {items.length === 0 ? 'This collection is empty' : 'No cards match your search'}
            </p>
          </div>
        ) : (
          <>
            {/* GRID VIEW */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition"
                  >
                    <div className="relative aspect-[2/3]">
                      <Image
                        src={getCardImage(item)}
                        alt={item.card_data?.name || 'Card'}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      {item.quantity > 1 && (
                        <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                          x{item.quantity}
                        </div>
                      )}
                      {item.is_foil && (
                        <div className="absolute bottom-2 right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">
                          FOIL
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-sm mb-1 truncate dark:text-white" title={item.card_data?.name}>
                        {item.card_data?.name || 'Unknown Card'}
                      </h3>
                      <div className="flex items-center gap-1 mb-1">
                        {(item.card_data?.set?.id || item.card_data?.set_code) && (
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded font-mono uppercase">
                            {item.card_data?.set?.id || item.card_data?.set_code}
                          </span>
                        )}
                        {(item.card_data?.collector_number || item.card_data?.localId) && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            #{item.card_data?.collector_number || item.card_data?.localId}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{item.condition || 'NM'}</span>
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          €{getCardPrice(item).value.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* BINDER VIEW */}
            {viewMode === 'binder' && (
              <div className="bg-gray-200 dark:bg-gray-800 p-8 rounded-xl shadow-inner min-h-[600px]">
                <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-3 gap-8 max-w-4xl mx-auto">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="aspect-[2.5/3.5] bg-black/10 rounded-lg p-1 shadow-lg transform hover:scale-105 transition"
                    >
                      <img
                        src={getCardImage(item)}
                        alt={item.card_data?.name}
                        className="w-full h-full object-cover rounded"
                      />
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LIST VIEW */}
            {viewMode === 'list' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 font-medium">
                    <tr>
                      <th className="p-4">Card Name</th>
                      <th className="p-4">Set</th>
                      <th className="p-4">#</th>
                      <th className="p-4">Condition</th>
                      <th className="p-4 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="p-4 font-medium dark:text-white">{item.card_data?.name}</td>
                        <td className="p-4">
                          <span className="uppercase text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            {item.card_data?.set?.id || item.card_data?.set_code}
                          </span>
                        </td>
                        <td className="p-4 text-gray-500 dark:text-gray-400">#{item.card_data?.collector_number}</td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded-full text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                            {item.condition || 'NM'}
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono dark:text-white">€{getCardPrice(item).value.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
