'use client';

import { useEffect, useState, use } from 'react';
import Navbar from '@/components/Navbar';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import Image from 'next/image';

export default function ArticleReaderPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/articles/${resolvedParams.slug}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setArticle(data.article);
        setLoading(false);
      });
  }, [resolvedParams.slug]);

  if (loading) return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-32 text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div></div>;

  if (!article) return <div className="min-h-screen text-center pt-32 dark:text-white">Article not found</div>;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Navbar />
      
      {/* Hero Section */}
      <div className="w-full bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-16 max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-6">{article.title}</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">{article.excerpt}</p>
          
          <div className="flex items-center justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
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
              {new Date(article.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      {article.cover_image && (
        <div className="container mx-auto px-4 max-w-5xl -mt-8 relative z-10">
          <img src={article.cover_image} alt={article.title} className="w-full aspect-video object-cover rounded-2xl shadow-xl border-4 border-white dark:border-gray-900 bg-gray-200 dark:bg-gray-800" />
        </div>
      )}

      {/* Article Content */}
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
