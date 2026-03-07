'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Users, Globe, Hash, Heart, MessageCircle, Send, Smile, X, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface Reaction {
  emoji: string;
  count: number;
  userReacted: boolean;
}

interface Post {
  post_id: string;
  content: string;
  name: string;
  user_id: string;
  image_url?: string;
  picture?: string;
  like_count: number;
  comment_count: number;
  liked: boolean;
  reactions: Reaction[];
  created_at: string;
  card_data?: any;
}

interface Reactor {
  user_id: string;
  name: string;
  picture?: string;
}

interface ReactorsData {
  likes: Reactor[];
  reactions: (Reactor & { emoji: string })[];
}

const EMOJI_OPTIONS = ['🔥', '👍', '😂', '😮', '❤️', '🎉', '👏', '🥲'];

// Render post text with clickable hyperlinks
function renderContent(text: string) {
  const URL_REGEX = /(https?:\/\/[^\s<>"]+)/g;
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) => {
    if (URL_REGEX.test(part)) {
      URL_REGEX.lastIndex = 0;
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-700 underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function Avatar({ picture, name, size = 40 }: { picture?: string; name: string; size?: number }) {
  if (picture) {
    return <Image src={picture} alt={name} width={size} height={size} className="rounded-full object-cover" unoptimized />;
  }
  return (
    <div
      className="bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function FeedPage() {
  const router = useRouter();
  const [tab, setTab] = useState('public');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

  // Emoji picker state: postId or null
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Reactors modal state
  const [reactorsModal, setReactorsModal] = useState<{ postId: string; filter?: string } | null>(null);
  const [reactorsData, setReactorsData] = useState<ReactorsData | null>(null);
  const [reactorsLoading, setReactorsLoading] = useState(false);

  // Comments state
  const [commentsOpen, setCommentsOpen] = useState<Set<string>>(new Set());
  const [postComments, setPostComments] = useState<Record<string, any[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [loadingComments, setLoadingComments] = useState<Set<string>>(new Set());
  const [submittingComment, setSubmittingComment] = useState<string | null>(null);

  // Comment emoji + reply state
  const [commentEmojiPickerFor, setCommentEmojiPickerFor] = useState<string | null>(null);
  const commentPickerRef = useRef<HTMLDivElement>(null);
  const [replyingTo, setReplyingTo] = useState<{ postId: string; commentId: string; name: string } | null>(null);
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [submittingReply, setSubmittingReply] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) { router.push('/auth/login'); return; }
        setAuthenticated(true);
        return res.json();
      })
      .then(() => loadPosts())
      .catch(() => router.push('/auth/login'));
  }, [router, tab]);

  // Close emoji pickers on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setEmojiPickerFor(null);
      }
      if (commentPickerRef.current && !commentPickerRef.current.contains(e.target as Node)) {
        setCommentEmojiPickerFor(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/feed?tab=${tab}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setPosts((data.posts || []).map((p: any) => ({ ...p, reactions: p.reactions || [] })));
      }
    } catch (error) {
      console.error('Load posts error:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPost = async () => {
    if (!newPost.trim()) return;
    try {
      const res = await fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: newPost, visibility: tab === 'public' ? 'public' : 'friends' }),
      });
      if (res.ok) { setNewPost(''); loadPosts(); }
    } catch (error) {
      console.error('Create post error:', error);
    }
  };

  const toggleLike = async (postId: string) => {
    // Optimistic update
    setPosts(prev => prev.map(p =>
      p.post_id === postId
        ? { ...p, liked: !p.liked, like_count: p.liked ? p.like_count - 1 : p.like_count + 1 }
        : p
    ));
    try {
      await fetch(`/api/feed/${postId}/like`, { method: 'POST', credentials: 'include' });
    } catch (error) {
      console.error('Like error:', error);
      loadPosts(); // revert on error
    }
  };

  const toggleReaction = async (postId: string, emoji: string) => {
    setEmojiPickerFor(null);
    // Optimistic update
    setPosts(prev => prev.map(p => {
      if (p.post_id !== postId) return p;
      const existing = p.reactions.find(r => r.emoji === emoji);
      let reactions: Reaction[];
      if (existing) {
        reactions = existing.userReacted
          ? existing.count <= 1
            ? p.reactions.filter(r => r.emoji !== emoji)
            : p.reactions.map(r => r.emoji === emoji ? { ...r, count: r.count - 1, userReacted: false } : r)
          : p.reactions.map(r => r.emoji === emoji ? { ...r, count: r.count + 1, userReacted: true } : r);
      } else {
        reactions = [...p.reactions, { emoji, count: 1, userReacted: true }];
      }
      return { ...p, reactions };
    }));
    try {
      await fetch(`/api/feed/${postId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ emoji }),
      });
    } catch (error) {
      console.error('Reaction error:', error);
      loadPosts();
    }
  };

  const openReactorsModal = async (postId: string, filter?: string) => {
    setReactorsModal({ postId, filter });
    setReactorsData(null);
    setReactorsLoading(true);
    try {
      const res = await fetch(`/api/feed/${postId}/reactors`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setReactorsData(data);
    } catch (e) {
      console.error('Reactors fetch error:', e);
    } finally {
      setReactorsLoading(false);
    }
  };

  const loadComments = async (postId: string) => {
    setLoadingComments(prev => new Set(prev).add(postId));
    try {
      const res = await fetch(`/api/feed/${postId}/comments`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setPostComments(prev => ({ ...prev, [postId]: data.comments || [] }));
      }
    } catch (e) {
      console.error('Load comments error:', e);
    } finally {
      setLoadingComments(prev => { const s = new Set(prev); s.delete(postId); return s; });
    }
  };

  const toggleComments = (postId: string) => {
    setCommentsOpen(prev => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
        if (!postComments[postId]) loadComments(postId);
      }
      return next;
    });
  };

  const submitComment = async (postId: string) => {
    const content = (commentInputs[postId] || '').trim();
    if (!content) return;
    setSubmittingComment(postId);
    try {
      const res = await fetch(`/api/feed/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (data.success) {
        setCommentInputs(prev => ({ ...prev, [postId]: '' }));
        setPostComments(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), data.comment],
        }));
        // Update comment count optimistically
        setPosts(prev => prev.map(p =>
          p.post_id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p
        ));
      }
    } catch (e) {
      console.error('Submit comment error:', e);
    } finally {
      setSubmittingComment(null);
    }
  };

  const toggleCommentReaction = async (postId: string, commentId: string, emoji: string) => {
    setCommentEmojiPickerFor(null);
    // Optimistic update
    setPostComments(prev => ({
      ...prev,
      [postId]: (prev[postId] || []).map(c => {
        if (c.comment_id !== commentId) return c;
        const existing = (c.reactions || []).find((r: any) => r.emoji === emoji);
        let reactions: any[];
        if (existing) {
          reactions = existing.userReacted
            ? existing.count <= 1
              ? (c.reactions || []).filter((r: any) => r.emoji !== emoji)
              : (c.reactions || []).map((r: any) => r.emoji === emoji ? { ...r, count: r.count - 1, userReacted: false } : r)
            : (c.reactions || []).map((r: any) => r.emoji === emoji ? { ...r, count: r.count + 1, userReacted: true } : r);
        } else {
          reactions = [...(c.reactions || []), { emoji, count: 1, userReacted: true }];
        }
        return { ...c, reactions };
      }),
    }));
    try {
      await fetch(`/api/feed/${postId}/comments/${commentId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ emoji }),
      });
    } catch (e) {
      console.error('Comment reaction error:', e);
    }
  };

  const submitReply = async (postId: string, parentCommentId: string) => {
    const content = (replyInputs[parentCommentId] || '').trim();
    if (!content) return;
    setSubmittingReply(parentCommentId);
    try {
      const res = await fetch(`/api/feed/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content, parentCommentId }),
      });
      const data = await res.json();
      if (data.success) {
        setReplyInputs(prev => ({ ...prev, [parentCommentId]: '' }));
        setReplyingTo(null);
        setPostComments(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), data.comment],
        }));
        setPosts(prev => prev.map(p =>
          p.post_id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p
        ));
      }
    } catch (e) {
      console.error('Submit reply error:', e);
    } finally {
      setSubmittingReply(null);
    }
  };

  if (!authenticated) return null;

  // Build reactors modal content
  const modalFilteredReactions = reactorsData && reactorsModal?.filter
    ? reactorsData.reactions.filter(r => r.emoji === reactorsModal.filter)
    : reactorsData?.reactions ?? [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      {/* Reactors Modal */}
      {reactorsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setReactorsModal(null)}>
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {reactorsModal.filter ? `${reactorsModal.filter} Reactions` : 'Likes & Reactions'}
              </h3>
              <button onClick={() => setReactorsModal(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-4">
              {reactorsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                </div>
              ) : (
                <>
                  {/* Likes section */}
                  {!reactorsModal.filter && reactorsData && reactorsData.likes.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" /> Likes ({reactorsData.likes.length})
                      </p>
                      <div className="space-y-2">
                        {reactorsData.likes.map(u => (
                          <Link key={u.user_id} href={`/profile/${u.user_id}`} onClick={() => setReactorsModal(null)}>
                            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                              <Avatar picture={u.picture} name={u.name} size={36} />
                              <span className="font-medium text-gray-900 dark:text-white text-sm">{u.name}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reactions section */}
                  {modalFilteredReactions.length > 0 && (
                    <div>
                      {!reactorsModal.filter && (
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                          Reactions ({modalFilteredReactions.length})
                        </p>
                      )}
                      <div className="space-y-2">
                        {modalFilteredReactions.map((r, i) => (
                          <Link key={i} href={`/profile/${r.user_id}`} onClick={() => setReactorsModal(null)}>
                            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                              <Avatar picture={r.picture} name={r.name} size={36} />
                              <span className="font-medium text-gray-900 dark:text-white text-sm flex-1">{r.name}</span>
                              <span className="text-lg">{r.emoji}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {!reactorsLoading && !reactorsData?.likes.length && !modalFilteredReactions.length && (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-6 text-sm">No reactions yet</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-6 p-2 flex gap-2">
          <button
            onClick={() => setTab('friends')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${tab === 'friends' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            <Users className="w-5 h-5 inline mr-2" />Friends
          </button>
          <button
            onClick={() => setTab('groups')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${tab === 'groups' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            <Hash className="w-5 h-5 inline mr-2" />Groups
          </button>
          <button
            onClick={() => setTab('public')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${tab === 'public' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            <Globe className="w-5 h-5 inline mr-2" />Public
          </button>
        </div>

        {/* Create Post */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Share your latest pull, trade, or TCG thoughts..."
            className="w-full p-4 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={createPost}
              disabled={!newPost.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-4 h-4" />Post
            </button>
          </div>
        </div>

        {/* Posts */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
            <Globe className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No posts yet. Be the first to share!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <div key={post.post_id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                {/* Post Header */}
                <div className="flex items-center gap-3 mb-4">
                  <Avatar picture={post.picture} name={post.name} size={40} />
                  <div>
                    <Link href={`/profile/${post.user_id}`}>
                      <p className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition">{post.name}</p>
                    </Link>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(post.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Post Content */}
                <p className="text-gray-800 dark:text-gray-200 mb-4 whitespace-pre-wrap">
                  {renderContent(post.content)}
                </p>

                {/* Post Image */}
                {post.image_url && (
                  <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden mb-4" style={{ aspectRatio: '16/9' }}>
                    <Image
                      src={post.image_url}
                      alt="Post"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      priority={false}
                      unoptimized
                    />
                  </div>
                )}

                {/* Reaction bubbles row (above action bar) */}
                {post.reactions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {post.reactions.map((r) => (
                      <button
                        key={r.emoji}
                        onClick={() => toggleReaction(post.post_id, r.emoji)}
                        onContextMenu={(e) => { e.preventDefault(); openReactorsModal(post.post_id, r.emoji); }}
                        title={`${r.count} reaction${r.count !== 1 ? 's' : ''} — long press or right-click to see who reacted`}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-sm border transition ${
                          r.userReacted
                            ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-400 text-blue-700 dark:text-blue-300'
                            : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        <span>{r.emoji}</span>
                        <span className="font-medium">{r.count}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Post Actions */}
                <div className="flex items-center gap-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex-wrap">
                  {/* Like */}
                  <button
                    onClick={() => toggleLike(post.post_id)}
                    className={`flex items-center gap-1.5 ${post.liked ? 'text-red-600' : 'text-gray-600 dark:text-gray-400'} hover:text-red-600 transition`}
                  >
                    <Heart className={`w-5 h-5 ${post.liked ? 'fill-current' : ''}`} />
                    <span
                      className="cursor-pointer hover:underline"
                      onClick={(e) => { e.stopPropagation(); if (post.like_count > 0) openReactorsModal(post.post_id); }}
                    >
                      {post.like_count || 0}
                    </span>
                  </button>

                  {/* Comment */}
                  <button
                    onClick={() => toggleComments(post.post_id)}
                    className={`flex items-center gap-1.5 transition ${commentsOpen.has(post.post_id) ? 'text-blue-600' : 'text-gray-600 dark:text-gray-400 hover:text-blue-600'}`}
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>{post.comment_count || 0}</span>
                  </button>

                  {/* Emoji picker trigger */}
                  <div className="relative ml-auto" ref={emojiPickerFor === post.post_id ? pickerRef : undefined}>
                    <button
                      onClick={() => setEmojiPickerFor(emojiPickerFor === post.post_id ? null : post.post_id)}
                      className="flex items-center gap-1 text-gray-400 hover:text-yellow-500 dark:hover:text-yellow-400 transition text-sm"
                      title="Add reaction"
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                    {emojiPickerFor === post.post_id && (
                      <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-gray-700 rounded-xl shadow-lg border border-gray-200 dark:border-gray-600 p-2 flex gap-1 z-30">
                        {EMOJI_OPTIONS.map(e => (
                          <button
                            key={e}
                            onClick={() => toggleReaction(post.post_id, e)}
                            className="text-xl hover:scale-125 transition-transform p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* See all reactions link */}
                  {(post.reactions.length > 0 || post.like_count > 0) && (
                    <button
                      onClick={() => openReactorsModal(post.post_id)}
                      className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                    >
                      See who reacted
                    </button>
                  )}
                </div>

                {/* ── Comment section ── */}
                {commentsOpen.has(post.post_id) && (() => {
                  const allComments = postComments[post.post_id] || [];
                  const topLevel = allComments.filter((c: any) => !c.parent_comment_id);
                  const repliesMap: Record<string, any[]> = {};
                  allComments.filter((c: any) => c.parent_comment_id).forEach((c: any) => {
                    if (!repliesMap[c.parent_comment_id]) repliesMap[c.parent_comment_id] = [];
                    repliesMap[c.parent_comment_id].push(c);
                  });

                  const renderComment = (comment: any, isReply = false) => (
                    <div key={comment.comment_id} className={`flex gap-2.5 ${isReply ? 'ml-10 mt-2' : ''}`}>
                      <Avatar picture={comment.picture} name={comment.name || '?'} size={isReply ? 28 : 32} />
                      <div className="flex-1 min-w-0">
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2">
                          <div className="flex items-center gap-2 mb-0.5">
                            <Link href={`/profile/${comment.user_id}`}>
                              <span className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">{comment.name}</span>
                            </Link>
                            <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(comment.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{comment.content}</p>
                        </div>

                        {/* Comment reaction bubbles */}
                        {(comment.reactions || []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1 ml-1">
                            {(comment.reactions as any[]).map((r: any) => (
                              <button
                                key={r.emoji}
                                onClick={() => toggleCommentReaction(post.post_id, comment.comment_id, r.emoji)}
                                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition ${
                                  r.userReacted
                                    ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-400 text-blue-700 dark:text-blue-300'
                                    : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                              >
                                <span>{r.emoji}</span>
                                <span className="font-medium">{r.count}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Comment action row: Reply + Emoji */}
                        <div className="flex items-center gap-3 mt-1 ml-1">
                          <button
                            onClick={() => setReplyingTo(
                              replyingTo?.commentId === comment.comment_id
                                ? null
                                : { postId: post.post_id, commentId: comment.comment_id, name: comment.name }
                            )}
                            className="text-xs text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition"
                          >
                            {replyingTo?.commentId === comment.comment_id ? 'Cancel' : 'Reply'}
                          </button>

                          {/* Per-comment emoji picker */}
                          <div
                            className="relative"
                            ref={commentEmojiPickerFor === comment.comment_id ? commentPickerRef : undefined}
                          >
                            <button
                              onClick={() => setCommentEmojiPickerFor(
                                commentEmojiPickerFor === comment.comment_id ? null : comment.comment_id
                              )}
                              className="text-gray-400 hover:text-yellow-500 transition"
                              title="React to comment"
                            >
                              <Smile className="w-3.5 h-3.5" />
                            </button>
                            {commentEmojiPickerFor === comment.comment_id && (
                              <div className="absolute bottom-full left-0 mb-1 bg-white dark:bg-gray-700 rounded-xl shadow-lg border border-gray-200 dark:border-gray-600 p-1.5 flex gap-0.5 z-30">
                                {EMOJI_OPTIONS.map(e => (
                                  <button
                                    key={e}
                                    onClick={() => toggleCommentReaction(post.post_id, comment.comment_id, e)}
                                    className="text-base hover:scale-125 transition-transform p-0.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                                  >
                                    {e}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Reply input for this comment */}
                        {replyingTo?.commentId === comment.comment_id && (
                          <div className="flex gap-2 items-center mt-2">
                            <input
                              type="text"
                              autoFocus
                              value={replyInputs[comment.comment_id] || ''}
                              onChange={e => setReplyInputs(prev => ({ ...prev, [comment.comment_id]: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitReply(post.post_id, comment.comment_id); } }}
                              placeholder={`Reply to ${comment.name}...`}
                              className="flex-1 px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                            <button
                              onClick={() => submitReply(post.post_id, comment.comment_id)}
                              disabled={!replyInputs[comment.comment_id]?.trim() || submittingReply === comment.comment_id}
                              className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full disabled:opacity-40 transition flex-shrink-0"
                            >
                              {submittingReply === comment.comment_id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Send className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        )}

                        {/* Nested replies */}
                        {!isReply && (repliesMap[comment.comment_id] || []).map((reply: any) =>
                          renderComment(reply, true)
                        )}
                      </div>
                    </div>
                  );

                  return (
                    <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-4 space-y-3">
                      {loadingComments.has(post.post_id) ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                        </div>
                      ) : topLevel.length === 0 ? (
                        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-2">No comments yet — be the first!</p>
                      ) : (
                        <div className="space-y-3">
                          {topLevel.map((comment: any) => renderComment(comment))}
                        </div>
                      )}

                      {/* New top-level comment input */}
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={commentInputs[post.post_id] || ''}
                          onChange={e => setCommentInputs(prev => ({ ...prev, [post.post_id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(post.post_id); } }}
                          placeholder="Write a comment..."
                          className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                        <button
                          onClick={() => submitComment(post.post_id)}
                          disabled={!commentInputs[post.post_id]?.trim() || submittingComment === post.post_id}
                          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full disabled:opacity-40 transition flex-shrink-0"
                          title="Post comment"
                        >
                          {submittingComment === post.post_id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Send className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
