'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { useRouter } from 'next/navigation';
import { Calendar, MapPin, Clock, ExternalLink, Ticket, ChevronDown, ChevronUp, Star, Users, CheckCircle, Heart } from 'lucide-react';

interface Event {
  event_id: string;
  title: string;
  description: string;
  categories: string[];
  location_name: string;
  location_city: string;
  location_country: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  image_url: string;
  website_url: string;
  ticket_url: string;
  is_sold_out: boolean;
  is_past: boolean;
  featured: boolean;
  hatake_exhibitor: boolean;
}

interface AttendanceData {
  myStatus: string | null;
  interestedCount: number;
  goingCount: number;
}

const CATEGORY_TABS = [
  { id: 'all', label: 'All Events', emoji: '🎴' },
  { id: 'tcg', label: 'TCG', emoji: '🃏' },
  { id: 'pokemon', label: 'Pokémon', emoji: '⚡' },
  { id: 'magic', label: 'Magic', emoji: '🔮' },
  { id: 'tournament', label: 'Tournaments', emoji: '🏆' },
  { id: 'convention', label: 'Conventions', emoji: '🎪' },
];

const CATEGORY_COLORS: Record<string, string> = {
  pokemon: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  tcg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  magic: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  tournament: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  convention: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
};

function formatDateRange(start: string, end?: string) {
  const startDate = new Date(start);
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  const locale = 'sv-SE';
  if (!end || end === start) return startDate.toLocaleDateString(locale, options);
  const endDate = new Date(end);
  if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
    return `${startDate.getDate()}\u2013${endDate.getDate()} ${startDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}`;
  }
  return `${startDate.toLocaleDateString(locale, options)} \u2013 ${endDate.toLocaleDateString(locale, options)}`;
}

function getDaysUntil(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const event = new Date(dateStr);
  event.setHours(0, 0, 0, 0);
  const diff = Math.round((event.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today!';
  if (diff === 1) return 'Tomorrow!';
  if (diff < 7) return `${diff} days away`;
  if (diff < 30) return `${Math.round(diff / 7)} weeks away`;
  const months = Math.round(diff / 30);
  return `${months} month${months > 1 ? 's' : ''} away`;
}

function EventCard({
  event,
  past = false,
  attendance,
  onAttend,
  onClick,
}: {
  event: Event;
  past?: boolean;
  attendance?: AttendanceData;
  onAttend?: (eventId: string, status: string | null) => void;
  onClick?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [attendLoading, setAttendLoading] = useState(false);

  const gradients: Record<string, string> = {
    pokemon: 'from-yellow-400 to-orange-500',
    magic: 'from-purple-600 to-blue-700',
    tcg: 'from-blue-500 to-cyan-600',
    convention: 'from-green-500 to-teal-600',
    tournament: 'from-red-500 to-pink-600',
  };

  const firstCat = event.categories?.[0] || 'tcg';
  const gradient = gradients[firstCat] || 'from-blue-500 to-purple-600';

  const handleAttend = async (e: React.MouseEvent, status: string) => {
    e.stopPropagation();
    if (!onAttend) return;
    setAttendLoading(true);
    const newStatus = attendance?.myStatus === status ? null : status;
    await onAttend(event.event_id, newStatus);
    setAttendLoading(false);
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${past ? 'opacity-80' : ''}`}
      onClick={onClick}
    >
      <div className={`relative h-44 bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden`}>
        {event.image_url && !imgError ? (
          <div className="absolute inset-0">
            <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" onError={() => setImgError(true)} />
            <div className="absolute inset-0 bg-black/30" />
          </div>
        ) : (
          <div className="text-6xl opacity-30 select-none">🎴</div>
        )}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {event.featured && !past && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500 text-white text-xs font-bold rounded-full shadow">
              <Star className="w-3 h-3 fill-white" /> Featured
            </span>
          )}
          {event.hatake_exhibitor && (
            <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full shadow">🏪 Hatake Here!</span>
          )}
          {event.is_sold_out && (
            <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full shadow">SOLD OUT</span>
          )}
        </div>
        {!past && (
          <div className="absolute top-3 right-3">
            <span className="px-2 py-1 bg-black/50 backdrop-blur text-white text-xs font-medium rounded-full">{getDaysUntil(event.start_date)}</span>
          </div>
        )}
        {past && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="px-3 py-1 bg-black/60 backdrop-blur text-gray-300 text-sm font-semibold rounded-full">Past Event</span>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {(event.categories || []).map(cat => (
            <span key={cat} className={`px-2 py-0.5 text-xs font-medium rounded-full ${CATEGORY_COLORS[cat] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </span>
          ))}
        </div>

        <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight mb-1">{event.title}</h3>

        <div className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400 mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 flex-shrink-0 text-blue-500" />
            <span>{formatDateRange(event.start_date, event.end_date)}</span>
          </div>
          {event.start_time && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 flex-shrink-0 text-blue-500" />
              <span>{event.start_time}{event.end_time ? ` \u2013 ${event.end_time}` : ''}</span>
            </div>
          )}
          {(event.location_name || event.location_city) && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 flex-shrink-0 text-blue-500" />
              <span>{[event.location_name, event.location_city].filter(Boolean).join(', ')}</span>
            </div>
          )}
        </div>

        {event.description && (
          <div className="mb-3">
            <p className={`text-sm text-gray-600 dark:text-gray-400 leading-relaxed ${!expanded ? 'line-clamp-2' : ''}`}>{event.description}</p>
            <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mt-1 hover:underline">
              {expanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Read more</>}
            </button>
          </div>
        )}

        {attendance && !past && (
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{attendance.goingCount} going</span>
            <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{attendance.interestedCount} interested</span>
          </div>
        )}

        {!past && (
          <div className="flex gap-2 flex-wrap">
            <button onClick={(e) => handleAttend(e, 'going')} disabled={attendLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                attendance?.myStatus === 'going' ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-700 dark:hover:text-green-400'
              }`}>
              <CheckCircle className="w-4 h-4" /> Going
            </button>
            <button onClick={(e) => handleAttend(e, 'interested')} disabled={attendLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                attendance?.myStatus === 'interested' ? 'bg-yellow-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 hover:text-yellow-700 dark:hover:text-yellow-400'
              }`}>
              <Heart className="w-4 h-4" /> Interested
            </button>
            {event.ticket_url && !event.is_sold_out && (
              <a href={event.ticket_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
                <Ticket className="w-4 h-4" /> Tickets
              </a>
            )}
            {event.website_url && (
              <a href={event.website_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition">
                <ExternalLink className="w-4 h-4" /> Website
              </a>
            )}
          </div>
        )}
        {past && event.website_url && (
          <a href={event.website_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition">
            <ExternalLink className="w-3 h-3" /> More info
          </a>
        )}
      </div>
    </div>
  );
}

export default function EventsPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('all');
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<Record<string, AttendanceData>>({});
  const [error, setError] = useState('');
  const [showPast, setShowPast] = useState(false);

  const fetchEvents = async (cat: string) => {
    setLoading(true);
    setError('');
    try {
      const param = cat === 'all' ? '' : `?category=${cat}`;
      const pastParam = cat === 'all' ? '?past=true' : `?category=${cat}&past=true`;
      const [upRes, pastRes] = await Promise.all([
        fetch(`/api/events${param}`, { credentials: 'include' }),
        fetch(`/api/events${pastParam}`, { credentials: 'include' }),
      ]);
      const upData = await upRes.json();
      const pastData = await pastRes.json();
      const upcoming = upData.events || [];
      const past = pastData.events || [];
      setUpcomingEvents(upcoming);
      setPastEvents(past);
      if (upcoming.length > 0) {
        const attendanceResults = await Promise.all(
          upcoming.map((e: Event) =>
            fetch(`/api/events/${e.event_id}/attend`, { credentials: 'include' })
              .then(r => r.json())
              .then(d => ({ id: e.event_id, data: d }))
              .catch(() => ({ id: e.event_id, data: { myStatus: null, interestedCount: 0, goingCount: 0 } }))
          )
        );
        const map: Record<string, AttendanceData> = {};
        attendanceResults.forEach(({ id, data }) => {
          map[id] = { myStatus: data.myStatus, interestedCount: data.interestedCount || 0, goingCount: data.goingCount || 0 };
        });
        setAttendance(map);
      }
    } catch {
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleAttend = async (eventId: string, status: string | null) => {
    try {
      const res = await fetch(`/api/events/${eventId}/attend`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        setAttendance(prev => ({
          ...prev,
          [eventId]: { myStatus: data.myStatus, interestedCount: data.interestedCount || 0, goingCount: data.goingCount || 0 },
        }));
      }
    } catch { /* silent */ }
  };

  useEffect(() => { fetchEvents(activeCategory); }, [activeCategory]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <Navbar />
      <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold mb-2">Events</h1>
            <p className="text-blue-100 text-lg">Tournaments, conventions & TCG events across Sweden</p>
          </div>
        </div>
      </div>

      <div className="sticky top-16 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-3 scrollbar-hide">
            {CATEGORY_TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveCategory(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  activeCategory === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}>
                <span>{tab.emoji}</span>{tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-pulse">
                <div className="h-44 bg-gray-200 dark:bg-gray-700" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-500 mb-4">{error}</p>
            <button onClick={() => fetchEvents(activeCategory)} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Try again</button>
          </div>
        ) : (
          <>
            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <span className="w-1 h-6 bg-blue-600 rounded-full inline-block" />
                Upcoming Events
                {upcomingEvents.length > 0 && <span className="ml-1 text-sm font-normal text-gray-500 dark:text-gray-400">({upcomingEvents.length})</span>}
              </h2>
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                  <div className="text-5xl mb-3">📅</div>
                  <p className="text-gray-500 dark:text-gray-400">No upcoming events in this category</p>
                  <button onClick={() => setActiveCategory('all')} className="mt-3 text-blue-600 hover:underline text-sm">View all events</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {upcomingEvents.map(event => (
                    <EventCard key={event.event_id} event={event} attendance={attendance[event.event_id]} onAttend={handleAttend} onClick={() => router.push(`/events/${event.event_id}`)} />
                  ))}
                </div>
              )}
            </section>
            {pastEvents.length > 0 && (
              <section className="mt-12">
                <button onClick={() => setShowPast(!showPast)} className="flex items-center gap-2 text-xl font-bold text-gray-700 dark:text-gray-300 mb-5 hover:text-gray-900 dark:hover:text-white transition group">
                  <span className="w-1 h-6 bg-gray-400 rounded-full inline-block" />
                  Previous Events
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({pastEvents.length})</span>
                  {showPast ? <ChevronUp className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition" /> : <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition" />}
                </button>
                {showPast && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {pastEvents.map(event => (
                      <EventCard key={event.event_id} event={event} past onClick={() => router.push(`/events/${event.event_id}`)} />
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
