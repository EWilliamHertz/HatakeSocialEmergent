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
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';
import CommentsModal from '../components/CommentsModal';
import UserProfileModal from '../components/UserProfileModal';
import { useTheme } from '../context/ThemeContext';

interface Reaction {
  emoji: string;
  count: number;
  userReacted: boolean;
}

interface Post {
  post_id?: string;
  id?: number | string;
  user_id: string;
  name: string;           // API returns 'name' 
  picture?: string;       // API returns 'picture'
  content: string;
  image?: string;         // API returns 'image'
  image_url?: string;     // Legacy field
  card_data?: any;
  card_id?: string;
  game?: string;
  like_count: number;     // API returns 'like_count'
  comment_count: number;  // API returns 'comment_count'
  likes_count?: number;   // Legacy field
  comments_count?: number; // Legacy field
  created_at: string;
  liked?: boolean;        // API returns 'liked'
  is_liked?: boolean;     // Legacy field
  reactions?: Reaction[]; // Emoji reactions
  group_id?: string;      // Group post association
  group_name?: string;    // Group name for display
}

const EMOJI_OPTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

interface FeedScreenProps {
  user: any;
  token: string;
  onOpenMenu: () => void;
  onOpenNotifications?: () => void;
}

export default function FeedScreen({ user, token, onOpenMenu, onOpenNotifications }: FeedScreenProps) {
  const { colors } = useTheme();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'groups' | 'public'>('public');
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [newPostText, setNewPostText] = useState('');
  const [posting, setPosting] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [viewProfileUserId, setViewProfileUserId] = useState<string | null>(null);
  
  // Groups for posting
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showGroupPicker, setShowGroupPicker] = useState(false);

  useEffect(() => {
    fetchPosts();
    fetchMyGroups();
  }, [activeTab]);

  const fetchMyGroups = async () => {
    try {
      const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : token;
      const res = await fetch(`${API_URL}/api/groups?type=my`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        // API returns 'groups' not 'myGroups'
        setMyGroups(data.groups || []);
      }
    } catch (err) {
      console.log('Failed to fetch groups:', err);
    }
  };

  const fetchPosts = async () => {
    try {
      const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : token;
      
      // Build URL with group filter if applicable
      let url = `${API_URL}/api/feed?type=${activeTab}`;
      if (activeTab === 'groups' && selectedGroup) {
        url += `&group_id=${selectedGroup}`;
      }
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await response.json();
      
      if (data.success && Array.isArray(data.posts)) {
        setPosts(data.posts);
      } else {
        // Show some placeholder posts if API doesn't exist yet
        setPosts([]);
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err);
      setPosts([]);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchPosts();
  }, [activeTab, selectedGroup]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const createPost = async () => {
    if (!newPostText.trim()) return;
    
    setPosting(true);
    try {
      const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : token;
      
      const postData: any = { content: newPostText };
      
      // If posting to a specific group
      if (activeTab === 'groups' && selectedGroup) {
        postData.group_id = selectedGroup;
        postData.visibility = 'group';
      }
      
      const response = await fetch(`${API_URL}/api/feed`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });
      
      if (response.ok) {
        setNewPostText('');
        fetchPosts();
      }
    } catch (err) {
      console.error('Failed to create post:', err);
    }
    setPosting(false);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(hours / 24);
      
      if (hours < 1) return 'Just now';
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;
      return date.toLocaleDateString();
    } catch {
      return '';
    }
  };

  const getCardImageUrl = (cardData: any) => {
    if (!cardData) return '';
    // MTG uses image_uris
    if (cardData.image_uris?.small) return cardData.image_uris.small;
    if (cardData.card_faces?.[0]?.image_uris?.small) return cardData.card_faces[0].image_uris.small;
    // Pokemon/TCGdex uses image as direct URL
    if (cardData.image) {
      const url = cardData.image;
      return url.includes('.') ? url : `${url}/high.webp`;
    }
    // Legacy format
    return cardData.images?.small || '';
  };

  const renderPost = ({ item }: { item: Post }) => {
    // Handle both old and new API field names
    const userName = item.name || '';
    const userPicture = item.picture;
    const imageUrl = item.image || item.image_url;
    const likeCount = item.like_count ?? item.likes_count ?? 0;
    const commentCount = item.comment_count ?? item.comments_count ?? 0;
    const isLiked = item.liked ?? item.is_liked ?? false;
    const userId = item.user_id;
    const postId = String(item.post_id || item.id);

    const handleUserPress = () => {
      // Open user profile modal
      setViewProfileUserId(item.user_id);
    };

    const handleLike = async () => {
      // Toggle like - API call
      try {
        const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : token;
        const response = await fetch(`${API_URL}/api/feed/${postId}/like`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${authToken}` },
        });
        const result = await response.json();
        if (result.success) {
          fetchPosts(); // Refresh to get updated count
        }
      } catch (err) {
        console.log('Like error:', err);
      }
    };

    const handleReaction = async (emoji: string) => {
      try {
        const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : token;
        const response = await fetch(`${API_URL}/api/feed/${postId}/reactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({ emoji }),
        });
        const result = await response.json();
        if (result.success) {
          setShowEmojiPicker(null);
          fetchPosts(); // Refresh to get updated reactions
        }
      } catch (err) {
        console.log('Reaction error:', err);
      }
    };

    const handleComment = () => {
      setCommentsPostId(postId);
    };

    return (
      <View style={[styles.post, { backgroundColor: colors.surface }]}>
        <TouchableOpacity style={styles.postHeader} onPress={handleUserPress}>
          {userPicture ? (
            <Image source={{ uri: userPicture }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surfaceSecondary }]}>
              <Ionicons name="person" size={16} color={colors.textTertiary} />
            </View>
          )}
          <View style={styles.postHeaderInfo}>
            <View style={styles.userNameRow}>
              <Text style={[styles.userName, { color: colors.text }]}>{userName}</Text>
              {item.group_name && (
                <Text style={styles.groupNameBadge}>@ {item.group_name}</Text>
              )}
            </View>
            <Text style={[styles.postTime, { color: colors.textTertiary }]}>{formatDate(item.created_at)}</Text>
          </View>
        </TouchableOpacity>
        
        <Text style={[styles.postContent, { color: colors.text }]}>{item.content}</Text>
        
        {imageUrl && (
          <Image source={{ uri: imageUrl }} style={styles.postImage} />
        )}
        
        {item.card_data && (
          <View style={[styles.cardPreview, { backgroundColor: colors.surfaceSecondary }]}>
            <Image 
              source={{ uri: getCardImageUrl(item.card_data) }} 
              style={styles.cardPreviewImage} 
            />
            <Text style={[styles.cardPreviewName, { color: colors.text }]}>{item.card_data.name}</Text>
          </View>
        )}

        {/* Emoji Reactions Display */}
        {item.reactions && item.reactions.length > 0 && (
          <View style={styles.reactionsRow}>
            {item.reactions.map((r, idx) => (
              <TouchableOpacity 
                key={idx} 
                style={[styles.reactionBadge, { backgroundColor: colors.surfaceSecondary }, r.userReacted && { backgroundColor: colors.primaryLight }]}
                onPress={() => handleReaction(r.emoji)}
              >
                <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                <Text style={[styles.reactionCount, { color: colors.text }]}>{r.count}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        <View style={[styles.postActions, { borderTopColor: colors.border }]}>
          <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
            <Ionicons 
              name={isLiked ? "heart" : "heart-outline"} 
              size={20} 
              color={isLiked ? "#EF4444" : colors.textSecondary} 
            />
            <Text style={[styles.actionText, { color: colors.textSecondary }]}>{likeCount}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleComment}>
            <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.actionText, { color: colors.textSecondary }]}>{commentCount}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => setShowEmojiPicker(showEmojiPicker === postId ? null : postId)}
          >
            <Ionicons name="happy-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="share-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Emoji Picker */}
        {showEmojiPicker === postId && (
          <View style={[styles.emojiPicker, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {EMOJI_OPTIONS.map((emoji) => (
              <TouchableOpacity 
                key={emoji} 
                style={styles.emojiOption}
                onPress={() => handleReaction(emoji)}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with menu button */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onOpenMenu} style={styles.menuButton}>
          <Ionicons name="menu" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Feed</Text>
        <TouchableOpacity style={styles.notifButton} onPress={onOpenNotifications}>
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={[styles.tabs, { backgroundColor: colors.surface }]}>
        {(['friends', 'groups', 'public'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, { backgroundColor: colors.surfaceSecondary }, activeTab === tab && { backgroundColor: colors.primaryLight }]}
            onPress={() => setActiveTab(tab)}
          >
            <Ionicons 
              name={tab === 'friends' ? 'people' : tab === 'groups' ? 'chatbubbles' : 'globe'} 
              size={18} 
              color={activeTab === tab ? colors.primary : colors.textTertiary} 
            />
            <Text style={[styles.tabText, { color: colors.textTertiary }, activeTab === tab && { color: colors.primary }]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Group Selector when on Groups tab */}
      {activeTab === 'groups' && myGroups.length > 0 && (
        <TouchableOpacity 
          style={styles.groupSelector}
          onPress={() => setShowGroupPicker(!showGroupPicker)}
        >
          <Ionicons name="chatbubbles-outline" size={18} color="#3B82F6" />
          <Text style={styles.groupSelectorText}>
            {selectedGroup 
              ? myGroups.find(g => g.group_id === selectedGroup)?.name || 'Select Group'
              : 'All Groups'}
          </Text>
          <Ionicons name={showGroupPicker ? 'chevron-up' : 'chevron-down'} size={18} color="#6B7280" />
        </TouchableOpacity>
      )}

      {/* Group Picker Dropdown */}
      {showGroupPicker && (
        <View style={styles.groupPickerDropdown}>
          <TouchableOpacity 
            style={[styles.groupPickerItem, !selectedGroup && styles.groupPickerItemActive]}
            onPress={() => { setSelectedGroup(null); setShowGroupPicker(false); }}
          >
            <Text style={styles.groupPickerText}>All Groups</Text>
          </TouchableOpacity>
          {myGroups.map(group => (
            <TouchableOpacity 
              key={group.group_id}
              style={[styles.groupPickerItem, selectedGroup === group.group_id && styles.groupPickerItemActive]}
              onPress={() => { setSelectedGroup(group.group_id); setShowGroupPicker(false); }}
            >
              <Text style={styles.groupPickerText}>{group.name}</Text>
              <Text style={styles.groupPickerCount}>{group.member_count} members</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* New Post Input */}
      <View style={[styles.newPostContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {activeTab === 'groups' && selectedGroup && (
          <View style={[styles.postingToGroup, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="chatbubbles" size={14} color={colors.primary} />
            <Text style={[styles.postingToGroupText, { color: colors.primary }]}>
              Posting to {myGroups.find(g => g.group_id === selectedGroup)?.name}
            </Text>
          </View>
        )}
        <View style={styles.newPostRow}>
          <TextInput
            style={[styles.newPostInput, { backgroundColor: colors.surfaceSecondary, color: colors.text }]}
            placeholder={activeTab === 'groups' && selectedGroup 
              ? "Share with this group..." 
              : "Share something with your community..."}
            placeholderTextColor={colors.textTertiary}
            value={newPostText}
            onChangeText={setNewPostText}
            multiline
          />
          <TouchableOpacity 
            style={[styles.postButton, (!newPostText.trim() || posting) && styles.postButtonDisabled]}
            onPress={createPost}
            disabled={!newPostText.trim() || posting}
          >
            {posting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="newspaper-outline" size={64} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No posts yet</Text>
          <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
            {activeTab === 'friends' 
              ? 'Follow friends to see their posts here' 
              : activeTab === 'groups'
              ? 'Join groups to see group posts'
              : 'Be the first to post something!'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        />
      )}

      {/* Comments Modal */}
      <CommentsModal
        visible={!!commentsPostId}
        onClose={() => setCommentsPostId(null)}
        postId={commentsPostId || ''}
        token={token}
        onCommentAdded={() => {
          // Refresh posts to update comment count
          fetchPosts();
        }}
      />

      {/* User Profile Modal */}
      <UserProfileModal
        visible={!!viewProfileUserId}
        onClose={() => setViewProfileUserId(null)}
        userId={viewProfileUserId || ''}
        token={token}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  menuButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  notifButton: {
    padding: 4,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#DBEAFE',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  tabTextActive: {
    color: '#3B82F6',
  },
  groupSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  groupSelectorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  groupPickerDropdown: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  groupPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  groupPickerItemActive: {
    backgroundColor: '#EFF6FF',
  },
  groupPickerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  groupPickerCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  postingToGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 8,
    gap: 6,
  },
  postingToGroupText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  newPostContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  newPostRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  newPostInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  postButton: {
    backgroundColor: '#3B82F6',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  list: {
    padding: 12,
  },
  post: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postHeaderInfo: {
    marginLeft: 10,
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  groupNameBadge: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3B82F6',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  postTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  postContent: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 12,
  },
  cardPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 8,
    marginTop: 12,
  },
  cardPreviewImage: {
    width: 40,
    height: 56,
    borderRadius: 4,
  },
  cardPreviewName: {
    marginLeft: 10,
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937',
  },
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  reactionBadgeActive: {
    backgroundColor: '#DBEAFE',
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  emojiPicker: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    marginTop: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  emojiOption: {
    padding: 8,
  },
  emojiText: {
    fontSize: 20,
  },
  postActions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 13,
    color: '#6B7280',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
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
    marginTop: 4,
    textAlign: 'center',
  },
});
