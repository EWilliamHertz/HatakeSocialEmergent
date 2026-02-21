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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';

// Use regular View on web to avoid SafeAreaView issues
const Container = Platform.OS === 'web' ? View : SafeAreaView;

interface Trade {
  trade_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';
  initiator_id: string;
  receiver_id: string;
  initiator_name: string;
  initiator_picture?: string;
  recipient_name: string;
  recipient_picture?: string;
  initiator_cards: any[];
  receiver_cards: any[];
  message?: string;
  cash_requested?: number;
  cash_currency?: string;
  created_at: string;
  updated_at: string;
}

interface TradesScreenProps {
  user: any;
  token: string;
  onClose: () => void;
  onCreateTrade?: () => void;
  onOpenMenu?: () => void;
}

export default function TradesScreen({ user, token, onClose, onCreateTrade, onOpenMenu }: TradesScreenProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);

  useEffect(() => {
    fetchTrades();
  }, []);

  const getAuthToken = () => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('auth_token') || token;
    }
    return token;
  };

  const fetchTrades = async () => {
    try {
      const authToken = getAuthToken();
      const res = await fetch(`${API_URL}/api/trades`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setTrades(data.trades || []);
      }
    } catch (err) {
      console.error('Failed to fetch trades:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateTradeStatus = async (tradeId: string, status: string) => {
    try {
      const authToken = getAuthToken();
      const res = await fetch(`${API_URL}/api/trades/${tradeId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        fetchTrades();
        setSelectedTrade(null);
      } else {
        showAlert('Error', data.error || 'Failed to update trade');
      }
    } catch (err) {
      console.error('Update trade error:', err);
      showAlert('Error', 'Failed to update trade');
    }
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const filteredTrades = trades.filter(trade => {
    if (filter === 'all') return true;
    if (filter === 'pending') return trade.status === 'pending';
    if (filter === 'completed') return ['completed', 'accepted'].includes(trade.status);
    return true;
  });

  const isIncoming = (trade: Trade) => trade.receiver_id === user.user_id;
  const getOtherUser = (trade: Trade) => {
    if (isIncoming(trade)) {
      return { name: trade.initiator_name, picture: trade.initiator_picture };
    }
    return { name: trade.recipient_name, picture: trade.recipient_picture };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'accepted': case 'completed': return '#10B981';
      case 'declined': case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'accepted': case 'completed': return 'checkmark-circle-outline';
      case 'declined': case 'cancelled': return 'close-circle-outline';
      default: return 'help-circle-outline';
    }
  };

  const renderTrade = ({ item }: { item: Trade }) => {
    const otherUser = getOtherUser(item);
    const incoming = isIncoming(item);
    
    return (
      <TouchableOpacity 
        style={styles.tradeCard}
        onPress={() => setSelectedTrade(item)}
        data-testid={`trade-${item.trade_id}`}
      >
        <View style={styles.tradeHeader}>
          {otherUser.picture ? (
            <Image source={{ uri: otherUser.picture }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={20} color="#9CA3AF" />
            </View>
          )}
          <View style={styles.tradeInfo}>
            <Text style={styles.userName}>{otherUser.name}</Text>
            <Text style={styles.tradeDirection}>
              {incoming ? 'Wants to trade with you' : 'You proposed a trade'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Ionicons name={getStatusIcon(item.status) as any} size={14} color={getStatusColor(item.status)} />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.tradeContent}>
          <View style={styles.tradeSide}>
            <Text style={styles.tradeSideLabel}>
              {incoming ? 'They offer' : 'You offer'}
            </Text>
            <Text style={styles.cardCount}>
              {(item.initiator_cards || []).length} cards
            </Text>
          </View>
          <Ionicons name="swap-horizontal" size={24} color="#D1D5DB" />
          <View style={styles.tradeSide}>
            <Text style={styles.tradeSideLabel}>
              {incoming ? 'You give' : 'They give'}
            </Text>
            <Text style={styles.cardCount}>
              {(item.receiver_cards || []).length} cards
            </Text>
          </View>
        </View>

        {item.cash_requested && item.cash_requested > 0 && (
          <View style={styles.cashRow}>
            <Ionicons name="cash-outline" size={16} color="#10B981" />
            <Text style={styles.cashText}>
              +€{item.cash_requested.toFixed(2)} {item.cash_currency || ''}
            </Text>
          </View>
        )}

        <Text style={styles.dateText}>
          {new Date(item.updated_at).toLocaleDateString()}
        </Text>
      </TouchableOpacity>
    );
  };

  // Trade Detail Modal
  if (selectedTrade) {
    const otherUser = getOtherUser(selectedTrade);
    const incoming = isIncoming(selectedTrade);
    
    return (
      <Container style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedTrade(null)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.title}>Trade Details</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.detailContent}>
          {/* Users */}
          <View style={styles.usersRow}>
            <View style={styles.userBox}>
              {selectedTrade.initiator_picture ? (
                <Image source={{ uri: selectedTrade.initiator_picture }} style={styles.detailAvatar} />
              ) : (
                <View style={styles.detailAvatarPlaceholder}>
                  <Ionicons name="person" size={24} color="#9CA3AF" />
                </View>
              )}
              <Text style={styles.detailUserName}>{selectedTrade.initiator_name}</Text>
              <Text style={styles.detailUserRole}>Initiator</Text>
            </View>
            
            <Ionicons name="swap-horizontal" size={32} color="#3B82F6" />
            
            <View style={styles.userBox}>
              {selectedTrade.recipient_picture ? (
                <Image source={{ uri: selectedTrade.recipient_picture }} style={styles.detailAvatar} />
              ) : (
                <View style={styles.detailAvatarPlaceholder}>
                  <Ionicons name="person" size={24} color="#9CA3AF" />
                </View>
              )}
              <Text style={styles.detailUserName}>{selectedTrade.recipient_name}</Text>
              <Text style={styles.detailUserRole}>Recipient</Text>
            </View>
          </View>

          {/* Status */}
          <View style={[styles.statusBox, { backgroundColor: getStatusColor(selectedTrade.status) + '15' }]}>
            <Ionicons name={getStatusIcon(selectedTrade.status) as any} size={20} color={getStatusColor(selectedTrade.status)} />
            <Text style={[styles.statusBoxText, { color: getStatusColor(selectedTrade.status) }]}>
              {selectedTrade.status.charAt(0).toUpperCase() + selectedTrade.status.slice(1)}
            </Text>
          </View>

          {/* Cards Summary */}
          <View style={styles.cardsSection}>
            <View style={styles.cardsSide}>
              <Text style={styles.cardsSideTitle}>Offered</Text>
              <Text style={styles.cardsCount}>
                {(selectedTrade.initiator_cards || []).length} cards
              </Text>
            </View>
            <View style={styles.cardsSide}>
              <Text style={styles.cardsSideTitle}>Requested</Text>
              <Text style={styles.cardsCount}>
                {(selectedTrade.receiver_cards || []).length} cards
              </Text>
            </View>
          </View>

          {/* Cash */}
          {selectedTrade.cash_requested && selectedTrade.cash_requested > 0 && (
            <View style={styles.cashSection}>
              <Ionicons name="cash-outline" size={20} color="#10B981" />
              <Text style={styles.cashAmount}>
                €{selectedTrade.cash_requested.toFixed(2)} additional
              </Text>
            </View>
          )}

          {/* Message */}
          {selectedTrade.message && (
            <View style={styles.messageSection}>
              <Text style={styles.messageLabel}>Message</Text>
              <Text style={styles.messageText}>{selectedTrade.message}</Text>
            </View>
          )}

          {/* Actions */}
          {selectedTrade.status === 'pending' && incoming && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.declineButton]}
                onPress={() => updateTradeStatus(selectedTrade.trade_id, 'declined')}
                data-testid="decline-trade-btn"
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => updateTradeStatus(selectedTrade.trade_id, 'accepted')}
                data-testid="accept-trade-btn"
              >
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Accept</Text>
              </TouchableOpacity>
            </View>
          )}

          {selectedTrade.status === 'pending' && !incoming && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton, { alignSelf: 'center' }]}
              onPress={() => updateTradeStatus(selectedTrade.trade_id, 'cancelled')}
              data-testid="cancel-trade-btn"
            >
              <Ionicons name="close-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Cancel Trade</Text>
            </TouchableOpacity>
          )}

          <View style={styles.noteBox}>
            <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
            <Text style={styles.noteText}>
              To create new trades or view card details, use the web app
            </Text>
          </View>
        </View>
      </Container>
    );
  }

  // Trades List View
  return (
    <Container style={styles.container}>
      <View style={styles.header}>
        {onOpenMenu ? (
          <TouchableOpacity onPress={onOpenMenu} style={styles.backButton}>
            <Ionicons name="menu" size={24} color="#1F2937" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
        )}
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Trades</Text>
          <Text style={styles.subtitle}>{trades.length} total trades</Text>
        </View>
        {onCreateTrade && (
          <TouchableOpacity onPress={onCreateTrade} style={styles.createTradeBtn} data-testid="create-trade-btn">
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        {!onCreateTrade && <View style={styles.backButton} />}
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        {(['all', 'pending', 'completed'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.filterActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={filteredTrades}
          renderItem={renderTrade}
          keyExtractor={(item) => item.trade_id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTrades(); }} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="swap-horizontal-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Trades Yet</Text>
              <Text style={styles.emptySubtitle}>
                Start trading cards with other collectors
              </Text>
            </View>
          }
        />
      )}
    </Container>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F9FAFB',
    ...(Platform.OS === 'web' ? { paddingTop: 20 } : {}),
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  createTradeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  filters: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  filterButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6' },
  filterActive: { backgroundColor: '#3B82F6' },
  filterText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  filterTextActive: { color: '#FFFFFF' },
  list: { padding: 16 },
  tradeCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  tradeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  tradeInfo: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  tradeDirection: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, gap: 4 },
  statusText: { fontSize: 12, fontWeight: '500', textTransform: 'capitalize' },
  tradeContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  tradeSide: { flex: 1, alignItems: 'center' },
  tradeSideLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  cardCount: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  cashRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  cashText: { fontSize: 14, fontWeight: '500', color: '#10B981' },
  dateText: { fontSize: 12, color: '#9CA3AF', marginTop: 12, textAlign: 'right' },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#6B7280', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
  detailContent: { flex: 1, padding: 20 },
  usersRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 24 },
  userBox: { alignItems: 'center' },
  detailAvatar: { width: 60, height: 60, borderRadius: 30, marginBottom: 8 },
  detailAvatarPlaceholder: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  detailUserName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  detailUserRole: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  statusBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 8, gap: 8, marginBottom: 20 },
  statusBoxText: { fontSize: 16, fontWeight: '600' },
  cardsSection: { flexDirection: 'row', marginBottom: 16 },
  cardsSide: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 8, padding: 16, alignItems: 'center', marginHorizontal: 4 },
  cardsSideTitle: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  cardsCount: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  cashSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ECFDF5', borderRadius: 8, padding: 12, gap: 8, marginBottom: 16 },
  cashAmount: { fontSize: 16, fontWeight: '600', color: '#10B981' },
  messageSection: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 16, marginBottom: 20 },
  messageLabel: { fontSize: 13, color: '#6B7280', marginBottom: 8 },
  messageText: { fontSize: 15, color: '#1F2937', lineHeight: 22 },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 8, gap: 8 },
  acceptButton: { backgroundColor: '#10B981' },
  declineButton: { backgroundColor: '#EF4444' },
  cancelButton: { backgroundColor: '#6B7280', paddingHorizontal: 24 },
  actionButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
  noteBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, padding: 12, gap: 8, marginTop: 'auto' },
  noteText: { flex: 1, fontSize: 13, color: '#6B7280' },
});
