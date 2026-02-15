'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Users, Globe, Hash, Heart, MessageCircle, Send } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

// 1. Added user_id to the interface so TypeScript doesn't complain
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
}

export default function FeedPage() {
  const router = useRouter();
  const [tab, setTab] = useState('public');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

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
      .then(() => loadPosts())
      .catch(() => router.push('/auth/login'));
  }, [router, tab]); // Added tab to dependency to reload when tab switches

  // Added tab dependency here so it re-fetches when you switch tabs
  useEffect(() => {
    if (authenticated) {
        loadPosts();
    }
  }, [tab, authenticated]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/feed?tab=${tab}`);
      const data = await res.json();
      if (data.success) {
        setPosts(data.posts || []);
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
        body: JSON.stringify({ content: newPost, visibility: tab === 'public' ? 'public' : 'friends' }),
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
      // Optimistic update (feels faster)
      setPosts(current => current.map(p => {
        if (p.post_id === postId) {
            return {
                ...p,
                liked: !p.liked,
                like_count: p.liked ? p.like_count - 1 : p.like_count + 1
            };
        }
        return p;
      }));
    } catch (error) {
      console.error('Like error:', error);
      loadPosts(); // Fallback to reload if error
    }
  };

  if (!authenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-2xl"> {/* Reduced max-w for better feed look */}
        
        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-6 p-2 flex gap-2">
          {['friends', 'groups', 'public'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
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

        {/* Create Post */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder={`What's happening in your collection?`}
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

        {/* Posts Feed */}
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
            {posts.map((post) => (
              <div key={post.post_id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                
                {/* --- HEADER WITH LINKS --- */}
                <div className="flex items-center gap-3 mb-4">
                  {/* Link wrapping the Avatar */}
                  <Link href={`/profile/${post.user_id}`} className="hover:opacity-80 transition">
                    {post.picture ? (
                      <Image 
                        src={post.picture} 
                        alt={post.name} 
                        width={40} 
                        height={40} 
                        className="rounded-full object-cover" 
                      />
                    ) : (
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {post.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </Link>

                  {/* Link wrapping the Name */}
                  <div>
                    <Link href={`/profile/${post.user_id}`} className="hover:underline hover:text-blue-600">
                      <p className="font-semibold text-gray-900 dark:text-white">{post.name}</p>
                    </Link>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(post.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {/* --- END HEADER --- */}

                {/* Post Content */}
                <p className="text-gray-800 dark:text-gray-200 mb-4 whitespace-pre-wrap">{post.content}</p>

                {/* Post Actions */}
                <div className="flex items-center gap-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => toggleLike(post.post_id)}
                    className={`flex items-center gap-2 ${post.liked ? 'text-red-600' : 'text-gray-600 dark:text-gray-400'} hover:text-red-600 transition`}
                  >
                    <Heart className={`w-5 h-5 ${post.liked ? 'fill-current' : ''}`} />
                    <span>{post.like_count || 0}</span>
                  </button>
                  <button className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 transition">
                    <MessageCircle className="w-5 h-5" />
                    <span>{post.comment_count || 0}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}