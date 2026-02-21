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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_URL, SCRYFALL_API, TCGDEX_API } from '../config';

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

// Map a set code from user input to TCGdex format
function mapPokemonSetCode(setCode: string): string {
  const code = setCode.toLowerCase().replace(/[^a-z0-9]/g, '');
  return POKEMON_SET_ALIASES[code] || code;
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

interface CollectionScreenProps {
  user: any;
  token: string;
  sessionCookie?: string;
}

export default function CollectionScreen({ user, token }: CollectionScreenProps) {
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

  useEffect(() => {
    fetchCollection();
  }, [filter]);

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
    
    try {
      if (searchGame === 'mtg') {
        // Magic: The Gathering search
        
        // Direct lookup by set and collector number (most precise)
        if (setCodeQuery.trim() && collectorNumQuery.trim()) {
          try {
            const response = await fetch(
              `${SCRYFALL_API}/cards/${setCodeQuery.toLowerCase().trim()}/${collectorNumQuery.trim()}`
            );
            if (response.ok) {
              const card = await response.json();
              // Prefer EUR prices for European users
              const eurPrice = card.prices?.eur;
              const usdPrice = card.prices?.usd;
              const displayPrice = eurPrice ? `€${parseFloat(eurPrice).toFixed(2)}` : 
                                   usdPrice ? `€${(parseFloat(usdPrice) * 0.92).toFixed(2)}` : 'N/A';
              setSearchResults([{
                id: card.id,
                name: card.name,
                image: card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || '',
                set_name: card.set_name,
                set_code: card.set.toUpperCase(),
                collector_number: card.collector_number,
                price: displayPrice,
                rarity: card.rarity,
                game: 'mtg',
                data: card,
              }]);
              setSearching(false);
              return;
            }
          } catch (e) {
            console.log('Direct lookup failed, trying search...');
          }
        }
        
        // Build search query - combine all provided fields
        const queryParts: string[] = [];
        if (searchQuery.trim()) {
          queryParts.push(`name:${searchQuery.trim()}`);
        }
        if (setCodeQuery.trim()) {
          queryParts.push(`set:${setCodeQuery.toLowerCase().trim()}`);
        }
        if (collectorNumQuery.trim()) {
          queryParts.push(`cn:${collectorNumQuery.trim()}`);
        }
        
        const query = queryParts.join(' ');
        
        if (!query) {
          // No search criteria provided - show error
          if (Platform.OS === 'web') {
            alert('Please enter a card name, set code, or collector number');
          } else {
            Alert.alert('Search', 'Please enter a card name, set code, or collector number');
          }
          setSearching(false);
          return;
        }
        
        console.log('MTG Search query:', query);
        const response = await fetch(
          `${SCRYFALL_API}/cards/search?q=${encodeURIComponent(query)}&unique=prints&order=released`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.data) {
            setSearchResults(data.data.slice(0, 50).map((card: any) => {
              // Prefer EUR prices for European users
              const eurPrice = card.prices?.eur;
              const usdPrice = card.prices?.usd;
              const displayPrice = eurPrice ? `€${parseFloat(eurPrice).toFixed(2)}` : 
                                   usdPrice ? `€${(parseFloat(usdPrice) * 0.92).toFixed(2)}` : 'N/A';
              return {
                id: card.id,
                name: card.name,
                image: card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || '',
                set_name: card.set_name,
                set_code: card.set.toUpperCase(),
                collector_number: card.collector_number,
                price: displayPrice,
                rarity: card.rarity,
                game: 'mtg' as const,
                data: card,
              };
            }));
          } else {
            console.log('No results found');
          }
        } else {
          const errorText = await response.text();
          console.log('Scryfall search failed:', errorText);
          // Scryfall returns 404 for no results, which is normal
          if (response.status !== 404) {
            if (Platform.OS === 'web') {
              alert('Search failed. Please try again.');
            } else {
              Alert.alert('Error', 'Search failed. Please try again.');
            }
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
          try {
            const cardId = `${mappedSetCode}-${collectorNumQuery.trim()}`;
            console.log(`Trying Pokemon direct lookup: ${cardId}`);
            const response = await fetch(`${TCGDEX_API}/cards/${cardId}`);
            if (response.ok) {
              const card = await response.json();
              if (card && card.id) {
                // Prefer European cardmarket prices
                const cmPrice = card.cardmarket?.prices?.averageSellPrice || card.cardmarket?.prices?.trendPrice;
                const displayPrice = cmPrice ? `€${cmPrice.toFixed(2)}` : 'N/A';
                
                setSearchResults([{
                  id: card.id,
                  name: card.name,
                  image: card.image ? `${card.image}/high.webp` : '',
                  set_name: card.set?.name || '',
                  set_code: card.set?.id?.toUpperCase() || mappedSetCode.toUpperCase(),
                  collector_number: card.localId || collectorNumQuery,
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
            console.log('Pokemon direct lookup failed, trying search...');
          }
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
            
            setSearchResults(results.slice(0, 50).map((card: any) => {
              const idParts = card.id?.split('-') || [];
              const setCode = idParts.length > 1 ? idParts.slice(0, -1).join('-').toUpperCase() : '';
              const collectorNum = card.localId || idParts[idParts.length - 1] || '';
              
              // Prefer European cardmarket prices
              const cmPrice = card.cardmarket?.prices?.averageSellPrice || card.cardmarket?.prices?.trendPrice;
              const displayPrice = cmPrice ? `€${cmPrice.toFixed(2)}` : 'N/A';
              
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
              
              setSearchResults(cards.slice(0, 50).map((card: any) => {
                const cmPrice = card.cardmarket?.prices?.averageSellPrice || card.cardmarket?.prices?.trendPrice;
                const displayPrice = cmPrice ? `€${cmPrice.toFixed(2)}` : 'N/A';
                
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
    } catch (err) {
      console.error('Search failed:', err);
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

  const renderItem = ({ item }: { item: CollectionItem }) => {
    const imageUrl = getCardImage(item);
    
    return (
      <TouchableOpacity style={styles.card}>
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
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={2}>
            {item.card_data?.name || 'Unknown Card'}
          </Text>
          <Text style={styles.cardMeta}>
            {item.game === 'mtg' ? 'Magic' : 'Pokémon'} • Qty: {item.quantity}
          </Text>
          <Text style={styles.cardCondition}>{item.condition}</Text>
          {item.finish && item.finish !== 'Normal' && (
            <Text style={styles.cardFinish}>{item.finish}</Text>
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
          <View>
            <Text style={styles.title}>My Collection</Text>
            <Text style={styles.subtitle}>{items.length} cards</Text>
          </View>
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
          numColumns={2}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {/* Search Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
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
                      {item.game === 'mtg' && item.price && item.price !== 'N/A' && (
                        <Text style={styles.searchResultPrice}>${item.price}</Text>
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
    width: '46%',
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
    height: 140,
    backgroundColor: '#F3F4F6',
  },
  cardPlaceholder: {
    width: '100%',
    height: 140,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    padding: 8,
  },
  cardName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  cardMeta: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  cardCondition: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  cardFinish: {
    fontSize: 10,
    color: '#8B5CF6',
    fontWeight: '500',
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
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
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
  // Card Detail Modal
  cardPreviewContainer: {
    alignItems: 'center',
    marginBottom: 16,
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
});
