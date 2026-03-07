'use client';

import Image from 'next/image';
import { Edit2, Trash2, CheckSquare, Square } from 'lucide-react';
import { CollectionItem } from '@/hooks/useCollection';

interface CardViewsProps {
  filteredItems: CollectionItem[];
  viewMode: 'grid' | 'list' | 'binder';
  selectedItems: Set<number>;
  toggleItemSelection: (id: number) => void;
  onEdit: (item: CollectionItem) => void;
  onRemove: (id: number) => void;
  getCardImage: (item: CollectionItem) => string;
  getPriceDisplay: (item: CollectionItem) => string;
}

export default function CardViews({
  filteredItems, viewMode, selectedItems, toggleItemSelection,
  onEdit, onRemove, getCardImage, getPriceDisplay,
}: CardViewsProps) {

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition relative group cursor-pointer ${
              selectedItems.has(item.id) ? 'ring-2 ring-blue-600' : ''
            }`}
            data-testid={`collection-item-${item.id}`}
            onClick={() => onEdit(item)}
          >
            <button
              onClick={(e) => { e.stopPropagation(); toggleItemSelection(item.id); }}
              className="absolute top-2 left-2 z-10 bg-white dark:bg-gray-700 rounded p-1 shadow"
            >
              {selectedItems.has(item.id)
                ? <CheckSquare className="w-5 h-5 text-blue-600" />
                : <Square className="w-5 h-5 text-gray-400" />}
            </button>

            <div className="relative aspect-[2/3]">
              <Image src={getCardImage(item)} alt={item.card_data?.name || 'Card image'} fill className="object-cover" unoptimized />
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
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                  className="p-2 bg-white text-gray-800 rounded-lg hover:bg-gray-100"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
                  className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-3">
              <h3 className="font-semibold text-sm mb-1 truncate dark:text-white" title={item.card_data?.name || 'Unknown'}>
                {item.card_data?.name || 'Unknown Card'}
              </h3>
              <div className="flex items-center gap-1 mb-1">
                {(item.card_data?.set?.id || item.card_data?.set_code || item.card_data?.set_name || item.card_data?.set) && (
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded font-mono uppercase text-gray-600 dark:text-gray-300">
                    {item.card_data?.set?.id || item.card_data?.set_code ||
                      (typeof item.card_data?.set === 'string' ? item.card_data.set : '') ||
                      (item.card_data?.set_name ? item.card_data.set_name.slice(0, 3) : '')}
                  </span>
                )}
                {(item.card_data?.collector_number || item.card_data?.number || item.card_data?.localId) && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                    #{item.card_data?.collector_number || item.card_data?.number || item.card_data?.localId}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">{item.condition || 'Near Mint'}</span>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{getPriceDisplay(item)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (viewMode === 'binder') {
    return (
      <div className="bg-gray-200 dark:bg-gray-800 p-8 rounded-xl shadow-inner min-h-[600px]">
        <div className="grid grid-cols-3 gap-8 max-w-4xl mx-auto">
          {filteredItems.map(item => (
            <div
              key={item.id}
              className="aspect-[2.5/3.5] bg-black/10 rounded-lg p-1 shadow-lg transform hover:scale-105 transition cursor-pointer relative"
              onClick={() => onEdit(item)}
            >
              <img src={getCardImage(item)} alt={item.card_data?.name} className="w-full h-full object-cover rounded" />
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 font-medium">
          <tr>
            <th className="p-4">Card Name</th>
            <th className="p-4">Set</th>
            <th className="p-4">#</th>
            <th className="p-4">Condition</th>
            <th className="p-4 text-right">Price</th>
            <th className="p-4 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {filteredItems.map(item => (
            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <td className="p-4 font-medium dark:text-white">{item.card_data?.name}</td>
              <td className="p-4">
                <span className="uppercase text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  {item.card_data?.set?.id || item.card_data?.set_code}
                </span>
              </td>
              <td className="p-4 text-gray-500 dark:text-gray-400">#{item.card_data?.collector_number}</td>
              <td className="p-4">
                <span className={`px-2 py-1 rounded-full text-xs ${item.condition === 'Near Mint' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {item.condition}
                </span>
              </td>
              <td className="p-4 text-right font-mono dark:text-white">{getPriceDisplay(item)}</td>
              <td className="p-4 text-center">
                <button onClick={() => onEdit(item)} className="text-blue-600 hover:underline">Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
