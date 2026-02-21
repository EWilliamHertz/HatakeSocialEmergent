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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const API_URL = 'https://www.hatake.eu';

interface Listing {
  listing_id: string;
  card_data: any;
  game: string;
  price: number;
  condition: string;
  seller_name: string;
}

interface MarketplaceScreenProps {
  user: any;
  token: string;
}

export default function MarketplaceScreen({ user, token }: MarketplaceScreenProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      const response = await fetch(`${API_URL}/api/marketplace`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      
      if (data.success) {
        setListings(data.listings || []);
      }
    } catch (err) {
      console.error('Failed to fetch listings:', err);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchListings();
  };

  const getCardImage = (listing: Listing) => {
    if (listing.game === 'mtg') {
      return listing.card_data?.image_uris?.normal || listing.card_data?.image_uris?.small;
    } else {
      return listing.card_data?.images?.large || listing.card_data?.images?.small;
    }
  };

  const renderItem = ({ item }: { item: Listing }) => (
    <TouchableOpacity style={styles.card}>
      {getCardImage(item) ? (
        <Image source={{ uri: getCardImage(item) }} style={styles.cardImage} />
      ) : (
        <View style={styles.cardPlaceholder}>
          <Ionicons name="image-outline" size={40} color="#9CA3AF" />
        </View>
      )}
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={2}>
          {item.card_data?.name || 'Unknown Card'}
        </Text>
        <Text style={styles.price}>${item.price?.toFixed(2)}</Text>
        <Text style={styles.seller}>Seller: {item.seller_name}</Text>
        <Text style={styles.condition}>{item.condition} • {item.game.toUpperCase()}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading marketplace...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Marketplace</Text>
        <Text style={styles.subtitle}>{listings.length} listings available</Text>
      </View>

      {listings.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="storefront-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyText}>No listings available</Text>
          <Text style={styles.emptySubtext}>
            Check back later or list your own cards
          </Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          renderItem={renderItem}
          keyExtractor={(item) => item.listing_id}
          numColumns={2}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  price: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#059669',
    marginTop: 4,
  },
  seller: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  condition: {
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
});
