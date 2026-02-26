'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { ArrowLeft, Calendar, User, Share2, MessageSquareShare, Edit, CheckCircle } from 'lucide-react';
import Image from 'next/image';

export default function ArticleReaderPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    // Get current user to check if they are the author
    fetch('/api/auth/me').then(res => res.json()).then(data => {
      if (data?.user) setCurrentUserId(data.user.user_id);
    });

    fetch(`/api/articles/${resolvedParams.slug}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setArticle(data.article);
        setLoading(false);
      });
  }, [resolvedParams.slug]);

  const handleShareToFeed = async () => {
    if (!currentUserId) return alert("Please log in to share to the feed.");
    
    const postContent = `Check out this article: **${article.title}**\n\n${window.location.origin}/blog/${article.slug}`;
    
    try {
      const res = await fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: postContent, visibility: 'public' }),
      });
      if (res.ok) setShared(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleNativeShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: article.title, url }); } catch (err) {}
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-32 text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div></div>;
  if (!article) return <div className="min-h-screen text-center pt-32 dark:text-white">Article not found</div>;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Navbar />
      
      <div className="w-full bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-16 max-w-4xl text-center">
          
          <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold rounded-full text-sm mb-4 uppercase tracking-wider">
            {article.category || 'General'}
          </span>
          
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-6">{article.title}</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">{article.excerpt}</p>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <Link href={`/profile/${article.author_id}`} className="flex items-center gap-2 hover:text-blue-600 transition">
                {article.author_picture ? (
                  <Image src={article.author_picture} alt={article.author_name} width={32} height={32} className="rounded-full" />
                ) : (
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white"><User className="w-4 h-4"/></div>
                )}
                <span className="font-semibold">{article.author_name}</span>
              </Link>
              <span>•</span>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(article.created_at).toLocaleDateString()}
              </div>
            </div>

            {/* Sharing and Editing Actions */}
            <div className="flex items-center gap-2">
               <button onClick={handleShareToFeed} disabled={shared} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${shared ? 'bg-green-100 text-green-700' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:text-blue-600 hover:shadow-sm'}`}>
                {shared ? <CheckCircle className="w-4 h-4" /> : <MessageSquareShare className="w-4 h-4" />} 
                {shared ? 'Shared to Feed' : 'Share to Feed'}
              </button>
              <button onClick={handleNativeShare} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-full text-sm font-medium hover:text-blue-600 hover:shadow-sm transition">
                <Share2 className="w-4 h-4" /> Share
              </button>
              {currentUserId === article.author_id && (
                <button onClick={() => router.push(`/creator?edit=${article.slug}`)} className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 rounded-full text-sm font-bold hover:bg-amber-200 transition">
                  <Edit className="w-4 h-4" /> Edit
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {article.cover_image && (
        <div className="container mx-auto px-4 max-w-5xl -mt-8 relative z-10">
          <img src={article.cover_image} alt={article.title} className="w-full aspect-video object-cover rounded-2xl shadow-xl border-4 border-white dark:border-gray-900 bg-gray-200 dark:bg-gray-800" />
        </div>
      )}

      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <Link href="/blog" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8 font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to News
        </Link>
        
        <article className="prose prose-lg md:prose-xl dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 prose-headings:font-bold prose-a:text-blue-600 hover:prose-a:text-blue-500">
          <ReactMarkdown>{article.content}</ReactMarkdown>
        </article>
      </div>
    </div>
  );
}