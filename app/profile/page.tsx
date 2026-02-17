'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { User, Package, ShoppingBag, Users, Settings, Camera, Save, X } from 'lucide-react';
import Image from 'next/image';

interface UserProfile {
  user_id: string;
  name: string;
  email: string;
  picture?: string;
  bio?: string;
  created_at: string;
  banner_url?: string;
  shipping_address?: string;
  payment_swish?: string;
  payment_bankgiro?: string;
  payment_account?: string;
}

interface Stats {
  collection_count: number;
  listings_count: number;
  friends_count: number;
  trades_count: number;
}

interface CollectionItem {
  id: number;
  card_id: string;
  game: string;
  card_data: any;
  quantity: number;
}

interface Listing {
  listing_id: string;
  card_data: any;
  price: number;
  currency: string;
  game: string;
}

export default function MyProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<Stats>({
    collection_count: 0,
    listings_count: 0,
    friends_count: 0,
    trades_count: 0
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editBanner, setEditBanner] = useState('');
  const [editShippingAddress, setEditShippingAddress] = useState('');
  const [editPaymentSwish, setEditPaymentSwish] = useState('');
  const [editPaymentBankgiro, setEditPaymentBankgiro] = useState('');
  const [editPaymentAccount, setEditPaymentAccount] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [recentCollection, setRecentCollection] = useState<CollectionItem[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) {
          router.push('/auth/login');
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
          setEditName(data.user.name);
          setEditBio(data.user.bio || '');
          setEditBanner(data.user.banner_url || '');
          setEditShippingAddress(data.user.shipping_address || '');
          setEditPaymentSwish(data.user.payment_swish || '');
          setEditPaymentBankgiro(data.user.payment_bankgiro || '');
          setEditPaymentAccount(data.user.payment_account || '');
          loadStats();
          loadRecentCollection();
          loadMyListings();
        }
      })
      .catch(() => router.push('/auth/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const loadStats = async () => {
    try {
      const res = await fetch('/api/profile/stats', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Load stats error:', error);
    }
  };

  const loadRecentCollection = async () => {
    try {
      const res = await fetch('/api/collection?limit=6', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setRecentCollection(data.items?.slice(0, 6) || []);
      }
    } catch (error) {
      console.error('Load collection error:', error);
    }
  };

  const loadMyListings = async () => {
    try {
      const res = await fetch('/api/marketplace/my-listings', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setMyListings(data.listings?.slice(0, 6) || []);
      }
    } catch (error) {
      console.error('Load listings error:', error);
    }
  };

  const getCardImage = (cardData: any) => {
    if (cardData?.image_uris?.small) return cardData.image_uris.small;
    if (cardData?.images?.small) return cardData.images.small;
    if (cardData?.image) return `${cardData.image}/low.webp`;
    return '/placeholder-card.png';
  };

  const saveProfile = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: editName, bio: editBio })
      });
      const data = await res.json();
      if (data.success) {
        setUser(prev => prev ? { ...prev, name: editName, bio: editBio } : null);
        setEditing(false);
      }
    } catch (error) {
      console.error('Save profile error:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Profile Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden mb-6">
          {/* Cover */}
          <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600"></div>
          
          {/* Profile Info */}
          <div className="px-6 pb-6">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-4 -mt-12">
              <div className="relative">
                {user.picture ? (
                  <Image 
                    src={user.picture} 
                    alt={user.name} 
                    width={96} 
                    height={96} 
                    className="rounded-full border-4 border-white dark:border-gray-800 shadow-lg"
                  />
                ) : (
                  <div className="w-24 h-24 bg-blue-600 rounded-full border-4 border-white dark:border-gray-800 shadow-lg flex items-center justify-center text-white text-3xl font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <button className="absolute bottom-0 right-0 p-2 bg-white dark:bg-gray-700 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-600">
                  <Camera className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
              
              <div className="flex-1">
                {editing ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Your name"
                    />
                    <textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Tell us about yourself..."
                      rows={2}
                    />
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{user.name}</h1>
                    <p className="text-gray-600 dark:text-gray-400">{user.bio || 'No bio yet'}</p>
                  </>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                  Member since {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                </p>
              </div>

              <div className="flex gap-2">
                {editing ? (
                  <>
                    <button
                      onClick={() => {
                        setEditing(false);
                        setEditName(user.name);
                        setEditBio(user.bio || '');
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                    <button
                      onClick={saveProfile}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                  >
                    <Settings className="w-4 h-4" />
                    Edit Profile
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 text-center">
            <Package className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.collection_count}</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Cards</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 text-center">
            <ShoppingBag className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.listings_count}</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Listings</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 text-center">
            <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.friends_count}</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Friends</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 text-center">
            <User className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.trades_count}</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Trades</p>
          </div>
        </div>

        {/* My Collection */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">My Collection</h2>
            <button
              onClick={() => router.push('/collection')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View All
            </button>
          </div>
          {recentCollection.length > 0 ? (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {recentCollection.map((item) => (
                <div 
                  key={item.id}
                  className="cursor-pointer hover:opacity-80 transition"
                  onClick={() => router.push('/collection')}
                >
                  <img 
                    src={getCardImage(item.card_data)} 
                    alt={item.card_data?.name || 'Card'} 
                    className="w-full h-auto rounded-lg shadow-sm"
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate text-center">
                    {item.card_data?.name}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No cards in collection yet
            </p>
          )}
        </div>

        {/* Items for Sale */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Items for Sale</h2>
            <button
              onClick={() => router.push('/marketplace')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View Marketplace
            </button>
          </div>
          {myListings.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {myListings.map((listing) => (
                <div 
                  key={listing.listing_id}
                  className="cursor-pointer hover:opacity-80 transition"
                  onClick={() => router.push('/marketplace')}
                >
                  <img 
                    src={getCardImage(listing.card_data)} 
                    alt={listing.card_data?.name || 'Card'} 
                    className="w-full h-auto rounded-lg shadow-sm"
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                    {listing.card_data?.name}
                  </p>
                  <p className="text-sm font-bold text-green-600">
                    {listing.currency === 'EUR' ? '€' : listing.currency === 'SEK' ? 'kr' : '$'}{listing.price}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400 mb-3">No items listed for sale</p>
              <button
                onClick={() => router.push('/collection')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                List cards from your collection
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
