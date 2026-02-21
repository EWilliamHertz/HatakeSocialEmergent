'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Users, Globe, Hash, ThumbsUp, MessageCircle, Send, ChevronDown, ChevronUp, Reply, Smile, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

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

// Updated reactions: Heart added, ThumbsUp removed (since it's the main button)
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
  
  // Groups for posting
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);

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
      .then(() => {
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
      const res = await fetch('/api/groups', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setMyGroups(data.myGroups || []);
      }
    } catch (e) {
      console.log('Failed to load groups:', e);
    }
  };

  const loadPosts = async () => {
    setLoading(true);
    try {
      let url = `/api/feed?tab=${tab}`;
      if (tab === 'groups' && selectedGroup) {
        url += `&group_id=${selectedGroup}`;
      }
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
      
      // If posting to a specific group
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

  if (!authenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-6 p-2 flex gap-2">
          {['friends', 'groups', 'public'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              data-testid={`tab-${t}`}
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

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <textarea
            value={newPost}
            onChange={e => setNewPost(e.target.value)}
            placeholder="What's happening in your collection?"
            className="w-full p-4 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            data-testid="new-post-input"
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={createPost}
              disabled={!newPost.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              data-testid="create-post-btn"
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
              <div key={post.post_id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm" data-testid={`post-${post.post_id}`}>
                <div className="p-6 pb-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Link href={`/profile/${post.user_id}`} className="hover:opacity-80 transition">
                      {post.picture ? (
                        <Image src={post.picture} alt={post.name} width={40} height={40} className="rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {post.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </Link>
                    <div>
                      <Link href={`/profile/${post.user_id}`} className="hover:underline hover:text-blue-600">
                        <p className="font-semibold text-gray-900 dark:text-white">{post.name}</p>
                      </Link>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(post.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <p className="text-gray-800 dark:text-gray-200 mb-4 whitespace-pre-wrap">{post.content}</p>
                </div>

                {/* Post Actions & Reactions - MERGED ROW */}
                <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Main Like Button - Thumbs Up */}
                    <button
                      onClick={() => toggleLike(post.post_id)}
                      className={`flex items-center gap-2 ${post.liked ? 'text-blue-600' : 'text-gray-600 dark:text-gray-400'} hover:text-blue-600 transition`}
                      data-testid={`like-btn-${post.post_id}`}
                    >
                      <ThumbsUp className={`w-5 h-5 ${post.liked ? 'fill-current' : ''}`} />
                      <span>{post.like_count || 0}</span>
                    </button>

                    <button
                      onClick={() => toggleComments(post.post_id)}
                      className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 transition"
                      data-testid={`comments-btn-${post.post_id}`}
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span>{post.comment_count || 0}</span>
                      {expandedComments.has(post.post_id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    <div className="relative">
                      <button
                        onClick={() => setShowEmojiPicker(showEmojiPicker === post.post_id ? null : post.post_id)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
                        data-testid={`emoji-btn-${post.post_id}`}
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
                  </div>

                  {/* Reactions Display (Same Row) */}
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
                                  <div className="flex gap-3" data-testid={`comment-${comment.comment_id}`}>
                                    <Link href={`/profile/${comment.user_id}`}>
                                      {comment.picture ? (
                                        <Image src={comment.picture} alt={comment.name} width={32} height={32} className="rounded-full" />
                                      ) : (
                                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                          {comment.name.charAt(0).toUpperCase()}
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
                                          data-testid={`reply-btn-${comment.comment_id}`}
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
                                        <div key={reply.comment_id} className="flex gap-3" data-testid={`reply-${reply.comment_id}`}>
                                          <Link href={`/profile/${reply.user_id}`}>
                                            {reply.picture ? (
                                              <Image src={reply.picture} alt={reply.name} width={28} height={28} className="rounded-full" />
                                            ) : (
                                              <div className="w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                                {reply.name.charAt(0).toUpperCase()}
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
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                            Y
                          </div>
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
                                data-testid={`comment-input-${post.post_id}`}
                              />
                              <button
                                onClick={() => submitComment(post.post_id)}
                                disabled={!commentInputs[post.post_id]?.trim()}
                                className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                data-testid={`submit-comment-${post.post_id}`}
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
    </div>
  );
}