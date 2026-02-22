import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  FlatList,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';
import { useTheme } from '../context/ThemeContext';
import GroupChatScreen from './GroupChatScreen';

const Container = Platform.OS === 'web' ? View : SafeAreaView;

interface GroupDetailScreenProps {
  user: any;
  token: string;
  group: {
    group_id: string;
    name: string;
    description?: string;
    image?: string;
    member_count: number | string;
    privacy?: string;
    role?: string;
  };
  onClose: () => void;
}

interface Post {
  post_id: string;
  user_id: string;
  name: string;
  picture?: string;
  content: string;
  image?: string;
  created_at: string;
  like_count: string | number;
}

export default function GroupDetailScreen({ user, token, group, onClose }: GroupDetailScreenProps) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'about' | 'members'>('feed');

  useEffect(() => {
    fetchGroupPosts();
  }, []);

  const getAuthToken = () => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('auth_token') || token;
    }
    return token;
  };

  const fetchGroupPosts = async () => {
    try {
      const authToken = getAuthToken();
      const res = await fetch(`${API_URL}/api/feed?type=groups&group_id=${group.group_id}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setPosts(data.posts || []);
      }
    } catch (err) {
      console.error('Failed to fetch group posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const createPost = async () => {
    if (!newPostContent.trim() || posting) return;
    
    setPosting(true);
    try {
      const authToken = getAuthToken();
      const res = await fetch(`${API_URL}/api/feed`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newPostContent.trim(),
          group_id: group.group_id,
          visibility: 'group',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewPostContent('');
        fetchGroupPosts();
      }
    } catch (err) {
      console.error('Failed to create post:', err);
    } finally {
      setPosting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View style={[styles.postCard, { backgroundColor: colors.surface }]}>
      <View style={styles.postHeader}>
        {item.picture ? (
          <Image source={{ uri: item.picture }} style={styles.postAvatar} />
        ) : (
          <View style={[styles.postAvatarPlaceholder, { backgroundColor: colors.surfaceSecondary }]}>
            <Ionicons name="person" size={16} color={colors.textTertiary} />
          </View>
        )}
        <View style={styles.postHeaderInfo}>
          <Text style={[styles.postUserName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.postDate, { color: colors.textTertiary }]}>{formatDate(item.created_at)}</Text>
        </View>
      </View>
      <Text style={[styles.postContent, { color: colors.text }]}>{item.content}</Text>
      {item.image && (
        <Image source={{ uri: item.image }} style={styles.postImage} resizeMode="cover" />
      )}
      <View style={[styles.postActions, { borderTopColor: colors.border }]}>
        <TouchableOpacity style={styles.postAction}>
          <Ionicons name="heart-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.postActionText, { color: colors.textSecondary }]}>{item.like_count || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.postAction}>
          <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Show Group Chat
  if (showChat) {
    return (
      <GroupChatScreen
        user={user}
        token={token}
        group={group}
        onClose={() => setShowChat(false)}
      />
    );
  }

  return (
    <Container style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{group.name}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{group.member_count} members</Text>
        </View>
        <TouchableOpacity 
          style={[styles.chatButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowChat(true)}
          data-testid="open-chat-btn"
        >
          <Ionicons name="chatbubbles" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Group Banner */}
      <View style={styles.banner}>
        {group.image ? (
          <Image source={{ uri: group.image }} style={styles.bannerImage} />
        ) : (
          <View style={[styles.bannerPlaceholder, { backgroundColor: colors.surfaceSecondary }]}>
            <Ionicons name="people" size={48} color={colors.textTertiary} />
          </View>
        )}
        <View style={styles.bannerOverlay}>
          <Text style={styles.bannerTitle}>{group.name}</Text>
          {group.privacy === 'private' && (
            <View style={styles.privateBadge}>
              <Ionicons name="lock-closed" size={12} color="#FFFFFF" />
              <Text style={styles.privateBadgeText}>Private</Text>
            </View>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {(['feed', 'about', 'members'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === tab && { color: colors.primary }]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content based on tab */}
      {activeTab === 'feed' && (
        <View style={styles.feedContainer}>
          {/* New Post Input */}
          <View style={[styles.newPostCard, { backgroundColor: colors.surface }]}>
            <TextInput
              style={[styles.newPostInput, { backgroundColor: colors.surfaceSecondary, color: colors.text }]}
              placeholder="Share something with the group..."
              placeholderTextColor={colors.textTertiary}
              value={newPostContent}
              onChangeText={setNewPostContent}
              multiline
            />
            <TouchableOpacity
              style={[styles.postButton, { backgroundColor: colors.primary }, (!newPostContent.trim() || posting) && styles.postButtonDisabled]}
              onPress={createPost}
              disabled={!newPostContent.trim() || posting}
            >
              {posting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={posts}
              renderItem={renderPost}
              keyExtractor={(item) => item.post_id}
              contentContainerStyle={styles.postsList}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="newspaper-outline" size={48} color={colors.textTertiary} />
                  <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No posts yet</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>Be the first to share something!</Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {activeTab === 'about' && (
        <ScrollView style={styles.aboutContainer}>
          <View style={[styles.aboutSection, { backgroundColor: colors.surface }]}>
            <Text style={[styles.aboutLabel, { color: colors.textSecondary }]}>Description</Text>
            <Text style={[styles.aboutText, { color: colors.text }]}>
              {group.description || 'No description provided for this group.'}
            </Text>
          </View>
          
          <View style={[styles.aboutSection, { backgroundColor: colors.surface }]}>
            <Text style={[styles.aboutLabel, { color: colors.textSecondary }]}>Group Info</Text>
            <View style={styles.infoRow}>
              <Ionicons name="people" size={18} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.text }]}>{group.member_count} members</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name={group.privacy === 'private' ? 'lock-closed' : 'globe'} size={18} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.text }]}>{group.privacy === 'private' ? 'Private group' : 'Public group'}</Text>
            </View>
            {group.role && (
              <View style={styles.infoRow}>
                <Ionicons name="shield" size={18} color={colors.textSecondary} />
                <Text style={[styles.infoText, { color: colors.text }]}>Your role: {group.role}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {activeTab === 'members' && (
        <View style={styles.membersContainer}>
          <View style={styles.centered}>
            <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>Members list</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>Coming soon...</Text>
          </View>
        </View>
      )}
    </Container>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F9FAFB',
    ...(Platform.OS === 'web' ? { paddingTop: 0 } : {}),
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  
  // Header
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    backgroundColor: '#FFFFFF', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E7EB',
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, marginHorizontal: 12 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  headerSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  chatButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#3B82F6', 
    alignItems: 'center', 
    justifyContent: 'center',
  },

  // Banner
  banner: { height: 140, backgroundColor: '#E5E7EB', position: 'relative' },
  bannerImage: { width: '100%', height: '100%' },
  bannerPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5E7EB' },
  bannerOverlay: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    padding: 16, 
    backgroundColor: 'rgba(0,0,0,0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  privateBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 12,
    gap: 4,
  },
  privateBadgeText: { fontSize: 12, color: '#FFFFFF', fontWeight: '500' },

  // Tabs
  tabs: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#3B82F6' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  tabTextActive: { color: '#3B82F6', fontWeight: '600' },

  // Feed
  feedContainer: { flex: 1 },
  newPostCard: { 
    backgroundColor: '#FFFFFF', 
    padding: 16, 
    margin: 16, 
    marginBottom: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  newPostInput: { 
    flex: 1, 
    minHeight: 60, 
    maxHeight: 120,
    backgroundColor: '#F3F4F6', 
    borderRadius: 8, 
    padding: 12, 
    fontSize: 14,
    textAlignVertical: 'top',
  },
  postButton: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: '#3B82F6', 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  postButtonDisabled: { backgroundColor: '#93C5FD' },
  postsList: { paddingHorizontal: 16, paddingBottom: 20 },

  // Posts
  postCard: { 
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
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  postAvatar: { width: 40, height: 40, borderRadius: 20 },
  postAvatarPlaceholder: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#E5E7EB', 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  postHeaderInfo: { marginLeft: 12 },
  postUserName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  postDate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  postContent: { fontSize: 15, color: '#374151', lineHeight: 22 },
  postImage: { width: '100%', height: 200, borderRadius: 8, marginTop: 12 },
  postActions: { flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 16 },
  postAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  postActionText: { fontSize: 14, color: '#6B7280' },

  // About
  aboutContainer: { flex: 1, padding: 16 },
  aboutSection: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12 },
  aboutLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', marginBottom: 8 },
  aboutText: { fontSize: 15, color: '#374151', lineHeight: 22 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  infoText: { fontSize: 14, color: '#374151' },

  // Members
  membersContainer: { flex: 1 },

  // Empty states
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#6B7280', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
});
