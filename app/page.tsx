'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Users, ShoppingBag, MessageCircle, Store, Info, Package, LayoutGrid, RefreshCw, Heart, Video, Globe, Shield, ChevronRight, Menu, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex flex-col overflow-x-hidden">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 flex-shrink-0">
              <Image
                src="https://i.imgur.com/B06rBhI.png"
                alt="Hatake.Social Logo"
                width={36}
                height={36}
                className="rounded-lg"
              />
              <span className="font-bold text-lg sm:text-xl text-gray-900">Hatake.Social</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-2 lg:gap-4">
              <Link href="/shop" className="px-3 py-2 text-gray-600 hover:text-blue-600 font-medium transition flex items-center gap-1.5 text-sm">
                <Store className="w-4 h-4" />
                Shop
              </Link>
              <Link href="/about" className="px-3 py-2 text-gray-600 hover:text-blue-600 font-medium transition flex items-center gap-1.5 text-sm">
                <Info className="w-4 h-4" />
                About
              </Link>
              <Link
                href="/auth/login"
                className="px-4 py-2 text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition whitespace-nowrap"
              >
                Get Started
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900 transition"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-gray-100 pt-4 space-y-2">
              <Link 
                href="/shop" 
                className="flex items-center gap-2 px-3 py-3 text-gray-600 hover:bg-gray-50 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Store className="w-5 h-5" />
                Shop
              </Link>
              <Link 
                href="/about" 
                className="flex items-center gap-2 px-3 py-3 text-gray-600 hover:bg-gray-50 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Info className="w-5 h-5" />
                About
              </Link>
              <div className="pt-2 border-t border-gray-100 mt-2 grid grid-cols-2 gap-2">
                <Link
                  href="/auth/login"
                  className="px-4 py-3 text-center text-blue-600 font-medium border border-blue-600 rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-4 py-3 text-center bg-blue-600 text-white font-medium rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Get Started
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-12 sm:py-20 px-4">
        <div className="container mx-auto max-w-5xl text-center">
          <div className="flex items-center justify-center mb-6 sm:mb-8">
            <Image
              src="https://i.imgur.com/B06rBhI.png"
              alt="Hatake.Social Logo"
              width={80}
              height={80}
              className="rounded-2xl shadow-lg sm:w-[100px] sm:h-[100px]"
              priority
            />
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent px-2">
            Hatake.Social
          </h1>
          <p className="text-base sm:text-xl text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
            The ultimate platform for trading card game collectors. Manage your collection,
            connect with friends, build decks, and trade cards with the community.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8 sm:mb-10 px-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for Pokemon, Magic, or any TCG card..."
                className="w-full pl-12 pr-4 py-3 sm:py-4 rounded-xl sm:rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none text-base sm:text-lg shadow-lg"
                data-testid="landing-search"
              />
            </div>
          </form>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-12 sm:mb-16 px-4">
            <Link
              href="/auth/signup"
              className="px-6 sm:px-8 py-3 sm:py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-center"
              data-testid="get-started-btn"
            >
              Get Started Free
            </Link>
            <Link
              href="/auth/login"
              className="px-6 sm:px-8 py-3 sm:py-4 bg-white text-blue-600 rounded-xl font-semibold hover:bg-gray-50 transition-all shadow-lg border-2 border-blue-600 text-center"
              data-testid="sign-in-btn"
            >
              Sign In
            </Link>
            <Link
              href="/shop"
              className="px-6 sm:px-8 py-3 sm:py-4 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
              data-testid="shop-btn"
            >
              <Store className="w-5 h-5" />
              Visit Shop
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12 sm:py-16 px-4 bg-white/50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-3 sm:mb-4">Everything You Need</h2>
          <p className="text-gray-600 text-center mb-8 sm:mb-12 max-w-2xl mx-auto text-sm sm:text-base px-4">
            From collection management to social features, we've got you covered
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Card Search */}
            <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <Search className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Card Search</h3>
              <p className="text-gray-600 text-sm">
                Search across Pokemon, Magic, and more with real-time pricing from Scryfall & TCGPlayer
              </p>
            </div>

            {/* Collection */}
            <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                <Package className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Collection Manager</h3>
              <p className="text-gray-600 text-sm">
                Import from ManaBox CSV, add cards manually, track value, and manage your entire collection
              </p>
            </div>

            {/* Deck Builder */}
            <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mb-4">
                <LayoutGrid className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Deck Builder</h3>
              <p className="text-gray-600 text-sm">
                Build decks, import decklists with sideboard support, and browse community decks
              </p>
            </div>

            {/* Trades */}
            <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                <RefreshCw className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Trading System</h3>
              <p className="text-gray-600 text-sm">
                Search users, browse collections, create trades with automatic value summaries
              </p>
            </div>

            {/* Social Feed */}
            <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Social Feed</h3>
              <p className="text-gray-600 text-sm">
                Share pulls, comment on posts, reply to comments, and react with emojis
              </p>
            </div>

            {/* Marketplace */}
            <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center mb-4">
                <ShoppingBag className="w-6 h-6 text-pink-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Marketplace</h3>
              <p className="text-gray-600 text-sm">
                Buy and sell cards directly with other collectors in a secure environment
              </p>
            </div>

            {/* Groups */}
            <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Groups & Chat</h3>
              <p className="text-gray-600 text-sm">
                Join communities, group chat with members, and invite friends to private groups
              </p>
            </div>

            {/* Messaging */}
            <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
                <MessageCircle className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Messenger</h3>
              <p className="text-gray-600 text-sm">
                Real-time messaging with emoji support, media sharing, and voice/video calls
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Shop Section */}
      <section className="py-12 sm:py-16 px-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="container mx-auto max-w-4xl text-center">
          <Store className="w-12 sm:w-16 h-12 sm:h-16 mx-auto mb-4 sm:mb-6 opacity-90" />
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Hatake TCG Merch</h2>
          <p className="text-base sm:text-xl opacity-90 mb-6 sm:mb-8 px-4">
            Premium TCG accessories including toploaders, playmats, deck boxes, and more — shipped directly from Sweden
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-white text-purple-600 rounded-xl font-semibold hover:bg-gray-100 transition shadow-lg"
          >
            Browse Shop
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* About Section */}
      <section className="py-12 sm:py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 md:p-12">
            <div className="flex flex-col md:flex-row gap-6 sm:gap-8 items-center">
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">About HatakeSocial</h2>
                <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base">
                  We're building two things at once — because they belong together. A healthy supply chain for TCG products across Europe, and a social platform that brings collectors together.
                </p>
                <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
                  Our long-term goal is to support local game shops with better discovery, clearer events, and real partnerships that help the community grow.
                </p>
                <Link
                  href="/about"
                  className="inline-flex items-center gap-2 text-blue-600 font-medium hover:text-blue-700"
                >
                  Meet the team
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="flex-shrink-0 order-first md:order-last">
                <Image
                  src="https://i.imgur.com/B06rBhI.png"
                  alt="Hatake.Social"
                  width={120}
                  height={120}
                  className="rounded-2xl shadow-lg sm:w-[150px] sm:h-[150px]"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-10 sm:py-12 px-4 mt-auto">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <Image
                  src="https://i.imgur.com/B06rBhI.png"
                  alt="Hatake.Social Logo"
                  width={32}
                  height={32}
                  className="rounded-lg"
                />
                <span className="font-bold text-lg">Hatake.Social</span>
              </div>
              <p className="text-gray-400 text-sm">
                The ultimate platform for TCG collectors
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Platform</h4>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-400">
                <li><Link href="/feed" className="hover:text-white transition">Social Feed</Link></li>
                <li><Link href="/collection" className="hover:text-white transition">Collection</Link></li>
                <li><Link href="/decks" className="hover:text-white transition">Deck Builder</Link></li>
                <li><Link href="/marketplace" className="hover:text-white transition">Marketplace</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Community</h4>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-400">
                <li><Link href="/friends" className="hover:text-white transition">Friends</Link></li>
                <li><Link href="/groups" className="hover:text-white transition">Groups</Link></li>
                <li><Link href="/messages" className="hover:text-white transition">Messages</Link></li>
                <li><Link href="/trades" className="hover:text-white transition">Trades</Link></li>
              </ul>
            </div>
            <div className="col-span-2 md:col-span-1">
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Company</h4>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-400">
                <li><Link href="/shop" className="hover:text-white transition">Shop</Link></li>
                <li><Link href="/about" className="hover:text-white transition">About Us</Link></li>
                <li><a href="mailto:contact@hatake.social" className="hover:text-white transition">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 sm:pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-center sm:text-left">
            <p className="text-xs sm:text-sm text-gray-500">© {new Date().getFullYear()} Hatake.Social. All rights reserved.</p>
            <p className="text-xs sm:text-sm text-gray-500">Made with care in Sweden</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
