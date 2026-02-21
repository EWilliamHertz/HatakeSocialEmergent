'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Package, Plus, Edit2, Trash2, DollarSign, TrendingUp, TrendingDown, Calendar, Filter, Search, X, Loader2, Box, Archive } from 'lucide-react';

interface SealedProduct {
  product_id: string;
  name: string;
  game: string;
  product_type: string;
  set_name?: string;
  set_code?: string;
  language: string;
  quantity: number;
  purchase_price: number;
  current_value: number;
  purchase_date?: string;
  notes?: string;
  image_url?: string;
  created_at: string;
}

interface ProductTotals {
  total_products: number;
  total_items: number;
  total_invested: number;
  total_value: number;
}

// Product types for Pokemon
const POKEMON_PRODUCT_TYPES = [
  'Booster Box',
  'Elite Trainer Box (ETB)',
  'Booster Bundle',
  'Collection Box',
  'Tin',
  'Blister Pack',
  'Theme Deck',
  'Premium Collection',
  'Special Collection',
  'Trainer Box',
  'Build & Battle Box',
  'Pokémon Center Exclusive',
  'Japanese Booster Box',
  'Other'
];

// Product types for MTG
const MTG_PRODUCT_TYPES = [
  'Draft Booster Box',
  'Set Booster Box',
  'Collector Booster Box',
  'Play Booster Box',
  'Bundle',
  'Prerelease Kit',
  'Commander Deck',
  'Starter Kit',
  'Fat Pack',
  'Gift Box',
  'Secret Lair',
  'Collector\'s Edition',
  'Japanese Booster Box',
  'Other'
];

export default function SealedProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<SealedProduct[]>([]);
  const [totals, setTotals] = useState<ProductTotals>({ total_products: 0, total_items: 0, total_invested: 0, total_value: 0 });
  const [loading, setLoading] = useState(true);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SealedProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGame, setFilterGame] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    game: 'pokemon',
    productType: '',
    setName: '',
    setCode: '',
    language: 'EN',
    quantity: 1,
    purchasePrice: 0,
    currentValue: 0,
    purchaseDate: '',
    notes: '',
    imageUrl: ''
  });

  useEffect(() => {
    fetchProducts();
  }, [filterGame]);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/sealed${filterGame !== 'all' ? `?game=${filterGame}` : ''}`, { credentials: 'include' });
      
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/auth/login');
          return;
        }
        throw new Error('Failed to fetch');
      }
      
      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
        setTotals(data.totals || { total_products: 0, total_items: 0, total_invested: 0, total_value: 0 });
        setNeedsMigration(data.needsMigration || false);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const runMigration = async () => {
    try {
      const res = await fetch('/api/admin/migrate', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setNeedsMigration(false);
        fetchProducts();
      } else {
        alert('Migration failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Migration error:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      game: 'pokemon',
      productType: '',
      setName: '',
      setCode: '',
      language: 'EN',
      quantity: 1,
      purchasePrice: 0,
      currentValue: 0,
      purchaseDate: '',
      notes: '',
      imageUrl: ''
    });
  };

  const handleAdd = async () => {
    if (!formData.name || !formData.productType) {
      alert('Please fill in name and product type');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/sealed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        resetForm();
        fetchProducts();
      } else {
        alert(data.error || 'Failed to add product');
      }
    } catch (error) {
      console.error('Add error:', error);
      alert('Failed to add product');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editingProduct) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/sealed/${editingProduct.product_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (data.success) {
        setShowEditModal(false);
        setEditingProduct(null);
        resetForm();
        fetchProducts();
      } else {
        alert(data.error || 'Failed to update product');
      }
    } catch (error) {
      console.error('Update error:', error);
      alert('Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const res = await fetch(`/api/sealed/${productId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await res.json();
      if (data.success) {
        fetchProducts();
      } else {
        alert(data.error || 'Failed to delete product');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete product');
    }
  };

  const openEditModal = (product: SealedProduct) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      game: product.game,
      productType: product.product_type,
      setName: product.set_name || '',
      setCode: product.set_code || '',
      language: product.language,
      quantity: product.quantity,
      purchasePrice: product.purchase_price,
      currentValue: product.current_value || product.purchase_price,
      purchaseDate: product.purchase_date || '',
      notes: product.notes || '',
      imageUrl: product.image_url || ''
    });
    setShowEditModal(true);
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filterType !== 'all' && product.product_type !== filterType) {
      return false;
    }
    return true;
  });

  // Calculate profit/loss
  const totalProfit = Number(totals.total_value) - Number(totals.total_invested);
  const profitPercentage = totals.total_invested > 0 
    ? ((totalProfit / Number(totals.total_invested)) * 100).toFixed(1)
    : '0';

  // Get unique product types from current products
  const productTypes = [...new Set(products.map(p => p.product_type))];

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Package className="w-8 h-8 text-purple-500" />
              Sealed Products
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Track your sealed product collection and investments</p>
          </div>
          
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition"
            data-testid="add-sealed-btn"
          >
            <Plus className="w-5 h-5" />
            Add Product
          </button>
        </div>

        {/* Migration Notice */}
        {needsMigration && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-300">Database Setup Required</h3>
                <p className="text-yellow-700 dark:text-yellow-400 text-sm">The sealed products feature needs to be initialized.</p>
              </div>
              <button
                onClick={runMigration}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition"
              >
                Initialize
              </button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-2">
              <Box className="w-5 h-5 text-purple-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Total Products</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{totals.total_products || 0}</p>
            <p className="text-sm text-gray-500">{totals.total_items || 0} items total</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Total Invested</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              ${Number(totals.total_invested || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-2">
              <Archive className="w-5 h-5 text-green-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Current Value</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              ${Number(totals.total_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-2">
              {totalProfit >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-500" />
              )}
              <span className="text-sm text-gray-500 dark:text-gray-400">Profit/Loss</span>
            </div>
            <p className={`text-3xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalProfit >= 0 ? '+' : ''}${totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className={`text-sm ${totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {totalProfit >= 0 ? '+' : ''}{profitPercentage}%
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                />
              </div>
            </div>

            <select
              value={filterGame}
              onChange={(e) => setFilterGame(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
            >
              <option value="all">All Games</option>
              <option value="pokemon">Pokémon</option>
              <option value="mtg">Magic: The Gathering</option>
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
            >
              <option value="all">All Types</option>
              {productTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No sealed products yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Start tracking your sealed product collection</p>
            <button
              onClick={() => { resetForm(); setShowAddModal(true); }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700"
            >
              <Plus className="w-5 h-5" />
              Add Your First Product
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => {
              const profit = (product.current_value || product.purchase_price) - product.purchase_price;
              const profitPct = product.purchase_price > 0 
                ? ((profit / product.purchase_price) * 100).toFixed(1)
                : '0';

              return (
                <div 
                  key={product.product_id} 
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition"
                  data-testid={`sealed-product-${product.product_id}`}
                >
                  {/* Product Image */}
                  <div className="aspect-video bg-gradient-to-br from-purple-500/20 to-blue-500/20 relative">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-16 h-16 text-purple-300" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-1">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        product.game === 'pokemon' 
                          ? 'bg-yellow-500 text-white' 
                          : 'bg-purple-600 text-white'
                      }`}>
                        {product.game === 'pokemon' ? 'Pokémon' : 'MTG'}
                      </span>
                    </div>
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-1 bg-black/60 text-white rounded text-sm font-medium">
                        x{product.quantity}
                      </span>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">{product.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      {product.product_type}
                      {product.set_name && ` • ${product.set_name}`}
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Purchase Price</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          ${(product.purchase_price * product.quantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Current Value</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          ${((product.current_value || product.purchase_price) * product.quantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    <div className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                      profit >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
                    }`}>
                      <span className={`text-sm font-medium ${
                        profit >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                      }`}>
                        {profit >= 0 ? '+' : ''}${(profit * product.quantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                      <span className={`text-sm ${
                        profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {profit >= 0 ? '+' : ''}{profitPct}%
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => openEditModal(product)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(product.product_id)}
                        className="px-3 py-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/40 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {showEditModal ? 'Edit Product' : 'Add Sealed Product'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setEditingProduct(null);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Game Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Game</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, game: 'pokemon', productType: '' })}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                      formData.game === 'pokemon'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Pokémon
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, game: 'mtg', productType: '' })}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                      formData.game === 'mtg'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    MTG
                  </button>
                </div>
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Obsidian Flames Booster Box"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                />
              </div>

              {/* Product Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Type *</label>
                <select
                  value={formData.productType}
                  onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                >
                  <option value="">Select type...</option>
                  {(formData.game === 'pokemon' ? POKEMON_PRODUCT_TYPES : MTG_PRODUCT_TYPES).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Set Name & Code */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Set Name</label>
                  <input
                    type="text"
                    value={formData.setName}
                    onChange={(e) => setFormData({ ...formData, setName: e.target.value })}
                    placeholder="e.g., Obsidian Flames"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Set Code</label>
                  <input
                    type="text"
                    value={formData.setCode}
                    onChange={(e) => setFormData({ ...formData, setCode: e.target.value })}
                    placeholder="e.g., SV3"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  />
                </div>
              </div>

              {/* Language & Quantity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Language</label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  >
                    <option value="EN">English</option>
                    <option value="JP">Japanese</option>
                    <option value="KR">Korean</option>
                    <option value="CN">Chinese</option>
                    <option value="DE">German</option>
                    <option value="FR">French</option>
                    <option value="IT">Italian</option>
                    <option value="ES">Spanish</option>
                    <option value="PT">Portuguese</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  />
                </div>
              </div>

              {/* Prices */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Price ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.purchasePrice || ''}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                    onFocus={(e) => { if (e.target.value === '0') e.target.value = ''; }}
                    placeholder="0.00"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Value ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.currentValue || ''}
                    onChange={(e) => setFormData({ ...formData, currentValue: parseFloat(e.target.value) || 0 })}
                    onFocus={(e) => { if (e.target.value === '0') e.target.value = ''; }}
                    placeholder="0.00"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  />
                </div>
              </div>

              {/* Purchase Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Date</label>
                <input
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Image URL (optional)</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  placeholder="Any additional notes..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setEditingProduct(null);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={showEditModal ? handleEdit : handleAdd}
                disabled={saving || !formData.name || !formData.productType}
                className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {showEditModal ? 'Save Changes' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
