'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Users, UserPlus, UserMinus, Search, Check, X, MessageCircle } from 'lucide-react';
import Image from 'next/image';

interface Friend {
  user_id: string;
  name: string;
  email?: string;
  picture?: string;
  status?: string;
}

interface FriendRequest {
  user_id: string;
  name: string;
  picture?: string;
  created_at: string;
}

export default function FriendsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'friends' | 'requests' | 'search'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) {
          router.push('/auth/login');
          return;
        }
        loadFriends();
        loadRequests();
      })
      .catch(() => router.push('/auth/login'));
  }, [router]);

  const loadFriends = async () => {
    try {
      const res = await fetch('/api/friends', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setFriends(data.friends || []);
      }
    } catch (error) {
      console.error('Load friends error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = async () => {
    try {
      const res = await fetch('/api/friends/requests', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Load requests error:', error);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.users || []);
      }
    } catch (error) {
      console.error('Search users error:', error);
    }
  };

  const sendFriendRequest = async (userId: string) => {
    try {
      await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ friendId: userId, action: 'request' })
      });
      alert('Friend request sent!');
      searchUsers(); // Refresh search to show updated status
    } catch (error) {
      console.error('Send request error:', error);
    }
  };

  const respondToRequest = async (userId: string, action: 'accept' | 'reject') => {
    try {
      await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ friendId: userId, action })
      });
      loadRequests();
      if (action === 'accept') {
        loadFriends();
      }
    } catch (error) {
      console.error('Respond to request error:', error);
    }
  };

  const removeFriend = async (userId: string) => {
    if (!confirm('Remove this friend?')) return;
    
    try {
      await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ friendId: userId, action: 'remove' })
      });
      loadFriends();
    } catch (error) {
      console.error('Remove friend error:', error);
    }
  };

  const startConversation = async (userId: string, userName: string) => {
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          recipientId: userId,
          content: `Hey ${userName}! 👋`
        })
      });
      router.push('/messages');
    } catch (error) {
      console.error('Start conversation error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-6 p-2 flex gap-2">
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
            onClick={() => setTab('requests')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
              tab === 'requests' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            data-testid="requests-tab"
          >
            <UserPlus className="w-5 h-5" />
            Requests
            {requests.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{requests.length}</span>
            )}
          </button>
          <button
            onClick={() => setTab('search')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
              tab === 'search' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
            data-testid="search-tab"
          >
            <Search className="w-5 h-5" />
            Find Friends
          </button>
        </div>

        {/* Friends List */}
        {tab === 'friends' && (
          <div className="bg-white rounded-xl shadow-sm">
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : friends.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">You haven't added any friends yet</p>
                <button
                  onClick={() => setTab('search')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                >
                  Find Friends
                </button>
              </div>
            ) : (
              <div className="divide-y">
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
                        <p className="font-semibold">{friend.name}</p>
                        <p className="text-sm text-gray-500">Friend</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startConversation(friend.user_id, friend.name)}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        title="Message"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => removeFriend(friend.user_id)}
                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                        title="Remove friend"
                      >
                        <UserMinus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Friend Requests */}
        {tab === 'requests' && (
          <div className="bg-white rounded-xl shadow-sm">
            {requests.length === 0 ? (
              <div className="p-12 text-center">
                <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No pending friend requests</p>
              </div>
            ) : (
              <div className="divide-y">
                {requests.map((request) => (
                  <div key={request.user_id} className="p-4 flex items-center justify-between" data-testid={`request-${request.user_id}`}>
                    <div className="flex items-center gap-4">
                      {request.picture ? (
                        <Image src={request.picture} alt={request.name} width={48} height={48} className="rounded-full" />
                      ) : (
                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-lg font-semibold">
                          {request.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold">{request.name}</p>
                        <p className="text-sm text-gray-500">Wants to be your friend</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => respondToRequest(request.user_id, 'accept')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        Accept
                      </button>
                      <button
                        onClick={() => respondToRequest(request.user_id, 'reject')}
                        className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search Users */}
        {tab === 'search' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
                    placeholder="Search by name or email..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    data-testid="search-users-input"
                  />
                </div>
                <button
                  onClick={searchUsers}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                  data-testid="search-users-btn"
                >
                  Search
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm">
              {searchResults.length === 0 ? (
                <div className="p-12 text-center">
                  <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Search for users to add as friends</p>
                </div>
              ) : (
                <div className="divide-y">
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
                          <p className="font-semibold">{user.name}</p>
                          {user.email && <p className="text-sm text-gray-500">{user.email}</p>}
                        </div>
                      </div>
                      <button
                        onClick={() => sendFriendRequest(user.user_id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        Add Friend
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
