'use client';

import { X, Search, Loader2, Package } from 'lucide-react';

interface AddSealedModalProps {
  sealedSearch: string;
  setSealedSearch: (v: string) => void;
  sealedSearchResults: any[];
  isSearchingSealed: boolean;
  hasSearchedSealed?: boolean;
  manualSealed: { name: string; game: string; price: string; type: string };
  setManualSealed: (v: any) => void;
  addingSealedProduct: boolean;
  onSearch: () => void;
  onAddFromSearch: (product: any) => void;
  onAddManual: () => void;
  onClose: () => void;
}

const PRODUCT_TYPES = [
  'Booster Box',
  'Elite Trainer Box',
  'Booster Pack',
  'Booster Bundle',
  'Blister Pack',
  'Tin',
  'Collection Box',
  'Starter Deck',
  'Premium Collection',
  'Gift Box',
  'Other',
];
const GAMES = [
  { value: 'pokemon', label: '⚡ Pokémon' },
  { value: 'mtg', label: '🃏 Magic' },
  { value: 'lorcana', label: '🕯️ Lorcana' },
  { value: 'onepiece', label: '☠️ One Piece' },
];

export default function AddSealedModal({
  sealedSearch, setSealedSearch, sealedSearchResults, isSearchingSealed,
  hasSearchedSealed = false,
  manualSealed, setManualSealed, addingSealedProduct,
  onSearch, onAddFromSearch, onAddManual, onClose,
}: AddSealedModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold dark:text-white">Add Sealed Product</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Search Pokémon products via ScryDex, or add any product manually</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* ScryDex Pokémon search */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Search Pokémon (ScryDex)</span>
              <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">Live prices</span>
            </div>
            <div className="flex gap-2">
             <input
  type="text"
  placeholder="Search for Pokémon Booster Boxes, ETBs... (Press Enter)"
  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
  value={sealedSearch}
  onChange={(e) => setSealedSearch(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearch(); // Triggers the handleSearchSealed from page.tsx
    }
  }}
/>
              <button onClick={onSearch} disabled={sealedSearch.length < 3}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                {isSearchingSealed ? <Loader2 className="animate-spin w-5 h-5" /> : <Search className="w-5 h-5" />}
                Search
              </button>
            </div>

            {sealedSearchResults.length > 0 && (
              <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto border dark:border-gray-700 rounded-lg p-2">
                {sealedSearchResults.map(result => (
                  <button
                    key={result.id}
                    onClick={() => onAddFromSearch(result)}
                    disabled={addingSealedProduct}
                    className="text-left p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition flex gap-3 items-center disabled:opacity-50"
                  >
                    {result.imageUrl ? (
                      <img src={result.imageUrl} alt={result.name} className="w-12 h-12 object-contain rounded flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate dark:text-white">{result.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{result.type}</p>
                      {result.price > 0 && <p className="text-xs font-bold text-green-600 mt-0.5">€{Number(result.price).toFixed(2)}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {hasSearchedSealed && sealedSearchResults.length === 0 && !isSearchingSealed && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">No results found. Try the manual entry below.</p>
            )}
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t dark:border-gray-700" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-gray-800 px-3 text-gray-500 font-medium">Or Manual Entry</span>
            </div>
          </div>

          {/* Manual Entry */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Product Name *</label>
              <input
                type="text"
                value={manualSealed.name}
                onChange={(e) => setManualSealed({ ...manualSealed, name: e.target.value })}
                placeholder="e.g. Shrouded Fable Booster Box"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Game</label>
              <select
                value={manualSealed.game}
                onChange={(e) => setManualSealed({ ...manualSealed, game: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
                {GAMES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Product Type</label>
              <select
                value={manualSealed.type}
                onChange={(e) => setManualSealed({ ...manualSealed, type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
                {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Purchase Price (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={manualSealed.price}
                onChange={(e) => setManualSealed({ ...manualSealed, price: e.target.value })}
                placeholder="e.g. 129.99"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t dark:border-gray-700 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-xl font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
            Cancel
          </button>
          <button onClick={onAddManual} disabled={!manualSealed.name.trim() || addingSealedProduct}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {addingSealedProduct ? <><Loader2 className="w-4 h-4 animate-spin" />Adding...</> : 'Add Manual Product'}
          </button>
        </div>
      </div>
    </div>
  );
}
