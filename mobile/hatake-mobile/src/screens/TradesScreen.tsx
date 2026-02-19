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

export default function TradesScreen({ navigation }: any) {
  const { trades, tradesLoading, fetchTrades } = useStore();
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchTrades(filter === 'all' ? undefined : filter);
  }, [filter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTrades(filter === 'all' ? undefined : filter);
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'accepted': return '#3B82F6';
      case 'completed': return '#22C55E';
      case 'rejected': return '#EF4444';
      case 'cancelled': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.tradeCard}
      onPress={() => navigation.navigate('TradeDetail', { trade: item })}
    >
      <View style={styles.tradeHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {item.initiator_name?.[0] || item.recipient_name?.[0] || '?'}
            </Text>
          </View>
          <View>
            <Text style={styles.userName}>
              {item.initiator_name || item.recipient_name || 'Unknown User'}
            </Text>
            <Text style={styles.tradeDate}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.cardsPreview}>
        <View style={styles.cardStack}>
          <Text style={styles.cardStackLabel}>Offering</Text>
          <Text style={styles.cardCount}>
            {item.initiator_cards?.length || 0} cards
          </Text>
          {item.initiator_cash > 0 && (
            <Text style={styles.cashAmount}>+${item.initiator_cash}</Text>
          )}
        </View>
        <Ionicons name="swap-horizontal" size={24} color="#9CA3AF" />
        <View style={styles.cardStack}>
          <Text style={styles.cardStackLabel}>Requesting</Text>
          <Text style={styles.cardCount}>
            {item.recipient_cards?.length || 0} cards
          </Text>
          {item.recipient_cash > 0 && (
            <Text style={styles.cashAmount}>+${item.recipient_cash}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Trades</Text>
        <TouchableOpacity 
          style={styles.newTradeButton}
          onPress={() => navigation.navigate('NewTrade')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        {(['all', 'pending', 'completed'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, filter === tab && styles.activeTab]}
            onPress={() => setFilter(tab)}
          >
            <Text style={[styles.tabText, filter === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Trades List */}
      <FlatList
        data={trades}
        renderItem={renderItem}
        keyExtractor={(item) => item.trade_id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="swap-horizontal-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No trades yet</Text>
            <Text style={styles.emptySubtext}>
              Start a trade with another collector
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
  newTradeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  activeTab: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#fff',
  },
  list: {
    padding: 16,
  },
  tradeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  tradeDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'capitalize',
  },
  cardsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardStack: {
    flex: 1,
    alignItems: 'center',
  },
  cardStackLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  cardCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  cashAmount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#22C55E',
    marginTop: 2,
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
