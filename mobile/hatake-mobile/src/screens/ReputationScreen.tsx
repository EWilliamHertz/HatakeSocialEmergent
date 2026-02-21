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
  TextInput,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';

interface ReputationStats {
  averageRating: number;
  totalRatings: number;
  completedTrades: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

interface Rating {
  rating_id: string;
  trade_id: string;
  rating: number;
  comment: string;
  created_at: string;
  rater_name: string;
  rater_picture?: string;
}

interface ReputationScreenProps {
  user: any;
  token: string;
  onClose: () => void;
  viewUserId?: string; // Optional: view another user's reputation
}

export default function ReputationScreen({ user, token, onClose, viewUserId }: ReputationScreenProps) {
  const [stats, setStats] = useState<ReputationStats | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Rating modal state
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [pendingTrades, setPendingTrades] = useState<any[]>([]);
  const [selectedTrade, setSelectedTrade] = useState<any>(null);
  const [newRating, setNewRating] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const userId = viewUserId || user.user_id;
  const isOwnProfile = userId === user.user_id;

  useEffect(() => {
    fetchReputation();
    if (isOwnProfile) {
      fetchPendingRatings();
    }
  }, [userId]);

  const getAuthToken = () => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('auth_token') || token;
    }
    return token;
  };

  const fetchReputation = async () => {
    try {
      const authToken = getAuthToken();
      const res = await fetch(`${API_URL}/api/reputation?userId=${userId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setRatings(data.recentRatings || []);
      }
    } catch (err) {
      console.error('Failed to fetch reputation:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPendingRatings = async () => {
    try {
      const authToken = getAuthToken();
      const res = await fetch(`${API_URL}/api/trades`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        // Filter completed trades that user hasn't rated yet
        const completed = (data.trades || []).filter((t: any) => t.status === 'completed');
        // We'll need to check if user has already rated these
        setPendingTrades(completed.slice(0, 10)); // Show up to 10 pending
      }
    } catch (err) {
      console.error('Failed to fetch pending trades:', err);
    }
  };

  const submitRating = async () => {
    if (!selectedTrade) return;
    setSubmitting(true);
    
    try {
      const authToken = getAuthToken();
      const res = await fetch(`${API_URL}/api/reputation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tradeId: selectedTrade.trade_id,
          rating: newRating,
          comment: ratingComment.trim() || null,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        showAlert('Success', 'Rating submitted successfully!');
        setShowRatingModal(false);
        setSelectedTrade(null);
        setNewRating(5);
        setRatingComment('');
        fetchReputation();
        fetchPendingRatings();
      } else {
        showAlert('Error', data.error || 'Failed to submit rating');
      }
    } catch (err) {
      console.error('Submit rating error:', err);
      showAlert('Error', 'Failed to submit rating');
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

  const renderStars = (rating: number, size: number = 16, interactive: boolean = false) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => interactive && setNewRating(star)}
            disabled={!interactive}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={size}
              color={star <= rating ? '#F59E0B' : '#D1D5DB'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderRatingBar = (stars: number, count: number) => {
    const total = stats?.totalRatings || 1;
    const percentage = (count / total) * 100;
    
    return (
      <View style={styles.ratingBarRow} key={stars}>
        <Text style={styles.ratingBarLabel}>{stars}</Text>
        <Ionicons name="star" size={12} color="#F59E0B" />
        <View style={styles.ratingBarTrack}>
          <View style={[styles.ratingBarFill, { width: `${percentage}%` }]} />
        </View>
        <Text style={styles.ratingBarCount}>{count}</Text>
      </View>
    );
  };

  const renderRating = ({ item }: { item: Rating }) => (
    <View style={styles.ratingCard} data-testid={`rating-${item.rating_id}`}>
      <View style={styles.ratingHeader}>
        {item.rater_picture ? (
          <Image source={{ uri: item.rater_picture }} style={styles.raterAvatar} />
        ) : (
          <View style={styles.raterAvatarPlaceholder}>
            <Ionicons name="person" size={16} color="#9CA3AF" />
          </View>
        )}
        <View style={styles.raterInfo}>
          <Text style={styles.raterName}>{item.rater_name}</Text>
          <Text style={styles.ratingDate}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        {renderStars(item.rating)}
      </View>
      {item.comment && (
        <Text style={styles.ratingComment}>{item.comment}</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isOwnProfile ? 'My Reputation' : 'Trader Reputation'}
        </Text>
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={ratings}
        renderItem={renderRating}
        keyExtractor={(item) => item.rating_id}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchReputation(); }} />
        }
        ListHeaderComponent={
          <>
            {/* Stats Card */}
            <View style={styles.statsCard}>
              <View style={styles.mainStat}>
                <Text style={styles.bigRating}>
                  {stats?.averageRating?.toFixed(1) || '0.0'}
                </Text>
                {renderStars(Math.round(stats?.averageRating || 0), 24)}
                <Text style={styles.totalRatings}>
                  {stats?.totalRatings || 0} ratings
                </Text>
              </View>
              
              <View style={styles.tradesStat}>
                <Ionicons name="swap-horizontal" size={24} color="#3B82F6" />
                <Text style={styles.tradesCount}>{stats?.completedTrades || 0}</Text>
                <Text style={styles.tradesLabel}>Completed Trades</Text>
              </View>
            </View>

            {/* Rating Distribution */}
            {stats && (
              <View style={styles.distributionCard}>
                <Text style={styles.sectionTitle}>Rating Distribution</Text>
                {[5, 4, 3, 2, 1].map((stars) => 
                  renderRatingBar(stars, stats.ratingDistribution[stars as keyof typeof stats.ratingDistribution] || 0)
                )}
              </View>
            )}

            {/* Rate a Trade Button (only for own profile) */}
            {isOwnProfile && pendingTrades.length > 0 && (
              <TouchableOpacity
                style={styles.rateButton}
                onPress={() => setShowRatingModal(true)}
                data-testid="rate-trade-btn"
              >
                <Ionicons name="star-outline" size={20} color="#FFFFFF" />
                <Text style={styles.rateButtonText}>Rate a Completed Trade</Text>
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>{pendingTrades.length}</Text>
                </View>
              </TouchableOpacity>
            )}

            <Text style={styles.sectionTitle}>Recent Reviews</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="star-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Reviews Yet</Text>
            <Text style={styles.emptySubtitle}>
              {isOwnProfile 
                ? 'Complete trades to receive ratings from other traders'
                : 'This trader has no reviews yet'}
            </Text>
          </View>
        }
      />

      {/* Rating Modal */}
      <Modal
        visible={showRatingModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRatingModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Rate Trade</Text>
            <TouchableOpacity onPress={() => setShowRatingModal(false)}>
              <Ionicons name="close" size={28} color="#1F2937" />
            </TouchableOpacity>
          </View>

          {!selectedTrade ? (
            <FlatList
              data={pendingTrades}
              renderItem={({ item }) => {
                const otherUser = item.initiator_id === user.user_id
                  ? { name: item.recipient_name, picture: item.recipient_picture }
                  : { name: item.initiator_name, picture: item.initiator_picture };
                
                return (
                  <TouchableOpacity
                    style={styles.tradeSelectCard}
                    onPress={() => setSelectedTrade(item)}
                  >
                    {otherUser.picture ? (
                      <Image source={{ uri: otherUser.picture }} style={styles.tradeAvatar} />
                    ) : (
                      <View style={styles.tradeAvatarPlaceholder}>
                        <Ionicons name="person" size={20} color="#9CA3AF" />
                      </View>
                    )}
                    <View style={styles.tradeSelectInfo}>
                      <Text style={styles.tradeSelectName}>{otherUser.name}</Text>
                      <Text style={styles.tradeSelectDate}>
                        Completed {new Date(item.updated_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                );
              }}
              keyExtractor={(item) => item.trade_id}
              contentContainerStyle={styles.modalContent}
              ListHeaderComponent={
                <Text style={styles.selectPrompt}>Select a trade to rate:</Text>
              }
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptySubtitle}>No completed trades to rate</Text>
                </View>
              }
            />
          ) : (
            <View style={styles.ratingForm}>
              <Text style={styles.ratingFormTitle}>
                Rate your trade with{' '}
                {selectedTrade.initiator_id === user.user_id
                  ? selectedTrade.recipient_name
                  : selectedTrade.initiator_name}
              </Text>

              <View style={styles.ratingStarsLarge}>
                {renderStars(newRating, 40, true)}
              </View>
              <Text style={styles.ratingLabel}>
                {newRating === 5 ? 'Excellent!' : 
                 newRating === 4 ? 'Great' :
                 newRating === 3 ? 'Good' :
                 newRating === 2 ? 'Fair' : 'Poor'}
              </Text>

              <TextInput
                style={styles.commentInput}
                placeholder="Leave a comment (optional)"
                value={ratingComment}
                onChangeText={setRatingComment}
                multiline
                numberOfLines={4}
                maxLength={500}
              />

              <View style={styles.ratingActions}>
                <TouchableOpacity
                  style={styles.cancelRatingBtn}
                  onPress={() => setSelectedTrade(null)}
                >
                  <Text style={styles.cancelRatingText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitRatingBtn, submitting && styles.buttonDisabled]}
                  onPress={submitRating}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                      <Text style={styles.submitRatingText}>Submit Rating</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
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
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: '#1F2937', textAlign: 'center' },
  content: { padding: 16 },
  
  statsCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  mainStat: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#E5E7EB', paddingRight: 20 },
  bigRating: { fontSize: 48, fontWeight: '700', color: '#1F2937' },
  totalRatings: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  tradesStat: { flex: 1, alignItems: 'center', paddingLeft: 20, justifyContent: 'center' },
  tradesCount: { fontSize: 32, fontWeight: '700', color: '#3B82F6', marginTop: 4 },
  tradesLabel: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  
  starsContainer: { flexDirection: 'row', gap: 2 },
  
  distributionCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12 },
  ratingBarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  ratingBarLabel: { width: 16, fontSize: 13, color: '#6B7280', textAlign: 'center' },
  ratingBarTrack: { flex: 1, height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  ratingBarFill: { height: '100%', backgroundColor: '#F59E0B', borderRadius: 4 },
  ratingBarCount: { width: 24, fontSize: 13, color: '#6B7280', textAlign: 'right' },
  
  rateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3B82F6', borderRadius: 12, padding: 14, marginBottom: 20, gap: 8 },
  rateButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  pendingBadge: { backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  pendingBadgeText: { color: '#3B82F6', fontSize: 12, fontWeight: '600' },
  
  ratingCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 10 },
  ratingHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  raterAvatar: { width: 36, height: 36, borderRadius: 18 },
  raterAvatarPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  raterInfo: { flex: 1, marginLeft: 10 },
  raterName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  ratingDate: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  ratingComment: { fontSize: 14, color: '#4B5563', lineHeight: 20, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#6B7280', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
  
  modalContainer: { flex: 1, backgroundColor: '#F9FAFB' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  modalContent: { padding: 20 },
  
  selectPrompt: { fontSize: 15, color: '#6B7280', marginBottom: 16 },
  tradeSelectCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10 },
  tradeAvatar: { width: 44, height: 44, borderRadius: 22 },
  tradeAvatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  tradeSelectInfo: { flex: 1, marginLeft: 12 },
  tradeSelectName: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  tradeSelectDate: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  
  ratingForm: { padding: 20 },
  ratingFormTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937', textAlign: 'center', marginBottom: 24 },
  ratingStarsLarge: { alignItems: 'center', marginBottom: 8 },
  ratingLabel: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  commentInput: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontSize: 15, color: '#1F2937', minHeight: 100, textAlignVertical: 'top', marginBottom: 20 },
  
  ratingActions: { flexDirection: 'row', gap: 12 },
  cancelRatingBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 10, backgroundColor: '#F3F4F6' },
  cancelRatingText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  submitRatingBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 10, backgroundColor: '#3B82F6', gap: 6 },
  submitRatingText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  buttonDisabled: { opacity: 0.6 },
});
