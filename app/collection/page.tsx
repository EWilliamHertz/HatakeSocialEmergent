'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Package, Trash2, CheckSquare, Square, MoreHorizontal, Edit2, ShoppingBag, Search, Upload, FileSpreadsheet, X, AlertCircle, CheckCircle, Plus, Loader2, Camera } from 'lucide-react';
import Image from 'next/image';
import { LayoutGrid, List as ListIcon, Grid3X3, BookOpen } from 'lucide-react'; // Add these icons
import CollectionDashboard from '@/components/CollectionDashboard'; // Import the new component

interface CollectionItem {
  id: number;
  card_id: string;
  game: string;
  card_data: any;
  quantity: number;
  condition?: string;
  foil?: boolean;
  finish?: string;
  is_signed?: boolean;
  is_graded?: boolean;
  grading_company?: string;
  grade_value?: string;
  custom_image_url?: string;
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
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'binder'>('grid'); // New State
  const [activeTab, setActiveTab] = useState<'cards' | 'sealed' | 'wishlist'>('cards'); // Tab state
  // Edit State
  const [editingItem, setEditingItem] = useState<CollectionItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Bulk List State
  const [showListModal, setShowListModal] = useState(false);
  const [listPrice, setListPrice] = useState('');
  const [listCondition, setListCondition] = useState('Near Mint');
  const [listPriceMode, setListPriceMode] = useState<'fixed' | 'percent'>('percent');
  const [listPercent, setListPercent] = useState('90');
  const [individualPrices, setIndividualPrices] = useState<Record<number, string>>({});
  const [listingInProgress, setListingInProgress] = useState(false);
  
  // Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importCards, setImportCards] = useState<ImportCard[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'preview' | 'importing' | 'done'>('idle');
  const [importResult, setImportResult] = useState<{ imported: number; errors?: string[] } | null>(null);
  const [importGameType, setImportGameType] = useState<'mtg' | 'pokemon'>('mtg');
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
  
  // Enhanced add card modal state
  const [selectedCardToAdd, setSelectedCardToAdd] = useState<any>(null);
  const [cardFinish, setCardFinish] = useState('Normal');
  const [isGraded, setIsGraded] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
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
  const gradingCompanies = ['PSA', 'BGS', 'CGC', 'SGC', 'PCG', 'Ace'];
  const gradeValues = ['10', '9.5', '9', '8.5', '8', '7.5', '7', '6.5', '6', '5.5', '5', '4', '3', '2', '1'];

  // Wishlist state
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [loadingWishlist, setLoadingWishlist] = useState(false);
  
  // Sealed products state
  const [sealedProducts, setSealedProducts] = useState<any[]>([]);
  const [loadingSealed, setLoadingSealed] = useState(false);

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

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'wishlist') {
      loadWishlist();
    } else if (activeTab === 'sealed') {
      loadSealedProducts();
    }
  }, [activeTab]);

  const loadWishlist = async () => {
    setLoadingWishlist(true);
    try {
      const res = await fetch('/api/wishlist', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setWishlistItems(data.items || []);
      }
    } catch (error) {
      console.error('Load wishlist error:', error);
    } finally {
      setLoadingWishlist(false);
    }
  };

  const loadSealedProducts = async () => {
    setLoadingSealed(true);
    try {
      const res = await fetch('/api/sealed', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setSealedProducts(data.products || []);
      }
    } catch (error) {
      console.error('Load sealed products error:', error);
    } finally {
      setLoadingSealed(false);
    }
  };

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
    // Initialize individual prices based on market price and default percent
    const selectedCards = items.filter(item => selectedItems.has(item.id));
    const initialPrices: Record<number, string> = {};
    selectedCards.forEach(item => {
      const marketPrice = getCardPrice(item).value;
      const calculatedPrice = marketPrice * (parseFloat(listPercent) / 100);
      initialPrices[item.id] = calculatedPrice.toFixed(2);
    });
    setIndividualPrices(initialPrices);
    setShowListModal(true);
  };

  const calculateSelectedValue = () => {
    let total = 0;
    items.forEach(item => {
      if (selectedItems.has(item.id)) {
        total += getCardPrice(item).value * item.quantity;
      }
    });
    return total;
  };

  // Recalculate all individual prices based on new percent
  const recalculateAllPrices = (percent: string) => {
    const selectedCards = items.filter(item => selectedItems.has(item.id));
    const newPrices: Record<number, string> = {};
    selectedCards.forEach(item => {
      const marketPrice = getCardPrice(item).value;
      const calculatedPrice = marketPrice * (parseFloat(percent) / 100);
      newPrices[item.id] = calculatedPrice.toFixed(2);
    });
    setIndividualPrices(newPrices);
  };

  // Calculate total listing value from individual prices
  const calculateListingTotal = () => {
    let total = 0;
    items.forEach(item => {
      if (selectedItems.has(item.id) && individualPrices[item.id]) {
        total += parseFloat(individualPrices[item.id]) * item.quantity;
      }
    });
    return total;
  };

  const submitBulkList = async () => {
    setListingInProgress(true);
    try {
      const selectedCards = items.filter(item => selectedItems.has(item.id));
      
      // Use individual prices (which may have been overridden by user)
      const listings = selectedCards.map(item => {
        // Use the individual override price, or calculate from global settings
        let price: number;
        if (individualPrices[item.id]) {
          price = parseFloat(individualPrices[item.id]);
        } else {
          const marketPrice = getCardPrice(item).value;
          if (listPriceMode === 'percent') {
            price = marketPrice * (parseFloat(listPercent) / 100);
          } else {
            price = parseFloat(listPrice);
          }
        }
        
        return {
          card_id: item.card_id,
          card_data: item.card_data,
          game: item.game,
          price: Math.max(0.01, price),
          condition: listCondition,
          quantity: item.quantity,
          foil: item.foil
        };
      });
      
      const res = await fetch('/api/collection/bulk-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ listings })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setSelectedItems(new Set());
        setShowListModal(false);
        setListPrice('');
        setListPercent('90');
        setIndividualPrices({});
        alert(`Successfully listed ${data.listed} card(s) for sale!`);
      } else {
        alert('Failed to list cards: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Bulk list error:', error);
      alert('Failed to list cards. Please try again.');
    } finally {
      setListingInProgress(false);
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
        try {
          const params = new URLSearchParams();
          if (addCardName.trim()) {
            params.append('q', addCardName.trim());
          }
          if (addCardSetCode.trim()) {
            params.append('set', addCardSetCode.trim());
          }
          if (addCardCollectorNum.trim()) {
            params.append('number', addCardCollectorNum.trim());
          }
          
          if (!params.toString()) {
            setAddCardSearchResults([]);
            return;
          }
          
          const searchRes = await fetch(`/api/cards/mtg?${params.toString()}`, {
            credentials: 'include',
            signal: AbortSignal.timeout(15000)
          });
          
          if (searchRes.ok) {
            const data = await searchRes.json();
            setAddCardSearchResults(data.cards || []);
          } else {
            setAddCardSearchResults([]);
          }
        } catch (mtgError) {
          console.error('MTG API error:', mtgError);
          setAddCardSearchResults([]);
        }
      } else {
        // TCGdex API for Pokemon
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);
          let cards: any[] = [];
          
          if (resolvedSetCode && addCardCollectorNum.trim() && !addCardName.trim()) {
            const collNum = addCardCollectorNum.trim().padStart(3, '0');
            const cardId = `${resolvedSetCode}-${collNum}`;
            const directRes = await fetch(`https://api.tcgdex.net/v2/en/cards/${cardId}`, { signal: controller.signal });
            if (directRes.ok) {
              const card = await directRes.json();
              cards = [card];
            } else {
              const cardIdNoPad = `${resolvedSetCode}-${addCardCollectorNum.trim()}`;
              const directRes2 = await fetch(`https://api.tcgdex.net/v2/en/cards/${cardIdNoPad}`, { signal: controller.signal });
              if (directRes2.ok) {
                const card = await directRes2.json();
                cards = [card];
              }
            }
          } else {
            let searchUrl = 'https://api.tcgdex.net/v2/en/cards';
            const params = new URLSearchParams();
            if (addCardName.trim()) params.append('name', addCardName.trim());
            let apiUrl = searchUrl;
            if (params.toString()) apiUrl += '?' + params.toString();
            
            const res = await fetch(apiUrl, { signal: controller.signal });
            if (res.ok) {
              cards = await res.json();
              if (addCardSetCode.trim()) {
                cards = cards.filter((card: any) => card.id?.toLowerCase().includes(resolvedSetCode) || card.set?.id?.toLowerCase() === resolvedSetCode);
              }
              if (addCardCollectorNum.trim()) {
                const collNum = addCardCollectorNum.trim();
                const paddedCollNum = collNum.padStart(3, '0');
                cards = cards.filter((card: any) => {
                  const cardLocalId = card.localId?.toString() || '';
                  const cardIdNum = card.id?.split('-').pop() || '';
                  return cardLocalId === collNum || cardLocalId === paddedCollNum || cardIdNum === collNum || cardIdNum === paddedCollNum;
                });
              }
            }
          }
          
          clearTimeout(timeoutId);
          
          const mappedCards = cards.slice(0, 30).map((card: any) => ({
            id: card.id,
            name: card.name,
            game: 'pokemon',
            rarity: card.rarity || 'Unknown',
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
            pricing: card.pricing
          }));
          
          setAddCardSearchResults(mappedCards);
        } catch (fetchError) {
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

  const updateItem = async (itemId: number, updates: {
    quantity?: number;
    condition?: string;
    foil?: boolean;
    finish?: string;
    isSigned?: boolean;
    isGraded?: boolean;
    gradingCompany?: string | null;
    gradeValue?: string | null;
    notes?: string;
  }) => {
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
    if (item.custom_image_url) return item.custom_image_url;
    const card = item.card_data || {};
    if (card.images?.small) return card.images.small;
    if (card.image_uris?.small) return card.image_uris.small;
    if (card.images?.large) return card.images.large;
    if (card.image_uris?.normal) return card.image_uris.normal;
    return '/placeholder-card.png';
  };

  const getCardPrice = (item: CollectionItem) => {
    const card = item.card_data;
    if (item.game === 'pokemon') {
      if (card.pricing?.cardmarket) {
        return { value: card.pricing.cardmarket.avg || card.pricing.cardmarket.trend || 0, currency: 'EUR' };
      }
      if (card.tcgplayer?.prices) {
        const prices = card.tcgplayer.prices;
        return { value: prices.holofoil?.market || prices.normal?.market || 0, currency: 'USD' };
      }
      return { value: 0, currency: 'EUR' };
    } else if (item.game === 'mtg') {
      if (card.prices?.eur) return { value: parseFloat(card.prices.eur), currency: 'EUR' };
      if (card.prices?.eur_foil && item.foil) return { value: parseFloat(card.prices.eur_foil), currency: 'EUR' };
      if (card.prices?.usd) return { value: parseFloat(card.prices.usd), currency: 'USD' };
      if (card.prices?.usd_foil && item.foil) return { value: parseFloat(card.prices.usd_foil), currency: 'USD' };
    }
    return { value: 0, currency: 'EUR' };
  };
  
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
        body: JSON.stringify({ csvContent: text, action: 'preview', gameType: importGameType })
      });
      const data = await res.json();
      if (data.success) {
        setImportCards(data.cards);
      } else {
        alert('Failed to parse CSV: ' + (data.error || 'Unknown error'));
        setImportStatus('idle');
      }
    } catch (error) {
      alert('Failed to read file');
      setImportStatus('idle');
    } finally {
      setImportLoading(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmImport = async () => {
    setImportLoading(true);
    setImportStatus('importing');
    try {
      const headers = 'Name,Set code,Set name,Collector number,Foil,Rarity,Quantity,ManaBox ID,Scryfall ID,Purchase price,Misprint,Altered,Condition,Language,Purchase price currency';
      const csvLines = importCards.map(c => 
        `"${c.name}",${c.setCode},"${c.setName}",${c.collectorNumber},${c.foil ? 'foil' : 'normal'},${c.rarity},${c.quantity},,${c.scryfallId},${c.purchasePrice},false,${c.altered || false},${c.condition},${c.language || 'English'},${c.currency}`
      );
      const csvContent = [headers, ...csvLines].join('\n');
      const res = await fetch('/api/collection/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ csvContent, action: 'import', gameType: importGameType })
      });
      const data = await res.json();
      setImportResult(data);
      setImportStatus('done');
      loadCollection();
    } catch (error) {
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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header with Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          {/* Main Tabs */}
          <div className="flex items-center gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('cards')}
              className={`px-4 py-3 font-semibold transition border-b-2 -mb-px ${
                activeTab === 'cards' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <span className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Cards
              </span>
            </button>
            <button
              onClick={() => setActiveTab('sealed')}
              className={`px-4 py-3 font-semibold transition border-b-2 -mb-px ${
                activeTab === 'sealed' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <span className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                Sealed Products
              </span>
            </button>
            <button
              onClick={() => setActiveTab('wishlist')}
              className={`px-4 py-3 font-semibold transition border-b-2 -mb-px ${
                activeTab === 'wishlist' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <span className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Wishlist
              </span>
            </button>
          </div>

          {/* Cards Tab Header */}
          {activeTab === 'cards' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2 dark:text-white">My Collection</h1>
                  <p className="text-gray-600 dark:text-gray-400">{items.length} cards • Estimated value: {calculateTotalValue()}</p>
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
                    className={`px-4 py-2 rounded-lg font-semibold transition ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                    data-testid="filter-all"
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilter('pokemon')}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${filter === 'pokemon' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                    data-testid="filter-pokemon"
                  >
                    Pokémon
                  </button>
                  <button
                    onClick={() => setFilter('mtg')}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${filter === 'mtg' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                    data-testid="filter-mtg"
                  >
                    Magic
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Sealed Products Tab Header */}
          {activeTab === 'sealed' && (
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2 dark:text-white">Sealed Products</h1>
                <p className="text-gray-600 dark:text-gray-400">{sealedProducts.length} products in your collection</p>
              </div>
              <a
                href="/sealed"
                className="px-4 py-2 rounded-lg font-semibold transition bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Manage Sealed Products
              </a>
            </div>
          )}

          {/* Wishlist Tab Header */}
          {activeTab === 'wishlist' && (
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2 dark:text-white">My Wishlist</h1>
                <p className="text-gray-600 dark:text-gray-400">{wishlistItems.length} cards you're looking for</p>
              </div>
              <a
                href="/wishlist"
                className="px-4 py-2 rounded-lg font-semibold transition bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Manage Wishlist
              </a>
            </div>
          )}
          
          {/* Search & Bulk Actions */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your collection..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                data-testid="collection-search"
              />
            </div>
            
            {items.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAll}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white"
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
                      <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 z-10 min-w-48">
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

        {/* 1. NEW DASHBOARD STATS */}
        <CollectionDashboard items={items} />

        {/* View Toggles */}
        <div className="flex justify-end mb-4">
           <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
             <button
               onClick={() => setViewMode('grid')}
               className={`p-2 rounded-md transition ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
               title="Grid View"
             >
               <LayoutGrid className="w-4 h-4" />
             </button>
             <button
               onClick={() => setViewMode('binder')}
               className={`p-2 rounded-md transition ${viewMode === 'binder' ? 'bg-white dark:bg-gray-600 shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
               title="Binder View"
             >
               <BookOpen className="w-4 h-4" />
             </button>
             <button
               onClick={() => setViewMode('list')}
               className={`p-2 rounded-md transition ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
               title="List View"
             >
               <ListIcon className="w-4 h-4" />
             </button>
           </div>
        </div>

        {/* Collection Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
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
          <>
            {/* GRID VIEW (Your existing layout) */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredItems.map((item) => (
                  <div 
                    key={item.id} 
                    className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition relative group cursor-pointer ${
                      selectedItems.has(item.id) ? 'ring-2 ring-blue-600' : ''
                    }`}
                    data-testid={`collection-item-${item.id}`}
                    onClick={() => {
                      setEditingItem(item);
                      setShowEditModal(true);
                    }}
                  >
                    {/* Selection Checkbox */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleItemSelection(item.id);
                      }}
                      className="absolute top-2 left-2 z-10 bg-white dark:bg-gray-700 rounded p-1 shadow"
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
                        alt={item.card_data?.name || 'Card image'}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingItem(item);
                            setShowEditModal(true);
                          }}
                          className="p-2 bg-white text-gray-800 rounded-lg hover:bg-gray-100"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeItem(item.id);
                          }}
                          className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-sm mb-1 truncate dark:text-white" title={item.card_data?.name || 'Unknown'}>{item.card_data?.name || 'Unknown Card'}</h3>
                      <div className="flex items-center gap-1 mb-1">
                        {(item.card_data?.set?.id || item.card_data?.set_code || item.card_data?.set_name || item.card_data?.set) && (
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded font-mono uppercase text-gray-600 dark:text-gray-300">
                            {item.card_data?.set?.id || item.card_data?.set_code || (typeof item.card_data?.set === 'string' ? item.card_data.set : '') || (item.card_data?.set_name ? item.card_data.set_name.slice(0, 3) : '')}
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
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          {getCardPrice(item).currency === 'EUR' ? '€' : '$'}{getCardPrice(item).value.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* BINDER VIEW (New!) */}
            {viewMode === 'binder' && (
              <div className="bg-gray-200 dark:bg-gray-800 p-8 rounded-xl shadow-inner min-h-[600px]">
                <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-3 gap-8 max-w-4xl mx-auto">
                  {filteredItems.map(item => (
                    <div 
                      key={item.id} 
                      className="aspect-[2.5/3.5] bg-black/10 rounded-lg p-1 shadow-lg transform hover:scale-105 transition cursor-pointer relative"
                      onClick={() => { setEditingItem(item); setShowEditModal(true); }}
                    >
                      <img 
                        src={getCardImage(item)} 
                        alt={item.card_data?.name}
                        className="w-full h-full object-cover rounded" 
                      />
                      {/* Glossy reflection effect */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LIST VIEW (New Spreadsheet Style) */}
            {viewMode === 'list' && (
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
                        <td className="p-4 font-medium">{item.card_data?.name}</td>
                        <td className="p-4"><span className="uppercase text-xs bg-gray-100 px-2 py-1 rounded">{item.card_data?.set?.id || item.card_data?.set_code}</span></td>
                        <td className="p-4 text-gray-500">#{item.card_data?.collector_number}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${item.condition === 'Near Mint' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {item.condition}
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono">€{getCardPrice(item).value.toFixed(2)}</td>
                        <td className="p-4 text-center">
                          <button onClick={() => { setEditingItem(item); setShowEditModal(true); }} className="text-blue-600 hover:underline">Edit</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Modal (Keep existing logic) */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold dark:text-white">Edit Card Details</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {editingItem.card_data?.name || 'Unknown Card'} • {editingItem.card_data?.set?.id || editingItem.card_data?.set_code || editingItem.card_data?.set || ''} #{editingItem.card_data?.collector_number || editingItem.card_data?.number || editingItem.card_data?.localId || ''}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingItem(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="flex gap-6 mb-6">
                {/* Left: Card Preview & Image Upload */}
                <div className="w-1/3 flex-shrink-0">
                  <div className="relative aspect-[2/3] bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden shadow-md mb-3">
                    <img
                      src={editingItem.custom_image_url || getCardImage(editingItem)}
                      alt={editingItem.card_data?.name || 'Card'}
                      className="w-full h-full object-cover"
                    />
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  
                  {/* Custom Image Controls */}
                  <div className="flex flex-col gap-2">
                    <label className="cursor-pointer w-full py-2 px-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 flex items-center justify-center gap-2 transition">
                      <Camera className="w-3 h-3" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          setUploadingImage(true);
                          const formData = new FormData();
                          formData.append('image', file);
                          formData.append('itemId', editingItem.id.toString());
                          
                          try {
                            const res = await fetch('/api/collection/upload-image', {
                              method: 'POST',
                              credentials: 'include',
                              body: formData
                            });
                            const data = await res.json();
                            if (data.success) {
                              setEditingItem({
                                ...editingItem,
                                custom_image_url: data.imageUrl
                              });
                              loadCollection();
                            }
                          } catch (err) {
                            console.error('Upload error:', err);
                          } finally {
                            setUploadingImage(false);
                          }
                        }}
                      />
                      Upload My Photo
                    </label>
                    {editingItem.custom_image_url && (
                      <button
                        onClick={async () => {
                          if(!confirm("Remove custom photo?")) return;
                          try {
                            await fetch(`/api/collection/upload-image?itemId=${editingItem.id}`, {
                              method: 'DELETE',
                              credentials: 'include'
                            });
                            setEditingItem({
                              ...editingItem,
                              custom_image_url: undefined
                            });
                            loadCollection();
                          } catch (err) {
                            console.error('Delete image error:', err);
                          }
                        }}
                        className="w-full py-2 px-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition"
                      >
                        Revert to Scan
                      </button>
                    )}
                  </div>
                </div>

                {/* Right: Editing Form */}
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        defaultValue={editingItem.quantity}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        id="edit-quantity"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Finish</label>
                      <select 
                        defaultValue={editingItem.finish || 'Normal'}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        id="edit-finish"
                        onChange={(e) => {
                          const isFoil = e.target.value !== 'Normal';
                          (document.getElementById('edit-foil') as HTMLInputElement).checked = isFoil;
                        }}
                      >
                        {(editingItem.game === 'pokemon' ? pokemonFinishOptions : mtgFinishOptions).map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Condition</label>
                    <select 
                      defaultValue={editingItem.condition || 'Near Mint'}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                      id="edit-condition"
                    >
                      {conditionOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg space-y-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Attributes</label>
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          defaultChecked={editingItem.foil}
                          id="edit-foil"
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="edit-foil" className="text-sm text-gray-700 dark:text-gray-300">Foil/Holo</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          defaultChecked={editingItem.is_signed}
                          id="edit-signed"
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="edit-signed" className="text-sm text-gray-700 dark:text-gray-300">Signed</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          defaultChecked={editingItem.is_graded}
                          id="edit-graded"
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                          onChange={(e) => {
                            const details = document.getElementById('grading-details');
                            if (details) details.style.display = e.target.checked ? 'grid' : 'none';
                          }}
                        />
                        <label htmlFor="edit-graded" className="text-sm text-gray-700 dark:text-gray-300">Graded</label>
                      </div>
                    </div>
                  </div>

                  {/* Grading Details (shown if graded) */}
                  <div className="grid grid-cols-2 gap-4" id="grading-details" style={{ display: editingItem.is_graded ? 'grid' : 'none' }}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Grading Company</label>
                      <select 
                        defaultValue={editingItem.grading_company || 'PSA'}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        id="edit-grading-company"
                      >
                        {gradingCompanies.map(company => (
                          <option key={company} value={company}>{company}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Grade</label>
                      <select 
                        defaultValue={editingItem.grade_value || '10'}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        id="edit-grade-value"
                      >
                        {gradeValues.map(grade => (
                          <option key={grade} value={grade}>{grade}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                    <textarea
                      defaultValue={editingItem.notes || ''}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      rows={2}
                      placeholder="Add personal notes (e.g. bought from LGS, gift, etc.)"
                      id="edit-notes"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2 border-t dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingItem(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const quantity = parseInt((document.getElementById('edit-quantity') as HTMLInputElement).value);
                    const condition = (document.getElementById('edit-condition') as HTMLSelectElement).value;
                    const finish = (document.getElementById('edit-finish') as HTMLSelectElement).value;
                    const foil = (document.getElementById('edit-foil') as HTMLInputElement).checked;
                    const isSigned = (document.getElementById('edit-signed') as HTMLInputElement).checked;
                    const isGraded = (document.getElementById('edit-graded') as HTMLInputElement).checked;
                    const gradingCompany = (document.getElementById('edit-grading-company') as HTMLSelectElement).value;
                    const gradeValue = (document.getElementById('edit-grade-value') as HTMLSelectElement).value;
                    const notes = (document.getElementById('edit-notes') as HTMLTextAreaElement).value;
                    
                    updateItem(editingItem.id, { 
                      quantity, condition, foil, notes, finish,
                      isSigned, isGraded, 
                      gradingCompany: isGraded ? gradingCompany : null,
                      gradeValue: isGraded ? gradeValue : null
                    });
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk List Modal (Keep existing logic) */}
      {showListModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b dark:border-gray-700">
              <h3 className="text-lg font-bold dark:text-white">List {selectedItems.size} Cards for Sale</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Market Value: €{calculateSelectedValue().toFixed(2)} → Listing Total: €{calculateListingTotal().toFixed(2)}
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Global Pricing Controls */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Global % of Market Price
                  </label>
                  <button
                    onClick={() => recalculateAllPrices(listPercent)}
                    className="text-xs px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50"
                  >
                    Apply to All
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={listPercent}
                    onChange={(e) => {
                      setListPercent(e.target.value);
                    }}
                    className="flex-1"
                    data-testid="bulk-list-percent-slider"
                  />
                  <div className="flex items-center bg-white dark:bg-gray-700 rounded-lg px-3 py-2 w-24 border dark:border-gray-600">
                    <input
                      type="number"
                      min="1"
                      max="200"
                      value={listPercent}
                      onChange={(e) => {
                        setListPercent(e.target.value);
                      }}
                      className="w-12 bg-transparent text-center focus:outline-none dark:text-white"
                      data-testid="bulk-list-percent-input"
                    />
                    <span className="text-gray-500 dark:text-gray-400">%</span>
                  </div>
                </div>
              </div>
              
              {/* Condition Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Condition for All</label>
                <select 
                  value={listCondition}
                  onChange={(e) => setListCondition(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  data-testid="bulk-list-condition"
                >
                  <option>Mint</option>
                  <option>Near Mint</option>
                  <option>Lightly Played</option>
                  <option>Moderately Played</option>
                  <option>Heavily Played</option>
                  <option>Damaged</option>
                </select>
              </div>
              
              {/* Individual Cards with Price Overrides */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Individual Prices (override below)
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto border dark:border-gray-700 rounded-lg">
                  {items.filter(item => selectedItems.has(item.id)).map(item => {
                    const marketPrice = getCardPrice(item);
                    return (
                      <div 
                        key={item.id} 
                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 border-b dark:border-gray-700 last:border-b-0"
                        data-testid={`bulk-list-item-${item.id}`}
                      >
                        <div className="w-10 h-14 flex-shrink-0 bg-gray-200 dark:bg-gray-600 rounded overflow-hidden">
                          <img
                            src={getCardImage(item)}
                            alt={item.card_data?.name || 'Card'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate dark:text-white" title={item.card_data?.name}>
                            {item.card_data?.name || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Market: {marketPrice.currency === 'EUR' ? '€' : '$'}{marketPrice.value.toFixed(2)}
                            {item.quantity > 1 && ` × ${item.quantity}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500 dark:text-gray-400">€</span>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={individualPrices[item.id] || ''}
                            onChange={(e) => {
                              setIndividualPrices(prev => ({
                                ...prev,
                                [item.id]: e.target.value
                              }));
                            }}
                            className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded focus:ring-2 focus:ring-blue-500"
                            placeholder="0.00"
                            data-testid={`bulk-list-price-${item.id}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-6 border-t dark:border-gray-700 flex gap-3">
              <button
                onClick={() => {
                  setShowListModal(false);
                  setListPrice('');
                  setListPercent('90');
                  setIndividualPrices({});
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white"
                data-testid="cancel-bulk-list-btn"
              >
                Cancel
              </button>
              <button
                onClick={submitBulkList}
                disabled={listingInProgress || Object.values(individualPrices).some(p => !p || parseFloat(p) <= 0)}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="confirm-bulk-list-btn"
              >
                {listingInProgress ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Listing...
                  </>
                ) : (
                  `List ${selectedItems.size} Card${selectedItems.size > 1 ? 's' : ''} for €${calculateListingTotal().toFixed(2)}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV Modal (Keep existing logic) */}
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
                <div className="p-6 flex-1 flex flex-col items-center justify-center">
                  {/* Game Type Selector */}
                  <div className="mb-6 w-full max-w-md">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
                      Select Card Game Type
                    </label>
                    <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <button
                        onClick={() => setImportGameType('mtg')}
                        className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
                          importGameType === 'mtg' 
                            ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' 
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                        data-testid="import-game-mtg"
                      >
                        🃏 Magic: The Gathering
                      </button>
                      <button
                        onClick={() => setImportGameType('pokemon')}
                        className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
                          importGameType === 'pokemon' 
                            ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' 
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                        data-testid="import-game-pokemon"
                      >
                        ⚡ Pokémon TCG
                      </button>
                    </div>
                  </div>
                  
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
                        <p className="text-sm text-gray-500">
                          {importGameType === 'mtg' ? 'ManaBox export format' : 'Pokémon TCG export format'}
                        </p>
                      </div>
                    </label>
                    <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                      {importGameType === 'mtg' 
                        ? 'Export your collection from ManaBox and upload the CSV file here'
                        : 'Export your Pokémon collection and upload the CSV file here'}
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
                      <strong> {importCards.reduce((sum, c) => sum + c.purchasePrice * c.quantity, 0).toFixed(2)} {importCards[0]?.currency || 'USD'}</strong> total purchase value
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
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddCardModal(false);
              setAddCardSearchResults([]);
              setAddCardSetCode('');
              setAddCardCollectorNum('');
              setAddCardName('');
            }
          }}
        >
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
                    onKeyDown={(e) => e.key === 'Enter' && searchCardManually()}
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
                    onKeyDown={(e) => e.key === 'Enter' && searchCardManually()}
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
                    // Calculate price display - prefer EUR
                    const getCardPriceDisplay = () => {
                      if (addCardGame === 'pokemon') {
                        const pricing = card.pricing?.cardmarket;
                        if (pricing?.avg) return `€${pricing.avg.toFixed(2)}`;
                        if (pricing?.trend) return `€${pricing.trend.toFixed(2)}`;
                        return null;
                      } else {
                        // MTG - Scryfall prices, prefer EUR
                        const prices = card.prices;
                        if (prices?.eur) return `€${prices.eur}`;
                        if (prices?.eur_foil) return `€${prices.eur_foil} (Foil)`;
                        // Fallback to USD
                        if (prices?.usd) return `$${prices.usd}`;
                        if (prices?.usd_foil) return `$${prices.usd_foil} (Foil)`;
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
                            {cardPriceData.eur && <p className="text-lg font-bold text-green-600">€{cardPriceData.eur}</p>}
                            {cardPriceData.eur_foil && <p className="text-xs text-gray-500">Foil: €{cardPriceData.eur_foil}</p>}
                            {!cardPriceData.eur && cardPriceData.usd && <p className="text-lg font-bold text-green-600">${cardPriceData.usd}</p>}
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
                  >
                    {conditionOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Graded Card Checkbox */}
              <div className="mb-4 space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isSigned}
                    onChange={(e) => setIsSigned(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Signed card
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isGraded}
                    onChange={(e) => setIsGraded(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Graded card
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
                          foil: cardFinish !== 'Normal',
                          finish: cardFinish,
                          isSigned: isSigned,
                          isGraded: isGraded,
                          gradingCompany: isGraded ? gradingCompany : null,
                          gradeValue: isGraded ? gradeValue : null
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