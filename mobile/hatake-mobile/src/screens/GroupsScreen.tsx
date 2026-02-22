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
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';
import { useTheme } from '../context/ThemeContext';
import GroupDetailScreen from './GroupDetailScreen';

// Use regular View on web to avoid SafeAreaView issues
const Container = Platform.OS === 'web' ? View : SafeAreaView;

interface Group {
  group_id: string;
  name: string;
  description?: string;
  image?: string;
  privacy: 'public' | 'private';
  member_count: number;
  role?: string;
  created_at: string;
}

interface GroupInvite {
  invite_id: string;
  group_id: string;
  group_name: string;
  group_description?: string;
  group_image?: string;
  privacy: string;
  inviter_name: string;
  inviter_picture?: string;
  created_at: string;
}

interface GroupsScreenProps {
  user: any;
  token: string;
  onClose: () => void;
}

export default function GroupsScreen({ user, token, onClose }: GroupsScreenProps) {
  const { colors } = useTheme();
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [discoverGroups, setDiscoverGroups] = useState<Group[]>([]);
  const [groupInvites, setGroupInvites] = useState<GroupInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'my' | 'discover' | 'invites'>('my');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  
  // Create form
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPrivacy, setNewPrivacy] = useState<'public' | 'private'>('public');

  useEffect(() => {
    fetchGroups();
  }, []);

  const getAuthToken = () => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('auth_token') || token;
    }
    return token;
  };

  const fetchGroups = async () => {
    try {
      const authToken = getAuthToken();
      
      // Fetch my groups
      const myRes = await fetch(`${API_URL}/api/groups?type=my`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const myData = await myRes.json();
      if (myData.success) setMyGroups(myData.groups || []);
      
      // Fetch discover groups
      const discoverRes = await fetch(`${API_URL}/api/groups?type=discover`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const discoverData = await discoverRes.json();
      if (discoverData.success) setDiscoverGroups(discoverData.groups || []);
      
      // Fetch group invites
      const invitesRes = await fetch(`${API_URL}/api/groups/invites`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const invitesData = await invitesRes.json();
      if (invitesData.success) setGroupInvites(invitesData.invites || []);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const acceptInvite = async (inviteId: string) => {
    try {
      const authToken = getAuthToken();
      const res = await fetch(`${API_URL}/api/groups/invites`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inviteId, action: 'accept' }),
      });
      if (res.ok) {
        fetchGroups();
      }
    } catch (err) {
      console.error('Failed to accept invite:', err);
    }
  };

  const declineInvite = async (inviteId: string) => {
    try {
      const authToken = getAuthToken();
      const res = await fetch(`${API_URL}/api/groups/invites`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inviteId, action: 'decline' }),
      });
      if (res.ok) {
        setGroupInvites(prev => prev.filter(i => i.invite_id !== inviteId));
      }
    } catch (err) {
      console.error('Failed to decline invite:', err);
    }
  };

  const createGroup = async () => {
    if (!newName.trim()) return;
    
    setCreating(true);
    try {
      const authToken = getAuthToken();
      const res = await fetch(`${API_URL}/api/groups`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription || null,
          privacy: newPrivacy,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setNewName('');
        setNewDescription('');
        fetchGroups();
      }
    } catch (err) {
      console.error('Failed to create group:', err);
    } finally {
      setCreating(false);
    }
  };

  const joinGroup = async (groupId: string) => {
    try {
      const authToken = getAuthToken();
      const res = await fetch(`${API_URL}/api/groups/${groupId}/join`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        fetchGroups();
      }
    } catch (err) {
      console.error('Failed to join group:', err);
    }
  };

  const leaveGroup = async (groupId: string) => {
    try {
      const authToken = getAuthToken();
      const res = await fetch(`${API_URL}/api/groups/${groupId}/leave`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        fetchGroups();
      }
    } catch (err) {
      console.error('Failed to leave group:', err);
    }
  };

  const renderGroup = ({ item }: { item: Group }) => {
    const isMember = tab === 'my';
    
    return (
      <TouchableOpacity 
        style={[styles.groupCard, { backgroundColor: colors.surface }]} 
        data-testid={`group-${item.group_id}`}
        onPress={isMember ? () => setSelectedGroup(item) : undefined}
        activeOpacity={isMember ? 0.7 : 1}
      >
        <View style={styles.groupImage}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.groupImageImg} />
          ) : (
            <View style={[styles.groupImagePlaceholder, { backgroundColor: colors.surfaceSecondary }]}>
              <Ionicons name="people" size={28} color={colors.textTertiary} />
            </View>
          )}
        </View>
        
        <View style={styles.groupInfo}>
          <View style={styles.groupNameRow}>
            <Text style={[styles.groupName, { color: colors.text }]}>{item.name}</Text>
            {item.privacy === 'private' && (
              <Ionicons name="lock-closed" size={14} color={colors.textSecondary} />
            )}
          </View>
          {item.description && (
            <Text style={[styles.groupDescription, { color: colors.textSecondary }]} numberOfLines={2}>{item.description}</Text>
          )}
          <View style={styles.groupMeta}>
            <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.memberCount, { color: colors.textSecondary }]}>{item.member_count} members</Text>
            {item.role && (
              <View style={[styles.roleBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.roleText, { color: colors.primary }]}>{item.role}</Text>
              </View>
            )}
          </View>
        </View>

        {isMember ? (
          <View style={styles.memberActions}>
            <TouchableOpacity 
              style={[styles.chatButton, { backgroundColor: colors.primary }]}
              onPress={() => setSelectedGroup(item)}
              data-testid={`chat-${item.group_id}`}
            >
              <Ionicons name="chatbubble" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.arrowButton}
              onPress={() => setSelectedGroup(item)}
            >
              <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={[styles.joinButton, { backgroundColor: colors.primary }]}
            onPress={() => joinGroup(item.group_id)}
          >
            <Text style={styles.joinButtonText}>Join</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  // If viewing a group detail page
  if (selectedGroup) {
    return (
      <GroupDetailScreen
        user={user}
        token={token}
        group={selectedGroup}
        onClose={() => setSelectedGroup(null)}
      />
    );
  }

  const currentGroups = tab === 'my' ? myGroups : tab === 'discover' ? discoverGroups : [];

  const renderInvite = ({ item }: { item: GroupInvite }) => (
    <View style={styles.inviteCard} data-testid={`invite-${item.invite_id}`}>
      <View style={styles.inviteHeader}>
        {item.group_image ? (
          <Image source={{ uri: item.group_image }} style={styles.inviteImage} />
        ) : (
          <View style={styles.inviteImagePlaceholder}>
            <Ionicons name="people" size={24} color="#9CA3AF" />
          </View>
        )}
        <View style={styles.inviteInfo}>
          <Text style={styles.inviteName}>{item.group_name}</Text>
          {item.group_description && (
            <Text style={styles.inviteDescription} numberOfLines={1}>{item.group_description}</Text>
          )}
          <Text style={styles.inviterText}>Invited by {item.inviter_name}</Text>
        </View>
      </View>
      <View style={styles.inviteActions}>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => acceptInvite(item.invite_id)}
        >
          <Ionicons name="checkmark" size={18} color="#FFFFFF" />
          <Text style={styles.acceptButtonText}>Join</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.declineButton, { borderColor: colors.border }]}
          onPress={() => declineInvite(item.invite_id)}
        >
          <Ionicons name="close" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Container style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Communities</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
          data-testid="create-group-btn"
        >
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[styles.tab, { borderBottomColor: 'transparent' }, tab === 'my' && { borderBottomColor: colors.primary }]}
          onPress={() => setTab('my')}
        >
          <Text style={[styles.tabText, { color: colors.textSecondary }, tab === 'my' && { color: colors.primary }]}>
            My Groups ({myGroups.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, { borderBottomColor: 'transparent' }, tab === 'discover' && { borderBottomColor: colors.primary }]}
          onPress={() => setTab('discover')}
        >
          <Text style={[styles.tabText, { color: colors.textSecondary }, tab === 'discover' && { color: colors.primary }]}>
            Discover
          </Text>
        </TouchableOpacity>
        {groupInvites.length > 0 && (
          <TouchableOpacity
            style={[styles.tab, { borderBottomColor: 'transparent' }, tab === 'invites' && { borderBottomColor: colors.primary }]}
            onPress={() => setTab('invites')}
          >
            <View style={[styles.inviteBadge, { backgroundColor: colors.danger }]}>
              <Text style={styles.inviteBadgeText}>{groupInvites.length}</Text>
            </View>
            <Text style={[styles.tabText, { color: colors.textSecondary }, tab === 'invites' && { color: colors.primary }]}>
              Invites
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : tab === 'invites' ? (
        <FlatList
          data={groupInvites}
          renderItem={renderInvite}
          keyExtractor={(item) => item.invite_id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchGroups(); }} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="mail-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No Invitations</Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>You don't have any pending group invitations</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={currentGroups}
          renderItem={renderGroup}
          keyExtractor={(item) => item.group_id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchGroups(); }} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>
                {tab === 'my' ? 'No Groups Yet' : 'No Groups to Discover'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {tab === 'my' 
                  ? 'Create or join a group to connect with other collectors'
                  : 'Check back later for new communities'}
              </Text>
              {tab === 'my' && (
                <TouchableOpacity 
                  style={styles.createButton}
                  onPress={() => setShowCreateModal(true)}
                >
                  <Text style={styles.createButtonText}>Create Group</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* Create Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Group</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Group Name"
              placeholderTextColor="#9CA3AF"
              value={newName}
              onChangeText={setNewName}
              data-testid="group-name-input"
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              placeholderTextColor="#9CA3AF"
              value={newDescription}
              onChangeText={setNewDescription}
              multiline
              numberOfLines={3}
            />

            <View style={styles.privacySelector}>
              <TouchableOpacity
                style={[styles.privacyOption, newPrivacy === 'public' && styles.privacyOptionActive]}
                onPress={() => setNewPrivacy('public')}
              >
                <Ionicons name="earth" size={20} color={newPrivacy === 'public' ? '#FFFFFF' : '#6B7280'} />
                <Text style={[styles.privacyText, newPrivacy === 'public' && styles.privacyTextActive]}>
                  Public
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.privacyOption, newPrivacy === 'private' && styles.privacyOptionActive]}
                onPress={() => setNewPrivacy('private')}
              >
                <Ionicons name="lock-closed" size={20} color={newPrivacy === 'private' ? '#FFFFFF' : '#6B7280'} />
                <Text style={[styles.privacyText, newPrivacy === 'private' && styles.privacyTextActive]}>
                  Private
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, (!newName.trim() || creating) && styles.submitButtonDisabled]}
              onPress={createGroup}
              disabled={!newName.trim() || creating}
              data-testid="submit-group-btn"
            >
              {creating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Create Group</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '600', color: '#1F2937', textAlign: 'center' },
  addButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#3B82F6' },
  tabText: { fontSize: 15, fontWeight: '500', color: '#6B7280' },
  tabTextActive: { color: '#3B82F6' },
  list: { padding: 16 },
  groupCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  groupImage: { marginRight: 12 },
  groupImageImg: { width: 56, height: 56, borderRadius: 12 },
  groupImagePlaceholder: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  groupInfo: { flex: 1 },
  groupNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  groupName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  groupDescription: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  groupMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  memberCount: { fontSize: 12, color: '#6B7280' },
  roleBadge: { backgroundColor: '#DBEAFE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  roleText: { fontSize: 11, fontWeight: '500', color: '#3B82F6', textTransform: 'capitalize' },
  memberActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chatButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' },
  joinButton: { backgroundColor: '#3B82F6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, alignSelf: 'flex-start' },
  joinButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  leaveButton: { padding: 8, alignSelf: 'flex-start' },
  arrowButton: { padding: 8, alignSelf: 'center' },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#6B7280', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#9CA3AF', marginTop: 4, textAlign: 'center', paddingHorizontal: 32 },
  createButton: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#3B82F6', borderRadius: 8 },
  createButtonText: { color: '#FFFFFF', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  input: { backgroundColor: '#F3F4F6', borderRadius: 8, padding: 14, fontSize: 15, color: '#1F2937', marginBottom: 12 },
  textArea: { height: 80, textAlignVertical: 'top' },
  privacySelector: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  privacyOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 8, backgroundColor: '#F3F4F6', gap: 8 },
  privacyOptionActive: { backgroundColor: '#3B82F6' },
  privacyText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  privacyTextActive: { color: '#FFFFFF' },
  submitButton: { backgroundColor: '#3B82F6', borderRadius: 8, padding: 16, alignItems: 'center' },
  submitButtonDisabled: { backgroundColor: '#93C5FD' },
  submitButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
  // Invite styles
  inviteCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  inviteHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  inviteImage: { width: 48, height: 48, borderRadius: 8 },
  inviteImagePlaceholder: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  inviteInfo: { flex: 1, marginLeft: 12 },
  inviteName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  inviteDescription: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  inviterText: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  inviteActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  acceptButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, gap: 6 },
  acceptButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  declineButton: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  inviteBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#EF4444', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  inviteBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  emptySubtext: { fontSize: 14, color: '#9CA3AF', marginTop: 4, textAlign: 'center', paddingHorizontal: 32 },
});
