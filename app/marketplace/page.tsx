'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { ShoppingBag, MessageCircle, Filter, X, Search, SlidersHorizontal, Plus, Trash2, Package, Store } from 'lucide-react';
import Image from 'next/image';

interface Listing {
  listing_id: string;
  card_id: string;
  game: string;
  card_data: any;
  price: number;
  currency: string;
  condition: string;
  foil: boolean;
  quantity: number;
  description: string;
  user_id: string;
  seller_name: string;
  seller_picture?: string;
  created_at: string;
}

interface ShopProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  image: string;
  gallery_images?: string[];
  features: string[];
  category: string;
  stock: number;
}

const CONDITIONS = ['All', 'Mint', 'Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played', 'Damaged'];
const SHOP_CATEGORIES = ['All', 'Protection', 'Storage', 'Accessories', 'Bags'];

export default function MarketplacePage() {
  const router = useRouter();
  // Tab state
  const [activeTab, setActiveTab] = useState<'cards' | 'shop'>('cards');
  
  // Card listings state
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [gameFilter, setGameFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [conditionFilter, setConditionFilter] = useState('All');
  const [foilOnly, setFoilOnly] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [currentUserId, setCurrentUserId] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expansionFilter, setExpansionFilter] = useState('All');
  const [rarityFilter, setRarityFilter] = useState('All');
  
  // Shop products state
  const [shopProducts, setShopProducts] = useState<ShopProduct[]>([]);
  const [shopLoading, setShopLoading] = useState(false);
  const [shopCategory, setShopCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);

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
          setCurrentUserId(data.user.user_id);
          setIsAdmin(data.user.is_admin === true);
          loadListings();
        }
      })
      .catch(() => router.push('/auth/login'));
  }, [router]);

  useEffect(() => {
    if (currentUserId) {
      loadListings();
    }
  }, [gameFilter, sortBy]);

  useEffect(() => {
    if (activeTab === 'shop') {
      loadShopProducts();
    }
  }, [activeTab, shopCategory]);

  const loadListings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (gameFilter !== 'all') params.append('game', gameFilter);
      params.append('sort', sortBy);
      
      const res = await fetch(`/api/marketplace?${params.toString()}`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setListings(data.listings || []);
      }
    } catch (error) {
      console.error('Load listings error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadShopProducts = async () => {
    setShopLoading(true);
    try {
      const params = shopCategory !== 'All' ? `?category=${shopCategory}` : '';
      const res = await fetch(`/api/shop${params}`);
      const data = await res.json();
      if (data.success) {
        setShopProducts(data.products || []);
      }
    } catch (error) {
      console.error('Load shop products error:', error);
    } finally {
      setShopLoading(false);
    }
  };

  const getCardImage = (listing: Listing) => {
    const card = listing.card_data;
    if (card.images?.small) return card.images.small;
    if (card.image_uris?.small) return card.image_uris.small;
    if (card.images?.large) return card.images.large;
    if (card.image_uris?.normal) return card.image_uris.normal;
    return '/placeholder-card.png';
  };

  const contactSeller = async (listing: Listing) => {
    if (listing.user_id === currentUserId) {
      alert("This is your own listing!");
      return;
    }
    
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          recipientId: listing.user_id,
          content: `Hi! I'm interested in your listing: ${listing.card_data.name} for €${Number(listing.price).toFixed(2)}`
        })
      });
      router.push('/messages');
    } catch (error) {
      console.error('Contact seller error:', error);
    }
  };

  const deleteListing = async (listingId: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;
    
    try {
      const res = await fetch(`/api/marketplace/${listingId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setListings(listings.filter(l => l.listing_id !== listingId));
      } else {
        alert(data.error || 'Failed to delete listing');
      }
    } catch (error) {
      console.error('Delete listing error:', error);
      alert('Failed to delete listing');
    }
  };

  // Get unique expansions and rarities from listings for filters
  const availableExpansions = [...new Set(listings.filter(l => {
    if (gameFilter === 'all') return true;
    return l.game === gameFilter;
  }).map(l => l.card_data?.set_name || l.card_data?.set?.name || 'Unknown').filter(Boolean))].sort();
  
  const availableRarities = [...new Set(listings.filter(l => {
    if (gameFilter === 'all') return true;
    return l.game === gameFilter;
  }).map(l => l.card_data?.rarity || 'Unknown').filter(Boolean))].sort();

  // Apply client-side filters
  const filteredListings = listings.filter(listing => {
    // Search filter
    if (searchQuery && !listing.card_data.name?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Price filters
    const listingPrice = Number(listing.price);
    if (priceMin && listingPrice < parseFloat(priceMin)) return false;
    if (priceMax && listingPrice > parseFloat(priceMax)) return false;
    
    // Condition filter
    if (conditionFilter !== 'All' && listing.condition !== conditionFilter) return false;
    
    // Foil filter
    if (foilOnly && !listing.foil) return false;
    
    // Expansion filter
    if (expansionFilter !== 'All') {
      const listingSet = listing.card_data?.set_name || listing.card_data?.set?.name || 'Unknown';
      if (listingSet !== expansionFilter) return false;
    }
    
    // Rarity filter
    if (rarityFilter !== 'All') {
      const listingRarity = listing.card_data?.rarity || 'Unknown';
      if (listingRarity !== rarityFilter) return false;
    }
    
    return true;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setPriceMin('');
    setPriceMax('');
    setConditionFilter('All');
    setFoilOnly(false);
    setGameFilter('all');
    setExpansionFilter('All');
    setRarityFilter('All');
  };

  const hasActiveFilters = searchQuery || priceMin || priceMax || conditionFilter !== 'All' || foilOnly || gameFilter !== 'all' || expansionFilter !== 'All' || rarityFilter !== 'All';

  // Filter shop products by search
  const filteredShopProducts = shopProducts.filter(p => {
    if (!searchQuery) return true;
    return p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           p.description.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header with Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-6">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('cards')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition border-b-2 -mb-px ${
                activeTab === 'cards'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <ShoppingBag className="w-5 h-5" />
              Card Listings
            </button>
            <button
              onClick={() => setActiveTab('shop')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition border-b-2 -mb-px ${
                activeTab === 'shop'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Store className="w-5 h-5" />
              Shop Products
            </button>
          </div>
          
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2 dark:text-white">
                  {activeTab === 'cards' ? 'Marketplace' : 'Hatake Shop'}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {activeTab === 'cards' ? 'Buy and sell cards with the community' : 'Official Hatake.Social accessories and supplies'}
                </p>
              </div>
              {activeTab === 'cards' && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 flex items-center gap-2"
                  data-testid="create-listing-btn"
                >
                  <Plus className="w-4 h-4" />
                  Sell Card
                </button>
              )}
            </div>
          
            {/* Search & Filter Bar - Cards Tab */}
            {activeTab === 'cards' && (
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-64 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search listings..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    data-testid="marketplace-search"
                  />
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setGameFilter('all')}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${gameFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setGameFilter('pokemon')}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${gameFilter === 'pokemon' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                  >
                    Pokemon
                  </button>
                  <button
                    onClick={() => setGameFilter('mtg')}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${gameFilter === 'mtg' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                  >
                    Magic
                  </button>
                </div>
            
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-4 py-2 border rounded-lg flex items-center gap-2 ${showFilters ? 'border-blue-600 text-blue-600' : 'border-gray-300 dark:border-gray-600 dark:text-gray-300'}`}
                  data-testid="toggle-filters-btn"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                  {hasActiveFilters && (
                    <span className="bg-blue-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">!</span>
                  )}
                </button>
                
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                  data-testid="sort-select"
                >
                  <option value="newest">Newest First</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                </select>
              </div>
            )}
            
            {/* Search & Filter Bar - Shop Tab */}
            {activeTab === 'shop' && (
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-64 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                
                <div className="flex gap-2">
                  {SHOP_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setShopCategory(cat)}
                      className={`px-4 py-2 rounded-lg font-semibold transition ${shopCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}
          
          {/* Advanced Filters Panel - Cards Tab Only */}
          {activeTab === 'cards' && showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Price (€)</label>
                  <input
                    type="number"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    data-testid="price-min-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Price (€)</label>
                  <input
                    type="number"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    placeholder="No limit"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    data-testid="price-max-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                  <select
                    value={conditionFilter}
                    onChange={(e) => setConditionFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    data-testid="condition-select"
                  >
                    {CONDITIONS.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={foilOnly}
                      onChange={(e) => setFoilOnly(e.target.checked)}
                      className="w-4 h-4"
                      data-testid="foil-only-checkbox"
                    />
                    <span className="text-sm font-medium text-gray-700">Foil/Holo Only</span>
                  </label>
                </div>
              </div>
              
              {/* Game-specific filters */}
              {gameFilter !== 'all' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expansion/Set</label>
                    <select
                      value={expansionFilter}
                      onChange={(e) => setExpansionFilter(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                      data-testid="expansion-select"
                    >
                      <option value="All">All Expansions</option>
                      {availableExpansions.map(exp => (
                        <option key={exp} value={exp}>{exp}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rarity</label>
                    <select
                      value={rarityFilter}
                      onChange={(e) => setRarityFilter(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                      data-testid="rarity-select"
                    >
                      <option value="All">All Rarities</option>
                      {availableRarities.map(rar => (
                        <option key={rar} value={rar} className="capitalize">{rar}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-4 text-sm text-blue-600 hover:underline flex items-center gap-1"
                  data-testid="clear-filters-btn"
                >
                  <X className="w-4 h-4" />
                  Clear all filters
                </button>
              )}
            </div>
          )}
          </div>
        </div>

        {/* Cards Tab Content */}
        {activeTab === 'cards' && (
          <>
            {/* Results Info */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-600">
                {loading ? 'Loading...' : `${filteredListings.length} listings found`}
              </p>
            </div>

            {/* Listings */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">
                  {listings.length === 0 ? 'No listings available yet' : 'No listings match your filters'}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 text-blue-600 hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredListings.map((listing) => (
                  <div 
                    key={listing.listing_id} 
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition relative group"
                    data-testid={`listing-${listing.listing_id}`}
                  >
                    {/* Delete button for owner or admin */}
                    {(listing.user_id === currentUserId || isAdmin) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteListing(listing.listing_id); }}
                        className="absolute top-2 right-2 z-10 p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition opacity-0 group-hover:opacity-100"
                        title={isAdmin && listing.user_id !== currentUserId ? 'Delete (Admin)' : 'Delete your listing'}
                        data-testid={`delete-listing-${listing.listing_id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    
                    <div className="relative aspect-[2/3]">
                      <Image
                        src={getCardImage(listing)}
                        alt={listing.card_data.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      {listing.foil && (
                        <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">
                          FOIL
                        </div>
                      )}
                      {listing.quantity > 1 && (
                        <div className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                          x{listing.quantity}
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-sm mb-1 truncate dark:text-white">{listing.card_data.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{listing.condition}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-green-600">
                          €{Number(listing.price).toFixed(2)}
                        </span>
                        {listing.user_id !== currentUserId && (
                          <button
                            onClick={() => contactSeller(listing)}
                            className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                            title="Contact seller"
                            data-testid={`contact-seller-${listing.listing_id}`}
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {listing.seller_picture ? (
                          <Image src={listing.seller_picture} alt={listing.seller_name || 'User'} width={20} height={20} className="rounded-full" />
                        ) : (
                          <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                            {(listing.seller_name || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs text-gray-600 truncate">
                          {listing.user_id === currentUserId ? 'Your listing' : (listing.seller_name || 'Unknown')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Shop Tab Content */}
        {activeTab === 'shop' && (
          <>
            {/* Results Info */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-600 dark:text-gray-400">
                {shopLoading ? 'Loading...' : `${filteredShopProducts.length} products available`}
              </p>
            </div>

            {/* Shop Products Grid */}
            {shopLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : filteredShopProducts.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No products available</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredShopProducts.map((product) => (
                  <div 
                    key={product.id}
                    onClick={() => { setSelectedProduct(product); setGalleryIndex(0); }}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition cursor-pointer group"
                  >
                    <div className="aspect-square bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
                      {product.image ? (
                        <Image 
                          src={product.image} 
                          alt={product.name}
                          fill
                          className="object-cover group-hover:scale-105 transition"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-16 h-16 text-gray-300" />
                        </div>
                      )}
                      {product.stock <= 5 && product.stock > 0 && (
                        <span className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded">
                          Only {product.stock} left
                        </span>
                      )}
                      {product.stock === 0 && (
                        <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                          Out of stock
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">{product.category}</p>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">{product.name}</h3>
                      <p className="text-lg font-bold text-green-600">
                        {product.price} {product.currency}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 uppercase">{selectedProduct.category}</p>
                  <h2 className="text-2xl font-bold dark:text-white">{selectedProduct.name}</h2>
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {/* Image Gallery */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden relative mb-3">
                    {(() => {
                      const images = [selectedProduct.image, ...(selectedProduct.gallery_images || [])].filter(Boolean);
                      const currentImage = images[galleryIndex] || selectedProduct.image;
                      return currentImage ? (
                        <Image 
                          src={currentImage} 
                          alt={selectedProduct.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-24 h-24 text-gray-300" />
                        </div>
                      );
                    })()}
                  </div>
                  
                  {/* Thumbnail Gallery */}
                  {(() => {
                    const images = [selectedProduct.image, ...(selectedProduct.gallery_images || [])].filter(Boolean);
                    if (images.length > 1) {
                      return (
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {images.map((img, idx) => (
                            <button
                              key={idx}
                              onClick={() => setGalleryIndex(idx)}
                              className={`w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 ${
                                galleryIndex === idx ? 'border-blue-600' : 'border-transparent'
                              }`}
                            >
                              <Image 
                                src={img} 
                                alt={`${selectedProduct.name} ${idx + 1}`}
                                width={64}
                                height={64}
                                className="object-cover w-full h-full"
                              />
                            </button>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                
                <div>
                  <p className="text-3xl font-bold text-green-600 mb-4">
                    {selectedProduct.price} {selectedProduct.currency}
                  </p>
                  
                  <p className="text-gray-600 dark:text-gray-400 mb-6">{selectedProduct.description}</p>
                  
                  {selectedProduct.features && selectedProduct.features.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-semibold mb-2 dark:text-white">Features</h4>
                      <ul className="space-y-1">
                        {selectedProduct.features.map((f, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm mb-6">
                    <span className={`px-2 py-1 rounded ${
                      selectedProduct.stock > 5 
                        ? 'bg-green-100 text-green-700' 
                        : selectedProduct.stock > 0 
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {selectedProduct.stock > 0 ? `${selectedProduct.stock} in stock` : 'Out of stock'}
                    </span>
                  </div>
                  
                  <button
                    disabled={selectedProduct.stock === 0}
                    className={`w-full py-3 rounded-lg font-semibold transition ${
                      selectedProduct.stock > 0
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {selectedProduct.stock > 0 ? 'Contact to Purchase' : 'Out of Stock'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Listing Modal Placeholder */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold mb-4">Create Listing</h3>
            <p className="text-gray-600 mb-4">
              To sell a card, go to your Collection and use the "List for Sale" option on any card.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => router.push('/collection')}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Go to Collection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
