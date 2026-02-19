'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Heart, Plus, Globe, Lock, Trash2, Edit2, ExternalLink, Search, Package } from 'lucide-react';
import Link from 'next/link';

interface Wishlist {
  wishlist_id: string;
  name: string;
  description: string;
  is_public: boolean;
  item_count: number;
  created_at: string;
}

interface WishlistItem {
  item_id: string;
  card_id: string;
  card_data: any;
  game: string;
  quantity: number;
  priority: string;
  notes: string;
}

export default function WishlistsPage() {
  const router = useRouter();
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [publicWishlists, setPublicWishlists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my' | 'public'>('my');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newIsPublic, setNewIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedWishlist, setSelectedWishlist] = useState<Wishlist | null>(null);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    loadWishlists();
    loadPublicWishlists();
  }, []);

  const loadWishlists = async () => {
    try {
      const res = await fetch('/api/wishlists', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setWishlists(data.wishlists || []);
      }
    } catch (error) {
      console.error('Error loading wishlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPublicWishlists = async () => {
    try {
      const res = await fetch('/api/wishlists?public=true', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setPublicWishlists(data.wishlists || []);
      }
    } catch (error) {
      console.error('Error loading public wishlists:', error);
    }
  };

  const loadWishlistItems = async (wishlistId: string) => {
    setLoadingItems(true);
    try {
      const res = await fetch(`/api/wishlists/${wishlistId}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setWishlistItems(data.wishlist?.items || []);
      }
    } catch (error) {
      console.error('Error loading wishlist items:', error);
    } finally {
      setLoadingItems(false);
    }
  };

  const createWishlist = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/wishlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newName,
          description: newDescription,
          isPublic: newIsPublic
        })
      });
      if (res.ok) {
        setShowCreateModal(false);
        setNewName('');
        setNewDescription('');
        setNewIsPublic(false);
        loadWishlists();
      }
    } catch (error) {
      console.error('Error creating wishlist:', error);
    } finally {
      setCreating(false);
    }
  };

  const deleteWishlist = async (wishlistId: string) => {
    if (!confirm('Are you sure you want to delete this wishlist?')) return;
    try {
      const res = await fetch(`/api/wishlists/${wishlistId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        setWishlists(wishlists.filter(w => w.wishlist_id !== wishlistId));
        if (selectedWishlist?.wishlist_id === wishlistId) {
          setSelectedWishlist(null);
          setWishlistItems([]);
        }
      }
    } catch (error) {
      console.error('Error deleting wishlist:', error);
    }
  };

  const selectWishlist = (wishlist: Wishlist) => {
    setSelectedWishlist(wishlist);
    loadWishlistItems(wishlist.wishlist_id);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Heart className="w-7 h-7 text-red-500" />
              Wishlists
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Track cards you want to collect</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            data-testid="create-wishlist-btn"
          >
            <Plus className="w-5 h-5" />
            New Wishlist
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('my')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'my'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            My Wishlists
          </button>
          <button
            onClick={() => setActiveTab('public')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'public'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Public Wishlists
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Wishlists List */}
          <div className="lg:col-span-1 space-y-3">
            {loading ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : activeTab === 'my' ? (
              wishlists.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
                  <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No wishlists yet</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-4 text-blue-600 hover:underline"
                  >
                    Create your first wishlist
                  </button>
                </div>
              ) : (
                wishlists.map(wishlist => (
                  <div
                    key={wishlist.wishlist_id}
                    onClick={() => selectWishlist(wishlist)}
                    className={`bg-white dark:bg-gray-800 rounded-xl p-4 cursor-pointer transition border-2 ${
                      selectedWishlist?.wishlist_id === wishlist.wishlist_id
                        ? 'border-blue-500'
                        : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                            {wishlist.name}
                          </h3>
                          {wishlist.is_public ? (
                            <Globe className="w-4 h-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          )}
                        </div>
                        {wishlist.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            {wishlist.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          {wishlist.item_count} {wishlist.item_count === 1 ? 'card' : 'cards'}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteWishlist(wishlist.wishlist_id); }}
                        className="p-2 text-gray-400 hover:text-red-500 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )
            ) : (
              publicWishlists.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
                  <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No public wishlists found</p>
                </div>
              ) : (
                publicWishlists.map(wishlist => (
                  <div
                    key={wishlist.wishlist_id}
                    onClick={() => selectWishlist(wishlist)}
                    className={`bg-white dark:bg-gray-800 rounded-xl p-4 cursor-pointer transition border-2 ${
                      selectedWishlist?.wishlist_id === wishlist.wishlist_id
                        ? 'border-blue-500'
                        : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      {wishlist.user_picture ? (
                        <img src={wishlist.user_picture} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {wishlist.user_name?.charAt(0) || '?'}
                        </div>
                      )}
                      <span className="text-sm text-gray-600 dark:text-gray-400">{wishlist.user_name}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{wishlist.name}</h3>
                    {wishlist.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {wishlist.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {wishlist.item_count} {wishlist.item_count === 1 ? 'card' : 'cards'}
                    </p>
                  </div>
                ))
              )
            )}
          </div>

          {/* Wishlist Details */}
          <div className="lg:col-span-2">
            {selectedWishlist ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      {selectedWishlist.name}
                      {selectedWishlist.is_public ? (
                        <Globe className="w-5 h-5 text-green-500" />
                      ) : (
                        <Lock className="w-5 h-5 text-gray-400" />
                      )}
                    </h2>
                    {selectedWishlist.description && (
                      <p className="text-gray-600 dark:text-gray-400 mt-1">{selectedWishlist.description}</p>
                    )}
                  </div>
                  <Link
                    href="/collection"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Cards
                  </Link>
                </div>

                {loadingItems ? (
                  <div className="text-center py-12">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                  </div>
                ) : wishlistItems.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No cards in this wishlist yet</p>
                    <Link
                      href="/collection"
                      className="text-blue-600 hover:underline"
                    >
                      Browse your collection to add cards
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {wishlistItems.map(item => (
                      <div key={item.item_id} className="group relative">
                        <img
                          src={item.card_data?.image_uris?.normal || item.card_data?.images?.large || '/card-back.png'}
                          alt={item.card_data?.name}
                          className="w-full rounded-lg shadow-md"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition rounded-lg flex items-center justify-center">
                          <div className="text-white text-center p-2">
                            <p className="font-medium text-sm">{item.card_data?.name}</p>
                            <p className="text-xs opacity-75">Qty: {item.quantity}</p>
                            {item.priority !== 'normal' && (
                              <span className={`text-xs px-2 py-0.5 rounded mt-1 inline-block ${
                                item.priority === 'high' ? 'bg-red-500' : 'bg-yellow-500'
                              }`}>
                                {item.priority}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center">
                <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Select a wishlist to view its contents</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Wishlist Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Create New Wishlist</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="My Wishlist"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  data-testid="wishlist-name-input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (optional)</label>
                <textarea
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="Cards I'm looking for..."
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newIsPublic}
                  onChange={e => setNewIsPublic(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700 dark:text-gray-300">Make this wishlist public</span>
                <Globe className="w-4 h-4 text-gray-400" />
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={createWishlist}
                disabled={!newName.trim() || creating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="confirm-create-wishlist-btn"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
