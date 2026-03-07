'use client';

import Link from 'next/link';
import { Package, BookOpen, Star, Plus, X } from 'lucide-react';
import CollectionValueChart from '@/components/CollectionValueChart';
import AddSealedModal from './AddSealedModal';

interface TabContentProps {
  activeTab: string;
  // Sealed
  sealedProducts: any[];
  loadingSealed: boolean;
  showAddSealedModal: boolean;
  setShowAddSealedModal: (v: boolean) => void;
  sealedSearch: string;
  setSealedSearch: (v: string) => void;
  sealedSearchResults: any[];
  isSearchingSealed: boolean;
  manualSealed: { name: string; game: string; price: string; type: string };
  setManualSealed: (v: any) => void;
  addingSealedProduct: boolean;
  onSealedSearch: () => void;
  onAddSealedFromSearch: (product: any) => void;
  onAddSealedManual: () => void;
  // Wishlist
  wishlistItems: any[];
  loadingWishlist: boolean;
  // Bookmarks
  bookmarkedCollections: any[];
  loadingBookmarks: boolean;
  onRemoveBookmark: (userId: string) => void;
}

export default function TabContent({
  activeTab,
  sealedProducts, loadingSealed, showAddSealedModal, setShowAddSealedModal,
  sealedSearch, setSealedSearch, sealedSearchResults, isSearchingSealed,
  manualSealed, setManualSealed, addingSealedProduct,
  onSealedSearch, onAddSealedFromSearch, onAddSealedManual,
  wishlistItems, loadingWishlist,
  bookmarkedCollections, loadingBookmarks, onRemoveBookmark,
}: TabContentProps) {

  if (activeTab === 'sealed') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold dark:text-white">Sealed Collection</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{sealedProducts.length} products tracked</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAddSealedModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 font-semibold">
              <Plus className="w-4 h-4" /> Add Product
            </button>
            <a href="/sealed" className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold">
              Manage All
            </a>
          </div>
        </div>

        {loadingSealed ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" /></div>
        ) : sealedProducts.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No sealed products yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Track your booster boxes, ETBs, and other sealed TCG products</p>
            <button onClick={() => setShowAddSealedModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Add Sealed Product
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sealedProducts.map((product: any) => (
              <div key={product.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border dark:border-gray-700 flex gap-4 hover:shadow-md transition">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-lg flex-shrink-0 overflow-hidden">
                  {product.image_url
                    ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    : <Package className="w-full h-full p-4 text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold truncate dark:text-white">{product.name}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">{product.game} • {product.product_type || product.type || 'Sealed'}</p>
                  {(product.current_value || product.purchase_price) && (
                    <p className="text-blue-600 font-bold mt-1">€{Number(product.current_value || product.purchase_price).toFixed(2)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {showAddSealedModal && (
          <AddSealedModal
            sealedSearch={sealedSearch} setSealedSearch={setSealedSearch}
            sealedSearchResults={sealedSearchResults} isSearchingSealed={isSearchingSealed}
            manualSealed={manualSealed} setManualSealed={setManualSealed}
            addingSealedProduct={addingSealedProduct}
            onSearch={onSealedSearch} onAddFromSearch={onAddSealedFromSearch}
            onAddManual={onAddSealedManual} onClose={() => setShowAddSealedModal(false)}
          />
        )}
      </div>
    );
  }

  if (activeTab === 'wishlist') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
        {loadingWishlist ? (
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
        ) : wishlistItems.length === 0 ? (
          <>
            <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Your wishlist is empty</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Track cards you're looking for to buy or trade</p>
            <a href="/wishlist" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Add to Wishlist
            </a>
          </>
        ) : (
          <div className="space-y-3 text-left">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold dark:text-white">{wishlistItems.length} cards wanted</h2>
              <a href="/wishlist" className="text-sm text-blue-600 hover:underline">Manage →</a>
            </div>
            {wishlistItems.map((item: any) => (
              <div key={item.id} className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                {item.card_data?.images?.small || item.card_data?.image_uris?.small ? (
                  <img src={item.card_data.images?.small || item.card_data.image_uris?.small} alt={item.card_data?.name} className="w-12 h-16 object-cover rounded" />
                ) : (
                  <div className="w-12 h-16 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center">
                    <Package className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold dark:text-white truncate">{item.card_data?.name || 'Unknown Card'}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 uppercase">{item.card_data?.set?.id || item.card_data?.set_code || ''}</p>
                </div>
                <span className="text-sm font-bold text-orange-500 uppercase">{item.priority || 'Wanted'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (activeTab === 'bookmarks') {
    return (
      <div className="space-y-6">
        {loadingBookmarks ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" /></div>
        ) : bookmarkedCollections.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
            <Star className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg font-medium mb-2">No bookmarked collections yet</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">Browse profiles and star ⭐ their collections to follow collectors</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookmarkedCollections.map((collection: any) => (
              <div key={collection.user_id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {collection.profile_picture_url
                        ? <img src={collection.profile_picture_url} alt={collection.name} className="w-12 h-12 rounded-full object-cover" />
                        : <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold">{(collection.name || 'U').charAt(0).toUpperCase()}</div>}
                      <div>
                        <h3 className="font-semibold dark:text-white">{collection.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{collection.card_count} cards</p>
                      </div>
                    </div>
                    <button onClick={() => onRemoveBookmark(collection.user_id)}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition text-gray-400 hover:text-red-500" title="Remove bookmark">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Collection Value</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">€{Number(collection.total_value).toFixed(2)}</p>
                  </div>
                  <Link href={`/collection/user/${collection.user_id}`}
                    className="w-full block text-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition">
                    View Collection
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (activeTab === 'analytics') {
    return (
      <div className="py-2">
        <CollectionValueChart />
      </div>
    );
  }

  return null;
}
