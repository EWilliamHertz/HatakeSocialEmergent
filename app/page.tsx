'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Users, ShoppingBag, MessageCircle, Sparkles, Store, Info } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => {
        if (res.ok) router.push('/feed');
        else setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [router]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex flex-col">
      {/* Nav Links */}
      <nav className="absolute top-4 right-4 flex items-center gap-4">
        <Link 
          href="/shop" 
          className="px-4 py-2 text-gray-700 hover:text-blue-600 font-medium transition flex items-center gap-2"
          data-testid="nav-shop"
        >
          <Store className="w-4 h-4" />
          Shop
        </Link>
        <Link 
          href="/about" 
          className="px-4 py-2 text-gray-700 hover:text-blue-600 font-medium transition flex items-center gap-2"
          data-testid="nav-about"
        >
          <Info className="w-4 h-4" />
          About
        </Link>
      </nav>

      <div className="flex-1 container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <Image
              src="https://i.imgur.com/B06rBhI.png"
              alt="Hatake.Social Logo"
              width={120}
              height={120}
              className="rounded-2xl shadow-lg"
              priority
            />
          </div>

          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Hatake.Social
          </h1>
          <p className="text-xl text-gray-600 mb-12">
            The ultimate platform for trading card game collectors. Manage your collection,
            connect with friends, and trade cards with the community.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-16">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for Pokemon, Magic, or any TCG card..."
                className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none text-lg shadow-lg"
                data-testid="landing-search"
              />
            </div>
          </form>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4 justify-center mb-20">
            <button
              onClick={() => router.push('/auth/signup')}
              className="px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              data-testid="get-started-btn"
            >
              Get Started Free
            </button>
            <button
              onClick={() => router.push('/auth/login')}
              className="px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold hover:bg-gray-50 transition-all shadow-lg border-2 border-blue-600"
              data-testid="sign-in-btn"
            >
              Sign In
            </button>
            <Link
              href="/shop"
              className="px-8 py-4 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
              data-testid="shop-btn"
            >
              <Store className="w-5 h-5" />
              Visit Shop
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto">
          <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <Search className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Card Search</h3>
            <p className="text-gray-600 text-sm">
              Search across Pokemon, Magic, and more with real-time pricing
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Social Feed</h3>
            <p className="text-gray-600 text-sm">
              Share your pulls, join groups, and connect with collectors
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center mb-4">
              <ShoppingBag className="w-6 h-6 text-pink-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Marketplace</h3>
            <p className="text-gray-600 text-sm">
              Buy, sell, and trade cards with the community
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <MessageCircle className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Messenger</h3>
            <p className="text-gray-600 text-sm">
              Chat with friends and negotiate trades directly
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 px-4 mt-auto">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Image
                src="https://i.imgur.com/B06rBhI.png"
                alt="Hatake.Social Logo"
                width={32}
                height={32}
                className="rounded-lg"
              />
              <span className="font-bold text-gray-900">Hatake.Social</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <Link href="/shop" className="hover:text-blue-600 transition">Shop</Link>
              <Link href="/about" className="hover:text-blue-600 transition">About Us</Link>
              <Link href="/feed" className="hover:text-blue-600 transition">Community</Link>
              <Link href="/marketplace" className="hover:text-blue-600 transition">Marketplace</Link>
            </div>
            <p className="text-sm text-gray-500">© {new Date().getFullYear()} Hatake.Social</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
