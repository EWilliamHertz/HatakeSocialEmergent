'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { Home, Newspaper, Search, Package, ShoppingBag, MessageCircle, User, LogOut, Users, ArrowRightLeft, Menu, X, UsersRound, Layers, Settings, ChevronDown, Shield, Heart, Archive, CalendarDays, Star } from 'lucide-react';
import Link from 'next/link';
import NotificationsDropdown from './NotificationsDropdown';
import ThemeToggle from './ThemeToggle';

const ADMIN_EMAILS = ['zudran@gmail.com', 'ernst@hatake.eu'];

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  is_admin?: boolean;
  is_organizer?: boolean;
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setShowUserDropdown(false);
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    router.push('/');
  };

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');
  const isAdmin = user && (ADMIN_EMAILS.includes(user.email) || user.is_admin);
  const isOrganizer = user && user.is_organizer;

  if (loading) return null;
  if (!user) return null;

  const navLinks = [
    { href: '/feed', icon: Home, label: 'Feed' },
    { href: '/search', icon: Search, label: 'Search' },
    { href: '/collection', icon: Package, label: 'Collection' },
    { href: '/decks', icon: Layers, label: 'Decks' },
    { href: '/marketplace', icon: ShoppingBag, label: 'Market' },
    { href: '/trades', icon: ArrowRightLeft, label: 'Trades' },
    { href: '/community', icon: Users, label: 'Community' },
    { href: '/events', icon: CalendarDays, label: 'Events' },
    { href: '/blog', icon: Newspaper, label: 'News' },
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
              const active = link.href === '/community'
                ? (pathname === '/community' || pathname === '/friends' || pathname === '/groups' || pathname?.startsWith('/groups/'))
                : isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                    active
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  data-testid={`nav-${link.label.toLowerCase()}`}
                  title={link.label}
                >
                  <Icon className="w-5 h-5" />
                  <span className="sr-only">{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationsDropdown />

            {/* User Avatar Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                data-testid="user-menu-btn"
              >
                <div className="relative">
                  {user.picture ? (
                    <Image src={user.picture} alt={user.name} width={32} height={32} className="rounded-full" />
                  ) : (
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {(user.name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  {/* Organizer badge on avatar */}
                  {isOrganizer && !isAdmin && (
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                      <Star className="w-2.5 h-2.5 text-white fill-white" />
                    </span>
                  )}
                  {isAdmin && (
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center">
                      <Shield className="w-2.5 h-2.5 text-white" />
                    </span>
                  )}
                </div>
                <span className="hidden md:inline text-sm font-medium text-gray-700 dark:text-gray-300">
                  {user.name ? user.name.split(' ')[0] : 'User'}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {showUserDropdown && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50" data-testid="user-dropdown">
                  {/* User Info */}
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                      {isAdmin && (
                        <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-medium rounded">
                          Admin
                        </span>
                      )}
                      {!isAdmin && isOrganizer && (
                        <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-xs font-medium rounded">
                          Organizer
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <Link
                      href="/profile"
                      onClick={() => setShowUserDropdown(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      data-testid="dropdown-profile"
                    >
                      <User className="w-4 h-4" />
                      <span>My Profile</span>
                    </Link>

                    <Link
                      href="/settings"
                      onClick={() => setShowUserDropdown(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      data-testid="dropdown-settings"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </Link>

                    {/* Manage Events - for organizers and admins */}
                    {(isAdmin || isOrganizer) && (
                      <Link
                        href="/events"
                        onClick={() => setShowUserDropdown(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                        data-testid="dropdown-events"
                      >
                        <CalendarDays className="w-4 h-4" />
                        <span>Manage Events</span>
                      </Link>
                    )}

                    {/* Admin Panel - only for admins */}
                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setShowUserDropdown(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                        data-testid="dropdown-admin"
                      >
                        <Shield className="w-4 h-4" />
                        <span>Admin Panel</span>
                      </Link>
                    )}
                  </div>

                  {/* Logout */}
                  <div className="border-t border-gray-200 dark:border-gray-700 py-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      data-testid="dropdown-logout"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

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
                const active = link.href === '/community'
                  ? (pathname === '/community' || pathname === '/friends' || pathname === '/groups')
                  : isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setShowMobileMenu(false)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${
                      active
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
          </div>
        )}
      </div>
    </nav>
  );
}
