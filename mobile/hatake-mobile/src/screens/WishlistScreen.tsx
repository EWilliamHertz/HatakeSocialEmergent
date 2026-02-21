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
  Alert,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';

interface Wishlist {
  wishlist_id: string;
  name: string;
  description?: string;
  is_public: boolean;
  item_count: number;
  created_at: string;
}

interface WishlistItem {
  item_id: string;
  card_id: string;
  card_data: any;
  game: string;
  quantity: number;
  priority: string;
  notes?: string;
  created_at: string;
}

interface WishlistScreenProps {
  user: any;
  token: string;
  onClose: () => void;
}

export default function WishlistScreen({ user, token, onClose }: WishlistScreenProps) {
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [selectedWishlist, setSelectedWishlist] = useState<Wishlist | null>(null);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Create wishlist modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWishlistName, setNewWishlistName] = useState('');
  const [newWishlistDesc, setNewWishlistDesc] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchWishlists();
  }, []);

  const getAuthToken = () => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('auth_token') || token;
    }
    return token;
  };

  const fetchWishlists = async () => {
    try {
      const authToken = getAuthToken();
      const res = await fetch(`${API_URL}/api/wishlists`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setWishlists(data.wishlists || []);
      }
    } catch (err) {
      console.error('Failed to fetch wishlists:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchWishlistItems = async (wishlistId: string) => {
    try {
      const authToken = getAuthToken();
      const res = await fetch(`${API_URL}/api/wishlists/${wishlistId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success && data.wishlist) {
        setWishlistItems(data.wishlist.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch wishlist items:', err);
    }
  };

  const createWishlist = async () => {
    if (!newWishlistName.trim()) {
      showAlert('Error', 'Please enter a wishlist name');
      return;
    }
    
    setCreating(true);
    try {
      const authToken = getAuthToken();
      const res = await fetch(`${API_URL}/api/wishlists`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newWishlistName.trim(),
          description: newWishlistDesc.trim() || null,
          isPublic: isPublic,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        showAlert('Success', 'Wishlist created!');
        setShowCreateModal(false);
        setNewWishlistName('');
        setNewWishlistDesc('');
        setIsPublic(false);
        fetchWishlists();
      } else {
        showAlert('Error', data.error || 'Failed to create wishlist');
      }
    } catch (err) {
      console.error('Create wishlist error:', err);
      showAlert('Error', 'Failed to create wishlist');
    } finally {
      setCreating(false);
    }
  };

  const deleteWishlist = async (wishlistId: string) => {
    const confirmed = await confirmAction('Delete Wishlist', 'Are you sure you want to delete this wishlist?');
    if (!confirmed) return;
    
    try {
      const authToken = getAuthToken();
      const res = await fetch(`${API_URL}/api/wishlists/${wishlistId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      
      const data = await res.json();
      
      if (data.success) {
        showAlert('Success', 'Wishlist deleted');
        if (selectedWishlist?.wishlist_id === wishlistId) {
          setSelectedWishlist(null);
        }
        fetchWishlists();
      } else {
        showAlert('Error', data.error || 'Failed to delete wishlist');
      }
    } catch (err) {
      console.error('Delete wishlist error:', err);
      showAlert('Error', 'Failed to delete wishlist');
    }
  };

  const removeItem = async (itemId: string) => {
    if (!selectedWishlist) return;
    
    try {
      const authToken = getAuthToken();
      // We need an endpoint to delete items - for now this is handled by the POST to wishlist
      // Since the API doesn't have a separate item delete, we'll need to use the main wishlist endpoint
      showAlert('Note', 'Item deletion is available on the web app');
    } catch (err) {
      console.error('Remove item error:', err);
    }
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const confirmAction = (title: string, message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (Platform.OS === 'web') {
        resolve(window.confirm(message));
      } else {
        Alert.alert(title, message, [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
        ]);
      }
    });
  };

  const getCardImage = (item: WishlistItem): string | null => {
    const data = item.card_data;
    if (!data) return null;
    
    if (item.game === 'mtg') {
      return data.image_uris?.normal || data.card_faces?.[0]?.image_uris?.normal;
    } else {
      const imageUrl = data.image;
      if (imageUrl) {
        return imageUrl.includes('.') ? imageUrl : `${imageUrl}/high.webp`;
      }
      return data.images?.large || data.images?.small;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'normal': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const renderWishlist = ({ item }: { item: Wishlist }) => (
    <TouchableOpacity
      style={styles.wishlistCard}
      onPress={() => {
        setSelectedWishlist(item);
        fetchWishlistItems(item.wishlist_id);
      }}
      data-testid={`wishlist-${item.wishlist_id}`}
    >
      <View style={styles.wishlistIcon}>
        <Ionicons name="heart" size={24} color="#3B82F6" />
      </View>
      <View style={styles.wishlistInfo}>
        <Text style={styles.wishlistName}>{item.name}</Text>
        {item.description && (
          <Text style={styles.wishlistDesc} numberOfLines={1}>{item.description}</Text>
        )}
        <View style={styles.wishlistMeta}>
          <Text style={styles.wishlistCount}>{item.item_count} cards</Text>
          {item.is_public && (
            <View style={styles.publicBadge}>
              <Ionicons name="globe-outline" size={12} color="#10B981" />
              <Text style={styles.publicText}>Public</Text>
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteWishlistBtn}
        onPress={() => deleteWishlist(item.wishlist_id)}
      >
        <Ionicons name="trash-outline" size={18} color="#EF4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: WishlistItem }) => {
    const image = getCardImage(item);
    const name = item.card_data?.name || 'Unknown Card';
    
    return (
      <View style={styles.itemCard} data-testid={`wishlist-item-${item.item_id}`}>
        {image ? (
          <Image source={{ uri: image }} style={styles.itemImage} resizeMode="contain" />
        ) : (
          <View style={styles.itemImagePlaceholder}>
            <Ionicons name="image-outline" size={24} color="#9CA3AF" />
          </View>
        )}
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={2}>{name}</Text>
          <Text style={styles.itemGame}>
            {item.game === 'mtg' ? 'Magic' : 'Pokémon'} • x{item.quantity}
          </Text>
          {item.notes && (
            <Text style={styles.itemNotes} numberOfLines={1}>{item.notes}</Text>
          )}
        </View>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + '20' }]}>
          <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
            {item.priority}
          </Text>
        </View>
      </View>
    );
  };

  // Wishlist Detail View
  if (selectedWishlist) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedWishlist(null)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{selectedWishlist.name}</Text>
            <Text style={styles.headerSubtitle}>{wishlistItems.length} cards</Text>
          </View>
          <View style={styles.backButton} />
        </View>

        <FlatList
          data={wishlistItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.item_id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={() => { setRefreshing(true); fetchWishlistItems(selectedWishlist.wishlist_id); }} 
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="heart-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Empty Wishlist</Text>
              <Text style={styles.emptySubtitle}>
                Add cards to this wishlist from the web app
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    );
  }

  // Wishlists List View
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Wishlists</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={wishlists}
          renderItem={renderWishlist}
          keyExtractor={(item) => item.wishlist_id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchWishlists(); }} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="heart-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Wishlists</Text>
              <Text style={styles.emptySubtitle}>
                Create a wishlist to track cards you want
              </Text>
              <TouchableOpacity
                style={styles.createFirstBtn}
                onPress={() => setShowCreateModal(true)}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.createFirstText}>Create Wishlist</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Create Wishlist Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Wishlist</Text>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Ionicons name="close" size={28} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.inputLabel}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="My Wishlist"
              value={newWishlistName}
              onChangeText={setNewWishlistName}
              maxLength={50}
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What cards are you looking for?"
              value={newWishlistDesc}
              onChangeText={setNewWishlistDesc}
              multiline
              numberOfLines={3}
              maxLength={200}
            />

            <TouchableOpacity
              style={styles.publicToggle}
              onPress={() => setIsPublic(!isPublic)}
            >
              <Ionicons 
                name={isPublic ? 'checkbox' : 'square-outline'} 
                size={24} 
                color={isPublic ? '#3B82F6' : '#9CA3AF'} 
              />
              <View style={styles.publicToggleInfo}>
                <Text style={styles.publicToggleTitle}>Make Public</Text>
                <Text style={styles.publicToggleDesc}>
                  Others can see this wishlist on your profile
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.createBtn, creating && styles.buttonDisabled]}
              onPress={createWishlist}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="heart" size={20} color="#FFFFFF" />
                  <Text style={styles.createBtnText}>Create Wishlist</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937', flex: 1, textAlign: 'center' },
  headerSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  addButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' },
  
  list: { padding: 16 },
  
  wishlistCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  wishlistIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  wishlistInfo: { flex: 1, marginLeft: 12 },
  wishlistName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  wishlistDesc: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  wishlistMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 10 },
  wishlistCount: { fontSize: 13, color: '#6B7280' },
  publicBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  publicText: { fontSize: 12, color: '#10B981' },
  deleteWishlistBtn: { padding: 8 },
  
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 10 },
  itemImage: { width: 50, height: 70, borderRadius: 6 },
  itemImagePlaceholder: { width: 50, height: 70, borderRadius: 6, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1, marginLeft: 12 },
  itemName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  itemGame: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  itemNotes: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic', marginTop: 4 },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  priorityText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#6B7280', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
  createFirstBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3B82F6', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, marginTop: 20, gap: 8 },
  createFirstText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  
  modalContainer: { flex: 1, backgroundColor: '#F9FAFB' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  modalContent: { padding: 20 },
  
  inputLabel: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 14, fontSize: 15, color: '#1F2937' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  
  publicToggle: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, marginTop: 20 },
  publicToggleInfo: { flex: 1, marginLeft: 12 },
  publicToggleTitle: { fontSize: 15, fontWeight: '500', color: '#1F2937' },
  publicToggleDesc: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3B82F6', borderRadius: 10, padding: 16, marginTop: 24, gap: 8 },
  createBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.6 },
});
