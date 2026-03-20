'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Package, Trash2, CheckSquare, Square, MoreHorizontal, Edit2, ShoppingBag, Search, Upload, FileSpreadsheet, X, AlertCircle, CheckCircle, Plus, Loader2, Camera, Star, Share2, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import { LayoutGrid, List as ListIcon, Grid3X3, BookOpen } from 'lucide-react'; // Add these icons
import CollectionDashboard from '@/components/CollectionDashboard'; // Import the new component
import CollectionValueChart from '@/components/CollectionValueChart';
import AddSealedModal from '@/components/collection/AddSealedModal';
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
  const [activeTab, setActiveTab] = useState<'cards' | 'sealed' | 'wishlist' | 'bookmarks' | 'analytics'>('cards'); // Tab state
  
  // Wishlist and Sealed Products state
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [loadingWishlist, setLoadingWishlist] = useState(false);
  const [sealedProducts, setSealedProducts] = useState<any[]>([]);
  const [sealedTotals, setSealedTotals] = useState<any>(null);
  const [loadingSealed, setLoadingSealed] = useState(false);
  const [bookmarkedCollections, setBookmarkedCollections] = useState<any[]>([]);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);
  
  // Current user (for share button)
  const [currentUser, setCurrentUser] = useState<{user_id: string; name?: string} | null>(null);

  // Foreign card price overrides (Fix 4)
  const [priceOverrides, setPriceOverrides] = useState<Record<number, number | null>>({});
  const [pricesLoading, setPricesLoading] = useState(false);

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
  const [importResult, setImportResult] = useState<{ imported: number; uniqueCards?: number; totalCopies?: number; errors?: string[] } | null>(null);
  const [importUnique, setImportUnique] = useState<number>(0);
  const [importTotalCopies, setImportTotalCopies] = useState<number>(0);
  const [importGameType, setImportGameType] = useState<'mtg' | 'pokemon' | 'lorcana'>('mtg');
  const [originalCsvContent, setOriginalCsvContent] = useState<string>(''); // Store original CSV for full import
  const [totalCardsToImport, setTotalCardsToImport] = useState<number>(0); // Track total cards in CSV
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Sealed Modal State
  const [showAddSealedModal, setShowAddSealedModal] = useState(false);
  const [sealedSearch, setSealedSearch] = useState('');
  const [sealedSearchResults, setSealedSearchResults] = useState<any[]>([]);
  const [isSearchingSealed, setIsSearchingSealed] = useState(false);
  const [hasSearchedSealed, setHasSearchedSealed] = useState(false);
  const [manualSealed, setManualSealed] = useState({ name: '', game: 'pokemon', type: 'Booster Box', price: '' });
  const [addingSealedProduct, setAddingSealedProduct] = useState(false);

  // FIXED: Sealed Search Logic
  const handleSearchSealed = async () => {
    // Only search if there is actually a query
    if (!sealedSearch.trim()) return;
    
    setIsSearchingSealed(true);
    setHasSearchedSealed(true);
    setSealedSearchResults([]); // Clear previous results immediately
    
    try {
      // Added a cache-busting timestamp and ensured query is trimmed
      const res = await fetch(`/api/sealed/search?q=${encodeURIComponent(sealedSearch.trim())}&t=${Date.now()}`);
      
      if (!res.ok) throw new Error('Search failed');
      
      const data = await res.json();
      
      // Ensure we handle both 'results' and 'products' keys often used by ScryDex
      const results = data.results || data.products || [];
      setSealedSearchResults(results);
      
      if (results.length === 0) {
        console.log("No Pokémon products found for query:", sealedSearch);
      }
    } catch (error) {
      console.error('Failed to search sealed products:', error);
      setSealedSearchResults([]);
    } finally {
      setIsSearchingSealed(false);
    }
  };
  const handleAddSealedFromSearch = async (product: any) => {
    setAddingSealedProduct(true);
    try {
      const res = await fetch('/api/sealed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: product.name,
          game: 'pokemon',
          productType: product.type || 'Sealed Product',
          purchasePrice: product.price || 0,
          imageUrl: product.imageUrl,
        })
      });
      if (res.ok) {
        loadSealedProducts();
        setShowAddSealedModal(false);
      } else {
        alert('Failed to add sealed product');
      }
    } catch (error) {
      console.error('Add sealed product error:', error);
    } finally {
      setAddingSealedProduct(false);
    }
  };

  const handleAddManualSealed = async () => {
    setAddingSealedProduct(true);
    try {
      const res = await fetch('/api/sealed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: manualSealed.name,
          game: manualSealed.game,
          productType: manualSealed.type,
          purchasePrice: parseFloat(manualSealed.price) || 0,
        })
      });
      if (res.ok) {
        loadSealedProducts();
        setShowAddSealedModal(false);
        setManualSealed({ name: '', game: 'pokemon', type: 'Booster Box', price: '' });
      } else {
        alert('Failed to add manual sealed product');
      }
    } catch (error) {
      console.error('Add manual sealed product error:', error);
    } finally {
      setAddingSealedProduct(false);
    }
  };

  // Manual add card state
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [addCardGame, setAddCardGame] = useState<'mtg' | 'pokemon' | 'lorcana'>('mtg');
  const [addCardSetCode, setAddCardSetCode] = useState('');
  const [addCardCollectorNum, setAddCardCollectorNum] = useState('');
  const [addCardName, setAddCardName] = useState('');
  const [addCardSearchResults, setAddCardSearchResults] = useState<any[]>([]);
  const [addCardSearching, setAddCardSearching] = useState(false);
  const [addCardQuantity, setAddCardQuantity] = useState(1);
  const [addCardCondition, setAddCardCondition] = useState('Near Mint');
  const [addCardFoil, setAddCardFoil] = useState(false);
  const [addCardLang, setAddCardLang] = useState<'all' | 'en' | 'ja'>('en');
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

  const lorcanaFinishOptions = ['Normal', 'Foil', 'Cold Foil'];

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

  const getPriceForFinish = (card: any, game: string, finish: string) => {
    if (!card) return null;
    
    if (game === 'pokemon') {
      const tcgPrices = card.tcgplayer?.prices || card.pricing?.tcgplayer;
      if (tcgPrices) {
        let key = 'normal';
        if (finish === 'Holofoil') key = 'holofoil';
        else if (finish === 'Reverse Holofoil') key = 'reverseHolofoil';
        else if (finish === 'Pokeball Holofoil') key = 'pokeballHolofoil';
        else if (finish === 'Masterball Holofoil') key = 'masterballHolofoil';
        
        const finishPrice = tcgPrices[key]?.market !== undefined ? tcgPrices[key].market : tcgPrices[key];
        if (finishPrice !== undefined && finishPrice !== null) return { value: parseFloat(finishPrice) * 0.92, currency: 'EUR' }; 
      }
      
      const cmPrices = card.cardmarket?.prices || card.pricing?.cardmarket;
      if (cmPrices) {
         if (finish === 'Reverse Holofoil' && (cmPrices.reverseHoloAvg || cmPrices.reverseHoloSell || cmPrices.reverseHoloTrend)) {
            const price = cmPrices.reverseHoloAvg || cmPrices.reverseHoloSell || cmPrices.reverseHoloTrend;
            if (price) return { value: parseFloat(price), currency: 'EUR' };
         } else if (finish === 'Normal' || finish === 'Holofoil') {
            const price = cmPrices.avg || cmPrices.averageSellPrice || cmPrices.trendPrice || cmPrices.trend;
            if (price) return { value: parseFloat(price), currency: 'EUR' };
         }
      }
      
      if (finish === 'Normal' || finish === 'Holofoil') {
         const usd = card.pricing?.usd || card.prices?.usd;
         if (usd) return { value: parseFloat(usd) * 0.92, currency: 'EUR' };
      }
    } else if (game === 'mtg') {
       const isFoil = finish !== 'Normal';
       const prices = card.prices || card.pricing;
       if (prices) {
         if (isFoil && prices.eur_foil) return { value: parseFloat(prices.eur_foil), currency: 'EUR' };
         if (!isFoil && prices.eur) return { value: parseFloat(prices.eur), currency: 'EUR' };
         if (isFoil && prices.usd_foil) return { value: parseFloat(prices.usd_foil) * 0.92, currency: 'EUR' };
         if (!isFoil && prices.usd) return { value: parseFloat(prices.usd) * 0.92, currency: 'EUR' };
       }
    } else if (game === 'lorcana') {
       const isFoil = finish !== 'Normal';
       const prices = card.tcgplayer?.prices || card.pricing?.tcgplayer || card.pricing;
       if (prices) {
         if (isFoil && prices.foil?.market) return { value: parseFloat(prices.foil.market) * 0.92, currency: 'EUR' };
         if (!isFoil && prices.normal?.market) return { value: parseFloat(prices.normal.market) * 0.92, currency: 'EUR' };
       }
       if (!isFoil) {
         const usd = card.pricing?.usd;
         if (usd) return { value: parseFloat(usd) * 0.92, currency: 'EUR' };
       }
    }
    return null;
  };

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) {
          router.push('/auth/login');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.user) setCurrentUser(data.user);
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
    } else if (activeTab === 'bookmarks') {
      loadBookmarks();
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

  const loadBookmarks = async () => {
    setLoadingBookmarks(true);
    try {
      const res = await fetch('/api/bookmarks/list', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setBookmarkedCollections(data.collections || []);
      }
    } catch (error) {
      console.error('Load bookmarks error:', error);
    } finally {
      setLoadingBookmarks(false);
    }
  };

  const removeBookmark = async (userId: string) => {
    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        setBookmarkedCollections(prev => prev.filter((c: any) => c.user_id !== userId));
      }
    } catch (error) {
      console.error('Remove bookmark error:', error);
    }
  };

  const loadSealedProducts = async () => {
    setLoadingSealed(true);
    try {
      const res = await fetch('/api/sealed', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setSealedProducts(data.products || []);
        setSealedTotals(data.totals || null);
      }
    } catch (error) {
      console.error('Load sealed products error:', error);
    } finally {
      setLoadingSealed(false);
    }
  };

  const getSealedTypeInfo = (type: string | null | undefined) => {
    const t = (type || '').toLowerCase();
    if (t.includes('elite trainer') || t.includes('etb')) return { emoji: '⭐', label: type, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' };
    if (t.includes('booster box')) return { emoji: '📦', label: type, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
    if (t.includes('blister')) return { emoji: '🎴', label: type, color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' };
    if (t.includes('booster pack') || t.includes('booster bundle')) return { emoji: '🎴', label: type, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
    if (t.includes('tin')) return { emoji: '🥫', label: type, color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' };
    if (t.includes('starter')) return { emoji: '🃏', label: type, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' };
    if (t.includes('premium') || t.includes('collection') || t.includes('gift')) return { emoji: '🎁', label: type, color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' };
    return { emoji: '📦', label: type || 'Sealed Product', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' };
  };

  const enrichForeignPrices = async (loadedItems: CollectionItem[]) => {
    // Find Pokémon items that have no price data (likely foreign/JA/ZH cards)
    const allForeignItems = loadedItems.filter(item => {
      if (item.game !== 'pokemon') return false;
      const card = item.card_data;
      if (!card) return false;
      if (card.pricing?.cardmarket?.avg || card.pricing?.cardmarket?.trend) return false;
      if (card.tcgplayer?.prices?.holofoil?.market || card.tcgplayer?.prices?.normal?.market) return false;
      return true;
    });

    // Chinese pricing is not available — mark these immediately without API call
    const zhItems = allForeignItems.filter(item => {
      const lang = item.card_data?.language || item.card_data?._srcLang || '';
      return lang === 'zh-tw' || lang === 'zh';
    });
    const needsLookup = allForeignItems.filter(item => {
      const lang = item.card_data?.language || item.card_data?._srcLang || '';
      return lang !== 'zh-tw' && lang !== 'zh';
    });

    if (zhItems.length > 0) {
      setPriceOverrides(prev => {
        const next = { ...prev };
        for (const item of zhItems) {
          if (!(item.id in next)) next[item.id] = null; // null = no pricing for ZH
        }
        return next;
      });
    }

    if (needsLookup.length === 0) return;

    setPricesLoading(true);

    try {
      // Build payload for batch CardMarket price lookup
      const cardsPayload = needsLookup.map(item => {
        const card = item.card_data;
        const tcgdexId = card?.id || `${card?.set?.id || card?.set_code}-${card?.localId || card?.number}`;
        const dexIds: number[] = Array.isArray(card?.dexId)
          ? card.dexId
          : (card?.dexId ? [card.dexId] : []);
        return {
          collectionId: item.id,
          tcgdexId,
          lang: card?.language || card?._srcLang || 'ja',
          dexIds,
        };
      });

      const res = await fetch('/api/prices/cardmarket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cards: cardsPayload }),
      });

      if (res.ok) {
        const data = await res.json();
        const prices: Record<number, number | null> = data.prices || {};
        // Single state update — never overwrite an existing real price with null
        setPriceOverrides(prev => {
          const next = { ...prev };
          for (const [k, v] of Object.entries(prices)) {
            const id = Number(k);
            if (v !== null && v !== undefined) {
              // Parse to number — DB NUMERIC columns may arrive as strings
              const num = parseFloat(String(v));
              if (!isNaN(num) && num > 0) {
                next[id] = num;
              } else if (!(id in next)) {
                next[id] = null;
              }
            } else if (!(id in next)) {
              next[id] = null;
            }
          }
          return next;
        });
      }
    } catch (err) {
      console.error('CardMarket price enrichment failed:', err);
    } finally {
      setPricesLoading(false);
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
        const loadedItems = data.items || [];
        setItems(loadedItems);
        // Fire and forget — enrichForeignPrices updates state once all settled
        enrichForeignPrices(loadedItems);
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
  // Values must match ScryDex internal IDs (e.g. sv9, not sv09)
  const pokemonSetAliases: Record<string, string> = {
    'jtg': 'sv9',           // Journey Together (code: JTG → id: sv9)
    'journey': 'sv9',
    'journeytogether': 'sv9',
    'tef': 'sv5',           // Temporal Forces (code: TEF → id: sv5)
    'temporal': 'sv5',
    'par': 'sv4',           // Paradox Rift (code: PAR → id: sv4)
    'obsidian': 'sv3',      // Obsidian Flames (code: OBF → id: sv3)
    'paldea': 'sv2',        // Paldea Evolved (code: PAL → id: sv2)
    'scarlet': 'sv1',       // Scarlet & Violet Base (code: SVI → id: sv1)
    'violet': 'sv1',
    'svbase': 'sv1',
    'sv01': 'sv1',          // Leading-zero variants
    'sv02': 'sv2',
    'sv03': 'sv3',
    'sv04': 'sv4',
    'sv05': 'sv5',
    'sv06': 'sv6',
    'sv07': 'sv7',
    'sv08': 'sv8',
    'sv09': 'sv9',
    'sv10': 'sv10',
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
      } else if (addCardGame === 'lorcana') {
        // Lorcana search via ScryDex (server-side proxy to keep API key private)
        try {
          const params = new URLSearchParams();
          if (addCardName.trim()) params.append('q', addCardName.trim());
          if (!params.toString()) { setAddCardSearchResults([]); return; }
          const searchRes = await fetch(`/api/search/lorcana?${params.toString()}`, {
            credentials: 'include',
            signal: AbortSignal.timeout(15000),
          });
          if (searchRes.ok) {
            const data = await searchRes.json();
            setAddCardSearchResults(data.cards || []);
          } else {
            setAddCardSearchResults([]);
          }
        } catch (lorcanaError) {
          console.error('Lorcana search error:', lorcanaError);
          setAddCardSearchResults([]);
        }
      } else {
        // Pokemon API via dedicated endpoint (uses ScryDex & caching)
        try {
          const params = new URLSearchParams();
          if (addCardName.trim()) params.append('q', addCardName.trim());
          if (resolvedSetCode) params.append('set', resolvedSetCode);
          if (addCardCollectorNum.trim()) params.append('number', addCardCollectorNum.trim());
          // Convert 'all' to 'en,ja' for combined search, otherwise use the language code as-is
          if (addCardLang) {
            const langParam = addCardLang === 'all' ? 'en,ja' : addCardLang;
            params.append('lang', langParam);
          }
          
          if (!params.toString()) {
            setAddCardSearchResults([]);
            return;
          }
          
          const searchRes = await fetch(`/api/search/pokemon?${params.toString()}`, {
            credentials: 'include',
            signal: AbortSignal.timeout(15000)
          });
          
          if (searchRes.ok) {
            const data = await searchRes.json();
            setAddCardSearchResults(data.cards || []);
          } else {
            setAddCardSearchResults([]);
          }
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

  const getCardPrice = (item: CollectionItem): { value: number; currency: string; noPrice?: boolean; isEstimated?: boolean } => {
    const card = item.card_data;
    if (item.game === 'pokemon') {
      if (card?.pricing?.cardmarket) {
        // Always parse to number — DB may return strings
        const v = Number(card.pricing.cardmarket.avg || card.pricing.cardmarket.trend || 0);
        if (v > 0) return { value: v, currency: 'EUR' };
      }
      if (card?.tcgplayer?.prices) {
        const prices = card.tcgplayer.prices;
        const usdPrice = Number(prices.holofoil?.market || prices.normal?.market || 0);
        if (usdPrice > 0) return { value: usdPrice * 0.92, currency: 'EUR' };
      }
      // JA cards stored with ScryDex USD price (after JPY→USD conversion at fetch time)
      if (card?.pricing?.usd) {
        const usd = parseFloat(String(card.pricing.usd));
        if (!isNaN(usd) && usd > 0) return { value: usd * 0.92, currency: 'EUR' };
      }
      // Check override cache (from background enrichForeignPrices)
      if (item.id in priceOverrides) {
        const overridePrice = priceOverrides[item.id];
        // Always Number() — priceOverrides may contain DB string values
        if (overridePrice !== null) return { value: Number(overridePrice), currency: 'EUR', isEstimated: true };
        return { value: 0, currency: 'EUR', noPrice: true };
      }
      return { value: 0, currency: 'EUR' };
    } else if (item.game === 'mtg') {
      if (card?.prices?.eur) return { value: parseFloat(card.prices.eur), currency: 'EUR' };
      if (card?.prices?.eur_foil && item.foil) return { value: parseFloat(card.prices.eur_foil), currency: 'EUR' };
      if (card?.prices?.usd) return { value: parseFloat(card.prices.usd) * 0.92, currency: 'EUR' };
      if (card?.prices?.usd_foil && item.foil) return { value: parseFloat(card.prices.usd_foil) * 0.92, currency: 'EUR' };
    } else if (item.game === 'lorcana') {
      // Lorcana prices are USD from ScryDex — convert to EUR for portfolio total
      const usdPrice = card?.pricing?.usd ? parseFloat(String(card.pricing.usd)) : 0;
      if (usdPrice > 0) return { value: usdPrice * 0.92, currency: 'EUR' };
    }
    if (card?.purchase_price && card.purchase_price > 0) {
      return { value: card.purchase_price, currency: 'EUR' };
    }
    return { value: 0, currency: 'EUR' };
  };

  const getPriceDisplay = (item: CollectionItem): string => {
    const result = getCardPrice(item);
    if (result.noPrice) return 'N/A';
    if (result.value === 0 && item.game === 'pokemon' && pricesLoading && !(item.id in priceOverrides)) {
      return '...';
    }
    return `${result.isEstimated ? '~' : ''}€${Number(result.value).toFixed(2)}`;
  };
  
  const calculateTotalValue = () => {
    let totalEUR = 0;
    items.forEach(item => {
      const price = getCardPrice(item);
      totalEUR += price.value * item.quantity;
    });
    return totalEUR > 0 ? `€${totalEUR.toFixed(2)}` : '€0.00';
  };

  const handleShareCollection = async () => {
    if (!currentUser) return;
    const url = `https://hatake.eu/share/${currentUser.user_id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Hatake Collection', url });
      } catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        alert('Collection link copied to clipboard!');
      } catch {
        alert(`Share this link: ${url}`);
      }
    }
  };

const filteredItems = items.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase().trim();
    
    // 1. Search by Card Name
    if (item.card_data?.name?.toLowerCase().includes(query)) return true;
    
    // 2. Search by Set Name
    if (item.card_data?.set_name?.toLowerCase().includes(query)) return true;
    if (item.card_data?.set?.name?.toLowerCase().includes(query)) return true;
    
    // 3. Search by Set Code
    if (item.card_data?.set_code?.toLowerCase().includes(query)) return true;
    if (item.card_data?.set?.id?.toLowerCase().includes(query)) return true;
    if (typeof item.card_data?.set === 'string' && item.card_data.set.toLowerCase().includes(query)) return true;
    
    // 4. Search by Collector Number
    if (item.card_data?.collector_number?.toString().toLowerCase().includes(query)) return true;
    if (item.card_data?.number?.toString().toLowerCase().includes(query)) return true;
    if (item.card_data?.localId?.toString().toLowerCase().includes(query)) return true;
    
    // 5. Search by Condition
    if (item.condition?.toLowerCase().includes(query)) return true;
    
    // 6. Search by Finish/Foil
    if (item.finish?.toLowerCase().includes(query)) return true;
    if (query === 'foil' && item.foil) return true;

    return false;
  });
  // Import functions
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    setImportStatus('preview');
    try {
      const text = await file.text();
      setOriginalCsvContent(text); // Store original CSV for full import
      const res = await fetch('/api/collection/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ csvContent: text, action: 'preview', gameType: importGameType })
      });
      const data = await res.json();
      if (data.success) {
        setImportCards(data.cards);
        setTotalCardsToImport(data.totalCards || data.cards.length);
        setImportUnique(data.uniqueCards || 0);
        setImportTotalCopies(data.totalCopies || 0);
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
      // Use original CSV content for full import (not reconstructed from preview)
      const res = await fetch('/api/collection/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ csvContent: originalCsvContent, action: 'import', gameType: importGameType })
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
    setOriginalCsvContent('');
    setTotalCardsToImport(0);
    setImportUnique(0);
    setImportTotalCopies(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900" style={{ height: '100dvh' }}>
      <Navbar />

      {/* Toolbar — always visible above the scroll area */}
      <div className="shrink-0 z-40 bg-gray-50 dark:bg-gray-900 shadow-sm">
        <div className="container mx-auto px-4 pt-4 pb-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
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
            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`px-4 py-3 font-semibold transition border-b-2 -mb-px ${
                activeTab === 'bookmarks' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <span className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                Bookmarks
              </span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-3 font-semibold transition border-b-2 -mb-px ${
                activeTab === 'analytics' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <span className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Analytics
              </span>
            </button>
          </div>

          {/* Cards Tab Header */}
        {activeTab === 'cards' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold dark:text-white">My Collection</h1>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleShareCollection}
                    className="px-4 py-2 rounded-lg font-semibold transition bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-2"
                    title="Share your collection"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
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
                    onClick={() => setFilter('mtg')}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${filter === 'mtg' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                    data-testid="filter-mtg"
                  >
                    Magic
                  </button>
                  <button
                    onClick={() => setFilter('pokemon')}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${filter === 'pokemon' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                    data-testid="filter-pokemon"
                  >
                    Pokémon
                  </button>
                  <button
                    onClick={() => setFilter('lorcana')}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${filter === 'lorcana' ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                    data-testid="filter-lorcana"
                  >
                    Lorcana
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Sealed Products Tab Header */}
          {activeTab === 'sealed' && (
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-1 dark:text-white">Sealed Products</h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-gray-600 dark:text-gray-400">{sealedProducts.length} products</p>
                  {sealedTotals && Number(sealedTotals.total_invested) > 0 && (
                    <>
                      <span className="text-gray-300 dark:text-gray-600">•</span>
                      <p className="text-gray-600 dark:text-gray-400">
                        Invested: <span className="font-bold text-blue-600 dark:text-blue-400">€{(Number(sealedTotals.total_invested) * 0.92).toFixed(2)}</span>
                      </p>
                      <span className="text-gray-300 dark:text-gray-600">•</span>
                      <p className="text-gray-600 dark:text-gray-400">
                        Est. Value: <span className="font-bold text-green-600 dark:text-green-400">€{(Number(sealedTotals.total_value) * 0.92).toFixed(2)}</span>
                      </p>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowAddSealedModal(true)}
                className="px-4 py-2 rounded-lg font-semibold transition bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Sealed Products
              </button>
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

          {/* Bookmarks Tab Header */}
          {activeTab === 'bookmarks' && (
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2 dark:text-white">Bookmarked Collections</h1>
                <p className="text-gray-600 dark:text-gray-400">{bookmarkedCollections.length} collectors you follow</p>
              </div>
            </div>
          )}
          
          {/* Search & Bulk Actions - Cards tab only */}
          {activeTab === 'cards' && <div className="flex items-center gap-4">
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
                  <>
                  <button
                    onClick={() => setSelectedItems(new Set())}
                    className="flex items-center gap-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white text-sm"
                    title="Clear selection"
                >
                  ✕ Clear
                </button>
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
                  </>
                )}
              </div>
            )}
          </div>}
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto min-h-0">
      <div className="container mx-auto px-4 pb-24 md:pb-8 pt-4">

        {/* CARDS TAB CONTENT */}
        {activeTab === 'cards' && (<>

        {/* 1. NEW DASHBOARD STATS */}
<CollectionDashboard items={items} priceOverrides={priceOverrides} pricesLoading={pricesLoading} sealedProducts={sealedProducts} />
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
                          {getPriceDisplay(item)}
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
                        <td className="p-4 text-right font-mono">{getPriceDisplay(item)}</td>
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
        </>)}

        {/* SEALED PRODUCTS TAB */}
        {activeTab === 'sealed' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
            {loadingSealed ? (
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            ) : sealedProducts.length === 0 ? (
              <>
                <Package className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No sealed products yet</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">Track your booster boxes, ETBs, and other sealed TCG products</p>
                {/* Changed <a> to a <button> that triggers the modal */}
                <button onClick={() => setShowAddSealedModal(true)} className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">
                  <Plus className="w-4 h-4" />
                  Add Sealed Products
                </button>
              </>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
                {sealedProducts.map((product: any) => {
                  const typeInfo = getSealedTypeInfo(product.product_type);
                  const price = Number(product.purchase_price || 0);
                  return (
                    <div key={product.id} className="bg-gray-50 dark:bg-gray-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition flex flex-col">
                      {/* Product Image */}
                      <div className="relative w-full h-40 bg-gray-100 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="h-full w-full object-contain p-2"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-gray-300 dark:text-gray-500">
                            <span className="text-5xl">{typeInfo.emoji}</span>
                          </div>
                        )}
                        {/* Type badge overlay */}
                        <span className={`absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full ${typeInfo.color}`}>
                          {typeInfo.emoji} {typeInfo.label}
                        </span>
                      </div>
                      {/* Product Info */}
                      <div className="p-3 flex-1 flex flex-col justify-between">
                        <h4 className="font-semibold dark:text-white text-sm leading-snug mb-1" title={product.name}>{product.name}</h4>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-mono">{product.game || 'pokemon'}</span>
                          {price > 0 && (
                            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                              €{(price * 0.92).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* WISHLIST TAB */}
        {activeTab === 'wishlist' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
            {loadingWishlist ? (
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            ) : wishlistItems.length === 0 ? (
              <>
                <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Your wishlist is empty</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">Track cards you're looking for to buy or trade</p>
                <a href="/wishlist" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">
                  <Plus className="w-4 h-4" />
                  Add to Wishlist
                </a>
              </>
            ) : (
              <div className="space-y-3 text-left">
                {wishlistItems.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                    {item.card_data?.images?.small || item.card_data?.image_uris?.small ? (
                      <img src={item.card_data.images?.small || item.card_data.image_uris?.small} alt={item.card_data?.name} className="w-12 h-16 object-cover rounded" />
                    ) : (
                      <div className="w-12 h-16 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold dark:text-white truncate">{item.card_data?.name || 'Unknown Card'}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 uppercase">{item.card_data?.set?.id || item.card_data?.set_code || ''}</p>
                    </div>
                    <span className="text-sm font-bold text-orange-500 uppercase">{item.priority || 'Wanted'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BOOKMARKS TAB */}
        {activeTab === 'bookmarks' && (
          <div className="space-y-6">
          {loadingBookmarks ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : bookmarkedCollections.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
              <Star className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg font-medium mb-2">No bookmarked collections yet</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm">Browse profiles and star ⭐ their collections to follow collectors</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bookmarkedCollections.map((collection: any) => (
                <div key={collection.user_id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {collection.profile_picture_url ? (
                          <img src={collection.profile_picture_url} alt={collection.name} className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                            {(collection.name || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold dark:text-white">{collection.name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{collection.card_count} cards</p>
                        </div>
                      </div>
                      <button onClick={() => removeBookmark(collection.user_id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition text-gray-400 hover:text-red-500" title="Remove bookmark">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Collection Value</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">€{Number(collection.total_value).toFixed(2)}</p>
                    </div>
                    <Link href={`/collection/user/${collection.user_id}`} className="w-full block text-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition">
                      View Collection
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="py-2">
            <CollectionValueChart />
          </div>
        )}

      </div>
      </div>
      {/* End scrollable content */}


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
                        {(editingItem.game === 'pokemon' ? pokemonFinishOptions : editingItem.game === 'lorcana' ? lorcanaFinishOptions : mtgFinishOptions).map(opt => (
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
                            Market: {marketPrice.currency === 'EUR' ? '€' : '$'}{Number(marketPrice.value).toFixed(2)}
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
                    {importStatus === 'preview' && (
                      <>
                        {importUnique > 0
                          ? <><strong>{importUnique.toLocaleString()}</strong> unique cards · <strong>{importTotalCopies.toLocaleString()}</strong> total copies</>
                          : <>{totalCardsToImport} cards ready to import</>
                        }
                      </>
                    )}
                    {importStatus === 'importing' && `Importing ${importTotalCopies > 0 ? importTotalCopies.toLocaleString() : totalCardsToImport} cards...`}
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
                      <button
                        onClick={() => setImportGameType('lorcana')}
                        className={`flex-1 py-2 rounded-lg font-medium transition text-sm ${
                          importGameType === 'lorcana'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}
                        data-testid="import-game-lorcana"
                      >
                        🕯️ Disney Lorcana
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
                          {importGameType === 'mtg' ? 'ManaBox export format' : importGameType === 'lorcana' ? 'Lorcana CSV format' : 'Pokémon TCG export format'}
                        </p>
                      </div>
                    </label>
                    <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                      {importGameType === 'mtg' 
                        ? 'Export your collection from ManaBox and upload the CSV file here'
                        : importGameType === 'lorcana' ? 'Export your Lorcana collection and upload the CSV file here' : 'Export your Pokémon collection and upload the CSV file here'}
                    </p>
                  </div>
                </div>
              )}

              {importStatus === 'preview' && (
                <div className="flex-1 overflow-auto p-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Showing first <strong>{importCards.length}</strong> of{' '}
                      {importUnique > 0
                        ? <><strong>{importUnique.toLocaleString()}</strong> unique cards (<strong>{importTotalCopies.toLocaleString()}</strong> total copies)</>
                        : <><strong>{totalCardsToImport}</strong> cards</>
                      }
                    </p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Card Name</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Set</th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">Qty</th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">Foil</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Condition</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {importCards.map((card, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-3 py-2 font-medium text-gray-900 dark:text-white max-w-[260px] truncate" title={card.name}>
                              {card.name}
                            </td>
                            <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                              <span className="uppercase text-xs font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">{card.setCode}</span>
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
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-gray-600 dark:text-gray-400 text-xs">
                              {card.condition}
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
                      Successfully imported <strong>{(importResult.totalCopies || importResult.imported).toLocaleString()}</strong> cards
                      {importResult.uniqueCards ? <> (<strong>{importResult.uniqueCards.toLocaleString()}</strong> unique)</> : null}
                      {' '}to your collection.
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
                    Import {importTotalCopies > 0 ? `${importTotalCopies.toLocaleString()} Cards` : `${totalCardsToImport} Cards`}
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

            {/* Search Form - collapses when results are shown */}
            {addCardSearchResults.length === 0 && (
            <div className="p-6 border-b dark:border-gray-700 space-y-4">
              {/* Game Selection */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Game</label>
                  <select
                    value={addCardGame}
                    onChange={(e) => {
                      setAddCardGame(e.target.value as 'mtg' | 'pokemon' | 'lorcana');
                      setAddCardSearchResults([]);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  >
                    <option value="mtg">Magic: The Gathering</option>
                    <option value="pokemon">Pokémon TCG</option>
                    <option value="lorcana">Disney Lorcana</option>
                  </select>
                </div>
              </div>
              
              {/* Language Toggle (Pokémon only) */}
              {addCardGame === 'pokemon' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Language</label>
                  <div className="flex flex-wrap gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    {([{code:'en',label:'🇬🇧 English'},{code:'ja',label:'🇯🇵 Japanese'},{code:'all',label:'🇬🇧+🇯🇵 EN + JP'}] as {code:'all'|'en'|'ja',label:string}[]).map(({code,label}) => (
                      <button
                        key={code}
                        onClick={() => { setAddCardLang(code); setAddCardSearchResults([]); }}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                          addCardLang === code
                            ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-800'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {addCardLang === 'all' && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">⚡ Searches English &amp; Japanese simultaneously</p>
                  )}
                </div>
              )}

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
            )}

            {/* Compact search summary bar — shown when results exist */}
            {addCardSearchResults.length > 0 && (
              <div className="px-4 py-2 border-b dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 shrink-0">
                <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                  <span className="font-medium">{addCardSearchResults.length} results</span>
                  {(addCardName || addCardSetCode) && (
                    <> for &quot;{addCardName || `${addCardSetCode} #${addCardCollectorNum}`}&quot;</>
                  )}
                  {addCardLang !== 'en' && addCardLang !== 'all' && (
                    <span className="ml-1 text-xs text-gray-400 uppercase">[{addCardLang}]</span>
                  )}
                </span>
                <button
                  onClick={() => setAddCardSearchResults([])}
                  className="ml-3 text-sm text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
                >
                  ← New search
                </button>
              </div>
            )}

            {/* Search Results */}
            <div className="flex-1 overflow-auto p-4 min-h-[320px]">
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
                    const getCardPriceDisplays = () => {
                      const prices: string[] = [];
                      if (addCardGame === 'pokemon') {
                        const tcgPrices = card.tcgplayer?.prices || card.pricing?.tcgplayer;
                        if (tcgPrices) {
                           if (tcgPrices.normal?.market || typeof tcgPrices.normal === 'number') {
                              const val = parseFloat(tcgPrices.normal?.market ?? tcgPrices.normal) * 0.92;
                              if (val > 0) prices.push(`€${val.toFixed(2)}`);
                           }
                           if (tcgPrices.holofoil?.market || typeof tcgPrices.holofoil === 'number') {
                              const val = parseFloat(tcgPrices.holofoil?.market ?? tcgPrices.holofoil) * 0.92;
                              if (val > 0) prices.push(`€${val.toFixed(2)} (Holo)`);
                           }
                           if (tcgPrices.reverseHolofoil?.market || typeof tcgPrices.reverseHolofoil === 'number') {
                              const val = parseFloat(tcgPrices.reverseHolofoil?.market ?? tcgPrices.reverseHolofoil) * 0.92;
                              if (val > 0) prices.push(`€${val.toFixed(2)} (Rev)`);
                           }
                           if (tcgPrices.pokeballHolofoil?.market || typeof tcgPrices.pokeballHolofoil === 'number') {
                              const val = parseFloat(tcgPrices.pokeballHolofoil?.market ?? tcgPrices.pokeballHolofoil) * 0.92;
                              if (val > 0) prices.push(`€${val.toFixed(2)} (PB)`);
                           }
                           if (tcgPrices.masterballHolofoil?.market || typeof tcgPrices.masterballHolofoil === 'number') {
                              const val = parseFloat(tcgPrices.masterballHolofoil?.market ?? tcgPrices.masterballHolofoil) * 0.92;
                              if (val > 0) prices.push(`€${val.toFixed(2)} (MB)`);
                           }
                           if (prices.length > 0) return prices;
                        }

                        const cmPrices = card.cardmarket?.prices || card.pricing?.cardmarket;
                        if (cmPrices) {
                           if (cmPrices.avg || cmPrices.trend) {
                              prices.push(`€${parseFloat(cmPrices.avg || cmPrices.trend).toFixed(2)}`);
                           }
                           if (cmPrices.reverseHoloAvg || cmPrices.reverseHoloTrend) {
                              prices.push(`€${parseFloat(cmPrices.reverseHoloAvg || cmPrices.reverseHoloTrend).toFixed(2)} (Rev)`);
                           }
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
                        const mtgPrices = card.prices;
                        if (mtgPrices?.eur) prices.push(`€${mtgPrices.eur}`);
                        if (mtgPrices?.eur_foil) prices.push(`€${mtgPrices.eur_foil} (Foil)`);
                        
                        if (prices.length === 0) {
                          if (mtgPrices?.usd) prices.push(`$${mtgPrices.usd}`);
                          if (mtgPrices?.usd_foil) prices.push(`$${mtgPrices.usd_foil} (Foil)`);
                        }
                        return prices.length > 0 ? prices : null;
                      }
                    };
                    
                    const priceDisplays = getCardPriceDisplays();
                    
                    return (
                      <div key={card.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-600 transition">
                        <div className="aspect-[488/680] relative mb-2">
                          <img
                            src={card.image_uris?.small || card.image_uris?.normal || card.images?.small || card.images?.large || '/placeholder-card.png'}
                            alt={card.name}
                            className="w-full h-full object-contain rounded"
                          />
                          {priceDisplays && priceDisplays.length > 0 && (
                            <div className="absolute top-1 right-1 flex flex-col gap-0.5 items-end">
                              {priceDisplays.map((p, i) => (
                                <div key={i} className="bg-green-600/90 text-white text-[10px] leading-tight font-bold px-1.5 py-0.5 rounded shadow-sm backdrop-blur-sm">
                                  {p}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <h4 className="font-medium text-sm truncate dark:text-white" title={card.name}>
                          {card.name}
                          {card.translation?.en?.name && card.translation.en.name !== card.name && (
                            <span className="ml-1 text-[10px] text-gray-400 font-normal">({card.translation.en.name})</span>
                          )}
                        </h4>
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
                            setCardPriceData(card.pricing || card.prices);
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
                    {selectedCardToAdd.translation?.en?.name && selectedCardToAdd.translation.en.name !== selectedCardToAdd.name && (
                      <span className="ml-1 text-xs text-gray-400 font-normal">({selectedCardToAdd.translation.en.name})</span>
                    )}
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
                    {(() => {
                      const selectedPrice = getPriceForFinish(selectedCardToAdd, addCardGame, cardFinish);
                      if (selectedPrice) {
                        return (
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Market Price ({cardFinish}):</p>
                            <p className="text-lg font-bold text-green-600">{selectedPrice.currency === 'EUR' ? '€' : '$'}{selectedPrice.value.toFixed(2)}</p>
                            <p className="text-xs text-gray-400">Estimated current value</p>
                          </div>
                        );
                      } else {
                        const _lang = selectedCardToAdd?.card_data?.language || selectedCardToAdd?.card_data?._srcLang || '';
                        const _isZh = _lang === 'zh-tw' || _lang === 'zh';
                        return _isZh 
                          ? <p className="text-sm text-amber-600 dark:text-amber-400">Pricing not available for Chinese cards</p>
                          : <p className="text-sm text-gray-500">Price not available</p>;
                      }
                    })()}
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
                    {(addCardGame === 'pokemon' ? pokemonFinishOptions : addCardGame === 'lorcana' ? lorcanaFinishOptions : mtgFinishOptions).map(opt => {
                        const price = getPriceForFinish(selectedCardToAdd, addCardGame, opt);
                        const priceStr = price ? ` - ${price.currency === 'EUR' ? '€' : '$'}${price.value.toFixed(2)}` : '';
                        return <option key={opt} value={opt}>{opt}{priceStr}</option>;
                    })}
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
                {isGraded && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 ml-6">
                    Graded card prices reflect US market values (US, TCGPlayer)
                  </p>
                )}
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

      {/* Sealed Products Modal */}
      {showAddSealedModal && (
        <AddSealedModal
          sealedSearch={sealedSearch}
          setSealedSearch={setSealedSearch}
          sealedSearchResults={sealedSearchResults}
          isSearchingSealed={isSearchingSealed}
          hasSearchedSealed={hasSearchedSealed}
          manualSealed={manualSealed}
          setManualSealed={setManualSealed}
          addingSealedProduct={addingSealedProduct}
          onSearch={handleSearchSealed}
          onAddFromSearch={handleAddSealedFromSearch}
          onAddManual={handleAddManualSealed}
          onClose={() => {
            setShowAddSealedModal(false);
            setSealedSearchResults([]);
            setSealedSearch('');
            setHasSearchedSealed(false);
          }}
        />
      )}
    </div>
  );
}