'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Home, Search, Package, ShoppingBag, MessageCircle, User, LogOut, Bell } from 'lucide-react';
import Link from 'next/link';

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
}

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    router.push('/');
  };

  if (loading) return null;

  if (!user) return null;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/feed" className="flex items-center gap-3">
            <Image
              src="https://i.imgur.com/B06rBhI.png"
              alt="Logo"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              TCG Hub
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-6">
            <Link href="/feed" className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition">
              <Home className="w-5 h-5" />
              <span className="hidden md:inline">Feed</span>
            </Link>
            <Link href="/search" className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition">
              <Search className="w-5 h-5" />
              <span className="hidden md:inline">Search</span>
            </Link>
            <Link href="/collection" className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition">
              <Package className="w-5 h-5" />
              <span className="hidden md:inline">Collection</span>
            </Link>
            <Link href="/marketplace" className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition">
              <ShoppingBag className="w-5 h-5" />
              <span className="hidden md:inline">Market</span>
            </Link>
            <Link href="/messages" className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition">
              <MessageCircle className="w-5 h-5" />
              <span className="hidden md:inline">Messages</span>
            </Link>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <button className="relative text-gray-600 hover:text-blue-600">
              <Bell className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              {user.picture ? (
                <Image src={user.picture} alt={user.name} width={32} height={32} className="rounded-full" />
              ) : (
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <button onClick={handleLogout} className="text-gray-600 hover:text-red-600">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
