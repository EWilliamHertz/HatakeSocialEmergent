import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';
import { useTheme } from '../context/ThemeContext';

interface UserProfile {
  user_id: string;
  name: string;
  email?: string;
  picture?: string;
  bio?: string;
  created_at?: string;
  collection_count?: number;
  post_count?: number;
  friend_count?: number;
  is_friend?: boolean;
}

interface CollectionItem {
  id: number;
  card_id: string;
  card_data: any;
  game: 'mtg' | 'pokemon';
  quantity: number;
}

interface UserProfileModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  token: string;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = (SCREEN_WIDTH - 64) / 3; // 3 cards per row with padding

export default function UserProfileModal({ 
  visible, 
  onClose, 
  userId,
  token 
}: UserProfileModalProps) {
  const { colors } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ collections: 0, posts: 0, friends: 0 });
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [showCollection, setShowCollection] = useState(false);
  const [loadingCollection, setLoadingCollection] = useState(false);

  useEffect(() => {
    if (visible && userId) {
      fetchProfile();
      setShowCollection(false);
      setCollection([]);
    }
  }, [visible, userId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : token;
      
      // Fetch user profile
      const response = await fetch(`${API_URL}/api/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setProfile(data.user);
          setStats({
            collections: data.user.collection_count || 0,
            posts: data.user.post_count || 0,
            friends: data.user.friend_count || 0,
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserCollection = async () => {
    try {
      setLoadingCollection(true);
      const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : token;
      
      const response = await fetch(`${API_URL}/api/users/${userId}/collection`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.items)) {
          setCollection(data.items);
        }
      }
    } catch (err) {
      console.error('Failed to fetch collection:', err);
    } finally {
      setLoadingCollection(false);
    }
  };

  const handleViewCollection = () => {
    setShowCollection(true);
    if (collection.length === 0) {
      fetchUserCollection();
    }
  };

  const getCardImage = (item: CollectionItem): string => {
    const cardData = item.card_data;
    if (!cardData) return '';
    
    // MTG cards
    if (item.game === 'mtg') {
      return cardData.image_uris?.normal || cardData.card_faces?.[0]?.image_uris?.normal || '';
    }
    
    // Pokemon cards
    if (cardData.image) {
      return `${cardData.image}/high.webp`;
    }
    return cardData.images?.large || cardData.images?.small || '';
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const renderCollectionItem = ({ item }: { item: CollectionItem }) => {
    const imageUrl = getCardImage(item);
    return (
      <View style={styles.collectionCard}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.collectionCardImage} />
        ) : (
          <View style={styles.collectionCardPlaceholder}>
            <Ionicons name="image-outline" size={24} color="#9CA3AF" />
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => {
            if (showCollection) {
              setShowCollection(false);
            } else {
              onClose();
            }
          }} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {showCollection ? `${profile?.name}'s Collection` : 'Profile'}
          </Text>
          <View style={styles.headerRight} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : !profile ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
            <Text style={styles.errorText}>Could not load profile</Text>
          </View>
        ) : showCollection ? (
          /* Collection View */
          <View style={styles.collectionContainer}>
            {loadingCollection ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
              </View>
            ) : collection.length === 0 ? (
              <View style={styles.emptySection}>
                <Ionicons name="albums-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptySectionText}>No cards in collection</Text>
              </View>
            ) : (
              <FlatList
                data={collection}
                renderItem={renderCollectionItem}
                keyExtractor={(item) => String(item.id)}
                numColumns={3}
                contentContainerStyle={styles.collectionGrid}
              />
            )}
          </View>
        ) : (
          <ScrollView style={styles.content}>
            {/* Profile Header */}
            <View style={styles.profileHeader}>
              {profile.picture ? (
                <Image source={{ uri: profile.picture }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={48} color="#9CA3AF" />
                </View>
              )}
              <Text style={styles.name}>{profile.name}</Text>
              {profile.bio && (
                <Text style={styles.bio}>{profile.bio}</Text>
              )}
              {profile.created_at && (
                <Text style={styles.joinDate}>
                  <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
                  {' '}Joined {formatDate(profile.created_at)}
                </Text>
              )}
            </View>

            {/* Stats */}
            <View style={styles.statsContainer}>
              <TouchableOpacity style={styles.statItem} onPress={handleViewCollection}>
                <Text style={styles.statValue}>{stats.collections}</Text>
                <Text style={styles.statLabelLink}>Cards</Text>
                <Ionicons name="chevron-forward" size={14} color="#3B82F6" />
              </TouchableOpacity>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.posts}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.friends}</Text>
                <Text style={styles.statLabel}>Friends</Text>
              </View>
            </View>

            {/* View Collection Button */}
            <TouchableOpacity 
              style={styles.viewCollectionButton}
              onPress={handleViewCollection}
            >
              <Ionicons name="albums-outline" size={20} color="#3B82F6" />
              <Text style={styles.viewCollectionText}>View Collection</Text>
              <Ionicons name="chevron-forward" size={20} color="#3B82F6" />
            </TouchableOpacity>

            {/* Actions */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="person-add-outline" size={20} color="#3B82F6" />
                <Text style={styles.actionButtonText}>Add Friend</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButtonSecondary}>
                <Ionicons name="chatbubble-outline" size={20} color="#6B7280" />
                <Text style={styles.actionButtonTextSecondary}>Message</Text>
              </TouchableOpacity>
            </View>

            {/* Placeholder for user's recent activity */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <View style={styles.emptySection}>
                <Ionicons name="newspaper-outline" size={32} color="#D1D5DB" />
                <Text style={styles.emptySectionText}>No recent activity</Text>
              </View>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerRight: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginTop: 16,
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
  },
  bio: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  joinDate: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    marginHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  statLabelLink: {
    fontSize: 13,
    color: '#3B82F6',
    marginTop: 2,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E5E7EB',
  },
  viewCollectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 14,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    gap: 8,
  },
  viewCollectionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3B82F6',
  },
  collectionContainer: {
    flex: 1,
  },
  collectionGrid: {
    padding: 12,
  },
  collectionCard: {
    width: CARD_WIDTH,
    aspectRatio: 0.72,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  collectionCardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  collectionCardPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3B82F6',
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    gap: 8,
  },
  actionButtonTextSecondary: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  emptySectionText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
});
