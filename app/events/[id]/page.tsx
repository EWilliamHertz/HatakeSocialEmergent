'use client';

import { useEffect, useState, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Image from 'next/image';
import {
  Calendar, MapPin, ExternalLink, Ticket, Users, Star, Heart,
  ChevronDown, ChevronUp, RefreshCw, X, Zap, CheckCircle, Trophy,
  ArrowRight, MessageCircle, QrCode, Clock, Camera, Trash2,
  ShieldCheck, Store, Plus, Search, Upload, Image as ImageIcon,
  Building2, UserCheck,
} from 'lucide-react';

interface Event {
  event_id: string;
  title: string;
  description: string;
  category: string;
  categories: string[];
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  venue?: string;
  city?: string;
  country?: string;
  website_url?: string;
  ticket_url?: string;
  image_url?: string;
  is_featured: boolean;
  is_sold_out: boolean;
  hatake_present: boolean;
  is_past: boolean;
}

interface Attendee {
  user_id: string;
  name: string;
  picture?: string;
  bio?: string;
  status: 'interested' | 'going';
  created_at: string;
}

interface Organizer {
  user_id: string;
  name: string;
  picture?: string;
  email: string;
  role: 'organizer' | 'exhibitor';
}

interface EventPost {
  post_id: string;
  user_id: string;
  content: string;
  media_urls: string[];
  created_at: string;
  author_name: string;
  author_picture?: string;
  author_role?: 'organizer' | 'exhibitor';
}

interface CheckIn {
  checkin_id: string;
  user_id: string;
  name: string;
  picture?: string;
  checked_in_at: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  pokemon: 'from-yellow-400 via-yellow-500 to-orange-500',
  magic: 'from-purple-600 via-indigo-600 to-blue-700',
  tcg: 'from-blue-600 via-cyan-600 to-teal-600',
  tournament: 'from-red-600 via-rose-600 to-pink-600',
  convention: 'from-green-600 via-emerald-600 to-teal-600',
};

const CATEGORY_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  pokemon: { label: '⚡ Pokémon', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300' },
  magic: { label: '🔮 Magic', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-800 dark:text-purple-300' },
  tcg: { label: '🃏 TCG', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300' },
  tournament: { label: '🏆 Tournament', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300' },
  convention: { label: '🎪 Convention', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300' },
};

function formatDate(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  if (s.toDateString() === e.toDateString()) return s.toLocaleDateString('sv-SE', opts);
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${s.getDate()}–${e.getDate()} ${s.toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' })}`;
  }
  return `${s.toLocaleDateString('sv-SE', opts)} – ${e.toLocaleDateString('sv-SE', opts)}`;
}

function formatTime(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diff < 1) return 'Just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

function isEventLive(start: string, end: string) {
  const now = Date.now();
  return now >= new Date(start).getTime() && now <= new Date(end).getTime();
}

function isEventUpcoming(start: string) {
  return Date.now() < new Date(start).getTime();
}

function getCountdown(start: string) {
  const diff = new Date(start).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today!';
  if (days === 1) return 'Tomorrow!';
  if (days < 7) return `${days} days away`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} away`;
  if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} away`;
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) > 1 ? 's' : ''} away`;
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [myStatus, setMyStatus] = useState<'interested' | 'going' | null>(null);
  const [interestedCount, setInterestedCount] = useState(0);
  const [goingCount, setGoingCount] = useState(0);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [posts, setPosts] = useState<EventPost[]>([]);
  const [activeTab, setActiveTab] = useState<'about' | 'attendees' | 'updates' | 'convention'>('about');
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [orgSearch, setOrgSearch] = useState('');
  const [orgSearchResults, setOrgSearchResults] = useState<any[]>([]);
  const [newPost, setNewPost] = useState('');
  const [postMedia, setPostMedia] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.user) {
          setCurrentUser(d.user);
          loadAll(d.user);
        } else {
          router.push('/auth/login');
        }
      })
      .catch(() => router.push('/auth/login'));
  }, [eventId]);

  const loadAll = async (user: any) => {
    setLoading(true);
    const [evRes, attRes, orgRes, postsRes] = await Promise.allSettled([
      fetch(`/api/events/${eventId}`, { credentials: 'include' }),
      fetch(`/api/events/${eventId}/attend`, { credentials: 'include' }),
      fetch(`/api/events/${eventId}/organizers`, { credentials: 'include' }),
      fetch(`/api/events/${eventId}/posts`, { credentials: 'include' }),
    ]);

    if (evRes.status === 'fulfilled') {
      const d = await evRes.value.json();
      if (d.event) setEvent(d.event);
    }
    if (attRes.status === 'fulfilled') {
      const d = await attRes.value.json();
      if (d.success) {
        setMyStatus(d.myStatus);
        setInterestedCount(d.interestedCount);
        setGoingCount(d.goingCount);
      }
    }
    if (orgRes.status === 'fulfilled') {
      const d = await orgRes.value.json();
      if (d.success) {
        setOrganizers(d.organizers);
        setIsOrganizer(d.organizers.some((o: Organizer) => o.user_id === user?.user_id));
      }
    }
    if (postsRes.status === 'fulfilled') {
      const d = await postsRes.value.json();
      if (d.success) setPosts(d.posts);
    }

    await loadAttendees();
    setLoading(false);
  };

  const loadAttendees = async () => {
    try {
      const r = await fetch(`/api/events/${eventId}/attendees`, { credentials: 'include' });
      const d = await r.json();
      if (d.success) setAttendees(d.attendees);
    } catch {}
  };

  const loadCheckins = async () => {
    try {
      const r = await fetch('/api/convention?type=checkins', { credentials: 'include' });
      const d = await r.json();
      if (d.success) {
        setCheckins(d.checkins || []);
        setIsCheckedIn(d.checkins?.some((c: CheckIn) => c.user_id === currentUser?.user_id) || false);
      }
    } catch {}
  };

  const handleAttend = async (status: 'interested' | 'going') => {
    const newStatus = myStatus === status ? null : status;
    const r = await fetch(`/api/events/${eventId}/attend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status: newStatus }),
    });
    const d = await r.json();
    if (d.success) {
      setMyStatus(d.myStatus);
      setInterestedCount(d.interestedCount);
      setGoingCount(d.goingCount);
      await loadAttendees();
    }
  };

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      const r = await fetch('/api/convention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'checkin' }),
      });
      const d = await r.json();
      if (d.success) { setIsCheckedIn(true); await loadCheckins(); }
    } catch {}
    setCheckingIn(false);
  };

  const handlePost = async () => {
    if (!newPost.trim() && !postMedia.length) return;
    setPosting(true);
    try {
      const r = await fetch(`/api/events/${eventId}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: newPost, media_urls: postMedia }),
      });
      const d = await r.json();
      if (d.success) {
        setNewPost('');
        setPostMedia([]);
        const postsRes = await fetch(`/api/events/${eventId}/posts`, { credentials: 'include' });
        const pd = await postsRes.json();
        if (pd.success) setPosts(pd.posts);
      }
    } catch {}
    setPosting(false);
  };

  const handleDeletePost = async (postId: string) => {
    await fetch(`/api/events/${eventId}/posts`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ postId }),
    });
    setPosts(p => p.filter(x => x.post_id !== postId));
  };

  const handleAssignOrganizer = async (userId: string, role: 'organizer' | 'exhibitor') => {
    const r = await fetch(`/api/events/${eventId}/organizers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ userId, role }),
    });
    const d = await r.json();
    if (d.success) setOrganizers(d.organizers);
  };

  const handleRemoveOrganizer = async (userId: string) => {
    await fetch(`/api/events/${eventId}/organizers`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ userId }),
    });
    setOrganizers(o => o.filter(x => x.user_id !== userId));
  };

  const searchUsers = async (q: string) => {
    if (!q.trim()) { setOrgSearchResults([]); return; }
    try {
      const r = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, { credentials: 'include' });
      const d = await r.json();
      setOrgSearchResults(d.users || []);
    } catch {}
  };

  const handleImagePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        const formData = new FormData();
        formData.append('file', file);
        try {
          const r = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: formData });
          const d = await r.json();
          if (d.url) setPostMedia(prev => [...prev, d.url]);
        } catch {}
      }
    }
  };

  // FIXED: use is_admin boolean, not role string
  const isAdmin = currentUser?.is_admin === true;
  const canPost = isAdmin || isOrganizer;
  const live = event ? isEventLive(event.start_date, event.end_date) : false;
  const upcoming = event ? isEventUpcoming(event.start_date) : false;
  const past = event ? !live && !upcoming : false;
  const gradient = event ? (CATEGORY_COLORS[event.category] || CATEGORY_COLORS.tcg) : CATEGORY_COLORS.tcg;
  const badge = event ? (CATEGORY_BADGE[event.category] || CATEGORY_BADGE.tcg) : CATEGORY_BADGE.tcg;
  const going = attendees.filter(a => a.status === 'going');
  const interested = attendees.filter(a => a.status === 'interested');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="flex items-center justify-center py-40">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <p className="text-gray-500 text-lg">Event not found</p>
          <button onClick={() => router.push('/events')} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold">← Back to Events</button>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'about', label: 'About', icon: Calendar },
    { key: 'attendees', label: `Attendees${going.length + interested.length > 0 ? ` (${going.length + interested.length})` : ''}`, icon: Users },
    { key: 'updates', label: `Updates${posts.length > 0 ? ` (${posts.length})` : ''}`, icon: Camera },
    ...(live ? [{ key: 'convention', label: '🔴 Live Mode', icon: Zap }] : []),
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      {/* Hero */}
      <div className={`bg-gradient-to-br ${gradient} relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        <div className="container mx-auto px-4 py-10 max-w-5xl relative">
          <button onClick={() => router.push('/events')} className="text-white/70 hover:text-white text-sm mb-6 flex items-center gap-1 transition">
            ← Alla evenemang
          </button>
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="flex-1">
              <div className="flex flex-wrap gap-2 mb-3">
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${badge.bg} ${badge.text}`}>{badge.label}</span>
                {live && <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-500 text-white animate-pulse">🔴 LIVE NOW</span>}
                {event.is_sold_out && <span className="text-xs font-bold px-3 py-1 rounded-full bg-gray-900 text-white">SOLD OUT</span>}
                {event.hatake_present && <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 text-white border border-white/30">🏪 Hatake Here!</span>}
                {event.is_featured && <span className="text-xs font-bold px-3 py-1 rounded-full bg-yellow-400 text-yellow-900">⭐ Featured</span>}
                {past && <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 text-white">Past Event</span>}
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-white mb-3 leading-tight">{event.title}</h1>
              <div className="flex flex-wrap gap-4 text-white/80 text-sm mb-4">
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{formatDate(event.start_date, event.end_date)}</span>
                {(event.venue || event.city) && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{[event.venue, event.city].filter(Boolean).join(', ')}</span>}
              </div>
              {upcoming && getCountdown(event.start_date) && (
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-xl font-semibold text-sm border border-white/30">
                  <Clock className="w-4 h-4" />
                  {getCountdown(event.start_date)}
                </div>
              )}
            </div>

            {/* Attend buttons */}
            {!past && (
              <div className="flex flex-col gap-3 md:min-w-[200px]">
                <button
                  onClick={() => handleAttend('going')}
                  className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition text-sm ${
                    myStatus === 'going'
                      ? 'bg-white text-green-700 shadow-lg'
                      : 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  {myStatus === 'going' ? '✓ Going!' : 'Going'}
                  {goingCount > 0 && <span className="ml-1 font-normal text-xs opacity-80">({goingCount})</span>}
                </button>
                <button
                  onClick={() => handleAttend('interested')}
                  className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition text-sm ${
                    myStatus === 'interested'
                      ? 'bg-white/40 text-white shadow-lg border-2 border-white'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                  }`}
                >
                  <Star className="w-4 h-4" />
                  {myStatus === 'interested' ? '★ Interested!' : 'Interested'}
                  {interestedCount > 0 && <span className="ml-1 font-normal text-xs opacity-80">({interestedCount})</span>}
                </button>
                <div className="flex gap-2">
                  {event.ticket_url && (
                    <a href={event.ticket_url} target="_blank" rel="noopener noreferrer"
                      className={`flex-1 flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl font-semibold text-xs transition ${
                        event.is_sold_out ? 'bg-gray-800 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      {event.is_sold_out ? 'Sold Out' : 'Tickets'}
                    </a>
                  )}
                  {event.website_url && (
                    <a href={event.website_url} target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl font-semibold text-xs transition border border-white/30"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Website
                    </a>
                  )}
                </div>
                {isAdmin && (
                  <button
                    onClick={() => setShowOrgModal(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold text-xs border border-white/20 transition"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Manage Organizers
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Who's going avatars */}
          {going.length > 0 && (
            <div className="mt-5 flex items-center gap-3">
              <div className="flex -space-x-2">
                {going.slice(0, 8).map(a => (
                  a.picture
                    ? <Image key={a.user_id} src={a.picture} alt={a.name} width={28} height={28} className="rounded-full border-2 border-white" unoptimized />
                    : <div key={a.user_id} className="w-7 h-7 rounded-full border-2 border-white bg-blue-600 flex items-center justify-center text-white text-xs font-bold">{a.name.charAt(0)}</div>
                ))}
                {going.length > 8 && <div className="w-7 h-7 rounded-full border-2 border-white bg-white/20 flex items-center justify-center text-white text-xs font-bold">+{going.length - 8}</div>}
              </div>
              <span className="text-white/80 text-sm font-medium">
                {going.length} {going.length === 1 ? 'person' : 'people'} going
                {interested.length > 0 ? ` · ${interested.length} interested` : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Tabs */}
        <div className="flex gap-1 bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as any);
                if (tab.key === 'convention') loadCheckins();
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-lg font-semibold text-sm transition whitespace-nowrap min-w-[80px] ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* About Tab */}
        {activeTab === 'about' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-bold dark:text-white mb-4">About This Event</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{event.description}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
                <h3 className="font-bold dark:text-white mb-3 flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-500" />Date & Time</h3>
                <p className="text-gray-700 dark:text-gray-300 font-medium">{formatDate(event.start_date, event.end_date)}</p>
                {event.start_time && (
                  <p className="text-gray-500 text-sm mt-1">
                    {event.start_time}{event.end_time ? ` – ${event.end_time}` : ''}
                  </p>
                )}
              </div>
              {(event.venue || event.city) && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
                  <h3 className="font-bold dark:text-white mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-red-500" />Location</h3>
                  {event.venue && <p className="text-gray-700 dark:text-gray-300 font-medium">{event.venue}</p>}
                  <p className="text-gray-500 text-sm">{[event.city, event.country].filter(Boolean).join(', ')}</p>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent([event.venue, event.city].filter(Boolean).join(' '))}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm mt-2 inline-flex items-center gap-1"
                  >
                    Open in Maps <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {organizers.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
                <h3 className="font-bold dark:text-white mb-4 flex items-center gap-2"><UserCheck className="w-4 h-4 text-purple-500" />Organizers & Exhibitors</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {organizers.map(org => (
                    <div key={org.user_id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                      {org.picture
                        ? <Image src={org.picture} alt={org.name} width={40} height={40} className="rounded-full" unoptimized />
                        : <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">{org.name.charAt(0)}</div>
                      }
                      <div className="min-w-0">
                        <p className="font-semibold text-sm dark:text-white truncate">{org.name}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          org.role === 'organizer' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}>
                          {org.role === 'organizer' ? '🎪 Organizer' : '🏪 Exhibitor'}
                        </span>
                      </div>
                      {isAdmin && (
                        <button onClick={() => handleRemoveOrganizer(org.user_id)} className="ml-auto p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-400">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Attendees Tab */}
        {activeTab === 'attendees' && (
          <div className="space-y-6">
            {going.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-bold dark:text-white mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />Going ({going.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {going.map(a => (
                    <div key={a.user_id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-700 cursor-pointer transition"
                      onClick={() => router.push(`/profile/${a.user_id}`)}>
                      {a.picture
                        ? <Image src={a.picture} alt={a.name} width={40} height={40} className="rounded-full flex-shrink-0" unoptimized />
                        : <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">{a.name.charAt(0)}</div>
                      }
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm dark:text-white truncate">{a.name}</p>
                        {a.bio && <p className="text-xs text-gray-400 truncate">{a.bio}</p>}
                      </div>
                      <button onClick={e => { e.stopPropagation(); router.push(`/messages?user=${a.user_id}`); }}
                        className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-blue-500">
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {interested.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-bold dark:text-white mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />Interested ({interested.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {interested.map(a => (
                    <div key={a.user_id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-yellow-200 cursor-pointer transition"
                      onClick={() => router.push(`/profile/${a.user_id}`)}>
                      {a.picture
                        ? <Image src={a.picture} alt={a.name} width={40} height={40} className="rounded-full flex-shrink-0" unoptimized />
                        : <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">{a.name.charAt(0)}</div>
                      }
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm dark:text-white truncate">{a.name}</p>
                      </div>
                      <button onClick={e => { e.stopPropagation(); router.push(`/messages?user=${a.user_id}`); }}
                        className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-blue-500">
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {going.length === 0 && interested.length === 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
                <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">No one has marked attendance yet — be the first!</p>
                {!past && (
                  <div className="flex gap-3 justify-center">
                    <button onClick={() => handleAttend('going')} className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700">I'm Going</button>
                    <button onClick={() => handleAttend('interested')} className="px-5 py-2.5 bg-yellow-500 text-white rounded-xl font-semibold hover:bg-yellow-600">Interested</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Updates Tab */}
        {activeTab === 'updates' && (
          <div className="space-y-4">
            {canPost && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  {isAdmin ? <ShieldCheck className="w-4 h-4 text-purple-500" /> : <Store className="w-4 h-4 text-blue-500" />}
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                    {isAdmin ? 'Admin Post' : organizers.find(o => o.user_id === currentUser?.user_id)?.role === 'exhibitor' ? 'Exhibitor Post' : 'Organizer Post'}
                  </span>
                </div>
                <textarea
                  value={newPost}
                  onChange={e => setNewPost(e.target.value)}
                  onPaste={handleImagePaste}
                  placeholder="Share an update, photo, or announcement... (paste images with Ctrl+V)"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                />
                {postMedia.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {postMedia.map((url, i) => (
                      <div key={i} className="relative">
                        <img src={url} alt="" className="h-20 w-20 object-cover rounded-lg" />
                        <button onClick={() => setPostMedia(m => m.filter((_, j) => j !== i))}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">×</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between mt-3">
                  <button onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-sm">
                    <ImageIcon className="w-4 h-4" /> Add Photo
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden"
                    onChange={async e => {
                      const files = Array.from(e.target.files || []);
                      for (const file of files) {
                        const fd = new FormData(); fd.append('file', file);
                        try {
                          const r = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: fd });
                          const d = await r.json();
                          if (d.url) setPostMedia(prev => [...prev, d.url]);
                        } catch {}
                      }
                    }}
                  />
                  <button onClick={handlePost} disabled={posting || (!newPost.trim() && !postMedia.length)}
                    className="px-5 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 text-sm transition">
                    {posting ? 'Posting...' : 'Post Update'}
                  </button>
                </div>
              </div>
            )}

            {posts.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
                <Camera className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No updates yet</p>
                {!canPost && <p className="text-gray-400 text-sm mt-1">Organizers and exhibitors can post updates here</p>}
              </div>
            ) : (
              posts.map(post => (
                <div key={post.post_id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
                  <div className="flex items-start gap-3 mb-3">
                    {post.author_picture
                      ? <Image src={post.author_picture} alt={post.author_name} width={40} height={40} className="rounded-full flex-shrink-0" unoptimized />
                      : <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">{post.author_name.charAt(0)}</div>
                    }
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm dark:text-white">{post.author_name}</p>
                        {post.author_role && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            post.author_role === 'organizer' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          }`}>
                            {post.author_role === 'organizer' ? '🎪 Organizer' : '🏪 Exhibitor'}
                          </span>
                        )}
                        {!post.author_role && isAdmin && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">🛡️ Admin</span>
                        )}
                        <span className="text-xs text-gray-400 ml-auto">{formatTime(post.created_at)}</span>
                      </div>
                    </div>
                    {(isAdmin || post.user_id === currentUser?.user_id) && (
                      <button onClick={() => handleDeletePost(post.post_id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {post.content && <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-wrap mb-3">{post.content}</p>}
                  {post.media_urls && post.media_urls.length > 0 && (
                    <div className={`grid gap-2 ${post.media_urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                      {post.media_urls.map((url, i) => (
                        url.match(/\.(mp4|webm|mov)$/i)
                          ? <video key={i} src={url} controls className="rounded-xl w-full" />
                          : <img key={i} src={url} alt="" className="rounded-xl w-full object-cover max-h-80" />
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Convention Live Mode Tab */}
        {activeTab === 'convention' && live && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-red-600 to-orange-500 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-5 h-5 text-yellow-300" />
                    <span className="text-yellow-300 font-bold text-sm uppercase tracking-wider">Live Convention Mode</span>
                  </div>
                  <p className="text-white/80 text-sm">{checkins.length} attendee{checkins.length !== 1 ? 's' : ''} checked in{event.venue ? ` at ${event.venue}` : ''}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowQR(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white/20 text-white rounded-xl font-semibold text-sm border border-white/30 hover:bg-white/30 transition">
                    <QrCode className="w-4 h-4" /> My QR
                  </button>
                  {isCheckedIn
                    ? <div className="flex items-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-xl font-semibold text-sm"><CheckCircle className="w-4 h-4" />Checked In!</div>
                    : <button onClick={handleCheckIn} disabled={checkingIn} className="flex items-center gap-2 px-4 py-2.5 bg-white text-red-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition disabled:opacity-60">
                        <MapPin className="w-4 h-4" />{checkingIn ? 'Checking in...' : 'Check In'}
                      </button>
                  }
                </div>
              </div>
            </div>

            {checkins.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold dark:text-white flex items-center gap-2"><Users className="w-5 h-5 text-blue-500" />Who's Here ({checkins.length})</h2>
                  <button onClick={loadCheckins} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><RefreshCw className="w-4 h-4 text-gray-400" /></button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {checkins.map(c => (
                    <div key={c.checkin_id} className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 cursor-pointer hover:border-blue-200 transition"
                      onClick={() => router.push(`/profile/${c.user_id}`)}>
                      {c.picture
                        ? <Image src={c.picture} alt={c.name} width={36} height={36} className="rounded-full flex-shrink-0" unoptimized />
                        : <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{c.name.charAt(0)}</div>
                      }
                      <p className="font-semibold text-sm dark:text-white truncate">{c.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manage Organizers Modal */}
      {showOrgModal && isAdmin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold dark:text-white">Manage Organizers & Exhibitors</h3>
              <button onClick={() => setShowOrgModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><X className="w-5 h-5 dark:text-white" /></button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              <div className="mb-4">
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={orgSearch}
                    onChange={e => { setOrgSearch(e.target.value); searchUsers(e.target.value); }}
                    placeholder="Search users by name or email..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                {orgSearchResults.map(u => {
                  const existing = organizers.find(o => o.user_id === u.user_id);
                  return (
                    <div key={u.user_id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 mb-2">
                      {u.picture
                        ? <Image src={u.picture} alt={u.name} width={36} height={36} className="rounded-full" unoptimized />
                        : <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">{u.name.charAt(0)}</div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm dark:text-white truncate">{u.name}</p>
                        <p className="text-xs text-gray-400 truncate">{u.email}</p>
                        {existing && <span className="text-xs text-green-600 font-medium">Currently: {existing.role}</span>}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleAssignOrganizer(u.user_id, 'organizer')}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${existing?.role === 'organizer' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>
                          🎪 Organizer
                        </button>
                        <button onClick={() => handleAssignOrganizer(u.user_id, 'exhibitor')}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${existing?.role === 'exhibitor' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>
                          🏪 Exhibitor
                        </button>
                        {existing && (
                          <button onClick={() => handleRemoveOrganizer(u.user_id)} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200">Remove</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {organizers.length > 0 && (
                <>
                  <h4 className="font-bold text-sm dark:text-white mb-2">Current Team</h4>
                  {organizers.map(org => (
                    <div key={org.user_id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 mb-2">
                      {org.picture
                        ? <Image src={org.picture} alt={org.name} width={36} height={36} className="rounded-full" unoptimized />
                        : <div className="w-9 h-9 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">{org.name.charAt(0)}</div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm dark:text-white">{org.name}</p>
                        <span className={`text-xs font-medium ${org.role === 'organizer' ? 'text-purple-600' : 'text-blue-600'}`}>
                          {org.role === 'organizer' ? '🎪 Organizer' : '🏪 Exhibitor'}
                        </span>
                      </div>
                      <button onClick={() => handleRemoveOrganizer(org.user_id)} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg text-red-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQR && currentUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm text-center p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold dark:text-white">My Convention QR</h3>
              <button onClick={() => setShowQR(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><X className="w-5 h-5 dark:text-white" /></button>
            </div>
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-white rounded-2xl shadow-inner border border-gray-100">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent('https://hatake.eu/profile/' + currentUser.user_id)}`}
                  alt="QR Code" width={200} height={200} className="rounded-xl" />
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-1 font-semibold">{currentUser.name}</p>
            <p className="text-gray-400 text-xs mb-6">Let others scan this to visit your profile</p>
            <button onClick={() => navigator.clipboard?.writeText('https://hatake.eu/profile/' + currentUser.user_id)}
              className="w-full py-3 border border-gray-200 dark:border-gray-600 dark:text-white rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              Copy Profile Link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
