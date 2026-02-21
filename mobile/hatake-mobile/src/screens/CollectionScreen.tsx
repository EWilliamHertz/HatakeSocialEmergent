import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import CardItem from '../components/CardItem';
import GameFilter from '../components/GameFilter';
import SearchBar from '../components/SearchBar';

export default function CollectionScreen({ navigation }: any) {
  const { collection, collectionLoading, fetchCollection, selectedGame, setSelectedGame } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCollection(selectedGame === 'all' ? undefined : selectedGame);
  }, [selectedGame]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCollection(selectedGame === 'all' ? undefined : selectedGame);
    setRefreshing(false);
  };

  const filteredCollection = collection.filter(item => 
    item.card_data?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate stats
  const totalCards = collection.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = collection.reduce((sum, item) => {
    const price = item.card_data?.prices?.usd || item.card_data?.price || 0;
    return sum + (parseFloat(price) * item.quantity);
  }, 0);

  const renderItem = ({ item }: { item: any }) => (
    <CardItem
      card={{
        ...item.card_data,
        game: item.game,
      }}
      quantity={item.quantity}
      onPress={() => navigation.navigate('CardDetail', { 
        card: item.card_data, 
        collectionItem: item 
      })}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Collection</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('Search')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalCards}</Text>
          <Text style={styles.statLabel}>Cards</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{collection.length}</Text>
          <Text style={styles.statLabel}>Unique</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, styles.valueGreen]}>
            ${totalValue.toFixed(2)}
          </Text>
          <Text style={styles.statLabel}>Value</Text>
        </View>
      </View>

      {/* Search & Filter */}
      <View style={styles.filterContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search collection..."
        />
        <View style={styles.gameFilterContainer}>
          <GameFilter selected={selectedGame} onSelect={setSelectedGame} />
        </View>
      </View>

      {/* Collection Grid */}
      <FlatList
        data={filteredCollection}
        renderItem={renderItem}
        keyExtractor={(item) => item.item_id}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="albums-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No cards in collection</Text>
            <Text style={styles.emptySubtext}>
              Search for cards to add them to your collection
            </Text>
          </View>
        }
      />
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  valueGreen: {
    color: '#22C55E',
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  gameFilterContainer: {
    marginTop: 12,
  },
  list: {
    padding: 16,
  },
  row: {
    justifyContent: 'space-between',
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
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  scanButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});
