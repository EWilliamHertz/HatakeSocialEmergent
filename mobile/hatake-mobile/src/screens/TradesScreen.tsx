import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';
import { useTheme } from '../context/ThemeContext';

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
  const { colors } = useTheme();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrades();
  }, []);

  const getAuthToken = () => {
    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        return localStorage.getItem('auth_token') || token;
      }
    } catch (e) {}
    return token;
  };

  const fetchTrades = async () => {
    setError(null);
    try {
      const authToken = getAuthToken();
      const res = await fetch(`${API_URL}/api/trades`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setTrades(data.trades || []);
      } else {
        setError(data.error || 'Failed to load trades');
      }
    } catch (err) {
      console.error('Failed to fetch trades:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTradeAction = async (tradeId: string, action: 'accept' | 'decline' | 'cancel') => {
    try {
      const authToken = getAuthToken();
      const res = await fetch(`${API_URL}/api/trades/${tradeId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        fetchTrades();
        setSelectedTrade(null);
      }
    } catch (err) {
      console.error('Trade action failed:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' };
      case 'accepted': return { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6' };
      case 'completed': return { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' };
      case 'declined': case 'cancelled': return { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' };
      default: return { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF' };
    }
  };

  // Calculate trade statistics
  const tradeStats = trades.reduce((acc, trade) => {
    const isInitiator = trade.initiator_id === user.user_id;
    const myCards = isInitiator ? trade.initiator_cards : trade.receiver_cards;
    const theirCards = isInitiator ? trade.receiver_cards : trade.initiator_cards;
    
    // Calculate € values
    const myValue = myCards.reduce((sum: number, c: any) => sum + (c.value || 0), 0);
    const theirValue = theirCards.reduce((sum: number, c: any) => sum + (c.value || 0), 0);
    
    // Cash adjustments
    const cashOut = isInitiator ? (trade.cash_offered || 0) : (trade.cash_requested || 0);
    const cashIn = isInitiator ? (trade.cash_requested || 0) : (trade.cash_offered || 0);
    
    if (trade.status === 'completed') {
      acc.completed++;
      acc.totalOut += myValue + cashOut;
      acc.totalIn += theirValue + cashIn;
    }
    if (trade.status === 'pending') acc.pending++;
    
    return acc;
  }, { completed: 0, pending: 0, totalIn: 0, totalOut: 0 });

  const filteredTrades = trades.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'pending') return t.status === 'pending' || t.status === 'accepted';
    return t.status === 'completed';
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Trade Detail View
  if (selectedTrade) {
    const isInitiator = selectedTrade.initiator_id === user.user_id;
    const partner = isInitiator 
      ? { name: selectedTrade.receiver_name, picture: selectedTrade.receiver_picture }
      : { name: selectedTrade.initiator_name, picture: selectedTrade.initiator_picture };
    const myCards = isInitiator ? selectedTrade.initiator_cards : selectedTrade.receiver_cards;
    const theirCards = isInitiator ? selectedTrade.receiver_cards : selectedTrade.initiator_cards;
    const statusColors = getStatusColor(selectedTrade.status);

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setSelectedTrade(null)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Trade Details</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView style={styles.detailContent}>
          {/* Partner Info */}
          <View style={[styles.partnerCard, { backgroundColor: colors.surface }]}>
            {partner.picture ? (
              <Image source={{ uri: partner.picture }} style={styles.partnerAvatar} />
            ) : (
              <View style={[styles.partnerAvatarPlaceholder, { backgroundColor: colors.surfaceSecondary }]}>
                <Ionicons name="person" size={28} color={colors.textTertiary} />
              </View>
            )}
            <Text style={[styles.partnerName, { color: colors.text }]}>{partner.name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColors.dot }]} />
              <Text style={[styles.statusText, { color: statusColors.text }]}>
                {selectedTrade.status.charAt(0).toUpperCase() + selectedTrade.status.slice(1)}
              </Text>
            </View>
          </View>

          {/* Your Cards */}
          <View style={[styles.cardsSection, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardsSectionTitle, { color: colors.text }]}>You Offer ({myCards.length} cards)</Text>
            {myCards.length > 0 ? (
              myCards.map((card: any, index: number) => (
                <View key={index} style={[styles.cardItem, { borderBottomColor: colors.border }]}>
                  {card.image_uri && (
                    <Image source={{ uri: card.image_uri }} style={styles.cardThumbnail} />
                  )}
                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardName, { color: colors.text }]}>{card.name || 'Unknown Card'}</Text>
                    <Text style={[styles.cardSet, { color: colors.textSecondary }]}>{card.set_name || card.set_code || ''}</Text>
                    {card.finish && <Text style={[styles.cardFinish, { color: colors.primary }]}>{card.finish}</Text>}
                  </View>
                  {card.value !== undefined && (
                    <Text style={[styles.cardValue, { color: colors.success }]}>€{card.value?.toFixed(2) || '0.00'}</Text>
                  )}
                </View>
              ))
            ) : (
              <Text style={[styles.noCardsText, { color: colors.textTertiary }]}>No cards offered</Text>
            )}
          </View>

          {/* Their Cards */}
          <View style={[styles.cardsSection, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardsSectionTitle, { color: colors.text }]}>You Receive ({theirCards.length} cards)</Text>
            {theirCards.length > 0 ? (
              theirCards.map((card: any, index: number) => (
                <View key={index} style={[styles.cardItem, { borderBottomColor: colors.border }]}>
                  {card.image_uri && (
                    <Image source={{ uri: card.image_uri }} style={styles.cardThumbnail} />
                  )}
                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardName, { color: colors.text }]}>{card.name || 'Unknown Card'}</Text>
                    <Text style={[styles.cardSet, { color: colors.textSecondary }]}>{card.set_name || card.set_code || ''}</Text>
                    {card.finish && <Text style={[styles.cardFinish, { color: colors.primary }]}>{card.finish}</Text>}
                  </View>
                  {card.value !== undefined && (
                    <Text style={[styles.cardValue, { color: colors.success }]}>€{card.value?.toFixed(2) || '0.00'}</Text>
                  )}
                </View>
              ))
            ) : (
              <Text style={[styles.noCardsText, { color: colors.textTertiary }]}>No cards requested</Text>
            )}
          </View>

          {/* Cash if any */}
          {(selectedTrade.cash_offered || selectedTrade.cash_requested) && (
            <View style={[styles.cashSection, { backgroundColor: colors.surfaceSecondary }]}>
              <Ionicons name="cash-outline" size={20} color={colors.success} />
              <Text style={[styles.cashText, { color: colors.success }]}>
                {selectedTrade.cash_offered 
                  ? `+€${selectedTrade.cash_offered.toFixed(2)} cash offered`
                  : `-€${selectedTrade.cash_requested?.toFixed(2)} cash requested`
                }
              </Text>
            </View>
          )}

          {/* Note */}
          {selectedTrade.note && (
            <View style={[styles.noteSection, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.noteLabel, { color: colors.textSecondary }]}>Note</Text>
              <Text style={[styles.noteText, { color: colors.text }]}>{selectedTrade.note}</Text>
            </View>
          )}

          {/* Actions */}
          {selectedTrade.status === 'pending' && !isInitiator && (
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.acceptButton}
                onPress={() => handleTradeAction(selectedTrade.trade_id, 'accept')}
              >
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                <Text style={styles.acceptText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.declineButton}
                onPress={() => handleTradeAction(selectedTrade.trade_id, 'decline')}
              >
                <Ionicons name="close" size={20} color="#EF4444" />
                <Text style={styles.declineText}>Decline</Text>
              </TouchableOpacity>
            </View>
          )}

          {selectedTrade.status === 'pending' && isInitiator && (
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => handleTradeAction(selectedTrade.trade_id, 'cancel')}
            >
              <Text style={styles.cancelText}>Cancel Trade</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  }

  // Loading State
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Trades</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading trades...</Text>
        </View>
      </View>
    );
  }

  // Error State
  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Trades</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="warning-outline" size={48} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={fetchTrades}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Main Trades List
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {onOpenMenu ? (
          <TouchableOpacity onPress={onOpenMenu} style={styles.backButton}>
            <Ionicons name="menu" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: colors.text }]}>Trades</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{trades.length} total trades</Text>
        </View>
        {onCreateTrade && (
          <TouchableOpacity onPress={onCreateTrade} style={[styles.createTradeBtn, { backgroundColor: colors.success }]}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        {!onCreateTrade && <View style={styles.backButton} />}
      </View>

      {/* Filters */}
      <View style={[styles.filters, { backgroundColor: colors.surface }]}>
        {(['all', 'pending', 'completed'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, { backgroundColor: colors.surfaceSecondary }, filter === f && { backgroundColor: colors.primary }]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, { color: colors.textSecondary }, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Trade Statistics */}
      <View style={[styles.statsContainer, { backgroundColor: colors.surface }]}>
        <View style={[styles.statBox, { backgroundColor: colors.surfaceSecondary }]}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Completed</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{tradeStats.completed}</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.surfaceSecondary }]}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>€ Out</Text>
          <Text style={[styles.statValue, styles.statValueOut]}>€{tradeStats.totalOut.toFixed(0)}</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.surfaceSecondary }]}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>€ In</Text>
          <Text style={[styles.statValue, styles.statValueIn]}>€{tradeStats.totalIn.toFixed(0)}</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.surfaceSecondary }]}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
          <Text style={[styles.statValue, styles.statValuePending]}>{tradeStats.pending}</Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContainer}>
        {filteredTrades.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="swap-horizontal-outline" size={64} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No trades yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>Start trading cards with other collectors</Text>
          </View>
        ) : (
          filteredTrades.map((trade) => {
            const isInitiator = trade.initiator_id === user.user_id;
            const partner = isInitiator
              ? { name: trade.receiver_name || 'Unknown', picture: trade.receiver_picture }
              : { name: trade.initiator_name || 'Unknown', picture: trade.initiator_picture };
            const statusColors = getStatusColor(trade.status);
            
            // Ensure arrays exist to prevent crashes
            const initiatorCards = trade.initiator_cards || [];
            const receiverCards = trade.receiver_cards || [];

            return (
              <Pressable
                key={trade.trade_id}
                style={({ pressed }) => [
                  styles.tradeCard, 
                  { backgroundColor: colors.surface },
                  pressed && { opacity: 0.7 }
                ]}
                onPress={() => {
                  console.log('Trade pressed:', trade.trade_id);
                  setSelectedTrade(trade);
                }}
              >
                <View style={styles.tradeHeader}>
                  {partner.picture ? (
                    <Image source={{ uri: partner.picture }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surfaceSecondary }]}>
                      <Ionicons name="person" size={22} color={colors.textTertiary} />
                    </View>
                  )}
                  <View style={styles.tradeInfo}>
                    <Text style={[styles.tradeName, { color: colors.text }]}>{partner.name}</Text>
                    <View style={styles.tradeMetaRow}>
                      <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusColors.dot }]} />
                        <Text style={[styles.statusText, { color: statusColors.text }]}>
                          {trade.status}
                        </Text>
                      </View>
                      <Text style={[styles.dateText, { color: colors.textTertiary }]}>{formatDate(trade.created_at)}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                </View>

                <View style={[styles.tradePreview, { borderTopColor: colors.border }]}>
                  <View style={styles.tradeSide}>
                    <Text style={[styles.tradeLabel, { color: colors.textSecondary }]}>Offering</Text>
                    <Text style={[styles.tradeCount, { color: colors.text }]}>
                      {isInitiator ? trade.initiator_cards.length : trade.receiver_cards.length} cards
                    </Text>
                  </View>
                  <Ionicons name="swap-horizontal" size={24} color={colors.primary} />
                  <View style={styles.tradeSide}>
                    <Text style={[styles.tradeLabel, { color: colors.textSecondary }]}>Receiving</Text>
                    <Text style={[styles.tradeCount, { color: colors.text }]}>
                      {isInitiator ? trade.receiver_cards.length : trade.initiator_cards.length} cards
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'web' ? 20 : 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  createTradeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filters: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  filterActive: {
    backgroundColor: '#3B82F6',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  statValueOut: {
    color: '#EF4444',
  },
  statValueIn: {
    color: '#10B981',
  },
  statValuePending: {
    color: '#F59E0B',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
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
  tradeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tradeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  tradeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  tradeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  tradePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  tradeSide: {
    alignItems: 'center',
  },
  tradeLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  tradeCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginTop: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Detail View Styles
  detailContent: {
    flex: 1,
    padding: 16,
  },
  partnerCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  partnerAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  partnerAvatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 12,
  },
  exchangeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  exchangeSide: {
    alignItems: 'center',
  },
  exchangeLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  cardCount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  cashSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  cashText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  noteSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  noteLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 22,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  acceptText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  declineText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  // Card list styles
  cardsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cardThumbnail: {
    width: 50,
    height: 70,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  cardSet: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  cardFinish: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  cardValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  noCardsText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
});
