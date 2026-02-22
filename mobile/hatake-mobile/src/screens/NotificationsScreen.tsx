import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';
import { useTheme } from '../context/ThemeContext';

interface Notification {
  notification_id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  created_at: string;
}

interface NotificationsScreenProps {
  user: any;
  token: string;
  onClose: () => void;
}

export default function NotificationsScreen({ user, token, onClose }: NotificationsScreenProps) {
  const { colors } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const getAuthToken = () => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('auth_token') || token;
    }
    return token;
  };

  const fetchNotifications = async () => {
    try {
      const authToken = getAuthToken();
      const res = await fetch(`${API_URL}/api/notifications`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markAsRead = async (notificationId?: string) => {
    try {
      const authToken = getAuthToken();
      await fetch(`${API_URL}/api/notifications`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId }),
      });
      
      if (notificationId) {
        setNotifications(prev => 
          prev.map(n => n.notification_id === notificationId ? { ...n, read: true } : n)
        );
      } else {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const authToken = getAuthToken();
      await fetch(`${API_URL}/api/notifications`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId }),
      });
      setNotifications(prev => prev.filter(n => n.notification_id !== notificationId));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const clearAll = async () => {
    try {
      const authToken = getAuthToken();
      await fetch(`${API_URL}/api/notifications`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      setNotifications([]);
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like':
      case 'reaction':
        return { name: 'heart', color: '#EF4444' };
      case 'comment':
        return { name: 'chatbubble', color: '#3B82F6' };
      case 'friend_request':
        return { name: 'person-add', color: '#10B981' };
      case 'message':
        return { name: 'mail', color: '#8B5CF6' };
      case 'trade':
        return { name: 'swap-horizontal', color: '#F59E0B' };
      default:
        return { name: 'notifications', color: '#6B7280' };
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const renderNotification = ({ item }: { item: Notification }) => {
    const icon = getIcon(item.type);
    
    return (
      <TouchableOpacity
        style={[styles.notificationCard, { backgroundColor: colors.surface }, !item.read && { backgroundColor: colors.surfaceSecondary }]}
        onPress={() => markAsRead(item.notification_id)}
        data-testid={`notification-${item.notification_id}`}
      >
        <View style={[styles.iconContainer, { backgroundColor: icon.color + '15' }]}>
          <Ionicons name={icon.name as any} size={20} color={icon.color} />
        </View>
        
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={2}>{item.message}</Text>
          <Text style={[styles.time, { color: colors.textTertiary }]}>{formatTime(item.created_at)}</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.deleteBtn}
          onPress={() => deleteNotification(item.notification_id)}
        >
          <Ionicons name="close" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
        
        {!item.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity 
              style={styles.markAllBtn}
              onPress={() => markAsRead()}
            >
              <Ionicons name="checkmark-done" size={22} color={colors.primary} />
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity 
              style={styles.clearBtn}
              onPress={clearAll}
            >
              <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.notification_id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotifications(); }} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No Notifications</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
                You're all caught up! New notifications will appear here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  badge: { backgroundColor: '#EF4444', minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 8, paddingHorizontal: 6 },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  markAllBtn: { padding: 8 },
  clearBtn: { padding: 8 },
  list: { padding: 16 },
  notificationCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1, position: 'relative' },
  unread: { backgroundColor: '#EFF6FF' },
  iconContainer: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  content: { flex: 1, marginRight: 8 },
  title: { fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  message: { fontSize: 14, color: '#4B5563', lineHeight: 20, marginBottom: 6 },
  time: { fontSize: 12, color: '#9CA3AF' },
  deleteBtn: { padding: 4 },
  unreadDot: { position: 'absolute', top: 16, right: 40, width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6' },
  empty: { alignItems: 'center', paddingVertical: 64 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#6B7280', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#9CA3AF', marginTop: 4, textAlign: 'center', paddingHorizontal: 32 },
});
