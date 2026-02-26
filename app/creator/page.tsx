'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ReactMarkdown from 'react-markdown';
import { PenTool, Eye, Save, Globe, Loader2 } from 'lucide-react';

const CATEGORIES = ['General', 'Releases', 'Tournaments', 'Marketplace', 'Updates'];

function CreatorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editSlug = searchParams.get('edit');

  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(!!editSlug);
  
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [excerpt, setExcerpt] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [content, setContent] = useState('');

  // Load existing article if editing
  useEffect(() => {
    if (editSlug) {
      fetch(`/api/articles/${editSlug}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setTitle(data.article.title);
            setCategory(data.article.category || 'General');
            setExcerpt(data.article.excerpt || '');
            setCoverImage(data.article.cover_image || '');
            setContent(data.article.content || '');
          }
          setInitializing(false);
        });
    }
  }, [editSlug]);

  const saveArticle = async (published: boolean) => {
    if (!title || !content) return alert('Title and Content are required!');
    setLoading(true);

    try {
      const url = editSlug ? `/api/articles/${editSlug}` : '/api/articles';
      const method = editSlug ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, excerpt, cover_image: coverImage, content, category, published })
      });

      const data = await res.json();
      if (data.success) {
        alert(`Article ${published ? 'published' : 'saved'} successfully!`);
        router.push(`/blog/${data.article.slug}`);
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Failed to save article.');
    } finally {
      setLoading(false);
    }
  };

  if (initializing) return <div className="text-center pt-32"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">{editSlug ? 'Edit Article' : 'Creator Studio'}</h1>
          <p className="text-gray-500">Draft and publish news to the community</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => saveArticle(false)} disabled={loading} className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white rounded-lg flex items-center gap-2 hover:opacity-80">
            <Save className="w-4 h-4" /> {editSlug ? 'Update Draft' : 'Save Draft'}
          </button>
          <button onClick={() => saveArticle(true)} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />} {editSlug ? 'Update & Publish' : 'Publish'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold mb-4 dark:text-white">Article Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 border dark:border-gray-600 dark:bg-gray-700 rounded-lg dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2 border dark:border-gray-600 dark:bg-gray-700 rounded-lg dark:text-white">
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cover Image URL</label>
                <input type="text" value={coverImage} onChange={(e) => setCoverImage(e.target.value)} className="w-full p-2 border dark:border-gray-600 dark:bg-gray-700 rounded-lg dark:text-white" />
                {coverImage && <img src={coverImage} alt="Cover" className="mt-2 w-full h-32 object-cover rounded-lg" />}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Short Excerpt</label>
                <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={3} className="w-full p-2 border dark:border-gray-600 dark:bg-gray-700 rounded-lg dark:text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col h-[700px]">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button onClick={() => setActiveTab('write')} className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-medium transition ${activeTab === 'write' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500'}`}><PenTool className="w-4 h-4" /> Write</button>
            <button onClick={() => setActiveTab('preview')} className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-medium transition ${activeTab === 'preview' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500'}`}><Eye className="w-4 h-4" /> Preview</button>
          </div>
          <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900/50">
            {activeTab === 'write' ? (
              <textarea value={content} onChange={(e) => setContent(e.target.value)} className="w-full h-full p-6 bg-transparent border-none focus:ring-0 resize-none dark:text-white" />
            ) : (
              <div className="p-8 prose dark:prose-invert max-w-none"><ReactMarkdown>{content}</ReactMarkdown></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreatorDashboard() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
      <Navbar />
      <Suspense fallback={<div className="text-center pt-32"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>}>
        <CreatorContent />
      </Suspense>
    </div>
  );
}