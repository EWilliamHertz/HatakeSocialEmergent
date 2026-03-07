'use client';

import { FileSpreadsheet, X, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { ImportCard } from '@/hooks/useImport';

interface ImportModalProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  importStatus: 'idle' | 'preview' | 'importing' | 'done';
  setImportStatus: (v: 'idle' | 'preview' | 'importing' | 'done') => void;
  importCards: ImportCard[];
  setImportCards: (v: ImportCard[]) => void;
  importLoading: boolean;
  importResult: { imported: number; errors?: string[] } | null;
  importGameType: 'mtg' | 'pokemon' | 'lorcana';
  setImportGameType: (v: 'mtg' | 'pokemon' | 'lorcana') => void;
  totalCardsToImport: number;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onConfirmImport: () => void;
  onClose: () => void;
}

export default function ImportModal({
  fileInputRef, importStatus, setImportStatus, importCards, setImportCards,
  importLoading, importResult, importGameType, setImportGameType,
  totalCardsToImport, onFileUpload, onConfirmImport, onClose,
}: ImportModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-6 h-6 text-green-600" />
            <div>
              <h3 className="text-lg font-bold dark:text-white">Import from CSV</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {importStatus === 'idle' && 'Upload a ManaBox export file to import your cards'}
                {importStatus === 'preview' && (
                  <>{totalCardsToImport} cards ready to import{totalCardsToImport > importCards.length && <span className="text-xs text-gray-400"> (showing first {importCards.length} for preview)</span>}</>
                )}
                {importStatus === 'importing' && `Importing ${totalCardsToImport} cards...`}
                {importStatus === 'done' && 'Import complete!'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {importStatus === 'idle' && (
            <div className="p-6 flex-1 flex flex-col items-center justify-center">
              <div className="mb-6 w-full max-w-md">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">Select Card Game Type</label>
                <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  {([
                    { value: 'mtg', label: '🃏 Magic: The Gathering' },
                    { value: 'pokemon', label: '⚡ Pokémon TCG' },
                    { value: 'lorcana', label: '🕯️ Disney Lorcana' },
                  ] as const).map(({ value, label }) => (
                    <button key={value} onClick={() => setImportGameType(value)}
                      className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition ${importGameType === value ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800'}`}
                      data-testid={`import-game-${value}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-center">
                <input type="file" ref={fileInputRef} accept=".csv" onChange={onFileUpload} className="hidden" id="csv-upload" />
                <label htmlFor="csv-upload" className="cursor-pointer inline-flex flex-col items-center gap-4 p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition">
                  <Upload className="w-12 h-12 text-gray-400" />
                  <div>
                    <p className="font-semibold text-gray-700 dark:text-gray-300">Click to upload CSV</p>
                    <p className="text-sm text-gray-500">{importGameType === 'mtg' ? 'ManaBox export format' : importGameType === 'lorcana' ? 'Lorcana CSV format' : 'Pokémon TCG export format'}</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {importStatus === 'preview' && (
            <div className="flex-1 overflow-auto p-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>{importCards.length}</strong> cards found •{' '}
                  <strong>{importCards.reduce((s, c) => s + c.quantity, 0)}</strong> total quantity •{' '}
                  <strong>{importCards.reduce((s, c) => s + c.purchasePrice * c.quantity, 0).toFixed(2)} {importCards[0]?.currency || 'USD'}</strong> total purchase value
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                    <tr>
                      {['Name', 'Set', '#', 'Qty', 'Foil', 'Condition', 'Rarity', 'Price'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {importCards.map((card, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-3 py-2 font-medium text-gray-900 dark:text-white max-w-[200px] truncate" title={card.name}>{card.name}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                          <span className="uppercase text-xs font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">{card.setCode}</span>
                          <span className="ml-1 text-xs truncate max-w-[100px] inline-block align-bottom" title={card.setName}>{card.setName}</span>
                        </td>
                        <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-400 font-mono text-xs">{card.collectorNumber}</td>
                        <td className="px-3 py-2 text-center">
                          <span className="inline-flex items-center justify-center min-w-[24px] h-6 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded font-medium text-xs">{card.quantity}</span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {card.foil
                            ? <span className="inline-flex items-center px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-xs font-medium">Foil</span>
                            : <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400 text-xs">{card.condition}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs font-medium capitalize ${card.rarity === 'mythic' ? 'text-orange-600 dark:text-orange-400' : card.rarity === 'rare' ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400'}`}>
                            {card.rarity}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">
                          {card.purchasePrice > 0 ? `${card.purchasePrice.toFixed(2)} ${card.currency}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {importStatus === 'importing' && (
            <div className="p-6 flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Importing your cards...</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">This may take a moment</p>
              </div>
            </div>
          )}

          {importStatus === 'done' && importResult && (
            <div className="p-6 flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Import Complete!</h4>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Successfully imported <strong>{importResult.imported}</strong> cards to your collection.</p>
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="text-left bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mt-4">
                    <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300 mb-2">
                      <AlertCircle className="w-4 h-4" /><span className="font-medium">Some cards had issues:</span>
                    </div>
                    <ul className="text-sm text-yellow-600 dark:text-yellow-400 list-disc list-inside max-h-32 overflow-y-auto">
                      {importResult.errors.slice(0, 10).map((err, i) => <li key={i}>{err}</li>)}
                      {importResult.errors.length > 10 && <li>... and {importResult.errors.length - 10} more</li>}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-3">
          {importStatus === 'preview' && (
            <>
              <button onClick={() => { setImportCards([]); setImportStatus('idle'); }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white">
                Upload Different File
              </button>
              <button onClick={onConfirmImport} disabled={importLoading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Import {importCards.length} Cards
              </button>
            </>
          )}
          {importStatus === 'done' && (
            <button onClick={onClose} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Done</button>
          )}
          {importStatus === 'idle' && (
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white">Cancel</button>
          )}
        </div>
      </div>
    </div>
  );
}
