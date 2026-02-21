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
  id: number;
  listing_id: string;
  card_data: any;
  game: string;
  price: number;
  condition: string;
  seller_name?: string;
  user_id?: string;
}

interface MarketplaceScreenProps {
  user: any;
  token: string;
}

export default function MarketplaceScreen({ user, token }: MarketplaceScreenProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    setError('');
    try {
      const response = await fetch(`${API_URL}/api/marketplace`, {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (data.success && Array.isArray(data.listings)) {
        setListings(data.listings);
      } else {
        setListings([]);
        if (data.error) {
          setError(data.error);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch listings:', err);
      setError('Failed to load marketplace: ' + (err.message || 'Unknown error'));
      setListings([]);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchListings();
  };

  const getCardImage = (listing: Listing) => {
    try {
      if (!listing.card_data) return null;
      if (listing.game === 'mtg') {
        return listing.card_data?.image_uris?.normal || 
               listing.card_data?.image_uris?.small ||
               listing.card_data?.card_faces?.[0]?.image_uris?.normal;
      } else {
        return listing.card_data?.images?.large || listing.card_data?.images?.small;
      }
    } catch {
      return null;
    }
  };

  const getCardName = (listing: Listing) => {
    try {
      return listing.card_data?.name || 'Unknown Card';
    } catch {
      return 'Unknown Card';
    }
  };

  const formatPrice = (price: any) => {
    try {
      const num = parseFloat(price);
      return isNaN(num) ? '$0.00' : `$${num.toFixed(2)}`;
    } catch {
      return '$0.00';
    }
  };

  const renderItem = ({ item }: { item: Listing }) => {
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
            {getCardName(item)}
          </Text>
          <Text style={styles.price}>{formatPrice(item.price)}</Text>
          <Text style={styles.condition}>
            {item.condition || 'NM'} • {(item.game || 'tcg').toUpperCase()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

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

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchListings}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {listings.length === 0 && !error ? (
        <View style={styles.centered}>
          <Ionicons name="storefront-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyText}>No listings available</Text>
          <Text style={styles.emptySubtext}>
            Check back later or list your own cards from the web app
          </Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id || item.listing_id)}
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
  price: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#059669',
    marginTop: 4,
  },
  condition: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
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
  errorBox: {
    backgroundColor: '#FEE2E2',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    color: '#DC2626',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#DC2626',
    borderRadius: 6,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
});
