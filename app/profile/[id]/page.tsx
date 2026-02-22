'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { User, Package, ShoppingBag, Users, Settings, Camera, UserPlus, UserMinus, MessageCircle, Star, Award } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import UserReputation from '@/components/UserReputation';

interface UserProfile {
  user_id: string;
  name: string;
  email: string;
  picture?: string;
  bio?: string;
  created_at: string;
}

interface Stats {
  collection_count: number;
  listings_count: number;
  friends_count: number;
  trades_count: number;
}

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<Stats>({
    collection_count: 0,
    listings_count: 0,
    friends_count: 0,
    trades_count: 0
  });
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [friendshipPending, setFriendshipPending] = useState(false);

  useEffect(() => {
    // Check auth and load profile
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) {
          router.push('/auth/login');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.user) {
          setCurrentUserId(data.user.user_id);
          setIsOwnProfile(data.user.user_id === resolvedParams.id);
          loadUserProfile();
        }
      })
      .catch(() => router.push('/auth/login'));
  }, [router, resolvedParams.id]);

  const loadUserProfile = async () => {
    try {
      const res = await fetch(`/api/users/search/${resolvedParams.id}`, { credentials: 'include' });
      const data = await res.json();
      
      if (data.success) {
        setUser(data.user);
        if (data.stats) {
          setStats({
            collection_count: Number(data.stats.collection_count) || 0,
            listings_count: Number(data.stats.active_listings) || 0,
            friends_count: Number(data.stats.friend_count) || 0,
            trades_count: 0
          });
        }
        // Check friendship status
        checkFriendship();
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Load profile error:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFriendship = async () => {
    try {
      const res = await fetch('/api/friends', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        const friend = data.friends?.find((f: any) => f.user_id === resolvedParams.id);
        setIsFriend(!!friend);
      }
    } catch (error) {
      console.error('Check friendship error:', error);
    }
  };

  const addFriend = async () => {
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ friendId: resolvedParams.id })
      });
      const data = await res.json();
      if (data.success) {
        setFriendshipPending(true);
      }
    } catch (error) {
      console.error('Add friend error:', error);
    }
  };

  const removeFriend = async () => {
    try {
      const res = await fetch(`/api/friends?friendId=${resolvedParams.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setIsFriend(false);
      }
    } catch (error) {
      console.error('Remove friend error:', error);
    }
  };

  const startMessage = () => {
    router.push('/messages');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">User not found</h2>
          <Link href="/" className="text-blue-600 hover:underline">Go Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Profile Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden mb-6">
          {/* Cover */}
          <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600"></div>
          
          {/* Profile Info */}
          <div className="px-6 pb-6">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-4 -mt-12">
              <div className="relative">
                {user.picture ? (
                  <Image 
                    src={user.picture} 
                    alt={user.name} 
                    width={96} 
                    height={96} 
                    className="rounded-full border-4 border-white dark:border-gray-800 shadow-lg"
                  />
                ) : (
                  <div className="w-24 h-24 bg-blue-600 rounded-full border-4 border-white dark:border-gray-800 shadow-lg flex items-center justify-center text-white text-3xl font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{user.name}</h1>
                <p className="text-gray-600 dark:text-gray-400">{user.bio || 'No bio yet'}</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                  Member since {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                </p>
              </div>

              {/* Action Buttons */}
              {!isOwnProfile && (
                <div className="flex gap-2">
                  <button
                    onClick={startMessage}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Message
                  </button>
                  {isFriend ? (
                    <button
                      onClick={removeFriend}
                      className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg font-medium hover:bg-red-200 dark:hover:bg-red-900/40 transition"
                    >
                      <UserMinus className="w-4 h-4" />
                      Unfriend
                    </button>
                  ) : friendshipPending ? (
                    <button
                      disabled
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-lg font-medium cursor-not-allowed"
                    >
                      Request Sent
                    </button>
                  ) : (
                    <button
                      onClick={addFriend}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add Friend
                    </button>
                  )}
                </div>
              )}

              {isOwnProfile && (
                <button
                  onClick={() => router.push('/profile')}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                >
                  <Settings className="w-4 h-4" />
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 text-center">
            <Package className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.collection_count}</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Cards</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 text-center">
            <ShoppingBag className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.listings_count}</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Listings</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 text-center">
            <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.friends_count}</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Friends</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 text-center">
            <Star className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.trades_count}</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Trades</p>
          </div>
        </div>

        {/* Trade Reputation */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Trade Reputation
          </h2>
          <UserReputation userId={resolvedParams.id} />
        </div>

        {/* Activity placeholder */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">No recent activity to show</p>
        </div>
      </div>
    </div>
  );
}
