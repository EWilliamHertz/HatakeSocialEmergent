'use client';

import { X, Search, Loader2, Plus } from 'lucide-react';
import {
  pokemonFinishOptions, lorcanaFinishOptions, mtgFinishOptions,
  conditionOptions, gradingCompanies, gradeValues, getPriceForFinish,
} from '@/hooks/useCardSearch';

interface AddCardModalProps {
  // Search state
  addCardGame: 'mtg' | 'pokemon' | 'lorcana';
  setAddCardGame: (g: 'mtg' | 'pokemon' | 'lorcana') => void;
  addCardName: string;
  setAddCardName: (v: string) => void;
  addCardSetCode: string;
  setAddCardSetCode: (v: string) => void;
  addCardCollectorNum: string;
  setAddCardCollectorNum: (v: string) => void;
  addCardLang: 'all' | 'en' | 'ja';
  setAddCardLang: (v: 'all' | 'en' | 'ja') => void;
  addCardSearchResults: any[];
  setAddCardSearchResults: (v: any[]) => void;
  addCardSearching: boolean;
  searchCardManually: () => void;
  onClose: () => void;

  // Confirm state
  selectedCardToAdd: any;
  setSelectedCardToAdd: (v: any) => void;
  addCardQuantity: number;
  setAddCardQuantity: (v: number) => void;
  addCardCondition: string;
  setAddCardCondition: (v: string) => void;
  cardFinish: string;
  setCardFinish: (v: string) => void;
  isGraded: boolean;
  setIsGraded: (v: boolean) => void;
  isSigned: boolean;
  setIsSigned: (v: boolean) => void;
  gradingCompany: string;
  setGradingCompany: (v: string) => void;
  gradeValue: string;
  setGradeValue: (v: string) => void;
  cardPriceData: any;
  setCardPriceData: (v: any) => void;
  addingCard: boolean;
  addCardToCollection: (onSuccess: () => void) => void;
  onSuccess: () => void;
}

export default function AddCardModal(props: AddCardModalProps) {
  const {
    addCardGame, setAddCardGame, addCardName, setAddCardName,
    addCardSetCode, setAddCardSetCode, addCardCollectorNum, setAddCardCollectorNum,
    addCardLang, setAddCardLang,
    addCardSearchResults, setAddCardSearchResults, addCardSearching, searchCardManually, onClose,
    selectedCardToAdd, setSelectedCardToAdd,
    addCardQuantity, setAddCardQuantity, addCardCondition, setAddCardCondition,
    cardFinish, setCardFinish, isGraded, setIsGraded, isSigned, setIsSigned,
    gradingCompany, setGradingCompany, gradeValue, setGradeValue,
    cardPriceData, setCardPriceData, addingCard, addCardToCollection, onSuccess,
  } = props;

  const finishOptions = addCardGame === 'pokemon' ? pokemonFinishOptions
    : addCardGame === 'lorcana' ? lorcanaFinishOptions
    : mtgFinishOptions;

  const getCardPriceDisplays = (card: any) => {
    const prices: string[] = [];
    if (addCardGame === 'pokemon') {
      const tcgPrices = card.tcgplayer?.prices || card.pricing?.tcgplayer;
      if (tcgPrices) {
        const entries: [string, string][] = [
          ['normal', ''], ['holofoil', ' (Holo)'], ['reverseHolofoil', ' (Rev)'],
          ['pokeballHolofoil', ' (PB)'], ['masterballHolofoil', ' (MB)'],
        ];
        for (const [key, label] of entries) {
          const val = parseFloat(tcgPrices[key]?.market ?? tcgPrices[key]) * 0.92;
          if (val > 0) prices.push(`€${val.toFixed(2)}${label}`);
        }
        if (prices.length > 0) return prices;
      }
      const cmPrices = card.cardmarket?.prices || card.pricing?.cardmarket;
      if (cmPrices) {
        if (cmPrices.avg || cmPrices.trend) prices.push(`€${parseFloat(cmPrices.avg || cmPrices.trend).toFixed(2)}`);
        if (cmPrices.reverseHoloAvg || cmPrices.reverseHoloTrend) prices.push(`€${parseFloat(cmPrices.reverseHoloAvg || cmPrices.reverseHoloTrend).toFixed(2)} (Rev)`);
        if (prices.length > 0) return prices;
      }
      const usd = card.pricing?.usd || card.prices?.usd;
      if (usd) return [`€${(parseFloat(String(usd)) * 0.92).toFixed(2)}`];
      return null;
    } else if (addCardGame === 'lorcana') {
      const usd = card.pricing?.usd;
      if (usd) prices.push(`$${parseFloat(String(usd)).toFixed(2)}`);
      const foil = card.pricing?.foil || card.tcgplayer?.prices?.foil?.market;
      if (foil) prices.push(`$${parseFloat(String(foil)).toFixed(2)} (Foil)`);
      return prices.length > 0 ? prices : null;
    } else {
      const p = card.prices;
      if (p?.eur) prices.push(`€${p.eur}`);
      if (p?.eur_foil) prices.push(`€${p.eur_foil} (Foil)`);
      if (prices.length === 0) {
        if (p?.usd) prices.push(`$${p.usd}`);
        if (p?.usd_foil) prices.push(`$${p.usd_foil} (Foil)`);
      }
      return prices.length > 0 ? prices : null;
    }
  };

  return (
    <>
      {/* Search Modal */}
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
          <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold dark:text-white">Add Card Manually</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Search by name or set code + collector number</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Search form — hidden once results shown */}
          {addCardSearchResults.length === 0 && (
            <div className="p-6 border-b dark:border-gray-700 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Game</label>
                <select value={addCardGame} onChange={(e) => { setAddCardGame(e.target.value as any); setAddCardSearchResults([]); }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg">
                  <option value="mtg">Magic: The Gathering</option>
                  <option value="pokemon">Pokémon TCG</option>
                  <option value="lorcana">Disney Lorcana</option>
                </select>
              </div>

              {addCardGame === 'pokemon' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Language</label>
                  <div className="flex flex-wrap gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    {([{ code: 'en', label: '🇬🇧 English' }, { code: 'ja', label: '🇯🇵 Japanese' }, { code: 'all', label: '🇬🇧+🇯🇵 EN + JP' }] as any[]).map(({ code, label }) => (
                      <button key={code} onClick={() => { setAddCardLang(code); setAddCardSearchResults([]); }}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${addCardLang === code ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {addCardLang === 'all' && <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">⚡ Searches English & Japanese simultaneously</p>}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Card Name</label>
                <input type="text" value={addCardName} onChange={(e) => setAddCardName(e.target.value)}
                  placeholder="e.g., Black Lotus, Charizard..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  data-testid="card-name-input"
                  onKeyDown={(e) => e.key === 'Enter' && searchCardManually()} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Set Code (optional)</label>
                  <input type="text" value={addCardSetCode} onChange={(e) => setAddCardSetCode(e.target.value.toUpperCase())}
                    placeholder="e.g., MH3, NEO"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg uppercase"
                    data-testid="set-code-input"
                    onKeyDown={(e) => e.key === 'Enter' && searchCardManually()} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Collector # (optional)</label>
                  <input type="text" value={addCardCollectorNum} onChange={(e) => setAddCardCollectorNum(e.target.value)}
                    placeholder="e.g., 141, 23"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                    data-testid="collector-num-input"
                    onKeyDown={(e) => e.key === 'Enter' && searchCardManually()} />
                </div>
                <div className="flex items-end">
                  <button onClick={searchCardManually}
                    disabled={(!addCardName.trim() && !addCardSetCode.trim()) || addCardSearching}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    data-testid="search-card-btn">
                    {addCardSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Search
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Tip: Search by card name, or use set code + collector number for exact matches</p>
            </div>
          )}

          {/* Compact summary bar */}
          {addCardSearchResults.length > 0 && (
            <div className="px-4 py-2 border-b dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 shrink-0">
              <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                <span className="font-medium">{addCardSearchResults.length} results</span>
                {(addCardName || addCardSetCode) && <> for &quot;{addCardName || `${addCardSetCode} #${addCardCollectorNum}`}&quot;</>}
              </span>
              <button onClick={() => setAddCardSearchResults([])} className="ml-3 text-sm text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap">
                ← New search
              </button>
            </div>
          )}

          {/* Results */}
          <div className="flex-1 overflow-auto p-4 min-h-[320px]">
            {addCardSearching ? (
              <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" /><p className="text-gray-500 mt-2">Searching...</p></div>
            ) : addCardSearchResults.length === 0 ? (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  {(addCardName || addCardSetCode) ? 'No cards found. Try a different search term.' : 'Enter a card name or set code to search'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {addCardSearchResults.map((card) => {
                  const priceDisplays = getCardPriceDisplays(card);
                  return (
                    <div key={card.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-600 transition">
                      <div className="aspect-[488/680] relative mb-2">
                        <img src={card.image_uris?.small || card.image_uris?.normal || card.images?.small || card.images?.large || '/placeholder-card.png'}
                          alt={card.name} className="w-full h-full object-contain rounded" />
                        {priceDisplays && priceDisplays.length > 0 && (
                          <div className="absolute top-1 right-1 flex flex-col gap-0.5 items-end">
                            {priceDisplays.map((p, i) => (
                              <div key={i} className="bg-green-600/90 text-white text-[10px] leading-tight font-bold px-1.5 py-0.5 rounded shadow-sm backdrop-blur-sm">{p}</div>
                            ))}
                          </div>
                        )}
                      </div>
                      <h4 className="font-medium text-sm truncate dark:text-white" title={card.name}>{card.name}</h4>
                      <div className="flex items-center gap-1 mb-2">
                        <span className="text-xs bg-gray-200 dark:bg-gray-600 px-1 rounded font-mono uppercase">
                          {card.set_code || card.set?.id || card.set || card.set_name?.slice(0, 3) || '???'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">#{card.collector_number || card.number || card.localId || '?'}</span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedCardToAdd(card);
                          setCardFinish('Normal');
                          setAddCardQuantity(1);
                          setAddCardCondition('Near Mint');
                          setIsGraded(false);
                          setCardPriceData(card.pricing || card.prices);
                        }}
                        className="w-full px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center justify-center gap-1">
                        <Plus className="w-3 h-3" /> Add to collection
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {selectedCardToAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold dark:text-white">Add to Collection</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{selectedCardToAdd.name}</p>
                  <p className="text-xs text-gray-500">{selectedCardToAdd.set_code || selectedCardToAdd.set?.id || ''} #{selectedCardToAdd.collector_number || selectedCardToAdd.localId || selectedCardToAdd.number || ''}</p>
                </div>
                <button onClick={() => setSelectedCardToAdd(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-5 h-5" /></button>
              </div>

              <div className="flex gap-4 mb-6">
                <div className="w-32 flex-shrink-0">
                  <img src={selectedCardToAdd.image_uris?.normal || selectedCardToAdd.image_uris?.small || selectedCardToAdd.images?.large || selectedCardToAdd.images?.small || '/placeholder-card.png'}
                    alt={selectedCardToAdd.name} className="w-full rounded-lg shadow" />
                </div>
                <div className="flex-1">
                  {(() => {
                    const selectedPrice = getPriceForFinish(selectedCardToAdd, addCardGame, cardFinish);
                    if (selectedPrice) return (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Market Price ({cardFinish}):</p>
                        <p className="text-lg font-bold text-green-600">{selectedPrice.currency === 'EUR' ? '€' : '$'}{selectedPrice.value.toFixed(2)}</p>
                        <p className="text-xs text-gray-400">Estimated current value</p>
                      </div>
                    );
                    return <p className="text-sm text-gray-500">Price not available</p>;
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                  <input type="number" min="1" value={addCardQuantity} onChange={(e) => setAddCardQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Finish</label>
                  <select value={cardFinish} onChange={(e) => setCardFinish(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    {finishOptions.map(opt => {
                      const price = getPriceForFinish(selectedCardToAdd, addCardGame, opt);
                      const priceStr = price ? ` - ${price.currency === 'EUR' ? '€' : '$'}${price.value.toFixed(2)}` : '';
                      return <option key={opt} value={opt}>{opt}{priceStr}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Condition</label>
                  <select value={addCardCondition} onChange={(e) => setAddCardCondition(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    {conditionOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>

              <div className="mb-4 space-y-2">
                {[{ checked: isSigned, onChange: setIsSigned, label: 'Signed card' }, { checked: isGraded, onChange: setIsGraded, label: 'Graded card' }].map(({ checked, onChange, label }) => (
                  <label key={label} className="flex items-center gap-2">
                    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="rounded" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
                  </label>
                ))}
              </div>

              {isGraded && (
                <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Grading Company</label>
                    <select value={gradingCompany} onChange={(e) => setGradingCompany(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:border-gray-500 dark:text-white">
                      {gradingCompanies.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Grade</label>
                    <select value={gradeValue} onChange={(e) => setGradeValue(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:border-gray-500 dark:text-white">
                      {gradeValues.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setSelectedCardToAdd(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                  Cancel
                </button>
                <button onClick={() => addCardToCollection(onSuccess)} disabled={addingCard}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {addingCard ? <><Loader2 className="w-4 h-4 animate-spin" />Adding...</> : <><Plus className="w-4 h-4" />Add to Collection</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
