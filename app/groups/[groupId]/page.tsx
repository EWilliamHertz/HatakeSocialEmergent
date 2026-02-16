'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Users, Lock, Globe, Crown, Shield, Settings, LogOut, MessageCircle, Heart, Share2, Send, MoreHorizontal, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface GroupDetails {
  group_id: string;
  name: string;
  description?: string;
  image?: string;
  privacy: 'public' | 'private';
  member_count: number;
  created_by: string;
  created_at: string;
}

interface Member {
  user_id: string;
  name: string;
  picture?: string;
  role: string;
  joined_at: string;
}

interface Post {
  post_id: string;
  user_id: string;
  content: string;
  image?: string;
  name: string;
  picture?: string;
  like_count: number;
  comment_count: number;
  liked: boolean;
  created_at: string;
}

export default function GroupDetailPage({ params }: { params: Promise<{ groupId: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'members'>('posts');
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');

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
          setCurrentUserId(data.user.user_id);
          loadGroup();
        }
      })
      .catch(() => router.push('/auth/login'));
  }, [router, resolvedParams.groupId]);

  const loadGroup = async () => {
    try {
      const res = await fetch(`/api/groups/${resolvedParams.groupId}`, { credentials: 'include' });
      const data = await res.json();
      
      if (data.success) {
        setGroup(data.group);
        setIsMember(data.isMember);
        setRole(data.role);
        setMembers(data.members || []);
        setPosts(data.posts || []);
      } else if (data.error === 'Group not found') {
        router.push('/groups');
      }
    } catch (error) {
      console.error('Load group error:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinGroup = async () => {
    setJoining(true);
    try {
      const res = await fetch(`/api/groups/${resolvedParams.groupId}/join`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        loadGroup();
      }
    } catch (error) {
      console.error('Join group error:', error);
    } finally {
      setJoining(false);
    }
  };

  const leaveGroup = async () => {
    if (!confirm('Are you sure you want to leave this group?')) return;
    
    setLeaving(true);
    try {
      const res = await fetch(`/api/groups/${resolvedParams.groupId}/join`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        router.push('/groups');
      } else {
        alert(data.error || 'Failed to leave group');
      }
    } catch (error) {
      console.error('Leave group error:', error);
    } finally {
      setLeaving(false);
    }
  };

  const createPost = async () => {
    if (!newPost.trim()) return;
    setPosting(true);
    
    try {
      const res = await fetch(`/api/groups/${resolvedParams.groupId}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: newPost }),
      });
      const data = await res.json();
      if (data.success) {
        setNewPost('');
        loadGroup();
      }
    } catch (error) {
      console.error('Create post error:', error);
    } finally {
      setPosting(false);
    }
  };

  const likePost = async (postId: string) => {
    try {
      const res = await fetch(`/api/feed/${postId}/like`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setPosts(posts.map(p => {
          if (p.post_id === postId) {
            return {
              ...p,
              liked: !p.liked,
              like_count: p.liked ? p.like_count - 1 : p.like_count + 1,
            };
          }
          return p;
        }));
      }
    } catch (error) {
      console.error('Like post error:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined 
    });
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Group not found</h2>
          <Link href="/groups" className="text-blue-600 hover:underline">Back to Groups</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Group Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600"></div>
          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
              {group.image ? (
                <Image
                  src={group.image}
                  alt={group.name}
                  width={96}
                  height={96}
                  className="w-24 h-24 rounded-xl border-4 border-white dark:border-gray-800 object-cover"
                />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl border-4 border-white dark:border-gray-800 flex items-center justify-center">
                  <Users className="w-10 h-10 text-white" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{group.name}</h1>
                  {group.privacy === 'private' ? (
                    <Lock className="w-5 h-5 text-gray-400" />
                  ) : (
                    <Globe className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-2">{group.description || 'No description'}</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                </p>
              </div>
              <div className="flex gap-2">
                {isMember ? (
                  <>
                    {role === 'admin' && (
                      <button
                        onClick={() => router.push(`/groups/${resolvedParams.groupId}/settings`)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                        data-testid="group-settings-btn"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </button>
                    )}
                    <button
                      onClick={leaveGroup}
                      disabled={leaving}
                      className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg font-medium hover:bg-red-200 dark:hover:bg-red-900/40 transition"
                      data-testid="leave-group-btn"
                    >
                      {leaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                      Leave
                    </button>
                  </>
                ) : (
                  <button
                    onClick={joinGroup}
                    disabled={joining || group.privacy === 'private'}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
                    data-testid="join-group-btn"
                  >
                    {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                    {group.privacy === 'private' ? 'Private Group' : 'Join Group'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          {isMember && (
            <div className="border-t border-gray-200 dark:border-gray-700 px-6">
              <div className="flex gap-6">
                <button
                  onClick={() => setActiveTab('posts')}
                  className={`py-4 border-b-2 font-medium transition ${
                    activeTab === 'posts'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Posts
                </button>
                <button
                  onClick={() => setActiveTab('members')}
                  className={`py-4 border-b-2 font-medium transition ${
                    activeTab === 'members'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Members ({members.length})
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        {!isMember ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
            <Lock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {group.privacy === 'private' ? 'This is a private group' : 'Join to see posts'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {group.privacy === 'private'
                ? 'You need an invitation to join this group'
                : 'Join this group to see posts and interact with members'}
            </p>
          </div>
        ) : activeTab === 'posts' ? (
          <div className="space-y-6">
            {/* Create Post */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="Share something with the group..."
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 resize-none dark:text-white"
                rows={3}
                data-testid="new-post-input"
              />
              <div className="flex justify-between items-center mt-3">
                <button className="flex items-center gap-2 px-3 py-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                  <ImageIcon className="w-5 h-5" />
                  Photo
                </button>
                <button
                  onClick={createPost}
                  disabled={!newPost.trim() || posting}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
                  data-testid="post-btn"
                >
                  {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Post
                </button>
              </div>
            </div>

            {/* Posts */}
            {posts.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No posts yet. Be the first to share!</p>
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.post_id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4" data-testid={`post-${post.post_id}`}>
                  <div className="flex items-start gap-3">
                    <Link href={`/profile/${post.user_id}`}>
                      {post.picture ? (
                        <Image src={post.picture} alt={post.name} width={40} height={40} className="rounded-full" />
                      ) : (
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {post.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </Link>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Link href={`/profile/${post.user_id}`} className="font-semibold text-gray-900 dark:text-white hover:underline">
                          {post.name}
                        </Link>
                        <span className="text-gray-400 text-sm">·</span>
                        <span className="text-gray-500 text-sm">{formatTimeAgo(post.created_at)}</span>
                      </div>
                      <p className="mt-2 text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{post.content}</p>
                      {post.image && (
                        <img src={post.image} alt="" className="mt-3 rounded-xl max-w-full" />
                      )}
                      <div className="flex items-center gap-6 mt-4">
                        <button
                          onClick={() => likePost(post.post_id)}
                          className={`flex items-center gap-1.5 text-sm transition ${
                            post.liked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                          }`}
                          data-testid={`like-${post.post_id}`}
                        >
                          <Heart className={`w-5 h-5 ${post.liked ? 'fill-current' : ''}`} />
                          {post.like_count > 0 && post.like_count}
                        </button>
                        <button className="flex items-center gap-1.5 text-gray-500 hover:text-blue-500 text-sm transition">
                          <MessageCircle className="w-5 h-5" />
                          {post.comment_count > 0 && post.comment_count}
                        </button>
                        <button className="flex items-center gap-1.5 text-gray-500 hover:text-green-500 text-sm transition">
                          <Share2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Members Tab */
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {members.map((member) => (
                <div key={member.user_id} className="p-4 flex items-center gap-4" data-testid={`member-${member.user_id}`}>
                  <Link href={`/profile/${member.user_id}`}>
                    {member.picture ? (
                      <Image src={member.picture} alt={member.name} width={48} height={48} className="rounded-full" />
                    ) : (
                      <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </Link>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Link href={`/profile/${member.user_id}`} className="font-semibold text-gray-900 dark:text-white hover:underline">
                        {member.name}
                      </Link>
                      {member.role === 'admin' && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 text-xs font-medium rounded-full">
                          <Crown className="w-3 h-3" />
                          Admin
                        </span>
                      )}
                      {member.role === 'moderator' && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 text-xs font-medium rounded-full">
                          <Shield className="w-3 h-3" />
                          Moderator
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Joined {formatDate(member.joined_at)}</p>
                  </div>
                  {role === 'admin' && member.user_id !== currentUserId && (
                    <button className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
