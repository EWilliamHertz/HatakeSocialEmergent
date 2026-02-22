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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';
import { useTheme } from '../context/ThemeContext';

interface Friend {
  user_id: string;
  name: string;
  picture?: string;
  status?: string;
  created_at?: string;
}

interface FriendsScreenProps {
  user: any;
  token: string;
  onClose: () => void;
  onOpenChat?: (friend: Friend) => void;
}

export default function FriendsScreen({ user, token, onClose, onOpenChat }: FriendsScreenProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : token;
      
      // Fetch friends
      const friendsRes = await fetch(`${API_URL}/api/friends`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const friendsData = await friendsRes.json();
      if (friendsData.success) {
        setFriends(friendsData.friends || []);
      }

      // Fetch friend requests
      const requestsRes = await fetch(`${API_URL}/api/friends/requests`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const requestsData = await requestsRes.json();
      if (requestsData.success) {
        setRequests(requestsData.requests || []);
      }
    } catch (err) {
      console.error('Failed to fetch friends data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : token;
      const res = await fetch(`${API_URL}/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        // Filter out current user and existing friends
        const friendIds = new Set(friends.map(f => f.user_id));
        const filtered = (data.users || []).filter(
          (u: Friend) => u.user_id !== user.user_id && !friendIds.has(u.user_id)
        );
        setSearchResults(filtered);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleFriendAction = async (friendId: string, action: 'request' | 'accept' | 'reject' | 'remove') => {
    try {
      const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : token;
      const res = await fetch(`${API_URL}/api/friends`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ friendId, action }),
      });
      
      if (res.ok) {
        fetchData(); // Refresh data
        if (action === 'request') {
          const msg = 'Friend request sent!';
          if (Platform.OS === 'web') {
            alert(msg);
          } else {
            Alert.alert('Success', msg);
          }
        }
      }
    } catch (err) {
      console.error('Friend action failed:', err);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const renderFriend = ({ item }: { item: Friend }) => (
    <View style={styles.friendItem}>
      {item.picture ? (
        <Image source={{ uri: item.picture }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person" size={24} color="#9CA3AF" />
        </View>
      )}
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.name}</Text>
      </View>
      <View style={styles.friendActions}>
        <TouchableOpacity 
          style={styles.chatButton}
          onPress={() => onOpenChat?.(item)}
        >
          <Ionicons name="chatbubble-outline" size={20} color="#3B82F6" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.removeButton}
          onPress={() => handleFriendAction(item.user_id, 'remove')}
        >
          <Ionicons name="person-remove-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRequest = ({ item }: { item: Friend }) => (
    <View style={styles.friendItem}>
      {item.picture ? (
        <Image source={{ uri: item.picture }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person" size={24} color="#9CA3AF" />
        </View>
      )}
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.name}</Text>
        <Text style={styles.requestLabel}>wants to be friends</Text>
      </View>
      <View style={styles.friendActions}>
        <TouchableOpacity 
          style={styles.acceptButton}
          onPress={() => handleFriendAction(item.user_id, 'accept')}
        >
          <Ionicons name="checkmark" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.rejectButton}
          onPress={() => handleFriendAction(item.user_id, 'reject')}
        >
          <Ionicons name="close" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSearchResult = ({ item }: { item: Friend }) => (
    <View style={styles.friendItem}>
      {item.picture ? (
        <Image source={{ uri: item.picture }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person" size={24} color="#9CA3AF" />
        </View>
      )}
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.name}</Text>
      </View>
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => handleFriendAction(item.user_id, 'request')}
      >
        <Ionicons name="person-add" size={18} color="#FFFFFF" />
        <Text style={styles.addButtonText}>Add</Text>
      </TouchableOpacity>
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Friends</Text>
        <View style={styles.backButton} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>
            Friends ({friends.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>
            Requests ({requests.length})
          </Text>
          {requests.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{requests.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'search' && styles.tabActive]}
          onPress={() => setActiveTab('search')}
        >
          <Text style={[styles.tabText, activeTab === 'search' && styles.tabTextActive]}>
            Find
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'friends' && (
        <FlatList
          data={friends}
          renderItem={renderFriend}
          keyExtractor={(item) => item.user_id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No friends yet</Text>
              <Text style={styles.emptySubtext}>Search for people to add as friends</Text>
            </View>
          }
        />
      )}

      {activeTab === 'requests' && (
        <FlatList
          data={requests}
          renderItem={renderRequest}
          keyExtractor={(item) => item.user_id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="mail-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No pending requests</Text>
            </View>
          }
        />
      )}

      {activeTab === 'search' && (
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or email..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searching && <ActivityIndicator size="small" color="#3B82F6" />}
          </View>
          
          <FlatList
            data={searchResults}
            renderItem={renderSearchResult}
            keyExtractor={(item) => item.user_id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              searchQuery.trim() ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>No users found</Text>
                </View>
              ) : (
                <View style={styles.empty}>
                  <Ionicons name="search" size={48} color="#D1D5DB" />
                  <Text style={styles.emptyText}>Search for friends</Text>
                  <Text style={styles.emptySubtext}>Enter a name or email to find people</Text>
                </View>
              )
            }
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 4,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  requestLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  friendActions: {
    flexDirection: 'row',
    gap: 8,
  },
  chatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    gap: 6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  searchContainer: {
    flex: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
});
