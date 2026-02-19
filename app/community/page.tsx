'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import { Users, UsersRound, UserPlus, Search, Check, X, MessageCircle, Plus, ChevronRight } from 'lucide-react';

interface Friend {
  user_id: string;
  name: string;
  email: string;
  picture?: string;
}

interface FriendRequest {
  request_id: string;
  from_user_id: string;
  name: string;
  email: string;
  picture?: string;
  created_at: string;
}

interface Group {
  group_id: string;
  name: string;
  description: string;
  picture?: string;
  member_count: number;
  is_member: boolean;
  is_owner: boolean;
  created_at: string;
}

interface SearchUser {
  user_id: string;
  name: string;
  email: string;
  picture?: string;
  is_friend: boolean;
  request_pending: boolean;
}

export default function CommunityPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'friends';
  
  const [tab, setTab] = useState<'friends' | 'groups' | 'requests' | 'search'>(initialTab as any);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Group creation modal
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (!data.user) router.push('/auth/login');
        else loadData();
      })
      .catch(() => router.push('/auth/login'));
  }, [router]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadFriends(), loadRequests(), loadGroups()]);
    setLoading(false);
  };

  const loadFriends = async () => {
    try {
      const res = await fetch('/api/friends', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setFriends(data.friends || []);
    } catch (e) { console.error('Load friends error:', e); }
  };

  const loadRequests = async () => {
    try {
      const res = await fetch('/api/friends/requests', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setRequests(data.requests || []);
    } catch (e) { console.error('Load requests error:', e); }
  };

  const loadGroups = async () => {
    try {
      const res = await fetch('/api/groups', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setGroups(data.groups || []);
    } catch (e) { console.error('Load groups error:', e); }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setSearchResults(data.users || []);
    } catch (e) { console.error('Search error:', e); }
  };

  const sendFriendRequest = async (userId: string) => {
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ targetUserId: userId })
      });
      const data = await res.json();
      if (data.success) {
        setSearchResults(prev => prev.map(u => 
          u.user_id === userId ? { ...u, request_pending: true } : u
        ));
      }
    } catch (e) { console.error('Send request error:', e); }
  };

  const acceptRequest = async (requestId: string) => {
    try {
      const res = await fetch('/api/friends/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ requestId, action: 'accept' })
      });
      if (res.ok) {
        await Promise.all([loadFriends(), loadRequests()]);
      }
    } catch (e) { console.error('Accept request error:', e); }
  };

  const rejectRequest = async (requestId: string) => {
    try {
      const res = await fetch('/api/friends/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ requestId, action: 'reject' })
      });
      if (res.ok) await loadRequests();
    } catch (e) { console.error('Reject request error:', e); }
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newGroupName, description: newGroupDesc })
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateGroup(false);
        setNewGroupName('');
        setNewGroupDesc('');
        await loadGroups();
      }
    } catch (e) { console.error('Create group error:', e); }
    setCreating(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-6 p-2 flex gap-2" data-testid="community-tabs">
          <button
            onClick={() => setTab('friends')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
              tab === 'friends' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            data-testid="friends-tab"
          >
            <Users className="w-5 h-5" />
            Friends ({friends.length})
          </button>
          <button
            onClick={() => setTab('groups')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
              tab === 'groups' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            data-testid="groups-tab"
          >
            <UsersRound className="w-5 h-5" />
            Groups ({groups.length})
          </button>
          <button
            onClick={() => setTab('requests')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition flex items-center justify-center gap-2 relative ${
              tab === 'requests' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            data-testid="requests-tab"
          >
            <UserPlus className="w-5 h-5" />
            Requests
            {requests.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {requests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('search')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
              tab === 'search' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            data-testid="search-tab"
          >
            <Search className="w-5 h-5" />
            Find
          </button>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : (
            <>
              {/* Friends Tab */}
              {tab === 'friends' && (
                <div data-testid="friends-content">
                  {friends.length === 0 ? (
                    <div className="p-12 text-center">
                      <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400 mb-4">You haven't added any friends yet</p>
                      <button
                        onClick={() => setTab('search')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Find Friends
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y dark:divide-gray-700">
                      {friends.map((friend) => (
                        <div key={friend.user_id} className="p-4 flex items-center justify-between" data-testid={`friend-${friend.user_id}`}>
                          <div className="flex items-center gap-4">
                            {friend.picture ? (
                              <Image src={friend.picture} alt={friend.name} width={48} height={48} className="rounded-full" />
                            ) : (
                              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-lg font-semibold">
                                {friend.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold dark:text-white">{friend.name}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{friend.email}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => router.push('/messages')}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                            title="Send message"
                          >
                            <MessageCircle className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Groups Tab */}
              {tab === 'groups' && (
                <div data-testid="groups-content">
                  <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between gap-4">
                    <button
                      onClick={() => setShowCreateGroup(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      data-testid="create-group-btn"
                    >
                      <Plus className="w-4 h-4" />
                      Create New Group
                    </button>
                    <a
                      href="/groups"
                      className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                    >
                      View All Groups
                      <ChevronRight className="w-4 h-4" />
                    </a>
                  </div>
                  {groups.length === 0 ? (
                    <div className="p-12 text-center">
                      <UsersRound className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No groups yet. Create one to get started!</p>
                    </div>
                  ) : (
                    <div className="divide-y dark:divide-gray-700">
                      {groups.map((group) => (
                        <div 
                          key={group.group_id} 
                          className="group"
                          data-testid={`group-${group.group_id}`}
                        >
                          {/* Main Row - Click to expand */}
                          <div 
                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                            onClick={() => setExpandedGroup(expandedGroup === group.group_id ? null : group.group_id)}
                          >
                            <div className="flex items-center gap-4">
                              {group.picture ? (
                                <Image src={group.picture} alt={group.name} width={48} height={48} className="rounded-xl" />
                              ) : (
                                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center text-white text-lg font-bold">
                                  {group.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="font-semibold dark:text-white">{group.name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{group.member_count} members</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/groups/${group.group_id}`);
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition opacity-0 group-hover:opacity-100"
                              >
                                Enter
                              </button>
                              <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${expandedGroup === group.group_id ? 'rotate-90' : ''}`} />
                            </div>
                          </div>
                          
                          {/* Expanded Info */}
                          {expandedGroup === group.group_id && (
                            <div className="px-4 pb-4 bg-gray-50 dark:bg-gray-700/30">
                              <div className="pl-16 pt-2">
                                {group.description ? (
                                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">{group.description}</p>
                                ) : (
                                  <p className="text-gray-400 dark:text-gray-500 text-sm italic mb-3">No description</p>
                                )}
                                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                  <span>Created {new Date(group.created_at).toLocaleDateString()}</span>
                                  {group.is_owner && <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full">Owner</span>}
                                  {group.is_member && !group.is_owner && <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full">Member</span>}
                                </div>
                                <button
                                  onClick={() => router.push(`/groups/${group.group_id}`)}
                                  className="mt-3 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                                >
                                  Enter Group
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Requests Tab */}
              {tab === 'requests' && (
                <div data-testid="requests-content">
                  {requests.length === 0 ? (
                    <div className="p-12 text-center">
                      <UserPlus className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No pending friend requests</p>
                    </div>
                  ) : (
                    <div className="divide-y dark:divide-gray-700">
                      {requests.map((request) => (
                        <div key={request.request_id} className="p-4 flex items-center justify-between" data-testid={`request-${request.request_id}`}>
                          <div className="flex items-center gap-4">
                            {request.picture ? (
                              <Image src={request.picture} alt={request.name} width={48} height={48} className="rounded-full" />
                            ) : (
                              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-lg font-semibold">
                                {request.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold dark:text-white">{request.name}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{request.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => acceptRequest(request.request_id)}
                              className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                              title="Accept"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => rejectRequest(request.request_id)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                              title="Decline"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Search Tab */}
              {tab === 'search' && (
                <div data-testid="search-content">
                  <div className="p-4 border-b dark:border-gray-700">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                        placeholder="Search by name or email..."
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                        data-testid="search-users-input"
                      />
                      <button
                        onClick={searchUsers}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        data-testid="search-users-btn"
                      >
                        Search
                      </button>
                    </div>
                  </div>
                  {searchResults.length === 0 ? (
                    <div className="p-12 text-center">
                      <Search className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">Search for people to add as friends</p>
                    </div>
                  ) : (
                    <div className="divide-y dark:divide-gray-700">
                      {searchResults.map((user) => (
                        <div key={user.user_id} className="p-4 flex items-center justify-between" data-testid={`search-result-${user.user_id}`}>
                          <div className="flex items-center gap-4">
                            {user.picture ? (
                              <Image src={user.picture} alt={user.name} width={48} height={48} className="rounded-full" />
                            ) : (
                              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-lg font-semibold">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold dark:text-white">{user.name}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                            </div>
                          </div>
                          {user.is_friend ? (
                            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-sm font-medium">
                              Friend
                            </span>
                          ) : user.request_pending ? (
                            <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-full text-sm font-medium">
                              Pending
                            </span>
                          ) : (
                            <button
                              onClick={() => sendFriendRequest(user.user_id)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                              data-testid={`add-friend-${user.user_id}`}
                            >
                              <UserPlus className="w-4 h-4" />
                              Add Friend
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" data-testid="create-group-modal">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold mb-4 dark:text-white">Create New Group</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Group Name</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g., MTG Commander Club"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  data-testid="group-name-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="What's this group about?"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  data-testid="group-desc-input"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowCreateGroup(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white"
              >
                Cancel
              </button>
              <button
                onClick={createGroup}
                disabled={!newGroupName.trim() || creating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                data-testid="create-group-submit"
              >
                {creating ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
