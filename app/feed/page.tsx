'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Users, Globe, Hash, ThumbsUp, MessageCircle, Send, ChevronDown, ChevronUp, Reply, Smile, X, MoreHorizontal, Trash2, Award, Share2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

// Badge display colors
const BADGE_COLORS: Record<string, string> = {
  first_trade: '#EC4899', trader_5: '#F97316', trader_10: '#EAB308', trader_25: '#22C55E',
  trader_50: '#14B8A6', top_trader: '#F59E0B', legendary_trader: '#A855F7',
  verified_seller: '#10B981', five_star: '#FBBF24', beta_tester: '#8B5CF6',
  founder: '#FFD700', moderator: '#6366F1', starter_collector: '#60A5FA',
  collector_50: '#3B82F6', collector_100: '#2563EB', collector_500: '#1D4ED8',
  collector_1000: '#6D28D9', social_butterfly: '#F472B6', community_leader: '#34D399',
  content_creator: '#FB923C', first_listing: '#4ADE80', merchant: '#2DD4BF',
  deck_builder: '#818CF8', deck_master: '#7C3AED', veteran: '#94A3B8', og_member: '#64748B',
};

interface Reaction {
  emoji: string;
  count: number;
  userReacted: boolean;
}

interface Comment {
  comment_id: string;
  user_id: string;
  content: string;
  name: string;
  picture?: string;
  created_at: string;
  parent_comment_id?: string;
  reactions: Reaction[];
}

interface Post {
  post_id: string;
  user_id: string;
  content: string;
  name: string;
  picture?: string;
  like_count: number;
  comment_count: number;
  liked: boolean;
  created_at: string;
  card_data?: any;
  reactions?: Reaction[];
}

const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '🔥', '💯'];

export default function FeedPage() {
  const router = useRouter();
  const [tab, setTab] = useState('public');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [postComments, setPostComments] = useState<Record<string, Comment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<{ postId: string; commentId: string; userName: string } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [postReactions, setPostReactions] = useState<Record<string, Reaction[]>>({});
  const [loadingComments, setLoadingComments] = useState<Set<string>>(new Set());
  
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [postMenu, setPostMenu] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Modal States for viewing who reacted
  const [reactorsModal, setReactorsModal] = useState<string | null>(null);
  const [reactorsData, setReactorsData] = useState<{ likes: any[], reactions: any[] } | null>(null);
  const [activeReactorTab, setActiveReactorTab] = useState<'likes' | 'reactions'>('likes');

  const deletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      const res = await fetch(`/api/feed/${postId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setPosts(prev => prev.filter(p => p.post_id !== postId));
      } else {
        alert(data.error || 'Failed to delete post');
      }
    } catch (error) {
      console.error('Delete post error:', error);
      alert('Failed to delete post');
    }
    setPostMenu(null);
  };

  const editPost = async (postId: string) => {
    if (!editContent.trim()) return;
    try {
      const res = await fetch(`/api/feed/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: editContent }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingPost(null);
        setEditContent('');
        loadPosts();
      } else {
        alert(data.error || 'Failed to update post');
      }
    } catch (error) {
      console.error('Edit post error:', error);
    }
    setPostMenu(null);
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) {
          router.push('/auth/login');
          return;
        }
        setAuthenticated(true);
        return res.json();
      })
      .then((data) => {
        if (data?.user?.user_id) {
          setCurrentUserId(data.user.user_id);
          setIsAdmin(data.user?.role === 'admin' || data.user?.is_admin === true);
        }
        loadPosts();
        loadMyGroups();
      })
      .catch(() => router.push('/auth/login'));
  }, [router]);

  useEffect(() => {
    if (authenticated) {
      loadPosts();
    }
  }, [tab, authenticated, selectedGroup]);

  const loadMyGroups = async () => {
    try {
      const res = await fetch('/api/groups?type=my', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setMyGroups(data.groups || []);
    } catch (e) {
      console.log('Failed to load groups:', e);
    }
  };

  const loadPosts = async () => {
    setLoading(true);
    try {
      let url = `/api/feed?tab=${tab}`;
      if (tab === 'groups' && selectedGroup) url += `&group_id=${selectedGroup}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setPosts(data.posts || []);
        for (const post of data.posts || []) {
          loadPostReactions(post.post_id);
        }
      }
    } catch (error) {
      console.error('Load posts error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPostReactions = async (postId: string) => {
    try {
      const res = await fetch(`/api/feed/${postId}/reactions`);
      const data = await res.json();
      if (data.success) {
        setPostReactions(prev => ({ ...prev, [postId]: data.reactions || [] }));
      }
    } catch (error) {
      console.error('Load post reactions error:', error);
    }
  };

  const createPost = async () => {
    if (!newPost.trim()) return;
    try {
      const postData: any = { 
        content: newPost, 
        visibility: tab === 'public' ? 'public' : (tab === 'groups' ? 'group' : 'friends')
      };
      if (tab === 'groups' && selectedGroup) {
        postData.group_id = selectedGroup;
        postData.visibility = 'group';
      }
      const res = await fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData),
      });
      if (res.ok) {
        setNewPost('');
        loadPosts();
      }
    } catch (error) {
      console.error('Create post error:', error);
    }
  };

  const toggleLike = async (postId: string) => {
    try {
      await fetch(`/api/feed/${postId}/like`, { method: 'POST' });
      setPosts(current =>
        current.map(p => {
          if (p.post_id === postId) {
            return {
              ...p,
              liked: !p.liked,
              like_count: p.liked ? p.like_count - 1 : p.like_count + 1,
            };
          }
          return p;
        })
      );
    } catch (error) {
      console.error('Like error:', error);
      loadPosts();
    }
  };

  const togglePostReaction = async (postId: string, emoji: string) => {
    try {
      await fetch(`/api/feed/${postId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });
      loadPostReactions(postId);
      setShowEmojiPicker(null);
    } catch (error) {
      console.error('Reaction error:', error);
    }
  };

  const loadComments = async (postId: string) => {
    setLoadingComments(prev => new Set(prev).add(postId));
    try {
      const res = await fetch(`/api/feed/${postId}/comments`);
      const data = await res.json();
      if (data.success) {
        setPostComments(prev => ({ ...prev, [postId]: data.comments || [] }));
      }
    } catch (error) {
      console.error('Load comments error:', error);
    } finally {
      setLoadingComments(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
        if (!postComments[postId]) {
          loadComments(postId);
        }
      }
      return newSet;
    });
  };

  const submitComment = async (postId: string) => {
    const content = commentInputs[postId]?.trim();
    if (!content) return;
    try {
      const res = await fetch(`/api/feed/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          parentCommentId: replyingTo?.postId === postId ? replyingTo.commentId : null,
        }),
      });
      if (res.ok) {
        setCommentInputs(prev => ({ ...prev, [postId]: '' }));
        setReplyingTo(null);
        loadComments(postId);
        setPosts(current =>
          current.map(p => (p.post_id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p))
        );
      }
    } catch (error) {
      console.error('Submit comment error:', error);
    }
  };

  const toggleCommentReaction = async (postId: string, commentId: string, emoji: string) => {
    try {
      await fetch(`/api/feed/${postId}/comments/${commentId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });
      loadComments(postId);
    } catch (error) {
      console.error('Comment reaction error:', error);
    }
  };

  const startReply = (postId: string, commentId: string, userName: string) => {
    setReplyingTo({ postId, commentId, userName });
    setCommentInputs(prev => ({ ...prev, [postId]: `@${userName} ` }));
  };

  const getThreadedComments = (comments: Comment[]) => {
    const topLevel = comments.filter(c => !c.parent_comment_id);
    const replies: Record<string, Comment[]> = {};
    comments.forEach(c => {
      if (c.parent_comment_id) {
        if (!replies[c.parent_comment_id]) {
          replies[c.parent_comment_id] = [];
        }
        replies[c.parent_comment_id].push(c);
      }
    });
    return { topLevel, replies };
  };

  const openReactors = async (postId: string) => {
    setReactorsModal(postId);
    setReactorsData(null);
    try {
      const res = await fetch(`/api/feed/${postId}/reactors`);
      const data = await res.json();
      if (data.success) {
        setReactorsData({ likes: data.likes, reactions: data.reactions });
      }
    } catch (e) {
      console.error('Failed to load reactors', e);
    }
  };

  const handleShare = async (postId: string) => {
    const url = `${window.location.origin}/feed#${postId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Hatake Social',
          text: 'Check out this post on Hatake!',
          url: url
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(url);
      alert('Post link copied to clipboard!');
    }
  };

  const renderPostContent = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (urlRegex.test(part)) {
        urlRegex.lastIndex = 0;
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300 break-all"
            onClick={e => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  if (!authenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-6 p-2 flex gap-2">
          {['friends', 'groups', 'public'].map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); if (t !== 'groups') setSelectedGroup(null); }}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition capitalize flex items-center justify-center gap-2
                ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            >
              {t === 'friends' && <Users className="w-5 h-5" />}
              {t === 'groups' && <Hash className="w-5 h-5" />}
              {t === 'public' && <Globe className="w-5 h-5" />}
              {t}
            </button>
          ))}
        </div>

        {tab === 'groups' && myGroups.length > 0 && (
          <div className="mb-4 relative">
            <button
              onClick={() => setShowGroupDropdown(!showGroupDropdown)}
              className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg text-left"
            >
              <div className="flex items-center gap-2">
                <Hash className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-gray-900 dark:text-white">
                  {selectedGroup 
                    ? myGroups.find(g => g.group_id === selectedGroup)?.name || 'Select Group'
                    : 'All Groups'}
                </span>
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${showGroupDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showGroupDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-64 overflow-auto">
                <button
                  onClick={() => { setSelectedGroup(null); setShowGroupDropdown(false); }}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between ${!selectedGroup ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                >
                  <span className="text-gray-900 dark:text-white">All Groups</span>
                </button>
                {myGroups.map(group => (
                  <button
                    key={group.group_id}
                    onClick={() => { setSelectedGroup(group.group_id); setShowGroupDropdown(false); }}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between ${selectedGroup === group.group_id ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                  >
                    <span className="text-gray-900 dark:text-white">{group.name}</span>
                    <span className="text-sm text-gray-500">{group.member_count} members</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          {tab === 'groups' && selectedGroup && (
            <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <Hash className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-700 dark:text-blue-300">
                Posting to {myGroups.find(g => g.group_id === selectedGroup)?.name}
              </span>
            </div>
          )}
          <textarea
            value={newPost}
            onChange={e => setNewPost(e.target.value)}
            placeholder={tab === 'groups' && selectedGroup 
              ? `Share with ${myGroups.find(g => g.group_id === selectedGroup)?.name}...`
              : "What's happening in your collection?"}
            className="w-full p-4 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={createPost}
              disabled={!newPost.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Post
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
            <Globe className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No posts yet. Be the first to share!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map(post => (
              <div key={post.post_id} id={post.post_id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                <div className="p-6 pb-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Link href={`/profile/${post.user_id}`} className="hover:opacity-80 transition">
                      {post.picture ? (
                        <Image src={post.picture} alt={post.name} width={40} height={40} className="rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {(post.name || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </Link>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/profile/${post.user_id}`} className="hover:underline hover:text-blue-600">
                          <p className="font-semibold text-gray-900 dark:text-white">{post.name}</p>
                        </Link>
                        {(post as any).badge_count > 0 && (
                          <Link href={`/profile/${post.user_id}`} title={`${(post as any).badge_count} badges`}>
                            <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: (BADGE_COLORS[(post as any).top_badge] || '#3B82F6') + '20', color: BADGE_COLORS[(post as any).top_badge] || '#3B82F6' }}>
                              <Award className="w-3 h-3" />
                              {(post as any).badge_count}
                            </span>
                          </Link>
                        )}
                        {(post as any).group_name && (
                          <span className="text-xs font-medium text-blue-600 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded">
                            @ {(post as any).group_name}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(post.created_at).toLocaleDateString()}</p>
                    </div>
                    {(currentUserId === post.user_id || isAdmin) && (
                      <div className="ml-auto relative">
                        <button
                          onClick={() => setPostMenu(postMenu === post.post_id ? null : post.post_id)}
                          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                        {postMenu === post.post_id && (
                          <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20 min-w-[120px]">
                            <button
                              onClick={() => {
                                setEditingPost(post.post_id);
                                setEditContent(post.content);
                                setPostMenu(null);
                              }}
                              className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              Edit
                            </button>
                            {(currentUserId === post.user_id || isAdmin) && (
                            <button
                              onClick={() => deletePost(post.post_id)}
                              className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {editingPost === post.post_id ? (
                    <div className="mb-4">
                      <textarea
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        className="w-full p-3 border border-blue-400 dark:border-blue-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                        rows={4}
                        autoFocus
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => editPost(post.post_id)}
                          disabled={!editContent.trim()}
                          className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => { setEditingPost(null); setEditContent(''); }}
                          className="px-4 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-300 dark:hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-800 dark:text-gray-200 mb-4 whitespace-pre-wrap break-words">
                      {renderPostContent(post.content)}
                    </p>
                  )}
                </div>

                <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => toggleLike(post.post_id)}
                      className={`flex items-center gap-2 ${post.liked ? 'text-blue-600' : 'text-gray-600 dark:text-gray-400'} hover:text-blue-600 transition`}
                    >
                      <ThumbsUp className={`w-5 h-5 ${post.liked ? 'fill-current' : ''}`} />
                      <span>{post.like_count || 0}</span>
                    </button>

                    <button
                      onClick={() => toggleComments(post.post_id)}
                      className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 transition"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span>{post.comment_count || 0}</span>
                      {expandedComments.has(post.post_id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    <div className="relative">
                      <button
                        onClick={() => setShowEmojiPicker(showEmojiPicker === post.post_id ? null : post.post_id)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
                      >
                        <Smile className="w-5 h-5" />
                      </button>

                      {showEmojiPicker === post.post_id && (
                        <div className="absolute left-0 top-full mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-2 z-10 flex gap-1">
                          {QUICK_REACTIONS.map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => togglePostReaction(post.post_id, emoji)}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-xl transition"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleShare(post.post_id)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
                      title="Share Post"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-4 flex-1 justify-end">
                    {postReactions[post.post_id]?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {postReactions[post.post_id].map(r => (
                          <button
                            key={r.emoji}
                            onClick={() => togglePostReaction(post.post_id, r.emoji)}
                            className={`px-2 py-1 rounded-full text-sm flex items-center gap-1 transition ${
                              r.userReacted
                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            <span>{r.emoji}</span>
                            <span className="text-xs">{r.count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {(post.like_count > 0 || postReactions[post.post_id]?.length > 0) && (
                      <button 
                        onClick={() => openReactors(post.post_id)} 
                        className="text-xs text-gray-500 hover:text-blue-600 hover:underline flex-shrink-0"
                      >
                        View interactions
                      </button>
                    )}
                  </div>
                </div>

                {expandedComments.has(post.post_id) && (
                  <div className="border-t border-gray-100 dark:border-gray-700 p-4">
                    {loadingComments.has(post.post_id) ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                      </div>
                    ) : (
                      <>
                        {postComments[post.post_id]?.length > 0 && (
                          <div className="space-y-4 mb-4">
                            {(() => {
                              const { topLevel, replies } = getThreadedComments(postComments[post.post_id] || []);
                              return topLevel.map(comment => (
                                <div key={comment.comment_id}>
                                  <div className="flex gap-3">
                                    <Link href={`/profile/${comment.user_id}`}>
                                      {comment.picture ? (
                                        <Image src={comment.picture} alt={comment.name} width={32} height={32} className="rounded-full" />
                                      ) : (
                                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                          {(comment.name || '?').charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                    </Link>
                                    <div className="flex-1">
                                      <div className="bg-gray-100 dark:bg-gray-700 rounded-xl px-4 py-2">
                                        <Link href={`/profile/${comment.user_id}`} className="font-semibold text-sm text-gray-900 dark:text-white hover:underline">
                                          {comment.name}
                                        </Link>
                                        <p className="text-sm text-gray-800 dark:text-gray-200">{comment.content}</p>
                                      </div>
                                      <div className="flex items-center gap-3 mt-1 px-2">
                                        <span className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleDateString()}</span>
                                        <button
                                          onClick={() => toggleCommentReaction(post.post_id, comment.comment_id, '❤️')}
                                          className={`text-xs ${
                                            comment.reactions?.some(r => r.emoji === '❤️' && r.userReacted)
                                              ? 'text-red-600'
                                              : 'text-gray-500 hover:text-red-600'
                                          }`}
                                        >
                                          ❤️ {comment.reactions?.find(r => r.emoji === '❤️')?.count || ''}
                                        </button>
                                        <button
                                          onClick={() => startReply(post.post_id, comment.comment_id, comment.name)}
                                          className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1"
                                        >
                                          <Reply className="w-3 h-3" />
                                          Reply
                                        </button>
                                      </div>
                                      {comment.reactions?.length > 0 && (
                                        <div className="flex gap-1 mt-1 px-2">
                                          {comment.reactions.map(r => (
                                            <button
                                              key={r.emoji}
                                              onClick={() => toggleCommentReaction(post.post_id, comment.comment_id, r.emoji)}
                                              className={`px-1.5 py-0.5 rounded-full text-xs ${
                                                r.userReacted ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-600'
                                              }`}
                                            >
                                              {r.emoji} {r.count}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {replies[comment.comment_id]?.length > 0 && (
                                    <div className="ml-10 mt-3 space-y-3 border-l-2 border-gray-200 dark:border-gray-600 pl-4">
                                      {replies[comment.comment_id].map(reply => (
                                        <div key={reply.comment_id} className="flex gap-3">
                                          <Link href={`/profile/${reply.user_id}`}>
                                            {reply.picture ? (
                                              <Image src={reply.picture} alt={reply.name} width={28} height={28} className="rounded-full" />
                                            ) : (
                                              <div className="w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                                {(reply.name || '?').charAt(0).toUpperCase()}
                                              </div>
                                            )}
                                          </Link>
                                          <div className="flex-1">
                                            <div className="bg-gray-100 dark:bg-gray-700 rounded-xl px-3 py-2">
                                              <Link href={`/profile/${reply.user_id}`} className="font-semibold text-xs text-gray-900 dark:text-white hover:underline">
                                                {reply.name}
                                              </Link>
                                              <p className="text-sm text-gray-800 dark:text-gray-200">{reply.content}</p>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 px-2">
                                              <span className="text-xs text-gray-500">{new Date(reply.created_at).toLocaleDateString()}</span>
                                              <button
                                                onClick={() => toggleCommentReaction(post.post_id, reply.comment_id, '❤️')}
                                                className={`text-xs ${
                                                  reply.reactions?.some(r => r.emoji === '❤️' && r.userReacted)
                                                    ? 'text-red-600'
                                                    : 'text-gray-500 hover:text-red-600'
                                                }`}
                                              >
                                                ❤️ {reply.reactions?.find(r => r.emoji === '❤️')?.count || ''}
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ));
                            })()}
                          </div>
                        )}
                        <div className="flex gap-3">
                          <div className="flex-1 relative">
                            {replyingTo?.postId === post.post_id && (
                              <div className="absolute -top-6 left-0 text-xs text-blue-600 flex items-center gap-1">
                                <Reply className="w-3 h-3" />
                                Replying to {replyingTo.userName}
                                <button onClick={() => setReplyingTo(null)} className="ml-1 hover:text-red-500">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={commentInputs[post.post_id] || ''}
                                onChange={e => setCommentInputs(prev => ({ ...prev, [post.post_id]: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && submitComment(post.post_id)}
                                placeholder={replyingTo?.postId === post.post_id ? 'Write a reply...' : 'Write a comment...'}
                                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-full text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                              <button
                                onClick={() => submitComment(post.post_id)}
                                disabled={!commentInputs[post.post_id]?.trim()}
                                className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reactors Modal */}
      {reactorsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-bold text-lg dark:text-white">Post Interactions</h3>
              <button onClick={() => setReactorsModal(null)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setActiveReactorTab('likes')}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeReactorTab === 'likes' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                Likes {reactorsData?.likes ? `(${reactorsData.likes.length})` : ''}
              </button>
              <button
                onClick={() => setActiveReactorTab('reactions')}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeReactorTab === 'reactions' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                Reactions {reactorsData?.reactions ? `(${reactorsData.reactions.length})` : ''}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px]">
              {!reactorsData ? (
                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
              ) : activeReactorTab === 'likes' ? (
                reactorsData.likes.length === 0 ? <p className="text-center text-gray-500 py-4">No likes yet.</p> : (
                  reactorsData.likes.map(user => (
                    <Link key={user.user_id} href={`/profile/${user.user_id}`} onClick={() => setReactorsModal(null)} className="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition">
                      {user.picture ? <Image src={user.picture} width={40} height={40} alt={user.name} className="rounded-full" /> : <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">{(user.name || '?').charAt(0).toUpperCase()}</div>}
                      <span className="font-medium dark:text-white">{user.name}</span>
                    </Link>
                  ))
                )
              ) : (
                 reactorsData.reactions.length === 0 ? <p className="text-center text-gray-500 py-4">No reactions yet.</p> : (
                  reactorsData.reactions.map((reaction, i) => (
                    <Link key={i} href={`/profile/${reaction.user_id}`} onClick={() => setReactorsModal(null)} className="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition">
                      <div className="relative">
                        {reaction.picture ? <Image src={reaction.picture} width={40} height={40} alt={reaction.name} className="rounded-full" /> : <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">{(reaction.name || '?').charAt(0).toUpperCase()}</div>}
                        <div className="absolute -bottom-1 -right-1 text-sm bg-white dark:bg-gray-800 rounded-full p-0.5 shadow-sm border border-gray-100 dark:border-gray-700 leading-none">{reaction.emoji}</div>
                      </div>
                      <span className="font-medium dark:text-white">{reaction.name}</span>
                    </Link>
                  ))
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}