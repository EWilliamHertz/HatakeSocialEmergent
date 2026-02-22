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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';

interface Trade {
  trade_id: string;
  status: 'pending' | 'accepted' | 'completed' | 'declined' | 'cancelled';
  initiator_id: string;
  receiver_id: string;
  initiator_name: string;
  receiver_name: string;
  initiator_picture?: string;
  receiver_picture?: string;
  initiator_cards: any[];
  receiver_cards: any[];
  cash_offered?: number;
  cash_requested?: number;
  cash_currency?: string;
  note?: string;
  created_at: string;
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
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    setMounted(true);
    fetchTrades();
    return () => setMounted(false);
  }, []);

  const getAuthToken = () => {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem('auth_token') || token;
      }
    } catch (e) {
      // localStorage not available
    }
    return token;
  };

  const fetchTrades = async () => {
    if (!mounted) return;
    setError(null);
    try {
      const authToken = getAuthToken();
      const res = await fetch(`${API_URL}/api/trades`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!mounted) return;
      if (data.success) {
        setTrades(data.trades || []);
      } else {
        setError(data.error || 'Failed to load trades');
      }
    } catch (err) {
      console.error('Failed to fetch trades:', err);
      if (mounted) {
        setError('Network error. Please try again.');
      }
    } finally {
      if (mounted) {
        setLoading(false);
        setRefreshing(false);
      }
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
        Alert.alert('Success', `Trade ${status}`);
      } else {
        Alert.alert('Error', data.error || 'Failed to update trade');
      }
    } catch (err) {
      console.error('Update trade error:', err);
      Alert.alert('Error', 'Failed to update trade');
    }
  };

  const isIncoming = (trade: Trade) => trade.receiver_id === user?.user_id;
  
  const getOtherUser = (trade: Trade) => {
    if (trade.initiator_id === user?.user_id) {
      return { name: trade.receiver_name, picture: trade.receiver_picture };
    }
    return { name: trade.initiator_name, picture: trade.initiator_picture };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'accepted': return '#3B82F6';
      case 'completed': return '#10B981';
      case 'declined':
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const filteredTrades = trades.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'pending') return t.status === 'pending' || t.status === 'accepted';
    if (filter === 'completed') return t.status === 'completed';
    return true;
  });

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
            <Text style={styles.tradeName}>{otherUser.name}</Text>
            <View style={styles.tradeMetaRow}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </Text>
              </View>
              <Text style={styles.directionText}>
                {incoming ? '← Incoming' : '→ Outgoing'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </View>
        
        <View style={styles.tradePreview}>
          <View style={styles.tradeSide}>
            <Text style={styles.tradeLabel}>You give</Text>
            <Text style={styles.tradeCount}>
              {incoming ? item.receiver_cards?.length || 0 : item.initiator_cards?.length || 0} cards
            </Text>
          </View>
          <Ionicons name="swap-horizontal" size={24} color="#D1D5DB" />
          <View style={styles.tradeSide}>
            <Text style={styles.tradeLabel}>You get</Text>
            <Text style={styles.tradeCount}>
              {incoming ? item.initiator_cards?.length || 0 : item.receiver_cards?.length || 0} cards
            </Text>
          </View>
        </View>

        {item.cash_requested && item.cash_requested > 0 && (
          <View style={styles.cashBadge}>
            <Ionicons name="cash-outline" size={14} color="#10B981" />
            <Text style={styles.cashText}>
              +€{item.cash_requested.toFixed(2)} {item.cash_currency || ''}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Trade Detail View
  if (selectedTrade) {
    const otherUser = getOtherUser(selectedTrade);
    const incoming = isIncoming(selectedTrade);
    
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedTrade(null)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.title}>Trade Details</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView style={styles.detailContent}>
          {/* Partner Info */}
          <View style={styles.partnerCard}>
            {otherUser.picture ? (
              <Image source={{ uri: otherUser.picture }} style={styles.partnerAvatar} />
            ) : (
              <View style={styles.partnerAvatarPlaceholder}>
                <Ionicons name="person" size={24} color="#9CA3AF" />
              </View>
            )}
            <Text style={styles.partnerName}>{otherUser.name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedTrade.status) + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(selectedTrade.status) }]} />
              <Text style={[styles.statusText, { color: getStatusColor(selectedTrade.status) }]}>
                {selectedTrade.status.charAt(0).toUpperCase() + selectedTrade.status.slice(1)}
              </Text>
            </View>
          </View>

          {/* Trade Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summarySide}>
              <Text style={styles.summaryRole}>You Give</Text>
              <Text style={styles.summaryCount}>
                {incoming ? selectedTrade.receiver_cards?.length || 0 : selectedTrade.initiator_cards?.length || 0} cards
              </Text>
            </View>
            <View style={styles.summaryDivider}>
              <Ionicons name="swap-horizontal" size={28} color="#3B82F6" />
            </View>
            <View style={styles.summarySide}>
              <Text style={styles.summaryRole}>You Get</Text>
              <Text style={styles.summaryCount}>
                {incoming ? selectedTrade.initiator_cards?.length || 0 : selectedTrade.receiver_cards?.length || 0} cards
              </Text>
            </View>
          </View>

          {/* Note */}
          {selectedTrade.note && (
            <View style={styles.noteCard}>
              <Ionicons name="chatbubble-outline" size={18} color="#6B7280" />
              <Text style={styles.noteText}>{selectedTrade.note}</Text>
            </View>
          )}

          {/* Action Buttons */}
          {selectedTrade.status === 'pending' && incoming && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => updateTradeStatus(selectedTrade.trade_id, 'accepted')}
              >
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.declineButton}
                onPress={() => updateTradeStatus(selectedTrade.trade_id, 'declined')}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Decline</Text>
              </TouchableOpacity>
            </View>
          )}

          {selectedTrade.status === 'accepted' && (
            <TouchableOpacity
              style={styles.completeButton}
              onPress={() => updateTradeStatus(selectedTrade.trade_id, 'completed')}
            >
              <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>Mark as Completed</Text>
            </TouchableOpacity>
          )}

          <View style={styles.noteBox}>
            <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
            <Text style={styles.noteBoxText}>
              To view card details or create new trades, use the web app
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Loading State
  if (loading) {
    return (
      <View style={styles.container}>
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
          </View>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading trades...</Text>
        </View>
      </View>
    );
  }

  // Error State
  if (error) {
    return (
      <View style={styles.container}>
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
          </View>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="warning-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchTrades}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Trades List View
  return (
    <View style={styles.container}>
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

      {filteredTrades.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="swap-horizontal-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No trades yet</Text>
          <Text style={styles.emptySubtext}>
            Start trading cards with other collectors
          </Text>
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
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F9FAFB',
    width: '100%',
    height: '100%',
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    paddingTop: Platform.OS === 'web' ? 16 : 12,
    backgroundColor: '#FFFFFF', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E7EB',
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, marginHorizontal: 8 },
  title: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  createTradeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' },
  
  // Filters
  filters: { flexDirection: 'row', padding: 12, backgroundColor: '#FFFFFF', gap: 8 },
  filterButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6' },
  filterActive: { backgroundColor: '#3B82F6' },
  filterText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  filterTextActive: { color: '#FFFFFF' },
  
  // List
  list: { padding: 16 },
  
  // Trade Card
  tradeCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  tradeHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  tradeInfo: { flex: 1, marginLeft: 12 },
  tradeName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  tradeMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '500' },
  directionText: { fontSize: 12, color: '#9CA3AF' },
  
  tradePreview: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  tradeSide: { alignItems: 'center' },
  tradeLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  tradeCount: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  
  cashBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 4 },
  cashText: { fontSize: 14, color: '#10B981', fontWeight: '500' },
  
  // Empty State
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#6B7280', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
  
  // Loading
  loadingText: { fontSize: 14, color: '#6B7280', marginTop: 12 },
  
  // Error
  errorText: { fontSize: 14, color: '#EF4444', marginTop: 12, textAlign: 'center' },
  retryButton: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#3B82F6', borderRadius: 8 },
  retryText: { color: '#FFFFFF', fontWeight: '600' },
  
  // Detail View
  detailContent: { flex: 1, padding: 16 },
  partnerCard: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, marginBottom: 16 },
  partnerAvatar: { width: 64, height: 64, borderRadius: 32 },
  partnerAvatarPlaceholder: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  partnerName: { fontSize: 18, fontWeight: '600', color: '#1F2937', marginTop: 12, marginBottom: 8 },
  
  summaryCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, marginBottom: 16 },
  summarySide: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 50, alignItems: 'center', justifyContent: 'center' },
  summaryRole: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  summaryCount: { fontSize: 20, fontWeight: '700', color: '#1F2937' },
  
  noteCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 16, gap: 10 },
  noteText: { flex: 1, fontSize: 14, color: '#374151' },
  
  actionButtons: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  acceptButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 14, gap: 8 },
  declineButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EF4444', borderRadius: 12, paddingVertical: 14, gap: 8 },
  completeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3B82F6', borderRadius: 12, paddingVertical: 14, gap: 8, marginBottom: 16 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  
  noteBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, padding: 12, gap: 8, marginTop: 8 },
  noteBoxText: { flex: 1, fontSize: 13, color: '#6B7280' },
});
