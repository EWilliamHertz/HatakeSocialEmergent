'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { Home, Search, Package, ShoppingBag, MessageCircle, User, LogOut, Users, ArrowRightLeft, Menu, X, UsersRound, Layers, Settings } from 'lucide-react';
import Link from 'next/link';
import NotificationsDropdown from './NotificationsDropdown';
import ThemeToggle from './ThemeToggle';

const ADMIN_EMAILS = ['zudran@gmail.com', 'ernst@hatake.eu'];

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

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

  const isActive = (path: string) => pathname === path;

  if (loading) return null;

  if (!user) return null;

  const navLinks = [
    { href: '/feed', icon: Home, label: 'Feed' },
    { href: '/search', icon: Search, label: 'Search' },
    { href: '/collection', icon: Package, label: 'Collection' },
    { href: '/decks', icon: Layers, label: 'Decks' },
    { href: '/marketplace', icon: ShoppingBag, label: 'Market' },
    { href: '/trades', icon: ArrowRightLeft, label: 'Trades' },
    { href: '/friends', icon: Users, label: 'Friends' },
    { href: '/groups', icon: UsersRound, label: 'Groups' },
    { href: '/messages', icon: MessageCircle, label: 'Messages' },
  ];

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50" data-testid="navbar">
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
              Hatake.Social
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link 
                  key={link.href}
                  href={link.href} 
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                    isActive(link.href) 
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                      : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  data-testid={`nav-${link.label.toLowerCase()}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="hidden xl:inline text-sm font-medium">{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationsDropdown />
            
            <Link 
              href="/profile"
              className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 p-2"
              data-testid="profile-link"
            >
              {user.picture ? (
                <Image src={user.picture} alt={user.name} width={32} height={32} className="rounded-full" />
              ) : (
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="hidden md:inline text-sm font-medium">{user.name.split(' ')[0]}</span>
            </Link>
            
            <button 
              onClick={handleLogout} 
              className="text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hidden md:block p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              data-testid="logout-btn"
            >
              <LogOut className="w-5 h-5" />
            </button>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              data-testid="mobile-menu-btn"
            >
              {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {showMobileMenu && (
          <div className="lg:hidden border-t border-gray-200 dark:border-gray-700 py-4">
            <div className="grid grid-cols-4 gap-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link 
                    key={link.href}
                    href={link.href} 
                    onClick={() => setShowMobileMenu(false)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${
                      isActive(link.href) 
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs">{link.label}</span>
                  </Link>
                );
              })}
            </div>
            <button
              onClick={handleLogout}
              className="mt-4 w-full flex items-center justify-center gap-2 p-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
