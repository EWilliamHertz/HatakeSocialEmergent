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

const API_URL = 'https://www.hatake.eu';
const SCRYFALL_API = 'https://api.scryfall.com';
const TCGDEX_API = 'https://api.tcgdex.net/v2/en';

interface CollectionItem {
  id: number;
  item_id?: string;
  card_id: string;
  card_data: any;
  game: string;
  quantity: number;
  condition: string;
}

interface SearchResult {
  id: string;
  name: string;
  image: string;
  set_name: string;
  game: 'mtg' | 'pokemon';
  data: any;
}

interface CollectionScreenProps {
  user: any;
  token: string;
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
  const [searchGame, setSearchGame] = useState<'mtg' | 'pokemon'>('mtg');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCard, setSelectedCard] = useState<SearchResult | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [condition, setCondition] = useState('Near Mint');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchCollection();
  }, [filter]);

  const fetchCollection = async () => {
    setError('');
    try {
      const url = filter === 'all' 
        ? `${API_URL}/api/collection`
        : `${API_URL}/api/collection?game=${filter}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      
      if (data.success && Array.isArray(data.items)) {
        setItems(data.items);
      } else if (data.items) {
        setItems(data.items);
      } else {
        setItems([]);
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
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    setSearchResults([]);
    
    try {
      if (searchGame === 'mtg') {
        const response = await fetch(
          `${SCRYFALL_API}/cards/search?q=${encodeURIComponent(searchQuery)}&unique=prints`
        );
        const data = await response.json();
        
        if (data.data) {
          setSearchResults(data.data.slice(0, 20).map((card: any) => ({
            id: card.id,
            name: card.name,
            image: card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || '',
            set_name: card.set_name,
            game: 'mtg' as const,
            data: card,
          })));
        }
      } else {
        const response = await fetch(
          `${TCGDEX_API}/cards?name=${encodeURIComponent(searchQuery)}`
        );
        const data = await response.json();
        
        if (Array.isArray(data)) {
          setSearchResults(data.slice(0, 20).map((card: any) => ({
            id: card.id,
            name: card.name,
            image: card.image ? `${card.image}/high.webp` : '',
            set_name: card.set?.name || '',
            game: 'pokemon' as const,
            data: card,
          })));
        }
      }
    } catch (err) {
      console.error('Search failed:', err);
    }
    
    setSearching(false);
  };

  const addCardToCollection = async () => {
    if (!selectedCard) return;
    
    setAdding(true);
    
    try {
      const response = await fetch(`${API_URL}/api/collection`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          card_id: selectedCard.id,
          game: selectedCard.game,
          card_data: selectedCard.data,
          quantity: parseInt(quantity) || 1,
          condition: condition,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Close modal and refresh
        setShowAddModal(false);
        setSelectedCard(null);
        setSearchQuery('');
        setSearchResults([]);
        setQuantity('1');
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
        return item.card_data?.images?.large || item.card_data?.images?.small;
      }
    } catch {
      return null;
    }
  };

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
            {(item.game || '').toUpperCase()} • Qty: {item.quantity}
          </Text>
          <Text style={styles.cardCondition}>{item.condition}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity 
      style={[
        styles.searchResult,
        selectedCard?.id === item.id && styles.searchResultSelected
      ]}
      onPress={() => setSelectedCard(item)}
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
        <Text style={styles.searchResultSet} numberOfLines={1}>{item.set_name}</Text>
      </View>
      {selectedCard?.id === item.id && (
        <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
      )}
    </TouchableOpacity>
  );

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
      </View>

      <View style={styles.filters}>
        {(['all', 'mtg', 'pokemon'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.filterActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All' : f.toUpperCase()}
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

      {/* Add Card Modal */}
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
                onPress={() => { setSearchGame('mtg'); setSearchResults([]); setSelectedCard(null); }}
              >
                <Text style={[styles.gameButtonText, searchGame === 'mtg' && styles.gameButtonTextActive]}>
                  Magic: The Gathering
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.gameButton, searchGame === 'pokemon' && styles.gameButtonActive]}
                onPress={() => { setSearchGame('pokemon'); setSearchResults([]); setSelectedCard(null); }}
              >
                <Text style={[styles.gameButtonText, searchGame === 'pokemon' && styles.gameButtonTextActive]}>
                  Pokémon
                </Text>
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search for a card..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={searchCards}
                returnKeyType="search"
              />
              <TouchableOpacity 
                style={styles.searchButton}
                onPress={searchCards}
                disabled={searching}
              >
                {searching ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="search" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <View style={styles.searchResultsContainer}>
                <Text style={styles.searchResultsTitle}>
                  Select a card ({searchResults.length} results)
                </Text>
                {searchResults.map((item) => (
                  <TouchableOpacity 
                    key={item.id}
                    style={[
                      styles.searchResult,
                      selectedCard?.id === item.id && styles.searchResultSelected
                    ]}
                    onPress={() => setSelectedCard(item)}
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
                      <Text style={styles.searchResultSet} numberOfLines={1}>{item.set_name}</Text>
                    </View>
                    {selectedCard?.id === item.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Selected Card Details */}
            {selectedCard && (
              <View style={styles.selectedCardSection}>
                <Text style={styles.sectionTitle}>Card Details</Text>
                
                <View style={styles.selectedCardPreview}>
                  {selectedCard.image && (
                    <Image source={{ uri: selectedCard.image }} style={styles.selectedCardImage} />
                  )}
                  <View style={styles.selectedCardInfo}>
                    <Text style={styles.selectedCardName}>{selectedCard.name}</Text>
                    <Text style={styles.selectedCardSet}>{selectedCard.set_name}</Text>
                  </View>
                </View>

                <Text style={styles.inputLabel}>Quantity</Text>
                <TextInput
                  style={styles.input}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="number-pad"
                  placeholder="1"
                />

                <Text style={styles.inputLabel}>Condition</Text>
                <View style={styles.conditionSelector}>
                  {['Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played'].map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.conditionButton, condition === c && styles.conditionButtonActive]}
                      onPress={() => setCondition(c)}
                    >
                      <Text style={[styles.conditionText, condition === c && styles.conditionTextActive]}>
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

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
              </View>
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
    flex: 1,
    margin: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    maxWidth: '48%',
  },
  cardImage: {
    width: '100%',
    aspectRatio: 0.72,
    backgroundColor: '#F3F4F6',
  },
  cardPlaceholder: {
    width: '100%',
    aspectRatio: 0.72,
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
    fontSize: 20,
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
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  gameButtonTextActive: {
    color: '#fff',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#3B82F6',
    width: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultsContainer: {
    marginBottom: 16,
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
    padding: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  searchResultSelected: {
    backgroundColor: '#DBEAFE',
    borderWidth: 2,
    borderColor: '#3B82F6',
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
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  selectedCardSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  selectedCardPreview: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  selectedCardImage: {
    width: 80,
    height: 112,
    borderRadius: 6,
  },
  selectedCardInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  selectedCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  selectedCardSet: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  conditionSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  conditionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  conditionButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  conditionText: {
    fontSize: 12,
    color: '#4B5563',
  },
  conditionTextActive: {
    color: '#fff',
  },
  addToCollectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 20,
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
});
