import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { API_URL, SCRYFALL_API, TCGDEX_API } from '../config';
import { useTheme } from '../context/ThemeContext';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 3; // 3 columns with padding

// Pokemon TCG set code mappings (common export codes -> TCGdex codes)
// User's CSV might use different codes than TCGdex expects
const POKEMON_SET_ALIASES: Record<string, string> = {
  // Scarlet & Violet Era - Map common codes to TCGdex format
  'sv09': 'sv09', 'jtg': 'sv09', 'journeytogether': 'sv09',  // Journey Together
  'sv08': 'sv08', 'ssp': 'sv08', 'surgingsparks': 'sv08',   // Surging Sparks
  'sv07': 'sv07', 'scr': 'sv07', 'stellarcrown': 'sv07',    // Stellar Crown
  'sv06': 'sv06', 'twm': 'sv06', 'twilightmasquerade': 'sv06', // Twilight Masquerade
  'sv05': 'sv05', 'tef': 'sv05', 'temporalforces': 'sv05',  // Temporal Forces
  'sv04': 'sv04', 'par': 'sv04', 'paradoxrift': 'sv04',     // Paradox Rift
  'sv03': 'sv03', 'obf': 'sv03', 'obsidianflames': 'sv03',  // Obsidian Flames
  'sv02': 'sv02', 'pal': 'sv02', 'paldeaevolved': 'sv02',   // Paldea Evolved
  'sv01': 'sv01', 'svi': 'sv01', 'scarletviolet': 'sv01',   // Scarlet & Violet Base
  'svp': 'svp', // SV Promo
  
  // Sword & Shield Era
  'swsh12': 'swsh12', 'crs': 'swsh12', 'sil': 'swsh12', 'crownzenith': 'swsh12', 'silvertempest': 'swsh12',
  'swsh11': 'swsh11', 'loi': 'swsh11', 'lor': 'swsh11', 'lostorigin': 'swsh11',
  'swsh10': 'swsh10', 'asr': 'swsh10', 'astralradiance': 'swsh10',
  'swsh9': 'swsh9', 'brs': 'swsh9', 'brilliantstars': 'swsh9',
  'swsh8': 'swsh8', 'fus': 'swsh8', 'fsn': 'swsh8', 'fusionstrike': 'swsh8',
  'swsh7': 'swsh7', 'evs': 'swsh7', 'evolvingskies': 'swsh7',
  'swsh6': 'swsh6', 'cre': 'swsh6', 'chillingreign': 'swsh6',
  'swsh5': 'swsh5', 'bst': 'swsh5', 'battlestyles': 'swsh5',
  'swsh4': 'swsh4', 'viv': 'swsh4', 'vividvoltage': 'swsh4',
  'swsh3': 'swsh3', 'dab': 'swsh3', 'darknessablaze': 'swsh3',
  'swsh2': 'swsh2', 'reb': 'swsh2', 'rebelclash': 'swsh2',
  'swsh1': 'swsh1', 'swordshield': 'swsh1',
  'swshp': 'swshp',
  
  // Sun & Moon Era
  'sm12': 'sm12', 'cec': 'sm12', 'cosmiceclipse': 'sm12',
  'sm11': 'sm11', 'unm': 'sm11', 'unifiedminds': 'sm11',
  'sm10': 'sm10', 'unb': 'sm10', 'unbrokenbonds': 'sm10',
  'sm9': 'sm9', 'det': 'sm9', 'detectivepikachu': 'sm9',
  'sm8': 'sm8', 'lot': 'sm8', 'lostthunder': 'sm8',
  'sm7': 'sm7', 'cel': 'sm7', 'celestialstorm': 'sm7',
  'sm6': 'sm6', 'fli': 'sm6', 'forbiddenlight': 'sm6',
  'sm5': 'sm5', 'ula': 'sm5', 'ultraprism': 'sm5',
  'sm4': 'sm4', 'cri': 'sm4', 'crimsoninvasion': 'sm4',
  'sm3': 'sm3', 'bus': 'sm3', 'burningshadows': 'sm3',
  'sm2': 'sm2', 'gri': 'sm2', 'guardiansrising': 'sm2',
  'sm1': 'sm1', 'sunmoon': 'sm1',
  'smp': 'smp',
  
  // XY Era
  'xy12': 'xy12', 'evo': 'xy12', 'evolutions': 'xy12',
  'xy11': 'xy11', 'stc': 'xy11', 'steamsiege': 'xy11',
  'xy10': 'xy10', 'fco': 'xy10', 'fatescollide': 'xy10',
  'xy9': 'xy9', 'bkp': 'xy9', 'breakpoint': 'xy9',
  'xy8': 'xy8', 'bkt': 'xy8', 'breakthrough': 'xy8',
  'xy7': 'xy7', 'aor': 'xy7', 'ancientorigins': 'xy7',
  'xy6': 'xy6', 'ros': 'xy6', 'roaringskies': 'xy6',
  'xy5': 'xy5', 'prc': 'xy5', 'primalclash': 'xy5',
  'xy4': 'xy4', 'phf': 'xy4', 'phantomforces': 'xy4',
  'xy3': 'xy3', 'ffi': 'xy3', 'furiousfists': 'xy3',
  'xy2': 'xy2', 'flf': 'xy2', 'flashfire': 'xy2',
  'xy1': 'xy1', 'xybase': 'xy1',
  'xyp': 'xyp',
};

// Map a set code from user input to TCGdex format (case-insensitive)
function mapPokemonSetCode(setCode: string): string {
  const code = setCode.toLowerCase().replace(/[^a-z0-9]/g, '');
  return POKEMON_SET_ALIASES[code] || code;
}

// Normalize collector number - remove leading zeros for TCGdex lookup
// but try both formats (with and without leading zeros)
function normalizeCollectorNumber(num: string): string[] {
  const trimmed = num.trim();
  const withoutLeadingZeros = trimmed.replace(/^0+/, '') || '0';
  const withLeadingZeros = trimmed.padStart(3, '0');
  
  // Return unique values to try
  const variants = [trimmed, withoutLeadingZeros];
  if (withLeadingZeros !== trimmed && withLeadingZeros !== withoutLeadingZeros) {
    variants.push(withLeadingZeros);
  }
  return [...new Set(variants)];
}

interface CollectionItem {
  id: number;
  item_id?: string;
  card_id: string;
  card_data: any;
  game: string;
  quantity: number;
  condition: string;
  foil?: boolean;
  finish?: string;
  is_signed?: boolean;
  is_graded?: boolean;
  grading_company?: string;
  grade_value?: string;
}

interface SearchResult {
  id: string;
  name: string;
  image: string;
  set_name: string;
  set_code: string;
  collector_number: string;
  price?: string;
  game: 'mtg' | 'pokemon';
  rarity?: string;
  data: any;
}

// For grouping MTG cards by name with multiple editions
interface CardGroup {
  name: string;
  editions: SearchResult[];
  selectedEdition: number;
}

interface CollectionScreenProps {
  user: any;
  token: string;
  sessionCookie?: string;
  onOpenMenu?: () => void;
}

export default function CollectionScreen({ user, token, onOpenMenu }: CollectionScreenProps) {
  const { colors } = useTheme();
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'mtg' | 'pokemon'>('all');
  const [error, setError] = useState('');

  // Add Card Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [setCodeQuery, setSetCodeQuery] = useState('');
  const [collectorNumQuery, setCollectorNumQuery] = useState('');
  const [searchGame, setSearchGame] = useState<'mtg' | 'pokemon'>('mtg');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(''); // For debugging search issues
  const [mtgCardGroups, setMtgCardGroups] = useState<CardGroup[]>([]); // Grouped MTG results
  
  // Card Detail Modal State
  const [selectedCard, setSelectedCard] = useState<SearchResult | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [quantity, setQuantity] = useState('1');
  const [condition, setCondition] = useState('Near Mint');
  const [isFoil, setIsFoil] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const [isGraded, setIsGraded] = useState(false);
  const [gradingCompany, setGradingCompany] = useState('PSA');
  const [gradeValue, setGradeValue] = useState('10');
  const [finish, setFinish] = useState('Normal'); // For Pokemon: Normal, Holo, Reverse Holo, etc.
  const [adding, setAdding] = useState(false);
  
  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // CSV Import state
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvGame, setCsvGame] = useState<'mtg' | 'pokemon'>('mtg');
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [importLog, setImportLog] = useState<string[]>([]);

  useEffect(() => {
    fetchCollection();
  }, [filter]);

  // Exit selection mode when leaving screen
  useEffect(() => {
    return () => {
      setSelectionMode(false);
      setSelectedIds(new Set());
    };
  }, []);

  const toggleSelection = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    // Get filtered items based on current filter
    const filteredItems = filter === 'all' 
      ? items 
      : items.filter(item => item.game === filter);
    setSelectedIds(new Set(filteredItems.map(item => item.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    const confirmMsg = `Are you sure you want to delete ${selectedIds.size} card(s) from your collection?`;
    
    const confirmed = await new Promise<boolean>((resolve) => {
      if (Platform.OS === 'web') {
        resolve(window.confirm(confirmMsg));
      } else {
        Alert.alert(
          'Delete Cards',
          confirmMsg,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
          ]
        );
      }
    });

    if (!confirmed) return;

    try {
      const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : token;
      let successCount = 0;
      let failCount = 0;

      // Delete cards one by one
      for (const id of selectedIds) {
        try {
          const response = await fetch(`${API_URL}/api/collection?id=${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` },
          });
          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
      }

      // Refresh and exit selection mode
      fetchCollection();
      setSelectionMode(false);
      setSelectedIds(new Set());

      const msg = failCount > 0 
        ? `Deleted ${successCount} cards. ${failCount} failed.`
        : `Successfully deleted ${successCount} cards.`;
      
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert('Done', msg);
      }
    } catch (err) {
      console.error('Bulk delete error:', err);
      if (Platform.OS === 'web') {
        alert('Failed to delete cards');
      } else {
        Alert.alert('Error', 'Failed to delete cards');
      }
    }
  };

  const fetchCollection = async () => {
    setError('');
    try {
      const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : token;
      
      const url = filter === 'all' 
        ? `${API_URL}/api/collection`
        : `${API_URL}/api/collection?game=${filter}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await response.json();
      
      if (data.success && Array.isArray(data.items)) {
        setItems(data.items);
      } else if (Array.isArray(data.items)) {
        setItems(data.items);
      } else {
        setItems([]);
        if (data.error) {
          setError(data.error);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch collection:', err);
      setError('Failed to load collection');
      setItems([]);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCollection();
  };

  const searchCards = async () => {
    setSearching(true);
    setSearchResults([]);
    setMtgCardGroups([]); // Clear grouped results
    setSearchError('');
    
    try {
      if (searchGame === 'mtg') {
        // Magic: The Gathering search - use backend proxy to avoid iOS network issues
        console.log('Starting MTG search...');
        console.log('Search params:', { name: searchQuery, set: setCodeQuery, num: collectorNumQuery });
        
        const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : token;
        
        // Build query params for our proxy
        const params = new URLSearchParams();
        
        // Direct lookup by set and collector number (most precise)
        if (setCodeQuery.trim() && collectorNumQuery.trim()) {
          params.set('set', setCodeQuery.toLowerCase().trim());
          params.set('cn', collectorNumQuery.trim());
        } else {
          // Build search query
          const queryParts: string[] = [];
          if (searchQuery.trim()) {
            queryParts.push(searchQuery.trim());
          }
          if (setCodeQuery.trim()) {
            queryParts.push(`set:${setCodeQuery.toLowerCase().trim()}`);
          }
          if (collectorNumQuery.trim()) {
            queryParts.push(`cn:${collectorNumQuery.trim()}`);
          }
          
          const query = queryParts.join(' ');
          
          if (!query) {
            setSearchError('Please enter a card name, set code, or collector number');
            if (Platform.OS === 'web') {
              alert('Please enter a card name, set code, or collector number');
            } else {
              Alert.alert('Search', 'Please enter a card name, set code, or collector number');
            }
            setSearching(false);
            return;
          }
          
          params.set('q', query);
        }
        
        const searchUrl = `${API_URL}/api/scryfall?${params.toString()}`;
        console.log('MTG Search URL:', searchUrl);
        setSearchError(`Searching MTG...`);
        
        const response = await fetch(searchUrl, {
          headers: { 'Authorization': `Bearer ${authToken}` },
        });
        console.log('MTG search response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('MTG search found:', data.cards?.length || 0, 'cards');
          
          if (data.cards && data.cards.length > 0) {
            // Convert all cards to SearchResult format
            const allResults: SearchResult[] = data.cards.map((card: any) => {
              const eurPrice = card.prices?.eur;
              const usdPrice = card.prices?.usd;
              const displayPrice = eurPrice ? `€${parseFloat(eurPrice).toFixed(2)}` : 
                                   usdPrice ? `€${(parseFloat(usdPrice) * 0.92).toFixed(2)}` : 'N/A';
              return {
                id: card.id,
                name: card.name,
                image: card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || '',
                set_name: card.set_name,
                set_code: card.set?.toUpperCase() || '',
                collector_number: card.collector_number,
                price: displayPrice,
                rarity: card.rarity,
                game: 'mtg' as const,
                data: card,
              };
            });
            
            // Group cards by name for edition picker
            const groupedByName = new Map<string, SearchResult[]>();
            allResults.forEach(card => {
              const existing = groupedByName.get(card.name) || [];
              existing.push(card);
              groupedByName.set(card.name, existing);
            });
            
            // Convert to CardGroup array
            const groups: CardGroup[] = Array.from(groupedByName.entries()).map(([name, editions]) => ({
              name,
              editions: editions.sort((a, b) => {
                // Sort by set name alphabetically
                return a.set_name.localeCompare(b.set_name);
              }),
              selectedEdition: 0,
            }));
            
            setMtgCardGroups(groups);
            setSearchResults([]); // Clear flat results for MTG
            setSearchError(`Found ${groups.length} unique cards (${data.cards.length} editions)`);
          } else {
            console.log('No MTG results found');
            setMtgCardGroups([]);
            setSearchError('No Magic cards found');
            if (Platform.OS === 'web') {
              alert('No Magic cards found with that search.');
            } else {
              Alert.alert('No Results', 'No Magic cards found with that search.');
            }
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.log('MTG search failed:', response.status, errorData);
          setSearchError(`Search failed: ${errorData.error || response.status}`);
          if (Platform.OS === 'web') {
            alert('Search failed. Please try again.');
          } else {
            Alert.alert('Error', 'Search failed. Please try again.');
          }
        }
      } else {
        // Pokemon search
        console.log('Pokemon search with:', { name: searchQuery, setCode: setCodeQuery, num: collectorNumQuery });
        
        // Map user's set code to TCGdex format
        const mappedSetCode = setCodeQuery.trim() ? mapPokemonSetCode(setCodeQuery.trim()) : '';
        console.log('Mapped set code:', mappedSetCode);
        
        // Strategy 1: Direct lookup by set code and collector number
        if (mappedSetCode && collectorNumQuery.trim()) {
          const numVariants = normalizeCollectorNumber(collectorNumQuery);
          console.log(`Trying Pokemon direct lookup with variants:`, numVariants);
          
          for (const num of numVariants) {
            try {
              const cardId = `${mappedSetCode}-${num}`;
              console.log(`Trying: ${cardId}`);
              const response = await fetch(`${TCGDEX_API}/cards/${cardId}`);
              if (response.ok) {
                const card = await response.json();
                if (card && card.id) {
                  // Prefer European cardmarket prices - TCGdex uses pricing.cardmarket.avg
                  const cmPrice = card.pricing?.cardmarket?.avg || card.pricing?.cardmarket?.trend || 0;
                  const displayPrice = cmPrice > 0 ? `€${cmPrice.toFixed(2)}` : 'N/A';
                  
                  setSearchResults([{
                    id: card.id,
                    name: card.name,
                    image: card.image ? `${card.image}/high.webp` : '',
                    set_name: card.set?.name || '',
                    set_code: card.set?.id?.toUpperCase() || mappedSetCode.toUpperCase(),
                    collector_number: card.localId || num,
                    price: displayPrice,
                    rarity: card.rarity,
                    game: 'pokemon' as const,
                    data: card,
                  }]);
                  setSearching(false);
                  return;
                }
              }
            } catch (e) {
              // Try next variant
            }
          }
          console.log('Pokemon direct lookup failed, trying search...');
        }
        
        // Strategy 2: Search by name (with optional set/number filter)
        if (searchQuery.trim()) {
          console.log('Trying name search:', searchQuery);
          const response = await fetch(`${TCGDEX_API}/cards?name=${encodeURIComponent(searchQuery.trim())}`);
          if (response.ok) {
            const data = await response.json();
            let results = Array.isArray(data) ? data : [];
            console.log(`Found ${results.length} results for name search`);
            
            // Filter by mapped set code if provided
            if (mappedSetCode) {
              results = results.filter((card: any) => {
                const cardSetId = card.set?.id?.toLowerCase() || '';
                const cardIdPrefix = card.id?.toLowerCase().split('-')[0] || '';
                return cardSetId === mappedSetCode.toLowerCase() || 
                       cardIdPrefix === mappedSetCode.toLowerCase();
              });
              console.log(`After set filter: ${results.length} results`);
            }
            
            // Filter by collector number if provided
            if (collectorNumQuery.trim()) {
              results = results.filter((card: any) => 
                card.localId === collectorNumQuery.trim() ||
                card.id?.endsWith(`-${collectorNumQuery.trim()}`)
              );
              console.log(`After number filter: ${results.length} results`);
            }
            
            // Fetch full details for each card to get prices (limit to first 100)
            const limitedResults = results.slice(0, 100);
            const detailedResults = await Promise.all(
              limitedResults.map(async (card: any) => {
                try {
                  const detailRes = await fetch(`${TCGDEX_API}/cards/${card.id}`);
                  if (detailRes.ok) {
                    return await detailRes.json();
                  }
                  return card;
                } catch {
                  return card;
                }
              })
            );
            
            setSearchResults(detailedResults.map((card: any) => {
              const idParts = card.id?.split('-') || [];
              const setCode = idParts.length > 1 ? idParts.slice(0, -1).join('-').toUpperCase() : '';
              const collectorNum = card.localId || idParts[idParts.length - 1] || '';
              
              // Prefer European cardmarket prices - TCGdex uses pricing.cardmarket.avg
              const cmPrice = card.pricing?.cardmarket?.avg || card.pricing?.cardmarket?.trend || 0;
              const displayPrice = cmPrice > 0 ? `€${cmPrice.toFixed(2)}` : 'N/A';
              
              return {
                id: card.id,
                name: card.name,
                image: card.image ? `${card.image}/high.webp` : '',
                set_name: card.set?.name || setCode,
                set_code: card.set?.id?.toUpperCase() || setCode,
                collector_number: collectorNum,
                price: displayPrice,
                rarity: card.rarity,
                game: 'pokemon' as const,
                data: card,
              };
            }));
            setSearching(false);
            return;
          }
        }
        
        // Strategy 3: Search by set only (browse all cards in set)
        if (mappedSetCode && !searchQuery.trim()) {
          console.log('Trying set browse:', mappedSetCode);
          const response = await fetch(`${TCGDEX_API}/sets/${mappedSetCode}`);
          if (response.ok) {
            const setData = await response.json();
            if (setData.cards) {
              let cards = setData.cards;
              console.log(`Found ${cards.length} cards in set`);
              
              // Filter by collector number if provided
              if (collectorNumQuery.trim()) {
                cards = cards.filter((card: any) => 
                  card.localId === collectorNumQuery.trim()
                );
              }
              
              // Fetch full details to get prices
              const detailedCards = await Promise.all(
                cards.slice(0, 50).map(async (card: any) => {
                  try {
                    const detailRes = await fetch(`${TCGDEX_API}/cards/${card.id}`);
                    if (detailRes.ok) {
                      return await detailRes.json();
                    }
                    return card;
                  } catch {
                    return card;
                  }
                })
              );
              
              setSearchResults(detailedCards.map((card: any) => {
                // TCGdex uses pricing.cardmarket.avg for prices
                const cmPrice = card.pricing?.cardmarket?.avg || card.pricing?.cardmarket?.trend || 0;
                const displayPrice = cmPrice > 0 ? `€${cmPrice.toFixed(2)}` : 'N/A';
                
                return {
                  id: card.id,
                  name: card.name,
                  image: card.image ? `${card.image}/high.webp` : '',
                  set_name: setData.name || '',
                  set_code: setData.id?.toUpperCase() || '',
                  collector_number: card.localId || '',
                  price: displayPrice,
                  rarity: card.rarity,
                  game: 'pokemon' as const,
                  data: { ...card, set: { id: setData.id, name: setData.name } },
                };
              }));
              setSearching(false);
              return;
            }
          } else {
            console.log('Set lookup failed:', await response.text());
          }
        }
        
        // No results found
        if (Platform.OS === 'web') {
          alert('No cards found. Try a different search.');
        } else {
          Alert.alert('No Results', 'No cards found. Try a different search.');
        }
      }
    } catch (err: any) {
      console.error('Search failed:', err);
      setSearchError(`Search error: ${err.message || 'Unknown error'}`);
    }
    
    setSearching(false);
  };

  const openCardDetail = (card: SearchResult) => {
    setSelectedCard(card);
    setQuantity('1');
    setCondition('Near Mint');
    setIsFoil(false);
    setIsSigned(false);
    setIsGraded(false);
    setFinish('Normal');
    setShowDetailModal(true);
  };

  const addCardToCollection = async () => {
    if (!selectedCard) return;
    
    setAdding(true);
    
    try {
      const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : token;
      
      const response = await fetch(`${API_URL}/api/collection`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          card_id: selectedCard.id,
          game: selectedCard.game,
          card_data: selectedCard.data,
          quantity: parseInt(quantity) || 1,
          condition: condition,
          foil: isFoil,
          finish: finish,
          is_signed: isSigned,
          is_graded: isGraded,
          grading_company: isGraded ? gradingCompany : null,
          grade_value: isGraded ? gradeValue : null,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setShowDetailModal(false);
        setShowAddModal(false);
        setSelectedCard(null);
        setSearchQuery('');
        setSetCodeQuery('');
        setCollectorNumQuery('');
        setSearchResults([]);
        fetchCollection();
        
        if (Platform.OS === 'web') {
          alert('Card added to collection!');
        } else {
          Alert.alert('Success', 'Card added to collection!');
        }
      } else {
        const errorMsg = data.error || 'Failed to add card';
        if (Platform.OS === 'web') {
          alert(errorMsg);
        } else {
          Alert.alert('Error', errorMsg);
        }
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Network error';
      if (Platform.OS === 'web') {
        alert(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
    }
    
    setAdding(false);
  };

  const getCardImage = (item: CollectionItem) => {
    try {
      if (!item.card_data) return null;
      if (item.game === 'mtg') {
        return item.card_data?.image_uris?.normal || 
               item.card_data?.image_uris?.small ||
               item.card_data?.card_faces?.[0]?.image_uris?.normal;
      } else {
        // TCGdex stores image as a direct URL string, not images.large/small
        // Format: https://assets.tcgdex.net/en/set/num - append /high.webp for high-res
        const imageUrl = item.card_data?.image;
        if (imageUrl) {
          // If it's already a full URL with file extension, use as-is
          if (imageUrl.includes('.png') || imageUrl.includes('.webp') || imageUrl.includes('.jpg')) {
            return imageUrl;
          }
          // Otherwise append /high.webp for TCGdex format
          return `${imageUrl}/high.webp`;
        }
        // Fallback to legacy format
        return item.card_data?.images?.large || item.card_data?.images?.small;
      }
    } catch {
      return null;
    }
  };

  const getPokemonFinishes = () => {
    // Common Pokemon finishes
    return ['Normal', 'Holo', 'Reverse Holo', 'Pokeball Holo', 'Masterball Holo', 'Full Art', 'Alt Art'];
  };

  const getMagicFinishes = () => {
    return ['Normal', 'Foil', 'Etched Foil', 'Gilded Foil'];
  };

  // CSV Import functionality
  // Supports multiple formats:
  // 1. name/set_code (e.g., "muxus/JMP" or "cavern of souls/LCI")
  // 2. set_code,collector_number,quantity (e.g., "sv09,123,2")
  // 3. quantity set_code collector_number (e.g., "2 sv09 123")
  interface ParsedCard {
    name?: string;
    setCode?: string;
    collectorNumber?: string;
    quantity: number;
    searchByName: boolean;
  }

  const parseCSV = (text: string): ParsedCard[] => {
    const lines = text.trim().split('\n');
    const results: ParsedCard[] = [];
    
    for (const line of lines) {
      if (!line.trim()) continue;
      const trimmedLine = line.trim();
      
      // Check for name/set_code format (contains "/" and text on both sides)
      if (trimmedLine.includes('/')) {
        const slashIndex = trimmedLine.lastIndexOf('/');
        const name = trimmedLine.substring(0, slashIndex).trim();
        const setCode = trimmedLine.substring(slashIndex + 1).trim();
        
        if (name && setCode) {
          results.push({
            name: name,
            setCode: setCode.toLowerCase(),
            quantity: 1,
            searchByName: true
          });
          continue;
        }
      }
      
      // Try comma-separated format: set_code,collector_number,quantity
      let parts = trimmedLine.split(',').map(p => p.trim().replace(/"/g, ''));
      
      if (parts.length >= 2 && !isNaN(parseInt(parts[1]))) {
        const setCode = parts[0].toLowerCase();
        const collectorNumber = parts[1];
        const quantity = parts[2] ? parseInt(parts[2]) || 1 : 1;
        
        if (setCode && collectorNumber) {
          results.push({ setCode, collectorNumber, quantity, searchByName: false });
          continue;
        }
      }
      
      // Space-separated format
      parts = trimmedLine.split(/\s+/).map(p => p.trim());
      if (parts.length >= 2) {
        const firstNum = parseInt(parts[0]);
        if (!isNaN(firstNum) && parts.length >= 3) {
          // Format: quantity set_code collector_number
          results.push({
            setCode: parts[1].toLowerCase(),
            collectorNumber: parts[2],
            quantity: firstNum,
            searchByName: false
          });
        } else if (!isNaN(parseInt(parts[1]))) {
          // Format: set_code collector_number [quantity]
          results.push({
            setCode: parts[0].toLowerCase(),
            collectorNumber: parts[1],
            quantity: parts[2] ? parseInt(parts[2]) || 1 : 1,
            searchByName: false
          });
        }
      }
    }
    
    return results;
  };

  const importFromCSV = async () => {
    if (!csvText.trim()) {
      Alert.alert('Error', 'Please paste your card list');
      return;
    }
    
    const cards = parseCSV(csvText);
    if (cards.length === 0) {
      Alert.alert('Error', 'Could not parse any cards from the input');
      return;
    }
    
    setImporting(true);
    setImportProgress({ current: 0, total: cards.length, success: 0, failed: 0 });
    setImportLog([]);
    
    const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : token;
    let successCount = 0;
    let failedCount = 0;
    const logs: string[] = [];
    
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      setImportProgress(prev => ({ ...prev, current: i + 1 }));
      
      try {
        let cardData: any = null;
        let game = csvGame;
        
        // Map set code using aliases if needed (for Pokemon)
        const mappedSetCode = csvGame === 'pokemon' 
          ? (POKEMON_SET_ALIASES[card.setCode] || card.setCode)
          : card.setCode;
        
        if (csvGame === 'mtg') {
          // Search Scryfall by set and collector number
          const url = `${SCRYFALL_API}/cards/${mappedSetCode}/${card.collectorNumber}`;
          const res = await fetch(url);
          if (res.ok) {
            cardData = await res.json();
          }
        } else {
          // Search TCGdex by set and number
          const url = `${TCGDEX_API}/sets/${mappedSetCode}/${card.collectorNumber}`;
          const res = await fetch(url);
          if (res.ok) {
            cardData = await res.json();
          }
        }
        
        if (!cardData) {
          logs.push(`❌ ${card.setCode}/${card.collectorNumber}: Not found`);
          failedCount++;
          continue;
        }
        
        // Add to collection
        const response = await fetch(`${API_URL}/api/collection`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            card_id: cardData.id,
            game: csvGame,
            quantity: card.quantity,
            condition: 'Near Mint',
            finish: 'Normal',
            card_data: cardData,
          }),
        });
        
        if (response.ok) {
          logs.push(`✅ ${cardData.name || card.collectorNumber} x${card.quantity}`);
          successCount++;
        } else {
          logs.push(`❌ ${card.setCode}/${card.collectorNumber}: Failed to add`);
          failedCount++;
        }
      } catch (err) {
        logs.push(`❌ ${card.setCode}/${card.collectorNumber}: Error`);
        failedCount++;
      }
      
      setImportProgress(prev => ({ ...prev, success: successCount, failed: failedCount }));
      setImportLog([...logs]);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    setImporting(false);
    
    if (successCount > 0) {
      fetchCollection();
    }
    
    Alert.alert(
      'Import Complete',
      `Successfully imported ${successCount} cards.\n${failedCount} cards failed.`
    );
  };

  // Pick a CSV file from device
  const pickCsvFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];
      
      // Read the file content
      if (Platform.OS === 'web') {
        // On web, we can read the file directly
        const response = await fetch(file.uri);
        const text = await response.text();
        setCsvText(text);
      } else {
        // On native, use FileSystem
        const FileSystem = require('expo-file-system');
        const content = await FileSystem.readAsStringAsync(file.uri);
        setCsvText(content);
      }
    } catch (error) {
      console.error('Error picking CSV file:', error);
      Alert.alert('Error', 'Failed to read the CSV file. Please try again or paste the content manually.');
    }
  };

  // Get price from card data - handles both MTG and Pokemon formats
  // All prices returned in EUR
  const getCardPrice = (item: CollectionItem): number => {
    try {
      const data = item.card_data;
      if (!data) return 0;
      
      if (item.game === 'mtg') {
        // Scryfall format - prefer EUR, convert USD if needed
        const eurPrice = parseFloat(data.prices?.eur) || 0;
        const usdPrice = parseFloat(data.prices?.usd) || 0;
        const price = eurPrice || (usdPrice * 0.92); // Approximate USD to EUR conversion
        return price * (item.quantity || 1);
      } else {
        // TCGdex format - cardmarket prices are already in EUR
        const cmPrice = data.cardmarket?.prices?.averageSellPrice || data.cardmarket?.prices?.trendPrice || data.pricing?.cardmarket?.avg || 0;
        const price = cmPrice || parseFloat(data.purchase_price) || 0;
        return price * (item.quantity || 1);
      }
    } catch {
      return 0;
    }
  };

  // Calculate collection totals
  const calculateCollectionStats = () => {
    let totalValue = 0;
    let mtgValue = 0;
    let pokemonValue = 0;
    const setValues: Record<string, number> = {};
    
    items.forEach(item => {
      const price = getCardPrice(item);
      totalValue += price;
      
      if (item.game === 'mtg') {
        mtgValue += price;
      } else {
        pokemonValue += price;
      }
      
      // Track by set
      const setName = item.card_data?.set?.name || item.card_data?.set_name || 'Unknown';
      setValues[setName] = (setValues[setName] || 0) + price;
    });
    
    return {
      totalValue,
      mtgValue,
      pokemonValue,
      totalCards: items.length,
      setValues: Object.entries(setValues)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5), // Top 5 sets by value
    };
  };

  const stats = calculateCollectionStats();

  // State for card detail modal (collection card view/edit)
  const [detailCard, setDetailCard] = useState<CollectionItem | null>(null);
  const [editingQuantity, setEditingQuantity] = useState('1');
  const [editingFinish, setEditingFinish] = useState('Normal');
  const [editingCondition, setEditingCondition] = useState('Near Mint');
  const [savingEdit, setSavingEdit] = useState(false);

  const openCollectionCardDetail = (item: CollectionItem) => {
    setDetailCard(item);
    setEditingQuantity(String(item.quantity || 1));
    setEditingFinish(item.finish || 'Normal');
    setEditingCondition(item.condition || 'Near Mint');
  };

  const updateCard = async () => {
    if (!detailCard) return;
    setSavingEdit(true);
    try {
      const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : token;
      const response = await fetch(`${API_URL}/api/collection`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          id: detailCard.id, // Use 'id' as that's what the API expects
          quantity: parseInt(editingQuantity) || 1,
          finish: editingFinish,
          condition: editingCondition,
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        fetchCollection();
        setDetailCard(null);
        if (Platform.OS === 'web') {
          alert('Card updated successfully');
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to update card');
      }
    } catch (err) {
      console.error('Update error:', err);
      Alert.alert('Error', 'Failed to update card');
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteCard = async (item: CollectionItem) => {
    const confirmDelete = () => {
      return new Promise<boolean>((resolve) => {
        if (Platform.OS === 'web') {
          resolve(window.confirm(`Are you sure you want to remove ${item.card_data?.name || 'this card'} from your collection?`));
        } else {
          Alert.alert(
            'Delete Card',
            `Are you sure you want to remove ${item.card_data?.name || 'this card'} from your collection?`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        }
      });
    };

    const confirmed = await confirmDelete();
    if (!confirmed) return;

    try {
      const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : token;
      // Use 'id' field as that's what the API expects
      const itemId = item.id;
      console.log('Deleting card with ID:', itemId);
      const response = await fetch(`${API_URL}/api/collection?id=${itemId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const result = await response.json();
      console.log('Delete response:', result);
      if (response.ok && result.success) {
        fetchCollection();
        setDetailCard(null);
        if (Platform.OS === 'web') {
          alert('Card deleted successfully');
        } else {
          Alert.alert('Success', 'Card deleted successfully');
        }
      } else {
        if (Platform.OS === 'web') {
          alert(result.error || 'Failed to delete card');
        } else {
          Alert.alert('Error', result.error || 'Failed to delete card');
        }
      }
    } catch (err) {
      console.error('Delete error:', err);
      if (Platform.OS === 'web') {
        alert('Failed to delete card');
      } else {
        Alert.alert('Error', 'Failed to delete card');
      }
    }
  };

  // Get card price for display
  const getDisplayPrice = (item: CollectionItem): string => {
    const price = getCardPrice(item);
    return price > 0 ? `€${price.toFixed(2)}` : 'N/A';
  };

  const renderItem = ({ item }: { item: CollectionItem }) => {
    const imageUrl = getCardImage(item);
    const price = getDisplayPrice(item);
    const isSelected = selectedIds.has(item.id);
    
    // Get set code and collector number
    const setCode = item.card_data?.set?.code || item.card_data?.set_code || item.card_data?.set?.id || '';
    const collectorNumber = item.card_data?.collector_number || item.card_data?.localId || '';
    
    // Determine finish/foil type for styling
    const finish = item.finish || 'Normal';
    const isFoil = finish !== 'Normal';
    const isHolo = finish.toLowerCase().includes('holo');
    const isPokeball = finish.toLowerCase().includes('pokeball');
    const isMasterball = finish.toLowerCase().includes('masterball');
    
    const handlePress = () => {
      if (selectionMode) {
        toggleSelection(item.id);
      } else {
        openCollectionCardDetail(item);
      }
    };

    const handleLongPress = () => {
      if (!selectionMode) {
        setSelectionMode(true);
        toggleSelection(item.id);
      }
    };
    
    return (
      <TouchableOpacity 
        style={[styles.card, isSelected && styles.cardSelected]} 
        onPress={handlePress}
        onLongPress={handleLongPress}
      >
        {selectionMode && (
          <View style={styles.checkboxContainer}>
            <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
              {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </View>
          </View>
        )}
        <View style={styles.cardImageWrapper}>
          {imageUrl ? (
            <Image 
              source={{ uri: imageUrl }} 
              style={styles.cardImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.cardPlaceholder}>
              <Ionicons name="image-outline" size={40} color="#9CA3AF" />
            </View>
          )}
          {/* Foil/Holo overlay effect */}
          {isFoil && (
            <View style={[
              styles.foilOverlay,
              isHolo && styles.holoOverlay,
              isPokeball && styles.pokeballOverlay,
              isMasterball && styles.masterballOverlay,
            ]} />
          )}
          {/* Finish badge */}
          {isFoil && (
            <View style={[
              styles.finishBadge,
              isPokeball && styles.pokeballBadge,
              isMasterball && styles.masterballBadge,
            ]}>
              <Ionicons 
                name={isPokeball ? 'ellipse' : isMasterball ? 'ellipse' : 'sparkles'} 
                size={10} 
                color="#FFFFFF" 
              />
              <Text style={styles.finishBadgeText}>
                {isPokeball ? 'PB' : isMasterball ? 'MB' : 'FOIL'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={2}>
            {item.card_data?.name || 'Unknown Card'}
          </Text>
          {/* Set code and collector number */}
          <View style={styles.setInfoRow}>
            <Text style={styles.setCode}>{setCode.toUpperCase()}</Text>
            {collectorNumber && (
              <Text style={styles.collectorNum}>#{collectorNumber}</Text>
            )}
          </View>
          <Text style={styles.cardPrice}>{price}</Text>
          <View style={styles.cardMetaRow}>
            <Text style={styles.cardMeta}>
              {item.game === 'mtg' ? 'MTG' : 'PKM'}
            </Text>
            <Text style={styles.cardQuantity}>x{item.quantity}</Text>
          </View>
          {item.finish && item.finish !== 'Normal' && (
            <Text style={[
              styles.cardFinish, 
              isPokeball && styles.pokeballText,
              isMasterball && styles.masterballText,
            ]}>{item.finish}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading collection...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={onOpenMenu}
          >
            <Ionicons name="menu" size={26} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>My Collection</Text>
            <Text style={styles.subtitle}>{items.length} cards</Text>
          </View>
          <TouchableOpacity 
            style={styles.csvButton}
            onPress={() => setShowCsvModal(true)}
            data-testid="csv-import-btn"
          >
            <Ionicons name="document-text-outline" size={22} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        
        {/* Collection Value Stats */}
        {items.length > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total Value</Text>
              <Text style={styles.statValue}>
                €{stats.totalValue.toFixed(2)}
              </Text>
            </View>
            {stats.mtgValue > 0 && (
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>MTG</Text>
                <Text style={[styles.statValue, styles.mtgColor]}>
                  €{stats.mtgValue.toFixed(2)}
                </Text>
              </View>
            )}
            {stats.pokemonValue > 0 && (
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Pokémon</Text>
                <Text style={[styles.statValue, styles.pokemonColor]}>
                  €{stats.pokemonValue.toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Selection Mode Bar */}
      {selectionMode && (
        <View style={styles.selectionBar}>
          <TouchableOpacity style={styles.selectionButton} onPress={selectAll}>
            <Ionicons name="checkmark-done-outline" size={20} color="#3B82F6" />
            <Text style={styles.selectionButtonText}>Select All</Text>
          </TouchableOpacity>
          <Text style={styles.selectionCount}>{selectedIds.size} selected</Text>
          <TouchableOpacity style={styles.selectionButton} onPress={clearSelection}>
            <Ionicons name="close-outline" size={20} color="#6B7280" />
            <Text style={styles.selectionButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.filters}>
        {(['all', 'mtg', 'pokemon'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.filterActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All' : f === 'mtg' ? 'Magic' : 'Pokémon'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {items.length === 0 && !error ? (
        <View style={styles.centered}>
          <Ionicons name="albums-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyText}>No cards in your collection</Text>
          <Text style={styles.emptySubtext}>
            Tap the + button to add cards
          </Text>
          <TouchableOpacity 
            style={styles.addFirstButton}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addFirstButtonText}>Add Your First Card</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id || item.item_id || item.card_id)}
          numColumns={3}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        />
      )}

      {/* Bulk Delete Button - Shows when in selection mode with items selected */}
      {selectionMode && selectedIds.size > 0 && (
        <View style={styles.bulkActionBar}>
          <TouchableOpacity 
            style={styles.bulkDeleteButton}
            onPress={bulkDelete}
          >
            <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
            <Text style={styles.bulkDeleteText}>Delete ({selectedIds.size})</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.bulkCancelButton}
            onPress={() => {
              setSelectionMode(false);
              setSelectedIds(new Set());
            }}
          >
            <Text style={styles.bulkCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Card Detail Modal */}
      <Modal
        visible={detailCard !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailCard(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Card Details</Text>
            <TouchableOpacity onPress={() => setDetailCard(null)}>
              <Ionicons name="close" size={28} color="#1F2937" />
            </TouchableOpacity>
          </View>

          {detailCard && (
            <ScrollView style={styles.modalContent}>
              {/* Card Image */}
              <View style={styles.detailImageContainer}>
                {getCardImage(detailCard) ? (
                  <Image 
                    source={{ uri: getCardImage(detailCard)! }} 
                    style={styles.detailImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.detailImagePlaceholder}>
                    <Ionicons name="image-outline" size={80} color="#9CA3AF" />
                  </View>
                )}
              </View>

              {/* Card Info */}
              <View style={styles.detailInfo}>
                <Text style={styles.detailName}>{detailCard.card_data?.name || 'Unknown Card'}</Text>
                <Text style={styles.detailPrice}>{getDisplayPrice(detailCard)}</Text>
                <Text style={styles.detailMeta}>
                  {detailCard.game === 'mtg' ? 'Magic: The Gathering' : 'Pokémon TCG'}
                </Text>
                <Text style={styles.detailMeta}>
                  Set: {detailCard.card_data?.set?.name || detailCard.card_data?.set_name || 'Unknown'}
                </Text>
                {detailCard.card_data?.rarity && (
                  <Text style={styles.detailMeta}>Rarity: {detailCard.card_data.rarity}</Text>
                )}
              </View>

              {/* Edit Section */}
              <View style={styles.editSection}>
                <Text style={styles.editTitle}>Edit Card</Text>
                
                {/* Quantity */}
                <View style={styles.editRow}>
                  <Text style={styles.editLabel}>Quantity</Text>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity 
                      style={styles.quantityButton}
                      onPress={() => setEditingQuantity(String(Math.max(1, parseInt(editingQuantity) - 1)))}
                    >
                      <Ionicons name="remove" size={20} color="#fff" />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.quantityInput}
                      value={editingQuantity}
                      onChangeText={setEditingQuantity}
                      keyboardType="number-pad"
                    />
                    <TouchableOpacity 
                      style={styles.quantityButton}
                      onPress={() => setEditingQuantity(String(parseInt(editingQuantity) + 1))}
                    >
                      <Ionicons name="add" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Finish */}
                <View style={styles.editRow}>
                  <Text style={styles.editLabel}>Finish</Text>
                  <View style={styles.finishOptions}>
                    {(detailCard.game === 'mtg' ? getMagicFinishes() : getPokemonFinishes()).map((f) => (
                      <TouchableOpacity
                        key={f}
                        style={[styles.finishOption, editingFinish === f && styles.finishOptionActive]}
                        onPress={() => setEditingFinish(f)}
                      >
                        <Text style={[styles.finishOptionText, editingFinish === f && styles.finishOptionTextActive]}>
                          {f}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Condition */}
                <View style={styles.editRow}>
                  <Text style={styles.editLabel}>Condition</Text>
                  <View style={styles.finishOptions}>
                    {['Mint', 'Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played'].map((c) => (
                      <TouchableOpacity
                        key={c}
                        style={[styles.finishOption, editingCondition === c && styles.finishOptionActive]}
                        onPress={() => setEditingCondition(c)}
                      >
                        <Text style={[styles.finishOptionText, editingCondition === c && styles.finishOptionTextActive]}>
                          {c}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.detailActions}>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={updateCard}
                  disabled={savingEdit}
                >
                  {savingEdit ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={20} color="#fff" />
                      <Text style={styles.saveButtonText}>Save Changes</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteCard(detailCard)}
                >
                  <Ionicons name="trash-outline" size={20} color="#fff" />
                  <Text style={styles.deleteButtonText}>Delete Card</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Search Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => { setShowAddModal(false); onOpenMenu?.(); }} 
              style={styles.modalMenuButton}
            >
              <Ionicons name="menu" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Card</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={28} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Game Selector */}
            <View style={styles.gameSelector}>
              <TouchableOpacity
                style={[styles.gameButton, searchGame === 'mtg' && styles.gameButtonActive]}
                onPress={() => { setSearchGame('mtg'); setSearchResults([]); }}
              >
                <Text style={[styles.gameButtonText, searchGame === 'mtg' && styles.gameButtonTextActive]}>
                  Magic
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.gameButton, searchGame === 'pokemon' && styles.gameButtonActive]}
                onPress={() => { setSearchGame('pokemon'); setSearchResults([]); }}
              >
                <Text style={[styles.gameButtonText, searchGame === 'pokemon' && styles.gameButtonTextActive]}>
                  Pokémon
                </Text>
              </TouchableOpacity>
            </View>

            {/* Search by Name */}
            <Text style={styles.inputLabel}>Search by Name</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Card name..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              onSubmitEditing={searchCards}
            />

            {/* Search by Set Code & Collector Number */}
            <Text style={styles.inputLabel}>Or search by Set Code & Number</Text>
            <View style={styles.setSearchRow}>
              <TextInput
                style={[styles.searchInput, { flex: 1 }]}
                placeholder="Set code (e.g. NEO)"
                value={setCodeQuery}
                onChangeText={setSetCodeQuery}
                autoCapitalize="characters"
              />
              <TextInput
                style={[styles.searchInput, { flex: 1 }]}
                placeholder="Number (e.g. 123)"
                value={collectorNumQuery}
                onChangeText={setCollectorNumQuery}
              />
            </View>

            <TouchableOpacity 
              style={styles.searchButton}
              onPress={searchCards}
              disabled={searching}
            >
              {searching ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="search" size={20} color="#fff" />
                  <Text style={styles.searchButtonText}>Search</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Debug Info - Show search status */}
            {searchError !== '' && (
              <View style={styles.debugBox}>
                <Text style={styles.debugText}>Debug: {searchError}</Text>
              </View>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && (
              <View style={styles.searchResultsContainer}>
                <Text style={styles.searchResultsTitle}>
                  Results ({searchResults.length})
                </Text>
                {searchResults.map((item) => (
                  <TouchableOpacity 
                    key={item.id}
                    style={styles.searchResult}
                    onPress={() => openCardDetail(item)}
                  >
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={styles.searchResultImage} />
                    ) : (
                      <View style={styles.searchResultImagePlaceholder}>
                        <Ionicons name="image-outline" size={24} color="#9CA3AF" />
                      </View>
                    )}
                    <View style={styles.searchResultInfo}>
                      <Text style={styles.searchResultName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.searchResultSet} numberOfLines={1}>
                        {item.set_name} ({item.set_code}) #{item.collector_number}
                      </Text>
                      {item.price && item.price !== 'N/A' && (
                        <Text style={styles.searchResultPrice}>{item.price}</Text>
                      )}
                      {item.rarity && (
                        <Text style={styles.searchResultRarity}>{item.rarity}</Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* MTG Grouped Results with Edition Picker */}
            {mtgCardGroups.length > 0 && (
              <View style={styles.searchResultsContainer}>
                <Text style={styles.searchResultsTitle}>
                  Cards Found ({mtgCardGroups.length})
                </Text>
                {mtgCardGroups.map((group, groupIndex) => {
                  const selectedCard = group.editions[group.selectedEdition];
                  return (
                    <View key={group.name} style={styles.mtgCardGroup}>
                      {/* Card Image and Info */}
                      <TouchableOpacity 
                        style={styles.searchResult}
                        onPress={() => openCardDetail(selectedCard)}
                      >
                        {selectedCard.image ? (
                          <Image source={{ uri: selectedCard.image }} style={styles.searchResultImage} />
                        ) : (
                          <View style={styles.searchResultImagePlaceholder}>
                            <Ionicons name="image-outline" size={24} color="#9CA3AF" />
                          </View>
                        )}
                        <View style={styles.searchResultInfo}>
                          <Text style={styles.searchResultName} numberOfLines={1}>{selectedCard.name}</Text>
                          <Text style={styles.searchResultSet} numberOfLines={1}>
                            {selectedCard.set_name} #{selectedCard.collector_number}
                          </Text>
                          {selectedCard.price && selectedCard.price !== 'N/A' && (
                            <Text style={styles.searchResultPrice}>{selectedCard.price}</Text>
                          )}
                          {selectedCard.rarity && (
                            <Text style={styles.searchResultRarity}>{selectedCard.rarity}</Text>
                          )}
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                      </TouchableOpacity>
                      
                      {/* Edition Picker - only show if multiple editions */}
                      {group.editions.length > 1 && (
                        <View style={styles.editionPickerContainer}>
                          <Text style={styles.editionLabel}>
                            Edition ({group.editions.length} available):
                          </Text>
                          <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false}
                            style={styles.editionScroll}
                          >
                            {group.editions.map((edition, edIndex) => (
                              <TouchableOpacity
                                key={edition.id}
                                style={[
                                  styles.editionChip,
                                  group.selectedEdition === edIndex && styles.editionChipActive
                                ]}
                                onPress={() => {
                                  const newGroups = [...mtgCardGroups];
                                  newGroups[groupIndex].selectedEdition = edIndex;
                                  setMtgCardGroups(newGroups);
                                }}
                              >
                                <Text 
                                  style={[
                                    styles.editionChipText,
                                    group.selectedEdition === edIndex && styles.editionChipTextActive
                                  ]}
                                  numberOfLines={1}
                                >
                                  {edition.set_code} #{edition.collector_number}
                                </Text>
                                {edition.price && edition.price !== 'N/A' && (
                                  <Text style={styles.editionChipPrice}>{edition.price}</Text>
                                )}
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Card Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowDetailModal(false)}>
              <Ionicons name="arrow-back" size={28} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add to Collection</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedCard && (
              <>
                {/* Card Preview */}
                <View style={styles.cardPreviewContainer}>
                  {selectedCard.image && (
                    <Image 
                      source={{ uri: selectedCard.image }} 
                      style={styles.cardPreviewImage}
                      resizeMode="contain"
                    />
                  )}
                </View>

                <View style={styles.cardPreviewInfo}>
                  <Text style={styles.cardPreviewName}>{selectedCard.name}</Text>
                  <Text style={styles.cardPreviewSet}>
                    {selectedCard.set_name} ({selectedCard.set_code}) #{selectedCard.collector_number}
                  </Text>
                  {selectedCard.game === 'mtg' && selectedCard.price && selectedCard.price !== 'N/A' && (
                    <Text style={styles.cardPreviewPrice}>Market Price: ${selectedCard.price}</Text>
                  )}
                </View>

                {/* Quantity */}
                <Text style={styles.inputLabel}>Quantity</Text>
                <TextInput
                  style={styles.input}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="number-pad"
                  placeholder="1"
                />

                {/* Condition */}
                <Text style={styles.inputLabel}>Condition</Text>
                <View style={styles.optionRow}>
                  {['Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played'].map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.optionButton, condition === c && styles.optionButtonActive]}
                      onPress={() => setCondition(c)}
                    >
                      <Text style={[styles.optionText, condition === c && styles.optionTextActive]}>
                        {c.replace(' ', '\n')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Finish (different options for Magic vs Pokemon) */}
                <Text style={styles.inputLabel}>Finish / Variant</Text>
                <View style={styles.optionRow}>
                  {(selectedCard.game === 'mtg' ? getMagicFinishes() : getPokemonFinishes()).map((f) => (
                    <TouchableOpacity
                      key={f}
                      style={[styles.optionButton, finish === f && styles.optionButtonActive]}
                      onPress={() => setFinish(f)}
                    >
                      <Text style={[styles.optionText, finish === f && styles.optionTextActive]}>
                        {f}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Magic-specific: Signed */}
                {selectedCard.game === 'mtg' && (
                  <>
                    <Text style={styles.inputLabel}>Special</Text>
                    <TouchableOpacity
                      style={[styles.checkboxRow, isSigned && styles.checkboxRowActive]}
                      onPress={() => setIsSigned(!isSigned)}
                    >
                      <Ionicons 
                        name={isSigned ? "checkbox" : "square-outline"} 
                        size={24} 
                        color={isSigned ? "#3B82F6" : "#9CA3AF"} 
                      />
                      <Text style={styles.checkboxText}>Signed by Artist</Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* Grading */}
                <Text style={styles.inputLabel}>Grading</Text>
                <TouchableOpacity
                  style={[styles.checkboxRow, isGraded && styles.checkboxRowActive]}
                  onPress={() => setIsGraded(!isGraded)}
                >
                  <Ionicons 
                    name={isGraded ? "checkbox" : "square-outline"} 
                    size={24} 
                    color={isGraded ? "#3B82F6" : "#9CA3AF"} 
                  />
                  <Text style={styles.checkboxText}>Graded Card</Text>
                </TouchableOpacity>

                {isGraded && (
                  <View style={styles.gradingSection}>
                    <View style={styles.gradingRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabelSmall}>Company</Text>
                        <View style={styles.gradingOptions}>
                          {['PSA', 'BGS', 'CGC'].map((company) => (
                            <TouchableOpacity
                              key={company}
                              style={[styles.gradingButton, gradingCompany === company && styles.gradingButtonActive]}
                              onPress={() => setGradingCompany(company)}
                            >
                              <Text style={[styles.gradingButtonText, gradingCompany === company && styles.gradingButtonTextActive]}>
                                {company}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabelSmall}>Grade</Text>
                        <TextInput
                          style={styles.gradeInput}
                          value={gradeValue}
                          onChangeText={setGradeValue}
                          placeholder="10"
                          keyboardType="decimal-pad"
                        />
                      </View>
                    </View>
                  </View>
                )}

                {/* Add Button */}
                <TouchableOpacity
                  style={[styles.addToCollectionButton, adding && styles.buttonDisabled]}
                  onPress={addCardToCollection}
                  disabled={adding}
                >
                  {adding ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="add-circle" size={20} color="#fff" />
                      <Text style={styles.addToCollectionText}>Add to Collection</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        visible={showCsvModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCsvModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Import from CSV</Text>
            <TouchableOpacity onPress={() => setShowCsvModal(false)}>
              <Ionicons name="close" size={28} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.csvInstructions}>
              Paste your card list below. Supported formats:
            </Text>
            <View style={styles.csvFormatExamples}>
              <Text style={styles.csvFormatLine}>• set_code, collector_number, quantity</Text>
              <Text style={styles.csvFormatLine}>• sv09, 123, 2</Text>
              <Text style={styles.csvFormatLine}>• NEO 45 4</Text>
            </View>

            {/* Game Selector */}
            <Text style={styles.inputLabel}>Card Game</Text>
            <View style={styles.gameSelector}>
              <TouchableOpacity
                style={[styles.gameButton, csvGame === 'mtg' && styles.gameButtonActive]}
                onPress={() => setCsvGame('mtg')}
              >
                <Text style={[styles.gameButtonText, csvGame === 'mtg' && styles.gameButtonTextActive]}>
                  Magic
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.gameButton, csvGame === 'pokemon' && styles.gameButtonActive]}
                onPress={() => setCsvGame('pokemon')}
              >
                <Text style={[styles.gameButtonText, csvGame === 'pokemon' && styles.gameButtonTextActive]}>
                  Pokémon
                </Text>
              </TouchableOpacity>
            </View>

            {/* CSV Input */}
            <Text style={styles.inputLabel}>Card List</Text>
            
            {/* File picker button */}
            <TouchableOpacity 
              style={styles.filePickerButton}
              onPress={pickCsvFile}
              data-testid="csv-file-picker-btn"
            >
              <Ionicons name="document-outline" size={20} color="#3B82F6" />
              <Text style={styles.filePickerButtonText}>Choose CSV File</Text>
            </TouchableOpacity>
            
            <Text style={styles.orDivider}>OR paste text below</Text>
            
            <TextInput
              style={styles.csvInput}
              placeholder="sv09, 001, 1&#10;sv09, 002, 2&#10;NEO, 45, 4"
              value={csvText}
              onChangeText={setCsvText}
              multiline
              numberOfLines={10}
              textAlignVertical="top"
              data-testid="csv-text-input"
            />

            {/* Import Progress */}
            {importing && (
              <View style={styles.importProgress}>
                <Text style={styles.importProgressText}>
                  Importing... {importProgress.current}/{importProgress.total}
                </Text>
                <View style={styles.importProgressBar}>
                  <View 
                    style={[
                      styles.importProgressFill, 
                      { width: `${(importProgress.current / importProgress.total) * 100}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.importStats}>
                  ✅ {importProgress.success} added | ❌ {importProgress.failed} failed
                </Text>
              </View>
            )}

            {/* Import Log */}
            {importLog.length > 0 && (
              <View style={styles.importLog}>
                <Text style={styles.importLogTitle}>Import Log:</Text>
                <ScrollView style={styles.importLogScroll} nestedScrollEnabled>
                  {importLog.map((log, idx) => (
                    <Text key={idx} style={styles.importLogLine}>{log}</Text>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Import Button */}
            <TouchableOpacity
              style={[styles.importButton, (importing || !csvText.trim()) && styles.importButtonDisabled]}
              onPress={importFromCSV}
              disabled={importing || !csvText.trim()}
              data-testid="csv-import-submit"
            >
              {importing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                  <Text style={styles.importButtonText}>Import Cards</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  addButton: {
    backgroundColor: '#3B82F6',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  csvButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  // Selection Mode Styles
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
  },
  selectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectionButtonText: {
    fontSize: 13,
    color: '#3B82F6',
  },
  selectionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  checkboxContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  bulkActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  bulkDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  bulkDeleteText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  bulkCancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  bulkCancelText: {
    color: '#6B7280',
    fontSize: 14,
  },
  filters: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  filterActive: {
    backgroundColor: '#3B82F6',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  filterTextActive: {
    color: '#fff',
  },
  list: {
    padding: 8,
  },
  card: {
    width: CARD_WIDTH,
    margin: 4,
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardImage: {
    width: '100%',
    height: CARD_WIDTH * 1.4,
    backgroundColor: '#F3F4F6',
  },
  cardImageWrapper: {
    position: 'relative',
  },
  cardPlaceholder: {
    width: '100%',
    height: CARD_WIDTH * 1.4,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foilOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  holoOverlay: {
    backgroundColor: 'rgba(147, 197, 253, 0.2)',
    borderColor: 'rgba(59, 130, 246, 0.5)',
  },
  pokeballOverlay: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  masterballOverlay: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  finishBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  pokeballBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
  },
  masterballBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.9)',
  },
  finishBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardInfo: {
    padding: 8,
  },
  cardName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  setInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  setCode: {
    fontSize: 10,
    fontWeight: '600',
    color: '#3B82F6',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  collectorNum: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  cardMeta: {
    fontSize: 10,
    color: '#6B7280',
  },
  cardQuantity: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  cardCondition: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  cardFinish: {
    fontSize: 10,
    color: '#8B5CF6',
    fontWeight: '500',
    marginTop: 2,
  },
  pokeballText: {
    color: '#EF4444',
  },
  masterballText: {
    color: '#8B5CF6',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  addFirstButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    margin: 16,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    color: '#DC2626',
    textAlign: 'center',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalMenuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
    textAlign: 'center',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  gameSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  gameButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  gameButtonActive: {
    backgroundColor: '#3B82F6',
  },
  gameButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  gameButtonTextActive: {
    color: '#fff',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
  },
  inputLabelSmall: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  searchInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  setSearchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 14,
    gap: 8,
    marginTop: 8,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  searchResultsContainer: {
    marginTop: 16,
  },
  searchResultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 8,
  },
  searchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  searchResultImage: {
    width: 50,
    height: 70,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  debugBox: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  debugText: {
    fontSize: 12,
    color: '#92400E',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  searchResultImagePlaceholder: {
    width: 50,
    height: 70,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  searchResultName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  searchResultSet: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  searchResultPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    marginTop: 2,
  },
  searchResultRarity: {
    fontSize: 10,
    color: '#8B5CF6',
    textTransform: 'capitalize',
  },
  // MTG Edition Picker
  mtgCardGroup: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
  },
  editionPickerContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: '#F9FAFB',
  },
  editionLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 8,
  },
  editionScroll: {
    flexGrow: 0,
  },
  editionChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 16,
    marginRight: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  editionChipActive: {
    backgroundColor: '#3B82F6',
  },
  editionChipText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#4B5563',
  },
  editionChipTextActive: {
    color: '#FFFFFF',
  },
  editionChipPrice: {
    fontSize: 9,
    color: '#059669',
    marginTop: 2,
  },
  // Card Detail Modal
  cardPreviewContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
    marginTop: 2,
  },
  detailImageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  detailImage: {
    width: 200,
    height: 280,
    borderRadius: 8,
  },
  detailImagePlaceholder: {
    width: 200,
    height: 280,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailInfo: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  detailName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  detailPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: '#059669',
    textAlign: 'center',
    marginBottom: 12,
  },
  detailMeta: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 4,
  },
  editSection: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  editTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  editRow: {
    marginBottom: 16,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityInput: {
    width: 60,
    height: 40,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  finishOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  finishOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  finishOptionActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  finishOptionText: {
    fontSize: 12,
    color: '#374151',
  },
  finishOptionTextActive: {
    color: '#fff',
  },
  detailActions: {
    paddingHorizontal: 16,
    marginBottom: 40,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cardPreviewImage: {
    width: 200,
    height: 280,
    borderRadius: 8,
  },
  cardPreviewInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  cardPreviewName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
  },
  cardPreviewSet: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  cardPreviewPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    marginTop: 8,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 70,
    alignItems: 'center',
  },
  optionButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  optionText: {
    fontSize: 11,
    color: '#4B5563',
    textAlign: 'center',
  },
  optionTextActive: {
    color: '#fff',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    gap: 10,
  },
  checkboxRowActive: {
    backgroundColor: '#DBEAFE',
  },
  checkboxText: {
    fontSize: 14,
    color: '#374151',
  },
  gradingSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  gradingRow: {
    flexDirection: 'row',
    gap: 16,
  },
  gradingOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  gradingButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  gradingButtonActive: {
    backgroundColor: '#3B82F6',
  },
  gradingButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4B5563',
  },
  gradingButtonTextActive: {
    color: '#fff',
  },
  gradeInput: {
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    width: 80,
  },
  addToCollectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 24,
    marginBottom: 40,
    gap: 8,
  },
  addToCollectionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  mtgColor: {
    color: '#7C3AED',
  },
  pokemonColor: {
    color: '#F59E0B',
  },
  // CSV Import Styles
  csvInstructions: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  csvFormatExamples: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  csvFormatLine: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
  },
  csvInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    minHeight: 200,
    marginBottom: 16,
  },
  importProgress: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  importProgressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  importProgressBar: {
    height: 8,
    backgroundColor: '#DBEAFE',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  importProgressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  importStats: {
    fontSize: 13,
    color: '#374151',
  },
  importLog: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    maxHeight: 200,
  },
  importLogTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  importLogScroll: {
    maxHeight: 160,
  },
  importLogLine: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#374151',
    marginBottom: 4,
  },
  importButton: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  importButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  importButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  filePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  filePickerButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  orDivider: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 12,
  },
});
