import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SearchBar from '../components/SearchBar';
import CardItem from '../components/CardItem';
import GameFilter from '../components/GameFilter';
import { searchService, CardSearchResult } from '../services/search';
import { useStore } from '../store';

export default function SearchScreen({ navigation }: any) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CardSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState<'all' | 'mtg' | 'pokemon'>('mtg');
  const { addToCollection } = useStore();

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const searchResults = await searchService.searchCards(query, selectedGame === 'all' ? 'mtg' : selectedGame);
      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to search cards');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCollection = async (card: CardSearchResult) => {
    const result = await addToCollection({
      cardId: card.id,
      cardData: card,
      game: card.game,
      quantity: 1,
      condition: 'near_mint',
    });

    if (result.success) {
      Alert.alert('Success', `${card.name} added to collection!`);
    } else {
      Alert.alert('Error', result.error || 'Failed to add card');
    }
  };

  const renderItem = ({ item }: { item: CardSearchResult }) => (
    <View style={styles.cardContainer}>
      <CardItem
        card={item}
        onPress={() => navigation.navigate('CardDetail', { card: item })}
      />
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => handleAddToCollection(item)}
      >
        <Ionicons name="add-circle" size={32} color="#22C55E" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Search Cards</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search & Filter */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          onSubmit={handleSearch}
          placeholder="Search for cards..."
          autoFocus
        />
        <View style={styles.filterContainer}>
          <GameFilter 
            selected={selectedGame} 
            onSelect={(game) => {
              setSelectedGame(game);
              if (query) handleSearch();
            }} 
          />
        </View>
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.row}
          ListEmptyComponent={
            query ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyText}>No cards found</Text>
                <Text style={styles.emptySubtext}>
                  Try a different search term
                </Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="search" size={64} color="#D1D5DB" />
                <Text style={styles.emptyText}>Search for cards</Text>
                <Text style={styles.emptySubtext}>
                  Enter a card name to search
                </Text>
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterContainer: {
    marginTop: 12,
  },
  list: {
    padding: 16,
  },
  row: {
    justifyContent: 'space-between',
  },
  cardContainer: {
    width: '48%',
    position: 'relative',
  },
  addButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
    marginTop: 8,
  },
});
