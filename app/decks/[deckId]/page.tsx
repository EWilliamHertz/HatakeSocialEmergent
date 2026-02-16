'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Search, Plus, Minus, Trash2, Save, ArrowLeft, Layers, Globe, Lock, Loader2, Settings, Share2, Upload, FileText } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface DeckCard {
  entry_id: string;
  card_id: string;
  card_data: any;
  quantity: number;
  category: string;
}

interface Deck {
  deck_id: string;
  name: string;
  description?: string;
  game: string;
  format?: string;
  is_public: boolean;
  user_id: string;
  owner_name: string;
  owner_picture?: string;
  created_at: string;
  updated_at: string;
}

interface SearchResult {
  id: string;
  name: string;
  image_uris?: {
    small: string;
    normal: string;
  };
  images?: {
    small: string;
  };
  mana_cost?: string;
  type_line?: string;
  set_name?: string;
}

export default function DeckEditorPage({ params }: { params: Promise<{ deckId: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<DeckCard[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editFormat, setEditFormat] = useState('');
  const [editPublic, setEditPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

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
          loadDeck();
        }
      })
      .catch(() => router.push('/auth/login'));
  }, [router, resolvedParams.deckId]);

  const loadDeck = async () => {
    try {
      const res = await fetch(`/api/decks/${resolvedParams.deckId}`, { credentials: 'include' });
      const data = await res.json();
      
      if (data.success) {
        setDeck(data.deck);
        setCards(data.cards || []);
        setIsOwner(data.isOwner);
        setEditName(data.deck.name);
        setEditDescription(data.deck.description || '');
        setEditFormat(data.deck.format || '');
        setEditPublic(data.deck.is_public);
      } else {
        router.push('/decks');
      }
    } catch (error) {
      console.error('Load deck error:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchCards = async () => {
    if (!searchQuery.trim() || !deck) return;
    setSearching(true);
    
    try {
      const res = await fetch(`/api/search?game=${deck.game}&q=${encodeURIComponent(searchQuery)}`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.results || []);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const addCard = async (card: SearchResult) => {
    if (!isOwner) return;
    
    try {
      const res = await fetch(`/api/decks/${resolvedParams.deckId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          cardId: card.id,
          cardData: card,
          quantity: 1,
          category: 'main'
        })
      });
      const data = await res.json();
      if (data.success) {
        loadDeck();
      }
    } catch (error) {
      console.error('Add card error:', error);
    }
  };

  const updateCardQuantity = async (cardId: string, delta: number) => {
    if (!isOwner) return;
    
    const card = cards.find(c => c.card_id === cardId);
    if (!card) return;
    
    const newQuantity = card.quantity + delta;
    
    try {
      const res = await fetch(`/api/decks/${resolvedParams.deckId}/cards`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          cardId,
          quantity: newQuantity
        })
      });
      const data = await res.json();
      if (data.success) {
        loadDeck();
      }
    } catch (error) {
      console.error('Update quantity error:', error);
    }
  };

  const removeCard = async (cardId: string) => {
    if (!isOwner) return;
    
    try {
      const res = await fetch(`/api/decks/${resolvedParams.deckId}/cards?cardId=${cardId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        loadDeck();
      }
    } catch (error) {
      console.error('Remove card error:', error);
    }
  };

  const toggleCardSelection = (cardId: string) => {
    const newSelected = new Set(selectedCards);
    if (newSelected.has(cardId)) {
      newSelected.delete(cardId);
    } else {
      newSelected.add(cardId);
    }
    setSelectedCards(newSelected);
  };

  const selectAllCards = () => {
    const allCardIds = new Set(filteredCards.map(c => c.card_id));
    setSelectedCards(allCardIds);
  };

  const deselectAllCards = () => {
    setSelectedCards(new Set());
  };

  const deleteSelectedCards = async () => {
    if (!isOwner || selectedCards.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedCards.size} selected card(s)?`)) return;
    
    try {
      for (const cardId of selectedCards) {
        await fetch(`/api/decks/${resolvedParams.deckId}/cards?cardId=${cardId}`, {
          method: 'DELETE',
          credentials: 'include'
        });
      }
      setSelectedCards(new Set());
      setSelectMode(false);
      loadDeck();
    } catch (error) {
      console.error('Delete selected cards error:', error);
    }
  };

  const saveSettings = async () => {
    if (!isOwner) return;
    setSaving(true);
    
    try {
      const res = await fetch(`/api/decks/${resolvedParams.deckId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: editName,
          description: editDescription,
          format: editFormat,
          isPublic: editPublic
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowSettings(false);
        loadDeck();
      }
    } catch (error) {
      console.error('Save settings error:', error);
    } finally {
      setSaving(false);
    }
  };

  // Import decklist from text
  const importDecklist = async () => {
    if (!isOwner || !importText.trim() || !deck) return;
    setImporting(true);
    
    try {
      // Parse decklist format: "4 Lightning Bolt" or "4x Lightning Bolt"
      // Support "SB:" or "Sideboard" prefix for sideboard cards
      const lines = importText.split('\n').filter(line => line.trim());
      const cardsToAdd: { name: string; quantity: number; category: string }[] = [];
      let currentCategory = 'main';
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Check for sideboard section markers
        if (trimmedLine.toLowerCase() === 'sideboard' || 
            trimmedLine.toLowerCase() === 'sideboard:' ||
            trimmedLine.toLowerCase() === 'sb' ||
            trimmedLine.toLowerCase() === 'sb:') {
          currentCategory = 'sideboard';
          continue;
        }
        
        // Check for main deck section marker
        if (trimmedLine.toLowerCase() === 'main' || 
            trimmedLine.toLowerCase() === 'main deck' ||
            trimmedLine.toLowerCase() === 'maindeck' ||
            trimmedLine.toLowerCase() === 'main:') {
          currentCategory = 'main';
          continue;
        }
        
        // Check for "SB: 4 Lightning Bolt" format
        const sbMatch = trimmedLine.match(/^(?:SB:|Sideboard:)\s*(\d+)x?\s+(.+)$/i);
        if (sbMatch) {
          const quantity = parseInt(sbMatch[1]);
          const name = sbMatch[2].trim();
          if (quantity > 0 && name) {
            cardsToAdd.push({ name, quantity, category: 'sideboard' });
          }
          continue;
        }
        
        // Regular card line
        const match = trimmedLine.match(/^(\d+)x?\s+(.+)$/i);
        if (match) {
          const quantity = parseInt(match[1]);
          const name = match[2].trim();
          if (quantity > 0 && name) {
            cardsToAdd.push({ name, quantity, category: currentCategory });
          }
        } else if (trimmedLine && !trimmedLine.startsWith('//') && !trimmedLine.startsWith('#')) {
          // Single card without quantity
          cardsToAdd.push({ name: trimmedLine, quantity: 1, category: currentCategory });
        }
      }
      
      // Search for each card and add it
      let addedCount = 0;
      let failedCards: string[] = [];
      
      for (const card of cardsToAdd) {
        try {
          // Search for the card
          const searchRes = await fetch(`/api/search?game=${deck.game}&q=${encodeURIComponent(card.name)}`, {
            credentials: 'include'
          });
          const searchData = await searchRes.json();
          
          if (searchData.success && searchData.results?.length > 0) {
            // Find exact match or first result
            const exactMatch = searchData.results.find((r: any) => 
              r.name.toLowerCase() === card.name.toLowerCase()
            ) || searchData.results[0];
            
            // Add to deck
            const addRes = await fetch(`/api/decks/${resolvedParams.deckId}/cards`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                cardId: exactMatch.id,
                cardData: exactMatch,
                quantity: card.quantity,
                category: card.category
              })
            });
            
            if ((await addRes.json()).success) {
              addedCount++;
            } else {
              failedCards.push(card.name);
            }
          } else {
            failedCards.push(card.name);
          }
        } catch (e) {
          failedCards.push(card.name);
        }
      }
      
      // Reload deck
      await loadDeck();
      setShowImportModal(false);
      setImportText('');
      
      // Show results
      if (failedCards.length > 0) {
        alert(`Imported ${addedCount} cards.\nCouldn't find: ${failedCards.slice(0, 5).join(', ')}${failedCards.length > 5 ? ` and ${failedCards.length - 5} more` : ''}`);
      } else {
        alert(`Successfully imported ${addedCount} cards!`);
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import decklist');
    } finally {
      setImporting(false);
    }
  };

  // Calculate deck stats
  const totalCards = cards.reduce((sum, c) => sum + c.quantity, 0);
  const uniqueCards = cards.length;
  
  // Group cards by category
  const mainDeck = cards.filter(c => c.category === 'main' || !c.category);
  const sideboard = cards.filter(c => c.category === 'sideboard');
  
  const filteredCards = activeCategory === 'all' ? cards : 
    activeCategory === 'main' ? mainDeck : sideboard;

  const getCardImage = (card: DeckCard) => {
    if (card.card_data.image_uris?.normal) return card.card_data.image_uris.normal;
    if (card.card_data.image_uris?.small) return card.card_data.image_uris.small;
    if (card.card_data.images?.small) return card.card_data.images.small;
    return '/placeholder-card.png';
  };

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

  if (!deck) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/decks" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{deck.name}</h1>
                  {deck.is_public ? (
                    <span title="Public"><Globe className="w-5 h-5 text-green-500" /></span>
                  ) : (
                    <span title="Private"><Lock className="w-5 h-5 text-gray-400" /></span>
                  )}
                </div>
                <p className="text-gray-500 dark:text-gray-400">
                  {deck.game.toUpperCase()} {deck.format && `• ${deck.format}`} • {totalCards} cards ({uniqueCards} unique)
                </p>
              </div>
            </div>
            
            {isOwner && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
                >
                  <Upload className="w-4 h-4" />
                  Import
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card Search */}
          {isOwner && (
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sticky top-4">
                <h2 className="font-bold text-gray-900 dark:text-white mb-4">Add Cards</h2>
                
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchCards()}
                    placeholder="Search cards..."
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    data-testid="card-search-input"
                  />
                  <button
                    onClick={searchCards}
                    disabled={searching}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  </button>
                </div>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {searchResults.map((card) => (
                    <div
                      key={card.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer"
                      onClick={() => addCard(card)}
                      data-testid={`search-result-${card.id}`}
                    >
                      {(card.image_uris?.small || card.images?.small) && (
                        <img
                          src={card.image_uris?.small || card.images?.small}
                          alt={card.name}
                          className="w-10 h-14 rounded object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">{card.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{card.type_line || card.set_name}</p>
                      </div>
                      <Plus className="w-5 h-5 text-green-600 flex-shrink-0" />
                    </div>
                  ))}
                  
                  {searchResults.length === 0 && searchQuery && !searching && (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-4">No cards found</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Deck List */}
          <div className={isOwner ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              {/* Category Tabs + Multi-Select Controls */}
              <div className="border-b border-gray-200 dark:border-gray-700 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex gap-4">
                    {['all', 'main', 'sideboard'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`py-3 px-2 border-b-2 font-medium transition capitalize ${
                          activeCategory === cat
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                      >
                        {cat} {cat === 'all' ? `(${totalCards})` : cat === 'main' ? `(${mainDeck.reduce((s, c) => s + c.quantity, 0)})` : `(${sideboard.reduce((s, c) => s + c.quantity, 0)})`}
                      </button>
                    ))}
                  </div>
                  
                  {/* Multi-Select Controls */}
                  {isOwner && filteredCards.length > 0 && (
                    <div className="flex items-center gap-2 py-2">
                      {selectMode ? (
                        <>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {selectedCards.size} selected
                          </span>
                          <button
                            onClick={selectAllCards}
                            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white"
                          >
                            Select All
                          </button>
                          <button
                            onClick={deselectAllCards}
                            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white"
                          >
                            Deselect
                          </button>
                          <button
                            onClick={deleteSelectedCards}
                            disabled={selectedCards.size === 0}
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                          <button
                            onClick={() => { setSelectMode(false); setSelectedCards(new Set()); }}
                            className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setSelectMode(true)}
                          className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white"
                          data-testid="multi-select-btn"
                        >
                          Select Multiple
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Cards Grid */}
              <div className="p-4">
                {filteredCards.length === 0 ? (
                  <div className="text-center py-12">
                    <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      {isOwner ? 'Search for cards to add to your deck' : 'This deck is empty'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {filteredCards.map((card) => (
                      <div 
                        key={card.entry_id} 
                        className={`relative group cursor-pointer ${
                          selectMode && selectedCards.has(card.card_id) 
                            ? 'ring-2 ring-blue-500 ring-offset-2 rounded-lg' 
                            : ''
                        }`}
                        onClick={selectMode ? () => toggleCardSelection(card.card_id) : undefined}
                        data-testid={`deck-card-${card.card_id}`}
                      >
                        {/* Selection Checkbox */}
                        {selectMode && (
                          <div className="absolute top-2 left-2 z-10">
                            <input
                              type="checkbox"
                              checked={selectedCards.has(card.card_id)}
                              onChange={() => toggleCardSelection(card.card_id)}
                              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        )}
                        
                        <img
                          src={getCardImage(card)}
                          alt={card.card_data.name}
                          className="w-full rounded-lg shadow-md"
                        />
                        
                        {/* Quantity Badge */}
                        <div className="absolute top-2 right-2 bg-black/70 text-white text-sm font-bold px-2 py-1 rounded">
                          x{card.quantity}
                        </div>
                        
                        {/* Category Badge for Sideboard */}
                        {card.category === 'sideboard' && (
                          <div className="absolute bottom-2 left-2 bg-purple-600 text-white text-xs font-medium px-2 py-0.5 rounded">
                            SB
                          </div>
                        )}
                        
                        {/* Controls */}
                        {isOwner && !selectMode && (
                          <div className="absolute bottom-2 left-2 right-2 flex justify-between opacity-0 group-hover:opacity-100 transition">
                            <div className="flex gap-1">
                              <button
                                onClick={() => updateCardQuantity(card.card_id, -1)}
                                className="p-1 bg-black/70 text-white rounded hover:bg-black/90"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => updateCardQuantity(card.card_id, 1)}
                                className="p-1 bg-black/70 text-white rounded hover:bg-black/90"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                            <button
                              onClick={() => removeCard(card.card_id)}
                              className="p-1 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Deck Settings</h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deck Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg resize-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Format</label>
                <input
                  type="text"
                  value={editFormat}
                  onChange={(e) => setEditFormat(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                />
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="editPublic"
                  checked={editPublic}
                  onChange={(e) => setEditPublic(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="editPublic" className="text-sm text-gray-700 dark:text-gray-300">
                  Make this deck public
                </label>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={saveSettings}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Import Decklist</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Paste your decklist in any common format
              </p>
            </div>
            
            <div className="p-6">
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="4 Lightning Bolt
4x Counterspell
2 Island
// Sideboard
3x Negate

Supports formats:
- 4 Card Name
- 4x Card Name
- Card Name (adds 1)"
                className="w-full h-64 px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg resize-none font-mono text-sm"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Lines starting with // or # are ignored. Each card will be searched and added if found.
              </p>
            </div>
            
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportText('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={importDecklist}
                disabled={importing || !importText.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Import Decklist
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
