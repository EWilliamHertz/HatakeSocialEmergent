'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { User, Package, ShoppingBag, Users, Settings, Camera } from 'lucide-react';
import Image from 'next/image';

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

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<Stats>({
    collection_count: 0,
    listings_count: 0,
    friends_count: 0,
    trades_count: 0
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) {
          router.push('/auth/login');
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
          setEditName(data.user.name);
          setEditBio(data.user.bio || '');
          loadStats();
        }
      })
      .catch(() => router.push('/auth/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const loadStats = async () => {
    try {
      const res = await fetch('/api/profile/stats', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Load stats error:', error);
    }
  };

  const saveProfile = async () => {
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: editName,
          bio: editBio
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
        }
        setEditing(false);
      }
    } catch (error) {
      console.error('Save profile error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Profile Header */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
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
                    className="rounded-full border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-24 h-24 bg-blue-600 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white text-3xl font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <button className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100">
                  <Camera className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              
              <div className="flex-1 pt-4 md:pt-0">
                {editing ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="text-2xl font-bold border-b-2 border-blue-600 focus:outline-none w-full"
                      placeholder="Your name"
                    />
                    <textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg text-gray-600"
                      placeholder="Tell us about yourself..."
                      rows={2}
                    />
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold">{user.name}</h1>
                    <p className="text-gray-600">{user.bio || 'No bio yet'}</p>
                  </>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Member since {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
              
              <div className="flex gap-2">
                {editing ? (
                  <>
                    <button
                      onClick={() => setEditing(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveProfile}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Save
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditing(true)}
                    className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                    data-testid="edit-profile-btn"
                  >
                    <Settings className="w-4 h-4" />
                    Edit Profile
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <Package className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.collection_count}</p>
            <p className="text-gray-600 text-sm">Cards</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <ShoppingBag className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.listings_count}</p>
            <p className="text-gray-600 text-sm">Listings</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.friends_count}</p>
            <p className="text-gray-600 text-sm">Friends</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <User className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.trades_count}</p>
            <p className="text-gray-600 text-sm">Trades</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => router.push('/collection')}
              className="p-4 bg-blue-50 rounded-lg text-blue-600 hover:bg-blue-100 transition text-center"
            >
              <Package className="w-6 h-6 mx-auto mb-2" />
              <span className="text-sm font-semibold">My Collection</span>
            </button>
            <button
              onClick={() => router.push('/marketplace')}
              className="p-4 bg-green-50 rounded-lg text-green-600 hover:bg-green-100 transition text-center"
            >
              <ShoppingBag className="w-6 h-6 mx-auto mb-2" />
              <span className="text-sm font-semibold">Marketplace</span>
            </button>
            <button
              onClick={() => router.push('/friends')}
              className="p-4 bg-purple-50 rounded-lg text-purple-600 hover:bg-purple-100 transition text-center"
            >
              <Users className="w-6 h-6 mx-auto mb-2" />
              <span className="text-sm font-semibold">Friends</span>
            </button>
            <button
              onClick={() => router.push('/search')}
              className="p-4 bg-orange-50 rounded-lg text-orange-600 hover:bg-orange-100 transition text-center"
            >
              <Package className="w-6 h-6 mx-auto mb-2" />
              <span className="text-sm font-semibold">Search Cards</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
