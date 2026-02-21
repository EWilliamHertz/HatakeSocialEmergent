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
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';

interface Listing {
  id: number;
  listing_id: string;
  card_id: string;
  card_data: any;
  game: string;
  price: number;
  condition: string;
  seller_name?: string;
  seller_picture?: string;
  user_id?: string;
  foil?: boolean;
  quantity?: number;
  created_at?: string;
}

interface ShopProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  image: string;
  gallery_images?: string[];
  features: string[];
  category: string;
  stock: number;
}

interface MarketplaceScreenProps {
  user: any;
  token: string;
  onOpenMenu?: () => void;
}

export default function MarketplaceScreen({ user, token, onOpenMenu }: MarketplaceScreenProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'mtg' | 'pokemon' | 'mine'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchListings();
  }, [filter]);

  const fetchListings = async () => {
    setError('');
    try {
      const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : token;
      
      let url = `${API_URL}/api/marketplace`;
      if (filter === 'mine') {
        url = `${API_URL}/api/marketplace/my-listings`;
      } else if (filter !== 'all') {
        url = `${API_URL}/api/marketplace?game=${filter}`;
      }
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${authToken}` },
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

  const handleDeleteListing = async (listingId: string) => {
    const confirmDelete = () => {
      if (Platform.OS === 'web') {
        return window.confirm('Are you sure you want to delete this listing?');
      }
      return new Promise<boolean>((resolve) => {
        Alert.alert(
          'Delete Listing',
          'Are you sure you want to delete this listing?',
          [
            { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
            { text: 'Delete', onPress: () => resolve(true), style: 'destructive' },
          ]
        );
      });
    };

    const confirmed = await confirmDelete();
    if (!confirmed) return;

    setDeletingId(listingId);
    try {
      const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : token;
      const response = await fetch(`${API_URL}/api/marketplace/${listingId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await response.json();
      
      if (data.success) {
        setListings(prev => prev.filter(l => l.listing_id !== listingId));
      } else {
        const errorMsg = data.error || 'Failed to delete listing';
        if (Platform.OS === 'web') {
          alert(errorMsg);
        } else {
          Alert.alert('Error', errorMsg);
        }
      }
    } catch (err: any) {
      console.error('Delete error:', err);
      const errorMsg = err.message || 'Failed to delete listing';
      if (Platform.OS === 'web') {
        alert(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
    }
    setDeletingId(null);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchListings();
  };

  const getCardImage = (listing: Listing) => {
    try {
      if (!listing.card_data) return null;
      if (listing.game === 'mtg') {
        return listing.card_data?.image_uris?.small || 
               listing.card_data?.image_uris?.normal ||
               listing.card_data?.card_faces?.[0]?.image_uris?.small;
      } else {
        // TCGdex stores image as a direct URL string
        const imageUrl = listing.card_data?.image;
        if (imageUrl) {
          if (imageUrl.includes('.png') || imageUrl.includes('.webp') || imageUrl.includes('.jpg')) {
            return imageUrl;
          }
          return `${imageUrl}/high.webp`;
        }
        return listing.card_data?.images?.small || listing.card_data?.images?.large;
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

  const getSetInfo = (listing: Listing) => {
    try {
      if (listing.game === 'mtg') {
        const set = listing.card_data?.set_name || '';
        const num = listing.card_data?.collector_number || '';
        return set ? `${set} #${num}` : '';
      } else {
        const set = listing.card_data?.set?.name || '';
        const num = listing.card_data?.localId || listing.card_id?.split('-')[1] || '';
        return set ? `${set} #${num}` : '';
      }
    } catch {
      return '';
    }
  };

  const formatPrice = (price: any) => {
    try {
      const num = parseFloat(price);
      return isNaN(num) ? '€0.00' : `€${num.toFixed(2)}`;
    } catch {
      return '€0.00';
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString();
    } catch {
      return '';
    }
  };

  const renderItem = ({ item }: { item: Listing }) => {
    const imageUrl = getCardImage(item);
    const isOwner = item.user_id === user?.user_id;
    const isDeleting = deletingId === item.listing_id;
    
    return (
      <TouchableOpacity style={styles.card} data-testid={`listing-${item.listing_id}`}>
        <View style={styles.cardImageContainer}>
          {imageUrl ? (
            <Image 
              source={{ uri: imageUrl }} 
              style={styles.cardImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.cardPlaceholder}>
              <Ionicons name="image-outline" size={30} color="#9CA3AF" />
            </View>
          )}
          {item.foil && (
            <View style={styles.foilBadge}>
              <Text style={styles.foilText}>Foil</Text>
            </View>
          )}
          {isOwner && (
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => handleDeleteListing(item.listing_id)}
              disabled={isDeleting}
              data-testid={`delete-listing-${item.listing_id}`}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="trash" size={14} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>
            {getCardName(item)}
          </Text>
          <Text style={styles.cardSet} numberOfLines={1}>
            {getSetInfo(item)}
          </Text>
          <Text style={styles.price}>{formatPrice(item.price)}</Text>
          <Text style={styles.condition}>
            {item.condition || 'NM'} • {item.game === 'mtg' ? 'Magic' : 'Pokémon'}
          </Text>
          
          <View style={styles.sellerRow}>
            {item.seller_picture ? (
              <Image source={{ uri: item.seller_picture }} style={styles.sellerAvatar} />
            ) : (
              <View style={styles.sellerAvatarPlaceholder}>
                <Ionicons name="person" size={10} color="#9CA3AF" />
              </View>
            )}
            <Text style={styles.sellerName} numberOfLines={1}>
              {isOwner ? 'You' : (item.seller_name || 'Seller')}
            </Text>
          </View>
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
        <View style={styles.headerRow}>
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={onOpenMenu}
          >
            <Ionicons name="menu" size={26} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Marketplace</Text>
            <Text style={styles.subtitle}>{listings.length} listings</Text>
          </View>
          <View style={styles.menuButton} />
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContent}>
          {(['all', 'mine', 'mtg', 'pokemon'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterButton, filter === f && styles.filterActive]}
              onPress={() => setFilter(f)}
              data-testid={`filter-${f}`}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === 'all' ? 'All' : f === 'mine' ? 'My Listings' : f === 'mtg' ? 'Magic' : 'Pokémon'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
  headerRow: {
    flexDirection: 'row',
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
  filters: {
    paddingVertical: 8,
  },
  filtersContent: {
    flexDirection: 'row',
    paddingHorizontal: 12,
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
    padding: 6,
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
  cardImageContainer: {
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: 100,
    backgroundColor: '#F3F4F6',
  },
  cardPlaceholder: {
    width: '100%',
    height: 100,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foilBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  foilText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
  },
  deleteButton: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#EF4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    padding: 8,
  },
  cardName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1F2937',
  },
  cardSet: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 1,
  },
  price: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#059669',
    marginTop: 4,
  },
  condition: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 2,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  sellerAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 4,
  },
  sellerAvatarPlaceholder: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  sellerName: {
    fontSize: 9,
    color: '#6B7280',
    flex: 1,
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
