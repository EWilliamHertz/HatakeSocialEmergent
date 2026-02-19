import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import GameFilter from '../components/GameFilter';
import SearchBar from '../components/SearchBar';

export default function MarketplaceScreen({ navigation }: any) {
  const { listings, marketplaceLoading, fetchListings, selectedGame, setSelectedGame } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchListings(selectedGame === 'all' ? undefined : selectedGame);
  }, [selectedGame]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchListings(selectedGame === 'all' ? undefined : selectedGame);
    setRefreshing(false);
  };

  const filteredListings = listings.filter(listing => 
    listing.card_data?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderItem = ({ item }: { item: any }) => {
    const imageUrl = item.card_data?.image_uris?.small || 
                     item.card_data?.image_uris?.normal || 
                     item.card_data?.images?.small || '';

    return (
      <TouchableOpacity 
        style={styles.listingCard}
        onPress={() => navigation.navigate('ListingDetail', { listing: item })}
      >
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name="image-outline" size={32} color="#D1D5DB" />
            </View>
          )}
          <View style={[styles.gameBadge, item.game === 'pokemon' ? styles.pokemonBadge : styles.mtgBadge]}>
            <Text style={styles.gameBadgeText}>
              {item.game === 'pokemon' ? 'PKM' : 'MTG'}
            </Text>
          </View>
          {item.foil && (
            <View style={styles.foilBadge}>
              <Ionicons name="sparkles" size={12} color="#fff" />
            </View>
          )}
        </View>
        
        <View style={styles.info}>
          <Text style={styles.cardName} numberOfLines={1}>{item.card_data?.name}</Text>
          <Text style={styles.condition}>{item.condition?.replace('_', ' ')}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>${parseFloat(item.price).toFixed(2)}</Text>
            <View style={styles.sellerInfo}>
              {item.picture ? (
                <Image source={{ uri: item.picture }} style={styles.sellerAvatar} />
              ) : (
                <View style={styles.sellerAvatarPlaceholder}>
                  <Text style={styles.sellerInitial}>{item.name?.[0] || '?'}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Marketplace</Text>
        <TouchableOpacity 
          style={styles.myListingsButton}
          onPress={() => navigation.navigate('MyListings')}
        >
          <Ionicons name="pricetag-outline" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {/* Search & Filter */}
      <View style={styles.filterContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search marketplace..."
        />
        <View style={styles.gameFilterContainer}>
          <GameFilter selected={selectedGame} onSelect={setSelectedGame} />
        </View>
      </View>

      {/* Listings */}
      <FlatList
        data={filteredListings}
        renderItem={renderItem}
        keyExtractor={(item) => item.listing_id}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="storefront-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No listings found</Text>
            <Text style={styles.emptySubtext}>
              Check back later for new items
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
  myListingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
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
  listingCard: {
    width: '48%',
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 0.72,
    backgroundColor: '#f0f0f0',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
  },
  gameBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pokemonBadge: {
    backgroundColor: '#FFCB05',
  },
  mtgBadge: {
    backgroundColor: '#9333EA',
  },
  gameBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  foilBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    padding: 4,
  },
  info: {
    padding: 12,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  condition: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'capitalize',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#22C55E',
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  sellerAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerInitial: {
    fontSize: 12,
    fontWeight: '600',
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
