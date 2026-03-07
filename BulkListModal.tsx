'use client';

import { Loader2 } from 'lucide-react';
import { CollectionItem } from '@/hooks/useCollection';

interface BulkListModalProps {
  selectedItems: Set<number>;
  items: CollectionItem[];
  listCondition: string;
  setListCondition: (v: string) => void;
  listPercent: string;
  setListPercent: (v: string) => void;
  individualPrices: Record<number, string>;
  setIndividualPrices: (v: Record<number, string>) => void;
  listingInProgress: boolean;
  calculateSelectedValue: () => number;
  calculateListingTotal: () => number;
  recalculateAllPrices: (percent: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  getCardImage: (item: CollectionItem) => string;
  getCardPrice: (item: CollectionItem) => { value: number; currency: string };
}

export default function BulkListModal({
  selectedItems, items, listCondition, setListCondition,
  listPercent, setListPercent, individualPrices, setIndividualPrices,
  listingInProgress, calculateSelectedValue, calculateListingTotal,
  recalculateAllPrices, onSubmit, onClose, getCardImage, getCardPrice,
}: BulkListModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b dark:border-gray-700">
          <h3 className="text-lg font-bold dark:text-white">List {selectedItems.size} Cards for Sale</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Market Value: €{calculateSelectedValue().toFixed(2)} → Listing Total: €{calculateListingTotal().toFixed(2)}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Global % slider */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Global % of Market Price</label>
              <button onClick={() => recalculateAllPrices(listPercent)}
                className="text-xs px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200">
                Apply to All
              </button>
            </div>
            <div className="flex items-center gap-3">
              <input type="range" min="50" max="150" value={listPercent}
                onChange={(e) => setListPercent(e.target.value)} className="flex-1"
                data-testid="bulk-list-percent-slider" />
              <div className="flex items-center bg-white dark:bg-gray-700 rounded-lg px-3 py-2 w-24 border dark:border-gray-600">
                <input type="number" min="1" max="200" value={listPercent}
                  onChange={(e) => setListPercent(e.target.value)}
                  className="w-12 bg-transparent text-center focus:outline-none dark:text-white"
                  data-testid="bulk-list-percent-input" />
                <span className="text-gray-500 dark:text-gray-400">%</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Condition for All</label>
            <select value={listCondition} onChange={(e) => setListCondition(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
              data-testid="bulk-list-condition">
              {['Mint', 'Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played', 'Damaged'].map(c => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Individual Prices (override below)</label>
            <div className="space-y-2 max-h-64 overflow-y-auto border dark:border-gray-700 rounded-lg">
              {items.filter(item => selectedItems.has(item.id)).map(item => {
                const marketPrice = getCardPrice(item);
                return (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 border-b dark:border-gray-700 last:border-b-0"
                    data-testid={`bulk-list-item-${item.id}`}>
                    <div className="w-10 h-14 flex-shrink-0 bg-gray-200 dark:bg-gray-600 rounded overflow-hidden">
                      <img src={getCardImage(item)} alt={item.card_data?.name || 'Card'} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate dark:text-white">{item.card_data?.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Market: {marketPrice.currency === 'EUR' ? '€' : '$'}{Number(marketPrice.value).toFixed(2)}
                        {item.quantity > 1 && ` × ${item.quantity}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500 dark:text-gray-400">€</span>
                      <input type="number" min="0.01" step="0.01" value={individualPrices[item.id] || ''}
                        onChange={(e) => setIndividualPrices({ ...individualPrices, [item.id]: e.target.value })}
                        className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00" data-testid={`bulk-list-price-${item.id}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-6 border-t dark:border-gray-700 flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white"
            data-testid="cancel-bulk-list-btn">
            Cancel
          </button>
          <button onClick={onSubmit}
            disabled={listingInProgress || Object.values(individualPrices).some(p => !p || parseFloat(p) <= 0)}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
            data-testid="confirm-bulk-list-btn">
            {listingInProgress
              ? <><Loader2 className="w-4 h-4 animate-spin" />Listing...</>
              : `List ${selectedItems.size} Card${selectedItems.size > 1 ? 's' : ''} for €${calculateListingTotal().toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
