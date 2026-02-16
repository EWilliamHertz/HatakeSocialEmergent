'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Package, Trash2, DollarSign, CheckSquare, Square, MoreHorizontal, Edit2, ShoppingBag, Search } from 'lucide-react';
import Image from 'next/image';

interface CollectionItem {
  id: number;
  card_id: string;
  game: string;
  card_data: any;
  quantity: number;
  condition?: string;
  foil?: boolean;
  notes?: string;
  added_at: string;
}

export default function CollectionPage() {
  const router = useRouter();
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [editingItem, setEditingItem] = useState<CollectionItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [listPrice, setListPrice] = useState('');
  const [listCondition, setListCondition] = useState('Near Mint');
  const [listPriceMode, setListPriceMode] = useState<'fixed' | 'percent'>('percent');
  const [listPercent, setListPercent] = useState('90');

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) {
          router.push('/auth/login');
          return;
        }
        return loadCollection();
      })
      .catch(() => router.push('/auth/login'));
  }, [router, filter]);

  const loadCollection = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/collection?game=${filter === 'all' ? '' : filter}`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
      }
    } catch (error) {
      console.error('Load collection error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleItemSelection = (itemId: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.id)));
    }
  };

  const removeItem = async (itemId: number) => {
    if (!confirm('Remove this card from your collection?')) return;
    
    try {
      await fetch(`/api/collection?id=${itemId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      loadCollection();
      setSelectedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    } catch (error) {
      console.error('Remove item error:', error);
    }
  };

  const bulkDelete = async () => {
    if (selectedItems.size === 0) return;
    if (!confirm(`Delete ${selectedItems.size} selected cards?`)) return;

    try {
      const ids = Array.from(selectedItems);
      await fetch('/api/collection/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids })
      });
      setSelectedItems(new Set());
      loadCollection();
    } catch (error) {
      console.error('Bulk delete error:', error);
    }
  };

  const bulkList = async () => {
    if (selectedItems.size === 0) return;
    setShowListModal(true);
  };

  const calculateSelectedValue = () => {
    let total = 0;
    items.forEach(item => {
      if (selectedItems.has(item.id)) {
        total += getCardPrice(item) * item.quantity;
      }
    });
    return total;
  };

  const submitBulkList = async () => {
    try {
      const ids = Array.from(selectedItems);
      const selectedCards = items.filter(item => selectedItems.has(item.id));
      
      // Calculate prices based on mode
      const listings = selectedCards.map(item => {
        const marketPrice = getCardPrice(item);
        let price: number;
        
        if (listPriceMode === 'percent') {
          price = marketPrice * (parseFloat(listPercent) / 100);
        } else {
          price = parseFloat(listPrice);
        }
        
        return {
          card_id: item.card_id,
          card_data: item.card_data,
          game: item.game,
          price: Math.max(0.01, price),
          condition: listCondition,
          quantity: item.quantity
        };
      });
      
      await fetch('/api/collection/bulk-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ listings })
      });
      setSelectedItems(new Set());
      setShowListModal(false);
      setListPrice('');
      setListPercent('90');
      alert('Cards listed for sale!');
    } catch (error) {
      console.error('Bulk list error:', error);
    }
  };

  const updateItem = async (itemId: number, updates: Partial<CollectionItem>) => {
    try {
      await fetch('/api/collection', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: itemId, ...updates })
      });
      loadCollection();
      setShowEditModal(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Update item error:', error);
    }
  };

  const getCardImage = (item: CollectionItem) => {
    const card = item.card_data;
    if (card.images?.small) return card.images.small;
    if (card.image_uris?.small) return card.image_uris.small;
    if (card.images?.large) return card.images.large;
    if (card.image_uris?.normal) return card.image_uris.normal;
    return '/placeholder-card.png';
  };

  const getCardPrice = (item: CollectionItem) => {
    const card = item.card_data;
    if (item.game === 'pokemon' && card.tcgplayer?.prices) {
      const prices = card.tcgplayer.prices;
      return prices.holofoil?.market || prices.normal?.market || 0;
    } else if (item.game === 'mtg' && card.prices?.usd) {
      return parseFloat(card.prices.usd);
    }
    return 0;
  };

  const calculateTotalValue = () => {
    let total = 0;
    items.forEach(item => {
      total += getCardPrice(item) * item.quantity;
    });
    return total.toFixed(2);
  };

  const filteredItems = items.filter(item => {
    if (!searchQuery) return true;
    return item.card_data.name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">My Collection</h1>
              <p className="text-gray-600">{items.length} cards • Estimated value: ${calculateTotalValue()}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                data-testid="filter-all"
              >
                All
              </button>
              <button
                onClick={() => setFilter('pokemon')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${filter === 'pokemon' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                data-testid="filter-pokemon"
              >
                Pokemon
              </button>
              <button
                onClick={() => setFilter('mtg')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${filter === 'mtg' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                data-testid="filter-mtg"
              >
                Magic
              </button>
            </div>
          </div>
          
          {/* Search & Bulk Actions */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your collection..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                data-testid="collection-search"
              />
            </div>
            
            {items.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAll}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  data-testid="select-all-btn"
                >
                  {selectedItems.size === filteredItems.length && filteredItems.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  Select All
                </button>
                
                {selectedItems.size > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowBulkMenu(!showBulkMenu)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      data-testid="bulk-actions-btn"
                    >
                      {selectedItems.size} selected
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    
                    {showBulkMenu && (
                      <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border z-10 min-w-48">
                        <button
                          onClick={bulkList}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-2"
                          data-testid="bulk-list-btn"
                        >
                          <ShoppingBag className="w-4 h-4" />
                          List for Sale
                        </button>
                        <button
                          onClick={bulkDelete}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-2 text-red-600"
                          data-testid="bulk-delete-btn"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Selected
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Collection Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">
              {items.length === 0 ? 'Your collection is empty' : 'No cards match your search'}
            </p>
            {items.length === 0 && (
              <button
                onClick={() => router.push('/search')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                data-testid="search-cards-btn"
              >
                Search Cards
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredItems.map((item) => (
              <div 
                key={item.id} 
                className={`bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition relative group ${
                  selectedItems.has(item.id) ? 'ring-2 ring-blue-600' : ''
                }`}
                data-testid={`collection-item-${item.id}`}
              >
                {/* Selection Checkbox */}
                <button
                  onClick={() => toggleItemSelection(item.id)}
                  className="absolute top-2 left-2 z-10 bg-white rounded p-1 shadow"
                >
                  {selectedItems.has(item.id) ? (
                    <CheckSquare className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                
                <div className="relative aspect-[2/3]">
                  <Image
                    src={getCardImage(item)}
                    alt={item.card_data.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  {item.quantity > 1 && (
                    <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                      x{item.quantity}
                    </div>
                  )}
                  {item.foil && (
                    <div className="absolute bottom-2 right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">
                      FOIL
                    </div>
                  )}
                  
                  {/* Hover Actions */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <button
                      onClick={() => {
                        setEditingItem(item);
                        setShowEditModal(true);
                      }}
                      className="p-2 bg-white text-gray-800 rounded-lg hover:bg-gray-100"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm mb-1 truncate">{item.card_data.name}</h3>
                  <p className="text-xs text-gray-500">{item.condition || 'Near Mint'}</p>
                  <p className="text-sm font-bold text-blue-600">${getCardPrice(item).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold mb-4">Edit Card</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  defaultValue={editingItem.quantity}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  id="edit-quantity"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                <select 
                  defaultValue={editingItem.condition || 'Near Mint'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  id="edit-condition"
                >
                  <option>Mint</option>
                  <option>Near Mint</option>
                  <option>Lightly Played</option>
                  <option>Moderately Played</option>
                  <option>Heavily Played</option>
                  <option>Damaged</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  defaultChecked={editingItem.foil}
                  id="edit-foil"
                  className="w-4 h-4"
                />
                <label htmlFor="edit-foil" className="text-sm font-medium text-gray-700">Foil/Holo</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  defaultValue={editingItem.notes || ''}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  id="edit-notes"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingItem(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const quantity = parseInt((document.getElementById('edit-quantity') as HTMLInputElement).value);
                  const condition = (document.getElementById('edit-condition') as HTMLSelectElement).value;
                  const foil = (document.getElementById('edit-foil') as HTMLInputElement).checked;
                  const notes = (document.getElementById('edit-notes') as HTMLTextAreaElement).value;
                  updateItem(editingItem.id, { quantity, condition, foil, notes });
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk List Modal */}
      {showListModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold mb-2 dark:text-white">List {selectedItems.size} Cards for Sale</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Total Market Value: ${calculateSelectedValue().toFixed(2)}
            </p>
            
            <div className="space-y-4">
              {/* Pricing Mode Toggle */}
              <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <button
                  onClick={() => setListPriceMode('percent')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
                    listPriceMode === 'percent' 
                      ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' 
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  % of Market
                </button>
                <button
                  onClick={() => setListPriceMode('fixed')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
                    listPriceMode === 'fixed' 
                      ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' 
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Fixed Price
                </button>
              </div>
              
              {listPriceMode === 'percent' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Percentage of Market Price
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="50"
                      max="150"
                      value={listPercent}
                      onChange={(e) => setListPercent(e.target.value)}
                      className="flex-1"
                    />
                    <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 w-24">
                      <input
                        type="number"
                        min="1"
                        max="200"
                        value={listPercent}
                        onChange={(e) => setListPercent(e.target.value)}
                        className="w-12 bg-transparent text-center focus:outline-none dark:text-white"
                      />
                      <span className="text-gray-500 dark:text-gray-400">%</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Estimated listing total: ${(calculateSelectedValue() * parseFloat(listPercent || '0') / 100).toFixed(2)}
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fixed Price per Card ($)
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={listPrice}
                    onChange={(e) => setListPrice(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                    placeholder="0.00"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Condition</label>
                <select 
                  value={listCondition}
                  onChange={(e) => setListCondition(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                >
                  <option>Mint</option>
                  <option>Near Mint</option>
                  <option>Lightly Played</option>
                  <option>Moderately Played</option>
                  <option>Heavily Played</option>
                  <option>Damaged</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowListModal(false);
                  setListPrice('');
                  setListPercent('90');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white"
              >
                Cancel
              </button>
              <button
                onClick={submitBulkList}
                disabled={listPriceMode === 'fixed' && !listPrice}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
              >
                List for Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
