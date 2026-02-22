import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';
import { useTheme } from '../context/ThemeContext';

interface CollectionItem {
  id: number;
  card_id: string;
  card_data: any;
  game: string;
  quantity: number;
}

interface Friend {
  user_id: string;
  name: string;
  picture?: string;
}

interface CreateTradeScreenProps {
  user: any;
  token: string;
  onClose: () => void;
  onTradeCreated?: () => void;
}

export default function CreateTradeScreen({ user, token, onClose, onTradeCreated }: CreateTradeScreenProps) {
  const { colors } = useTheme();
  // Steps: 1 = Select recipient, 2 = Select your cards, 3 = Review & send
  const [step, setStep] = useState(1);
  
  // Recipient
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<Friend | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [searching, setSearching] = useState(false);
  
  // Cards
  const [myCollection, setMyCollection] = useState<CollectionItem[]>([]);
  const [selectedCards, setSelectedCards] = useState<Set<number>>(new Set());
  const [loadingCollection, setLoadingCollection] = useState(false);
  
  // Trade details
  const [message, setMessage] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFriends();
  }, []);

  const getAuthToken = () => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('auth_token') || token;
    }
    return token;
  };

  const fetchFriends = async () => {
    try {
      const authToken = getAuthToken();
      const res = await fetch(`${API_URL}/api/friends`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setFriends(data.friends || []);
      }
    } catch (err) {
      console.error('Failed to fetch friends:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    
    try {
      const authToken = getAuthToken();
      const res = await fetch(`${API_URL}/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        // Filter out self
        setSearchResults((data.users || []).filter((u: Friend) => u.user_id !== user.user_id));
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const fetchCollection = async () => {
    setLoadingCollection(true);
    try {
      const authToken = getAuthToken();
      const res = await fetch(`${API_URL}/api/collection`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success || data.items) {
        setMyCollection(data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch collection:', err);
    } finally {
      setLoadingCollection(false);
    }
  };

  const selectRecipient = (recipient: Friend) => {
    setSelectedRecipient(recipient);
    setStep(2);
    fetchCollection();
  };

  const toggleCardSelection = (cardId: number) => {
    const newSet = new Set(selectedCards);
    if (newSet.has(cardId)) {
      newSet.delete(cardId);
    } else {
      newSet.add(cardId);
    }
    setSelectedCards(newSet);
  };

  const submitTrade = async () => {
    if (!selectedRecipient) {
      showAlert('Error', 'Please select a recipient');
      return;
    }
    
    if (selectedCards.size === 0) {
      showAlert('Error', 'Please select at least one card to offer');
      return;
    }

    setSubmitting(true);
    
    try {
      const authToken = getAuthToken();
      
      // Get selected card data
      const selectedCardData = myCollection
        .filter(c => selectedCards.has(c.id))
        .map(c => ({
          card_id: c.card_id,
          collection_item_id: c.id,
          name: c.card_data?.name,
          image: getCardImage(c),
          game: c.game,
        }));

      const res = await fetch(`${API_URL}/api/trades`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientId: selectedRecipient.user_id,
          initiatorItems: selectedCardData,
          recipientItems: [], // Mobile version only offers cards, doesn't request
          message: message.trim() || null,
          cash_requested: cashAmount ? parseFloat(cashAmount) : null,
          cash_currency: cashAmount ? 'EUR' : null,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        showAlert('Success', 'Trade offer sent!');
        onTradeCreated?.();
        onClose();
      } else {
        showAlert('Error', data.error || 'Failed to create trade');
      }
    } catch (err) {
      console.error('Submit trade error:', err);
      showAlert('Error', 'Failed to create trade');
    } finally {
      setSubmitting(false);
    }
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const getCardImage = (item: CollectionItem): string | null => {
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

  const renderFriend = ({ item }: { item: Friend }) => (
    <TouchableOpacity
      style={[styles.friendCard, { backgroundColor: colors.surface }]}
      onPress={() => selectRecipient(item)}
      data-testid={`friend-${item.user_id}`}
    >
      {item.picture ? (
        <Image source={{ uri: item.picture }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surfaceSecondary }]}>
          <Ionicons name="person" size={24} color={colors.textTertiary} />
        </View>
      )}
      <Text style={[styles.friendName, { color: colors.text }]}>{item.name}</Text>
      <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
    </TouchableOpacity>
  );

  const renderCollectionCard = ({ item }: { item: CollectionItem }) => {
    const image = getCardImage(item);
    const isSelected = selectedCards.has(item.id);
    
    return (
      <TouchableOpacity
        style={[styles.cardItem, { backgroundColor: colors.surface }, isSelected && { borderColor: colors.primary, backgroundColor: colors.surfaceSecondary }]}
        onPress={() => toggleCardSelection(item.id)}
      >
        {isSelected && (
          <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          </View>
        )}
        {image ? (
          <Image source={{ uri: image }} style={styles.cardImage} resizeMode="contain" />
        ) : (
          <View style={[styles.cardImagePlaceholder, { backgroundColor: colors.surfaceSecondary }]}>
            <Ionicons name="image-outline" size={20} color={colors.textTertiary} />
          </View>
        )}
        <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={2}>
          {item.card_data?.name || 'Unknown'}
        </Text>
      </TouchableOpacity>
    );
  };

  // Step 1: Select Recipient
  if (step === 1) {
    const displayList = searchQuery.trim() ? searchResults : friends;
    
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="close" size={24} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>New Trade</Text>
            <Text style={styles.stepIndicator}>Step 1 of 3</Text>
          </View>
          <View style={styles.backButton} />
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Who do you want to trade with?</Text>
          
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search users..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={searchUsers}
            />
            <TouchableOpacity style={styles.searchBtn} onPress={searchUsers}>
              {searching ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="search" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>

          {!searchQuery.trim() && friends.length > 0 && (
            <Text style={styles.listLabel}>Your Friends</Text>
          )}

          {loading ? (
            <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={displayList}
              renderItem={renderFriend}
              keyExtractor={(item) => item.user_id}
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Ionicons name="people-outline" size={48} color="#D1D5DB" />
                  <Text style={styles.emptyText}>
                    {searchQuery.trim() ? 'No users found' : 'No friends yet'}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Step 2: Select Cards
  if (step === 2) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep(1)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Select Cards</Text>
            <Text style={styles.stepIndicator}>Step 2 of 3</Text>
          </View>
          <TouchableOpacity 
            style={[styles.nextBtn, selectedCards.size === 0 && styles.nextBtnDisabled]}
            onPress={() => selectedCards.size > 0 && setStep(3)}
            disabled={selectedCards.size === 0}
          >
            <Text style={[styles.nextBtnText, selectedCards.size === 0 && styles.nextBtnTextDisabled]}>
              Next
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recipientBar}>
          <Text style={styles.recipientLabel}>Trading with:</Text>
          <View style={styles.recipientInfo}>
            {selectedRecipient?.picture ? (
              <Image source={{ uri: selectedRecipient.picture }} style={styles.recipientAvatar} />
            ) : (
              <View style={styles.recipientAvatarPlaceholder}>
                <Ionicons name="person" size={12} color="#9CA3AF" />
              </View>
            )}
            <Text style={styles.recipientName}>{selectedRecipient?.name}</Text>
          </View>
        </View>

        <View style={styles.selectionBar}>
          <Text style={styles.selectionCount}>{selectedCards.size} cards selected</Text>
          {selectedCards.size > 0 && (
            <TouchableOpacity onPress={() => setSelectedCards(new Set())}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {loadingCollection ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : (
          <FlatList
            data={myCollection}
            renderItem={renderCollectionCard}
            keyExtractor={(item) => String(item.id)}
            numColumns={3}
            contentContainerStyle={styles.cardGrid}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="albums-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>Your collection is empty</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    );
  }

  // Step 3: Review & Send
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setStep(2)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Review Trade</Text>
          <Text style={styles.stepIndicator}>Step 3 of 3</Text>
        </View>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.reviewContent}>
        <View style={styles.reviewSection}>
          <Text style={styles.reviewLabel}>Trading with</Text>
          <View style={styles.reviewRecipient}>
            {selectedRecipient?.picture ? (
              <Image source={{ uri: selectedRecipient.picture }} style={styles.reviewAvatar} />
            ) : (
              <View style={styles.reviewAvatarPlaceholder}>
                <Ionicons name="person" size={24} color="#9CA3AF" />
              </View>
            )}
            <Text style={styles.reviewName}>{selectedRecipient?.name}</Text>
          </View>
        </View>

        <View style={styles.reviewSection}>
          <Text style={styles.reviewLabel}>Cards you're offering ({selectedCards.size})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardsScroll}>
            {myCollection.filter(c => selectedCards.has(c.id)).map(card => {
              const image = getCardImage(card);
              return (
                <View key={card.id} style={styles.reviewCardItem}>
                  {image ? (
                    <Image source={{ uri: image }} style={styles.reviewCardImage} resizeMode="contain" />
                  ) : (
                    <View style={styles.reviewCardPlaceholder}>
                      <Ionicons name="image-outline" size={24} color="#9CA3AF" />
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.reviewSection}>
          <Text style={styles.reviewLabel}>Request additional cash (optional)</Text>
          <View style={styles.cashInputRow}>
            <Text style={styles.currencyLabel}>€</Text>
            <TextInput
              style={styles.cashInput}
              placeholder="0.00"
              value={cashAmount}
              onChangeText={setCashAmount}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={styles.reviewSection}>
          <Text style={styles.reviewLabel}>Message (optional)</Text>
          <TextInput
            style={styles.messageInput}
            placeholder="Add a message for the recipient..."
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={3}
            maxLength={500}
          />
        </View>

        <TouchableOpacity
          style={[styles.sendButton, submitting && styles.buttonDisabled]}
          onPress={submitTrade}
          disabled={submitting}
          data-testid="send-trade-btn"
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="paper-plane" size={20} color="#FFFFFF" />
              <Text style={styles.sendButtonText}>Send Trade Offer</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  stepIndicator: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  nextBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#3B82F6' },
  nextBtnDisabled: { backgroundColor: '#E5E7EB' },
  nextBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  nextBtnTextDisabled: { color: '#9CA3AF' },
  
  content: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 16 },
  
  searchRow: { flexDirection: 'row', marginBottom: 16 },
  searchInput: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  searchBtn: { width: 48, height: 48, borderRadius: 10, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  
  listLabel: { fontSize: 13, fontWeight: '500', color: '#6B7280', marginBottom: 10 },
  list: { paddingBottom: 20 },
  
  friendCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  friendName: { flex: 1, fontSize: 15, fontWeight: '500', color: '#1F2937', marginLeft: 12 },
  
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 15, color: '#9CA3AF', marginTop: 12 },
  
  recipientBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 10 },
  recipientLabel: { fontSize: 13, color: '#6B7280' },
  recipientInfo: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  recipientAvatar: { width: 24, height: 24, borderRadius: 12 },
  recipientAvatarPlaceholder: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  recipientName: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginLeft: 6 },
  
  selectionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  selectionCount: { fontSize: 14, fontWeight: '500', color: '#3B82F6' },
  clearText: { fontSize: 14, color: '#6B7280' },
  
  cardGrid: { padding: 8 },
  cardItem: { flex: 1/3, margin: 4, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 8, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  cardItemSelected: { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' },
  checkBadge: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  cardImage: { width: '100%', height: 100, borderRadius: 6 },
  cardImagePlaceholder: { width: '100%', height: 100, borderRadius: 6, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: 11, color: '#1F2937', marginTop: 6, textAlign: 'center' },
  
  reviewContent: { flex: 1, padding: 20 },
  reviewSection: { marginBottom: 24 },
  reviewLabel: { fontSize: 14, fontWeight: '500', color: '#6B7280', marginBottom: 10 },
  reviewRecipient: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14 },
  reviewAvatar: { width: 48, height: 48, borderRadius: 24 },
  reviewAvatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  reviewName: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginLeft: 12 },
  
  cardsScroll: { flexDirection: 'row' },
  reviewCardItem: { marginRight: 10 },
  reviewCardImage: { width: 80, height: 110, borderRadius: 8 },
  reviewCardPlaceholder: { width: 80, height: 110, borderRadius: 8, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  
  cashInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 14 },
  currencyLabel: { fontSize: 18, fontWeight: '600', color: '#1F2937', marginRight: 8 },
  cashInput: { flex: 1, paddingVertical: 14, fontSize: 18, color: '#1F2937' },
  
  messageInput: { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, fontSize: 15, color: '#1F2937', minHeight: 80, textAlignVertical: 'top' },
  
  sendButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10B981', borderRadius: 12, padding: 16, marginTop: 10, gap: 8 },
  sendButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.6 },
});
