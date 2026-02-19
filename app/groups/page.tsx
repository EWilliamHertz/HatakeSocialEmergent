'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Users, Plus, Search, Lock, Globe, Settings, UserPlus, Crown, ChevronRight, Loader2, MessageSquare, Activity, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import Image from 'next/image';

interface Group {
  group_id: string;
  name: string;
  description?: string;
  image?: string;
  banner_image?: string;
  privacy: 'public' | 'private';
  member_count: number;
  role?: string;
  created_at: string;
  recent_activity?: number; // Number of posts in last 7 days
  last_activity?: string; // Last post date
}

export default function GroupsPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [discoverGroups, setDiscoverGroups] = useState<Group[]>([]);
  const [tab, setTab] = useState<'my' | 'discover'>('my');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    privacy: 'public' as 'public' | 'private',
  });

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) {
          router.push('/auth/login');
          return;
        }
        setAuthenticated(true);
        return res.json();
      })
      .then(() => {
        loadMyGroups();
        loadDiscoverGroups();
      })
      .catch(() => router.push('/auth/login'));
  }, [router]);

  const loadMyGroups = async () => {
    try {
      const res = await fetch('/api/groups?type=my', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setMyGroups(data.groups || []);
      }
    } catch (error) {
      console.error('Load my groups error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDiscoverGroups = async () => {
    try {
      const res = await fetch('/api/groups?type=discover', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setDiscoverGroups(data.groups || []);
      }
    } catch (error) {
      console.error('Load discover groups error:', error);
    }
  };

  const createGroup = async () => {
    if (!newGroup.name.trim()) return;
    setCreating(true);

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newGroup),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setNewGroup({ name: '', description: '', privacy: 'public' });
        loadMyGroups();
        if (data.groupId) {
          router.push(`/groups/${data.groupId}`);
        }
      }
    } catch (error) {
      console.error('Create group error:', error);
    } finally {
      setCreating(false);
    }
  };

  const joinGroup = async (groupId: string) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/join`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        loadMyGroups();
        loadDiscoverGroups();
      }
    } catch (error) {
      console.error('Join group error:', error);
    }
  };

  const filteredGroups = (tab === 'my' ? myGroups : discoverGroups).filter(
    (group) =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!authenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Groups</h1>
            <p className="text-gray-600 dark:text-gray-400">Join communities of TCG collectors</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
            data-testid="create-group-btn"
          >
            <Plus className="w-5 h-5" />
            Create Group
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-6 p-2 flex gap-2">
          <button
            onClick={() => setTab('my')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${
              tab === 'my'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            data-testid="my-groups-tab"
          >
            <Users className="w-5 h-5 inline mr-2" />
            My Groups ({myGroups.length})
          </button>
          <button
            onClick={() => setTab('discover')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${
              tab === 'discover'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            data-testid="discover-groups-tab"
          >
            <Search className="w-5 h-5 inline mr-2" />
            Discover
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search groups..."
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
            data-testid="search-groups-input"
          />
        </div>

        {/* Groups List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {tab === 'my'
                ? "You haven't joined any groups yet"
                : 'No groups found'}
            </p>
            {tab === 'my' && (
              <button
                onClick={() => setTab('discover')}
                className="mt-4 text-blue-600 dark:text-blue-400 font-semibold hover:underline"
              >
                Discover groups to join
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredGroups.map((group) => (
              <div
                key={group.group_id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition"
                data-testid={`group-${group.group_id}`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    {group.image ? (
                      <Image
                        src={group.image}
                        alt={group.name}
                        width={64}
                        height={64}
                        className="rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
                        <Users className="w-8 h-8" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {group.name}
                        </h3>
                        {group.privacy === 'private' ? (
                          <Lock className="w-4 h-4 text-gray-400" />
                        ) : (
                          <Globe className="w-4 h-4 text-gray-400" />
                        )}
                        {group.role === 'admin' && (
                          <Crown className="w-4 h-4 text-yellow-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                        {group.description || 'No description'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
                  {tab === 'my' ? (
                    <>
                      <button
                        onClick={() => router.push(`/groups/${group.group_id}`)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg font-medium transition"
                        data-testid={`view-group-${group.group_id}`}
                      >
                        View
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      {group.role === 'admin' && (
                        <button
                          onClick={() => router.push(`/groups/${group.group_id}/settings`)}
                          className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={() => joinGroup(group.group_id)}
                      className="flex items-center gap-1 px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700 transition"
                      data-testid={`join-group-${group.group_id}`}
                    >
                      <UserPlus className="w-4 h-4" />
                      Join
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create a Group</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Start a community for TCG collectors</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  placeholder="e.g., Pokemon Collectors NYC"
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  data-testid="group-name-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  placeholder="What's your group about?"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                  data-testid="group-description-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Privacy
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setNewGroup({ ...newGroup, privacy: 'public' })}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition ${
                      newGroup.privacy === 'public'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'
                    }`}
                    data-testid="privacy-public"
                  >
                    <Globe className="w-5 h-5" />
                    Public
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewGroup({ ...newGroup, privacy: 'private' })}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition ${
                      newGroup.privacy === 'private'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'
                    }`}
                    data-testid="privacy-private"
                  >
                    <Lock className="w-5 h-5" />
                    Private
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {newGroup.privacy === 'public'
                    ? 'Anyone can find and join this group'
                    : 'Only invited members can join this group'}
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 flex justify-end gap-3 rounded-b-2xl">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium transition"
                data-testid="cancel-create-group"
              >
                Cancel
              </button>
              <button
                onClick={createGroup}
                disabled={!newGroup.name.trim() || creating}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                data-testid="submit-create-group"
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
