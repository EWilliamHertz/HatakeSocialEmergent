'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Package, Trash2, DollarSign, CheckSquare, Square, MoreHorizontal, Edit2, ShoppingBag, Search, Upload, FileSpreadsheet, X, AlertCircle, CheckCircle, Plus, Loader2 } from 'lucide-react';
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

interface ImportCard {
  name: string;
  setCode: string;
  setName: string;
  collectorNumber: string;
  foil: boolean;
  rarity: string;
  quantity: number;
  scryfallId: string;
  purchasePrice: number;
  currency: string;
  condition: string;
  language: string;
  misprint: boolean;
  altered: boolean;
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
  
  // Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importCards, setImportCards] = useState<ImportCard[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'preview' | 'importing' | 'done'>('idle');
  const [importResult, setImportResult] = useState<{ imported: number; errors?: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Manual add card state
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [addCardGame, setAddCardGame] = useState<'mtg' | 'pokemon'>('mtg');
  const [addCardSetCode, setAddCardSetCode] = useState('');
  const [addCardCollectorNum, setAddCardCollectorNum] = useState('');
  const [addCardName, setAddCardName] = useState('');
  const [addCardSearchResults, setAddCardSearchResults] = useState<any[]>([]);
  const [addCardSearching, setAddCardSearching] = useState(false);
  const [addCardQuantity, setAddCardQuantity] = useState(1);
  const [addCardCondition, setAddCardCondition] = useState('Near Mint');
  const [addCardFoil, setAddCardFoil] = useState(false);
  const [addingCard, setAddingCard] = useState(false);
  const [addCardSearchMode, setAddCardSearchMode] = useState<'name' | 'set'>('name');
  
  // Enhanced add card modal state
  const [selectedCardToAdd, setSelectedCardToAdd] = useState<any>(null);
  const [cardFinish, setCardFinish] = useState('Normal');
  const [isGraded, setIsGraded] = useState(false);
  const [gradingCompany, setGradingCompany] = useState('PSA');
  const [gradeValue, setGradeValue] = useState('10');
  const [loadingCardPrice, setLoadingCardPrice] = useState(false);
  const [cardPriceData, setCardPriceData] = useState<any>(null);

  // Pokemon finish options
  const pokemonFinishOptions = [
    'Normal',
    'Holofoil',
    'Reverse Holofoil', 
    'Pokeball Holofoil',
    'Masterball Holofoil',
    'Full Art',
    'Special Art Rare',
    'Illustration Rare'
  ];

  // MTG finish options
  const mtgFinishOptions = [
    'Normal',
    'Foil',
    'Etched Foil',
    'Gilded Foil',
    'Surge Foil',
    'Galaxy Foil',
    'Textured Foil'
  ];

  // Condition options
  const conditionOptions = [
    'Mint',
    'Near Mint',
    'Excellent',
    'Good',
    'Light Played',
    'Played',
    'Poor'
  ];

  // Grading companies
  const gradingCompanies = ['PSA', 'BGS', 'CGC', 'SGC'];
  const gradeValues = ['10', '9.5', '9', '8.5', '8', '7.5', '7', '6.5', '6', '5.5', '5', '4', '3', '2', '1'];

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

  // Pokemon set code aliases - common abbreviations users might use
  const pokemonSetAliases: Record<string, string> = {
    'jtg': 'sv09',          // Journey Together
    'journey': 'sv09',      // Journey Together
    'journeytogether': 'sv09',
    'tef': 'sv05',          // Temporal Forces
    'temporal': 'sv05',     
    'par': 'sv04',          // Paradox Rift
    'obsidian': 'sv03',     // Obsidian Flames
    'paldea': 'sv02',       // Paldea Evolved
    'scarlet': 'sv01',      // Scarlet & Violet Base
    'violet': 'sv01',
    'svbase': 'sv01',
  };

  // Search for card - supports name search or set+number search
  const searchCardManually = async () => {
    const hasNameSearch = addCardName.trim().length >= 2;
    const hasSetSearch = addCardSetCode.trim().length > 0;
    
    if (!hasNameSearch && !hasSetSearch) return;
    
    setAddCardSearching(true);
    setAddCardSearchResults([]);
    
    // Resolve set code alias for Pokemon
    let resolvedSetCode = addCardSetCode.trim().toLowerCase();
    if (addCardGame === 'pokemon' && pokemonSetAliases[resolvedSetCode]) {
      resolvedSetCode = pokemonSetAliases[resolvedSetCode];
    }
    
    try {
      if (addCardGame === 'mtg') {
        let query = '';
        
        // Build Scryfall query
        if (addCardName.trim()) {
          // Name search (with optional set filter)
          query = addCardName.trim();
          if (addCardSetCode.trim()) {
            query += ` set:${addCardSetCode.toLowerCase()}`;
          }
          if (addCardCollectorNum.trim()) {
            query += ` cn:${addCardCollectorNum}`;
          }
        } else if (addCardSetCode.trim()) {
          // Set + collector number search
          query = `set:${addCardSetCode.toLowerCase()}`;
          if (addCardCollectorNum.trim()) {
            query += ` cn:${addCardCollectorNum}`;
          }
        }
        
        if (!query) {
          setAddCardSearchResults([]);
          return;
        }
        
        try {
          // Try search API first
          console.log('Scryfall search query:', query);
          const searchRes = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&unique=prints&order=released`, {
            headers: {
              'Accept': 'application/json',
            }
          });
          
          if (searchRes.ok) {
            const data = await searchRes.json();
            setAddCardSearchResults(data.data?.slice(0, 30) || []);
          } else {
            // If search fails, check error response
            const errorData = await searchRes.json().catch(() => ({}));
            console.log('Scryfall search error:', errorData);
            
            // If search fails and we have set+number, try direct lookup
            if (addCardSetCode.trim() && addCardCollectorNum.trim()) {
              const directRes = await fetch(`https://api.scryfall.com/cards/${addCardSetCode.toLowerCase()}/${addCardCollectorNum}`, {
                headers: { 'Accept': 'application/json' }
              });
              if (directRes.ok) {
                const card = await directRes.json();
                setAddCardSearchResults([card]);
              } else {
                // Try with padded collector number (some sets need leading zeros)
                const paddedNum = addCardCollectorNum.padStart(3, '0');
                const paddedRes = await fetch(`https://api.scryfall.com/cards/${addCardSetCode.toLowerCase()}/${paddedNum}`, {
                  headers: { 'Accept': 'application/json' }
                });
                if (paddedRes.ok) {
                  const card = await paddedRes.json();
                  setAddCardSearchResults([card]);
                } else {
                  setAddCardSearchResults([]);
                }
              }
            } else {
              setAddCardSearchResults([]);
            }
          }
        } catch (scryfallError) {
          console.error('Scryfall API error:', scryfallError);
          setAddCardSearchResults([]);
        }
      } else {
        // TCGdex API for Pokemon (free, no API key required)
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);
          
          let cards: any[] = [];
          
          // If we have set code and collector number but no name, try direct card lookup
          if (resolvedSetCode && addCardCollectorNum.trim() && !addCardName.trim()) {
            // Try to fetch specific card directly
            const collNum = addCardCollectorNum.trim().padStart(3, '0');
            const cardId = `${resolvedSetCode}-${collNum}`;
            console.log('TCGdex direct card lookup:', cardId);
            
            const directRes = await fetch(`https://api.tcgdex.net/v2/en/cards/${cardId}`, {
              signal: controller.signal
            });
            
            if (directRes.ok) {
              const card = await directRes.json();
              cards = [card];
            } else {
              // Try without padding
              const cardIdNoPad = `${resolvedSetCode}-${addCardCollectorNum.trim()}`;
              const directRes2 = await fetch(`https://api.tcgdex.net/v2/en/cards/${cardIdNoPad}`, {
                signal: controller.signal
              });
              if (directRes2.ok) {
                const card = await directRes2.json();
                cards = [card];
              }
            }
          } else {
            // Name-based search
            let searchUrl = 'https://api.tcgdex.net/v2/en/cards';
            const params = new URLSearchParams();
            
            if (addCardName.trim()) {
              params.append('name', addCardName.trim());
            }
            
            let apiUrl = searchUrl;
            if (params.toString()) {
              apiUrl += '?' + params.toString();
            }
            
            console.log('TCGdex search URL:', apiUrl);
            
            const res = await fetch(apiUrl, {
              signal: controller.signal
            });
            
            if (res.ok) {
              cards = await res.json();
              
              // If set code is provided, filter results
              if (addCardSetCode.trim()) {
                cards = cards.filter((card: any) => 
                  card.id?.toLowerCase().includes(resolvedSetCode) || 
                  card.set?.id?.toLowerCase() === resolvedSetCode
                );
              }
              
              // If collector number is provided, filter results
              if (addCardCollectorNum.trim()) {
                const collNum = addCardCollectorNum.trim();
                // Pad to 3 digits for comparison (e.g., "24" -> "024")
                const paddedCollNum = collNum.padStart(3, '0');
                cards = cards.filter((card: any) => {
                  const cardLocalId = card.localId?.toString() || '';
                  const cardIdNum = card.id?.split('-').pop() || '';
                  return cardLocalId === collNum || 
                         cardLocalId === paddedCollNum ||
                         cardIdNum === collNum ||
                         cardIdNum === paddedCollNum;
                });
              }
            }
          }
          
          clearTimeout(timeoutId);
          
          // Map TCGdex cards to consistent format
          const mappedCards = cards.slice(0, 30).map((card: any) => ({
            id: card.id,
            name: card.name,
            game: 'pokemon',
            image_uris: {
              small: card.image ? card.image + '/low.webp' : null,
              normal: card.image ? card.image + '/high.webp' : null,
              large: card.image ? card.image + '/high.webp' : null
            },
            images: {
              small: card.image ? card.image + '/low.webp' : null,
              large: card.image ? card.image + '/high.webp' : null
            },
            set_name: card.set?.name || '',
            set_code: card.set?.id || card.id?.split('-')[0] || '',
            collector_number: card.localId || card.id?.split('-').pop() || '',
            set: { id: card.set?.id, name: card.set?.name },
            pricing: card.pricing  // Include pricing if available
          }));
          
          setAddCardSearchResults(mappedCards);
          
          if (mappedCards.length === 0) {
            console.log('No Pokemon cards found for search');
          }
        } catch (fetchError: any) {
          if (fetchError.name === 'AbortError') {
            console.error('TCGdex API timeout');
          } else {
            console.error('TCGdex API fetch error:', fetchError);
          }
          setAddCardSearchResults([]);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      setAddCardSearchResults([]);
    } finally {
      setAddCardSearching(false);
    }
  };

  // Add selected card to collection
  const addCardToCollection = async (card: any) => {
    setAddingCard(true);
    
    try {
      let cardData = card;
      
      // For Pokemon cards, fetch full details to get pricing
      if (addCardGame === 'pokemon' && card.id) {
        try {
          const detailRes = await fetch(`https://api.tcgdex.net/v2/en/cards/${card.id}`, {
            signal: AbortSignal.timeout(10000)
          });
          if (detailRes.ok) {
            const fullCard = await detailRes.json();
            // Merge full card data with our mapped format
            cardData = {
              ...card,
              pricing: fullCard.pricing,
              rarity: fullCard.rarity,
              hp: fullCard.hp,
              types: fullCard.types,
              artist: fullCard.illustrator,
            };
          }
        } catch (e) {
          console.warn('Could not fetch full card details:', e);
        }
      }
      
      const res = await fetch('/api/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          cardId: card.id,
          game: addCardGame,
          cardData: cardData,
          quantity: addCardQuantity,
          condition: addCardCondition,
          foil: addCardFoil
        })
      });
      
      const data = await res.json();
      if (data.success) {
        alert(`Added ${card.name} to collection!`);
        loadCollection();
        // Reset form
        setAddCardSetCode('');
        setAddCardCollectorNum('');
        setAddCardSearchResults([]);
        setAddCardQuantity(1);
        setAddCardFoil(false);
      } else {
        alert(data.error || 'Failed to add card');
      }
    } catch (error) {
      console.error('Add card error:', error);
      alert('Failed to add card');
    } finally {
      setAddingCard(false);
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
    if (item.game === 'pokemon') {
      // Check for TCGdex pricing (from cardmarket) - prices are in EUR
      if (card.pricing?.cardmarket) {
        return { value: card.pricing.cardmarket.avg || card.pricing.cardmarket.trend || 0, currency: 'EUR' };
      }
      // Legacy TCGplayer format - prices are in USD
      if (card.tcgplayer?.prices) {
        const prices = card.tcgplayer.prices;
        return { value: prices.holofoil?.market || prices.normal?.market || 0, currency: 'USD' };
      }
      return { value: 0, currency: 'EUR' };
    } else if (item.game === 'mtg') {
      // Scryfall prices
      if (card.prices?.usd) {
        return { value: parseFloat(card.prices.usd), currency: 'USD' };
      }
      if (card.prices?.eur) {
        return { value: parseFloat(card.prices.eur), currency: 'EUR' };
      }
    }
    return { value: 0, currency: 'USD' };
  };
  
  // Helper to get just the numeric value
  const getCardPriceValue = (item: CollectionItem) => getCardPrice(item).value;

  const calculateTotalValue = () => {
    let totalEUR = 0;
    let totalUSD = 0;
    items.forEach(item => {
      const price = getCardPrice(item);
      if (price.currency === 'EUR') {
        totalEUR += price.value * item.quantity;
      } else {
        totalUSD += price.value * item.quantity;
      }
    });
    
    // Return formatted string with both currencies if applicable
    const parts = [];
    if (totalUSD > 0) parts.push(`$${totalUSD.toFixed(2)}`);
    if (totalEUR > 0) parts.push(`€${totalEUR.toFixed(2)}`);
    return parts.length > 0 ? parts.join(' + ') : '$0.00';
  };

  const filteredItems = items.filter(item => {
    if (!searchQuery) return true;
    return item.card_data.name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Import functions
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportLoading(true);
    setImportStatus('preview');

    try {
      const text = await file.text();
      
      const res = await fetch('/api/collection/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ csvContent: text, action: 'preview' })
      });

      const data = await res.json();
      
      if (data.success) {
        setImportCards(data.cards);
      } else {
        alert('Failed to parse CSV: ' + (data.error || 'Unknown error'));
        setImportStatus('idle');
      }
    } catch (error) {
      console.error('File upload error:', error);
      alert('Failed to read file');
      setImportStatus('idle');
    } finally {
      setImportLoading(false);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const confirmImport = async () => {
    setImportLoading(true);
    setImportStatus('importing');

    try {
      // Re-read the file for import
      const file = fileInputRef.current?.files?.[0];
      if (!file) {
        // Use the already parsed cards
        const res = await fetch('/api/collection/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ 
            csvContent: importCards.map(c => 
              `"${c.name}",${c.setCode},"${c.setName}",${c.collectorNumber},${c.foil ? 'foil' : 'normal'},${c.rarity},${c.quantity},,${c.scryfallId},${c.purchasePrice},false,${c.altered},${c.condition},${c.language},${c.currency}`
            ).join('\n'),
            action: 'import' 
          })
        });

        const data = await res.json();
        setImportResult(data);
        setImportStatus('done');
        loadCollection();
        return;
      }

      const text = await file.text();
      
      const res = await fetch('/api/collection/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ csvContent: text, action: 'import' })
      });

      const data = await res.json();
      setImportResult(data);
      setImportStatus('done');
      loadCollection();
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import cards');
      setImportStatus('preview');
    } finally {
      setImportLoading(false);
    }
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportCards([]);
    setImportStatus('idle');
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">My Collection</h1>
              <p className="text-gray-600">{items.length} cards • Estimated value: {calculateTotalValue()}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddCardModal(true)}
                className="px-4 py-2 rounded-lg font-semibold transition bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
                data-testid="add-card-btn"
              >
                <Plus className="w-4 h-4" />
                Add Card
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2 rounded-lg font-semibold transition bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
                data-testid="import-btn"
              >
                <Upload className="w-4 h-4" />
                Import CSV
              </button>
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
                  <h3 className="font-semibold text-sm mb-1 truncate" title={item.card_data.name}>{item.card_data.name}</h3>
                  <div className="flex items-center gap-1 mb-1">
                    {(item.card_data.set?.id || item.card_data.set_code || item.card_data.set_name) && (
                      <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono uppercase text-gray-600">
                        {item.card_data.set?.id || item.card_data.set_code || (item.card_data.set_name ? item.card_data.set_name.slice(0, 3) : '')}
                      </span>
                    )}
                    {(item.card_data.collector_number || item.card_data.number || item.card_data.localId) && (
                      <span className="text-xs text-gray-500 font-mono">
                        #{item.card_data.collector_number || item.card_data.number || item.card_data.localId}
                      </span>
                    )}
                    {item.foil && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium">
                        Foil
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{item.condition || 'Near Mint'}</span>
                    <span className="text-sm font-bold text-blue-600">${getCardPrice(item).toFixed(2)}</span>
                  </div>
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
                data-testid="confirm-bulk-list-btn"
              >
                List for Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-6 h-6 text-green-600" />
                <div>
                  <h3 className="text-lg font-bold dark:text-white">Import from ManaBox CSV</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {importStatus === 'idle' && 'Upload a ManaBox export file to import your cards'}
                    {importStatus === 'preview' && `${importCards.length} cards ready to import`}
                    {importStatus === 'importing' && 'Importing cards...'}
                    {importStatus === 'done' && `Import complete!`}
                  </p>
                </div>
              </div>
              <button
                onClick={closeImportModal}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {importStatus === 'idle' && (
                <div className="p-6 flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="csv-upload"
                    />
                    <label
                      htmlFor="csv-upload"
                      className="cursor-pointer inline-flex flex-col items-center gap-4 p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition"
                    >
                      <Upload className="w-12 h-12 text-gray-400" />
                      <div>
                        <p className="font-semibold text-gray-700 dark:text-gray-300">Click to upload CSV</p>
                        <p className="text-sm text-gray-500">ManaBox export format supported</p>
                      </div>
                    </label>
                    <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                      Export your collection from ManaBox and upload the CSV file here
                    </p>
                  </div>
                </div>
              )}

              {importStatus === 'preview' && (
                <div className="flex-1 overflow-auto p-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>{importCards.length}</strong> cards found • 
                      <strong> {importCards.reduce((sum, c) => sum + c.quantity, 0)}</strong> total quantity • 
                      <strong> ${importCards.reduce((sum, c) => sum + c.purchasePrice * c.quantity, 0).toFixed(2)}</strong> total purchase value
                    </p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Name</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Set</th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">#</th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">Qty</th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">Foil</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Condition</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Rarity</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-300">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {importCards.map((card, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-3 py-2 font-medium text-gray-900 dark:text-white max-w-[200px] truncate" title={card.name}>
                              {card.name}
                            </td>
                            <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                              <span className="uppercase text-xs font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">{card.setCode}</span>
                              <span className="ml-1 text-xs truncate max-w-[100px] inline-block align-bottom" title={card.setName}>{card.setName}</span>
                            </td>
                            <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-400 font-mono text-xs">
                              {card.collectorNumber}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className="inline-flex items-center justify-center min-w-[24px] h-6 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded font-medium text-xs">
                                {card.quantity}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              {card.foil ? (
                                <span className="inline-flex items-center px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-xs font-medium">
                                  Foil
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-gray-600 dark:text-gray-400 text-xs">
                              {card.condition}
                            </td>
                            <td className="px-3 py-2">
                              <span className={`text-xs font-medium capitalize ${
                                card.rarity === 'mythic' ? 'text-orange-600 dark:text-orange-400' :
                                card.rarity === 'rare' ? 'text-yellow-600 dark:text-yellow-400' :
                                card.rarity === 'uncommon' ? 'text-gray-600 dark:text-gray-400' :
                                'text-gray-400'
                              }`}>
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
                    <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Successfully imported <strong>{importResult.imported}</strong> cards to your collection.
                    </p>
                    {importResult.errors && importResult.errors.length > 0 && (
                      <div className="text-left bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mt-4">
                        <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300 mb-2">
                          <AlertCircle className="w-4 h-4" />
                          <span className="font-medium">Some cards had issues:</span>
                        </div>
                        <ul className="text-sm text-yellow-600 dark:text-yellow-400 list-disc list-inside max-h-32 overflow-y-auto">
                          {importResult.errors.slice(0, 10).map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                          {importResult.errors.length > 10 && (
                            <li>... and {importResult.errors.length - 10} more</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-3">
              {importStatus === 'preview' && (
                <>
                  <button
                    onClick={() => {
                      setImportCards([]);
                      setImportStatus('idle');
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white"
                  >
                    Upload Different File
                  </button>
                  <button
                    onClick={confirmImport}
                    disabled={importLoading}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Import {importCards.length} Cards
                  </button>
                </>
              )}
              {importStatus === 'done' && (
                <button
                  onClick={closeImportModal}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Done
                </button>
              )}
              {importStatus === 'idle' && (
                <button
                  onClick={closeImportModal}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Card Modal */}
      {showAddCardModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold dark:text-white">Add Card Manually</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Search by name or set code + collector number</p>
              </div>
              <button
                onClick={() => {
                  setShowAddCardModal(false);
                  setAddCardSearchResults([]);
                  setAddCardSetCode('');
                  setAddCardCollectorNum('');
                  setAddCardName('');
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Search Form */}
            <div className="p-6 border-b dark:border-gray-700 space-y-4">
              {/* Game Selection */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Game</label>
                  <select
                    value={addCardGame}
                    onChange={(e) => {
                      setAddCardGame(e.target.value as 'mtg' | 'pokemon');
                      setAddCardSearchResults([]);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  >
                    <option value="mtg">Magic: The Gathering</option>
                    <option value="pokemon">Pokemon TCG</option>
                  </select>
                </div>
              </div>
              
              {/* Card Name Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Card Name</label>
                <input
                  type="text"
                  value={addCardName}
                  onChange={(e) => setAddCardName(e.target.value)}
                  placeholder="e.g., Black Lotus, Charizard, Lightning Bolt..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  data-testid="card-name-input"
                  onKeyDown={(e) => e.key === 'Enter' && searchCardManually()}
                />
              </div>
              
              {/* Optional Set/Number Filter */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Set Code (optional)</label>
                  <input
                    type="text"
                    value={addCardSetCode}
                    onChange={(e) => setAddCardSetCode(e.target.value.toUpperCase())}
                    placeholder="e.g., MH3, NEO"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg uppercase"
                    data-testid="set-code-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Collector # (optional)</label>
                  <input
                    type="text"
                    value={addCardCollectorNum}
                    onChange={(e) => setAddCardCollectorNum(e.target.value)}
                    placeholder="e.g., 141, 23"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                    data-testid="collector-num-input"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={searchCardManually}
                    disabled={(!addCardName.trim() && !addCardSetCode.trim()) || addCardSearching}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    data-testid="search-card-btn"
                  >
                    {addCardSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Search
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Tip: Search by card name, or use set code + collector number for exact matches
              </p>
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-auto p-4">
              {addCardSearching ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                  <p className="text-gray-500 mt-2">Searching...</p>
                </div>
              ) : addCardSearchResults.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {(addCardName || addCardSetCode) 
                      ? 'No cards found. Try a different search term or check spelling.' 
                      : 'Enter a card name or set code to search'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {addCardSearchResults.map((card) => {
                    // Calculate price display
                    const getCardPriceDisplay = () => {
                      if (addCardGame === 'pokemon') {
                        const pricing = card.pricing?.cardmarket;
                        if (pricing?.avg) return `€${pricing.avg.toFixed(2)}`;
                        if (pricing?.trend) return `€${pricing.trend.toFixed(2)}`;
                        return null;
                      } else {
                        // MTG - Scryfall prices
                        const prices = card.prices;
                        if (prices?.usd) return `$${prices.usd}`;
                        if (prices?.usd_foil) return `$${prices.usd_foil} (Foil)`;
                        if (prices?.eur) return `€${prices.eur}`;
                        return null;
                      }
                    };
                    
                    const priceDisplay = getCardPriceDisplay();
                    
                    return (
                      <div key={card.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-600 transition">
                        <div className="aspect-[488/680] relative mb-2">
                          <img
                            src={card.image_uris?.small || card.image_uris?.normal || card.images?.small || card.images?.large || '/placeholder-card.png'}
                            alt={card.name}
                            className="w-full h-full object-contain rounded"
                          />
                          {priceDisplay && (
                            <div className="absolute top-1 right-1 bg-green-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                              {priceDisplay}
                            </div>
                          )}
                        </div>
                        <h4 className="font-medium text-sm truncate dark:text-white" title={card.name}>{card.name}</h4>
                        <div className="flex items-center gap-1 mb-2">
                          <span className="text-xs bg-gray-200 dark:bg-gray-600 px-1 rounded font-mono uppercase">
                            {card.set_code || card.set?.id || card.set || card.set_name?.slice(0, 3) || '???'}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            #{card.collector_number || card.number || card.localId || '?'}
                          </span>
                        </div>
                        
                        <button
                          onClick={() => {
                            setSelectedCardToAdd(card);
                            setCardFinish('Normal');
                            setAddCardQuantity(1);
                            setAddCardCondition('Near Mint');
                            setIsGraded(false);
                            // Fetch full card data with pricing if Pokemon
                            if (addCardGame === 'pokemon' && card.id && !card.pricing) {
                              setLoadingCardPrice(true);
                              fetch(`https://api.tcgdex.net/v2/en/cards/${card.id}`)
                                .then(res => res.json())
                                .then(data => {
                                  setCardPriceData(data.pricing);
                                  setLoadingCardPrice(false);
                                })
                                .catch(() => setLoadingCardPrice(false));
                            } else {
                              setCardPriceData(card.pricing || card.prices);
                            }
                          }}
                          className="w-full px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center justify-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Add to collection
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Card Confirmation Modal */}
      {selectedCardToAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold dark:text-white">Add to Collection</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedCardToAdd.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {selectedCardToAdd.set_code || selectedCardToAdd.set?.id || ''} #{selectedCardToAdd.collector_number || selectedCardToAdd.localId || selectedCardToAdd.number || ''}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedCardToAdd(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex gap-4 mb-6">
                {/* Card Preview */}
                <div className="w-32 flex-shrink-0">
                  <img
                    src={selectedCardToAdd.image_uris?.normal || selectedCardToAdd.image_uris?.small || selectedCardToAdd.images?.large || selectedCardToAdd.images?.small || '/placeholder-card.png'}
                    alt={selectedCardToAdd.name}
                    className="w-full rounded-lg shadow"
                  />
                </div>

                {/* Price Info */}
                <div className="flex-1">
                  <div className="mb-3">
                    {loadingCardPrice ? (
                      <div className="flex items-center gap-2 text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Fetching price...</span>
                      </div>
                    ) : cardPriceData ? (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Market Price:</p>
                        {addCardGame === 'pokemon' && cardPriceData.cardmarket && (
                          <>
                            {cardPriceData.cardmarket.avg && (
                              <p className="text-lg font-bold text-green-600">€{cardPriceData.cardmarket.avg.toFixed(2)}</p>
                            )}
                            {cardPriceData.cardmarket.trend && (
                              <p className="text-xs text-gray-500">Trend: €{cardPriceData.cardmarket.trend.toFixed(2)}</p>
                            )}
                          </>
                        )}
                        {addCardGame === 'mtg' && (
                          <>
                            {cardPriceData.usd && <p className="text-lg font-bold text-green-600">${cardPriceData.usd}</p>}
                            {cardPriceData.usd_foil && <p className="text-xs text-gray-500">Foil: ${cardPriceData.usd_foil}</p>}
                            {cardPriceData.eur && <p className="text-xs text-gray-500">EUR: €{cardPriceData.eur}</p>}
                          </>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Price not available</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={addCardQuantity}
                    onChange={(e) => setAddCardQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                {/* Finish */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Finish
                  </label>
                  <select
                    value={cardFinish}
                    onChange={(e) => setCardFinish(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    {(addCardGame === 'pokemon' ? pokemonFinishOptions : mtgFinishOptions).map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* Condition */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Condition
                  </label>
                  <select
                    value={addCardCondition}
                    onChange={(e) => setAddCardCondition(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                    {conditionOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Graded Card Checkbox */}
              <div className="mb-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isGraded}
                    onChange={(e) => setIsGraded(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Add as graded card
                  </span>
                </label>
              </div>

              {/* Grading Options (shown if graded) */}
              {isGraded && (
                <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Grading Company
                    </label>
                    <select
                      value={gradingCompany}
                      onChange={(e) => setGradingCompany(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                    >
                      {gradingCompanies.map(company => (
                        <option key={company} value={company}>{company}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Grade
                    </label>
                    <select
                      value={gradeValue}
                      onChange={(e) => setGradeValue(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                    >
                      {gradeValues.map(grade => (
                        <option key={grade} value={grade}>{grade}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedCardToAdd(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setAddingCard(true);
                    try {
                      // Prepare card data with all options
                      const cardData = {
                        ...selectedCardToAdd,
                        pricing: cardPriceData,
                        finish: cardFinish,
                        graded: isGraded ? { company: gradingCompany, grade: gradeValue } : null
                      };
                      
                      const res = await fetch('/api/collection', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                          cardId: selectedCardToAdd.id,
                          game: addCardGame,
                          cardData: cardData,
                          quantity: addCardQuantity,
                          condition: addCardCondition,
                          foil: cardFinish !== 'Normal'
                        })
                      });
                      
                      const data = await res.json();
                      if (data.success) {
                        alert(`Added ${selectedCardToAdd.name} to collection!`);
                        loadCollection();
                        setSelectedCardToAdd(null);
                        setAddCardQuantity(1);
                        setCardFinish('Normal');
                        setIsGraded(false);
                      } else {
                        alert(data.error || 'Failed to add card');
                      }
                    } catch (error) {
                      console.error('Add card error:', error);
                      alert('Failed to add card');
                    } finally {
                      setAddingCard(false);
                    }
                  }}
                  disabled={addingCard}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {addingCard ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add to Collection
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
