'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Package, BookOpen, LayoutGrid, List as ListIcon, Search, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

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
  user_id: string;
  name: string;
  picture?: string;
}

export default function ShareCollectionPage() {
  const params = useParams();
  const userId = params?.userId as string;

  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'binder'>('grid');

  useEffect(() => {
    if (userId) loadCollection();
  }, [userId, filter]);

  const loadCollection = async () => {
    setLoading(true);
    try {
      const gameParam = filter === 'all' ? '' : filter;
      const res = await fetch(`/api/collection/public/${userId}?game=${gameParam}`);
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
    if (!card) return 0;
    if (item.game === 'pokemon') {
      if (card.pricing?.cardmarket) return card.pricing.cardmarket.avg || card.pricing.cardmarket.trend || 0;
      if (card.tcgplayer?.prices) {
        const prices = card.tcgplayer.prices;
        return (prices.holofoil?.market || prices.normal?.market || 0) * 0.92;
      }
    } else if (item.game === 'mtg') {
      if (card.prices?.eur) return parseFloat(card.prices.eur);
      if (card.prices?.eur_foil && item.is_foil) return parseFloat(card.prices.eur_foil);
      if (card.prices?.usd) return parseFloat(card.prices.usd) * 0.92;
    }
    return 0;
  };

  const totalValue = items.reduce((sum, item) => sum + getCardPrice(item) * item.quantity, 0);
  const displayName = userInfo?.name || 'User';

  const filteredItems = items.filter(item => {
    if (!searchQuery) return true;
    return item.card_data?.name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Minimal top bar */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-bold text-xl text-blue-600">Hatake</span>
          <span className="text-gray-400 text-sm hidden sm:inline">Social</span>
        </Link>
        <Link
          href="/auth/login"
          className="flex items-center gap-2 text-sm text-blue-600 hover:underline font-semibold"
        >
          <ExternalLink className="w-4 h-4" />
          Sign in to track your own collection
        </Link>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            {userInfo?.picture ? (
              <Image
                src={userInfo.picture}
                alt={displayName}
                width={64}
                height={64}
                className="rounded-full object-cover"
                unoptimized
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold dark:text-white">
                {displayName}&apos;s Collection
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {items.length} cards · Total Value: €{totalValue.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Filter + Search */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex gap-2">
              {[{key:'all',label:'All'},{key:'pokemon',label:'Pokémon'},{key:'mtg',label:'Magic'}].map(({key,label}) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                    filter === key ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cards..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex justify-end mb-4">
          <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow text-blue-600' : 'text-gray-500'}`} title="Grid"><LayoutGrid className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('binder')} className={`p-2 rounded-md transition ${viewMode === 'binder' ? 'bg-white dark:bg-gray-600 shadow text-blue-600' : 'text-gray-500'}`} title="Binder"><BookOpen className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow text-blue-600' : 'text-gray-500'}`} title="List"><ListIcon className="w-4 h-4" /></button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {items.length === 0 ? `${displayName} hasn't added any cards yet` : 'No cards match your search'}
            </p>
          </div>
        ) : (
          <>
            {viewMode === 'grid' && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredItems.map((item) => (
                  <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition">
                    <div className="relative aspect-[2/3]">
                      <Image src={getCardImage(item)} alt={item.card_data?.name || 'Card'} fill className="object-cover" unoptimized />
                      {item.quantity > 1 && (
                        <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">x{item.quantity}</div>
                      )}
                      {item.is_foil && (
                        <div className="absolute bottom-2 right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">FOIL</div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-sm mb-1 truncate dark:text-white">{item.card_data?.name || 'Unknown Card'}</h3>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{item.condition || 'NM'}</span>
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">€{getCardPrice(item).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {viewMode === 'binder' && (
              <div className="bg-gray-200 dark:bg-gray-800 p-8 rounded-xl shadow-inner min-h-[600px]">
                <div className="grid grid-cols-3 gap-8 max-w-4xl mx-auto">
                  {filteredItems.map((item) => (
                    <div key={item.id} className="aspect-[2.5/3.5] bg-black/10 rounded-lg p-1 shadow-lg transform hover:scale-105 transition">
                      <img src={getCardImage(item)} alt={item.card_data?.name} className="w-full h-full object-cover rounded" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {viewMode === 'list' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 font-medium">
                    <tr>
                      <th className="p-4">Card Name</th>
                      <th className="p-4">Set</th>
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
                        <td className="p-4">
                          <span className="px-2 py-1 rounded-full text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">{item.condition || 'NM'}</span>
                        </td>
                        <td className="p-4 text-right font-mono dark:text-white">€{getCardPrice(item).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* CTA footer */}
        <div className="mt-12 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 text-center">
          <p className="text-blue-800 dark:text-blue-200 font-semibold text-lg mb-2">
            📦 Want to track your own TCG collection?
          </p>
          <p className="text-blue-600 dark:text-blue-300 text-sm mb-4">
            Join Hatake Social to import Pokémon and Magic cards, track values, and connect with traders.
          </p>
          <Link
            href="/auth/register"
            className="inline-block bg-blue-600 text-white font-semibold px-8 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Create Free Account
          </Link>
        </div>
      </div>
    </div>
  );
}
