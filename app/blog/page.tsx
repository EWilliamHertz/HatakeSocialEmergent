'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Image from 'next/image';
import { Calendar, User } from 'lucide-react';

export default function BlogPage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/articles')
      .then(res => res.json())
      .then(data => {
        if (data.success) setArticles(data.articles);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">Community News</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">The latest updates, sets, and insights from Hatake.</p>
        </div>

        {loading ? (
          <div className="flex justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map(article => (
              <Link key={article.article_id} href={`/blog/${article.slug}`} className="group bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition border border-gray-100 dark:border-gray-700 flex flex-col">
                <div className="aspect-video w-full bg-gray-200 dark:bg-gray-700 relative overflow-hidden">
                  {article.cover_image ? (
                    <img src={article.cover_image} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                  )}
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <h2 className="text-xl font-bold mb-2 dark:text-white group-hover:text-blue-600 transition">{article.title}</h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2 flex-1">{article.excerpt}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" /> {article.author_name}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {new Date(article.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

