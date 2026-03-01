'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Image from 'next/image';
import {
  Zap, Users, Trophy, Heart, ArrowRight, RefreshCw,
  MapPin, Clock, Star, MessageCircle, ShoppingBag, QrCode, X, CheckCircle,
} from 'lucide-react';

interface CheckIn {
  checkin_id: string;
  user_id: string;
  name: string;
  picture?: string;
  checked_in_at: string;
  bio?: string;
}

interface TopTrader {
  user_id: string;
  name: string;
  picture?: string;
  trade_count: number;
  reputation: number;
}

interface WantedCard {
  card_name: string;
  game: string;
  want_count: number;
  image_url?: string;
}

interface ConventionTrade {
  trade_id: string;
  user_name: string;
  user_picture?: string;
  user_id: string;
  offering: string;
  looking_for: string;
  created_at: string;
  location?: string;
}

export default function ConventionPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [topTraders, setTopTraders] = useState<TopTrader[]>([]);
  const [wantedCards, setWantedCards] = useState<WantedCard[]>([]);
  const [trades, setTrades] = useState<ConventionTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [newTrade, setNewTrade] = useState({ offering: '', looking_for: '', location: '' });
  const [postingTrade, setPostingTrade] = useState(false);
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'checkins' | 'traders' | 'wanted' | 'trades'>('checkins');

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.user) {
          setCurrentUser(d.user);
          loadAll(d.user.user_id);
        } else {
          router.push('/auth/login');
        }
      })
      .catch(() => router.push('/auth/login'));
  }, [router]);

  const loadAll = async (userId?: string) => {
    setLoading(true);
    await Promise.allSettled([
      loadCheckins(userId),
      loadTopTraders(),
      loadWantedCards(),
      loadConventionTrades(),
    ]);
    setLoading(false);
  };

  const loadCheckins = async (userId?: string) => {
    try {
      const res = await fetch('/api/convention?type=checkins', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setCheckins(data.checkins || []);
        if (userId) setIsCheckedIn(data.checkins.some((c: CheckIn) => c.user_id === userId));
      }
    } catch {}
  };

  const loadTopTraders = async () => {
    try {
      const res = await fetch('/api/convention?type=top_traders', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setTopTraders(data.traders || []);
    } catch {}
  };

  const loadWantedCards = async () => {
    try {
      const res = await fetch('/api/convention?type=wanted_cards', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setWantedCards(data.cards || []);
    } catch {}
  };

  const loadConventionTrades = async () => {
    try {
      const res = await fetch('/api/convention?type=trades', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setTrades(data.trades || []);
    } catch {}
  };

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      const res = await fetch('/api/convention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'checkin' }),
      });
      const data = await res.json();
      if (data.success) {
        setIsCheckedIn(true);
        await loadCheckins(currentUser?.user_id);
      }
    } catch {}
    setCheckingIn(false);
  };

  const handlePostTrade = async () => {
    if (!newTrade.offering.trim() || !newTrade.looking_for.trim()) return;
    setPostingTrade(true);
    try {
      const res = await fetch('/api/convention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'post_trade', ...newTrade }),
      });
      const data = await res.json();
      if (data.success) {
        setNewTrade({ offering: '', looking_for: '', location: '' });
        setShowTradeForm(false);
        await loadConventionTrades();
      }
    } catch {}
    setPostingTrade(false);
  };

  const formatTime = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  const tabs = [
    { key: 'checkins', label: 'Attendees', icon: Users, count: checkins.length },
    { key: 'traders', label: 'Top Traders', icon: Trophy, count: topTraders.length },
    { key: 'wanted', label: 'Most Wanted', icon: Heart, count: wantedCards.length },
    { key: 'trades', label: 'Trade Board', icon: ArrowRight, count: trades.length },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Hero Banner */}
        <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl p-6 md:p-10 mb-6 overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-6 h-6 text-yellow-300" />
                <span className="text-yellow-300 font-bold text-sm uppercase tracking-wider">Live Event</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white mb-2">Convention Mode</h1>
              <p className="text-white/80 text-lg">
                {checkins.length} attendee{checkins.length !== 1 ? 's' : ''} checked in · Find traders, see wanted cards, and post your offers
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowQR(true)}
                className="flex items-center gap-2 px-5 py-3 bg-white/20 hover:bg-white/30 text-white rounded-xl font-semibold transition backdrop-blur-sm border border-white/30"
              >
                <QrCode className="w-5 h-5" />
                My QR
              </button>
              {isCheckedIn ? (
                <div className="flex items-center gap-2 px-5 py-3 bg-green-500 text-white rounded-xl font-semibold">
                  <CheckCircle className="w-5 h-5" />
                  Checked In!
                </div>
              ) : (
                <button
                  onClick={handleCheckIn}
                  disabled={checkingIn}
                  className="flex items-center gap-2 px-5 py-3 bg-white text-purple-700 rounded-xl font-bold hover:bg-gray-50 transition disabled:opacity-60"
                >
                  <MapPin className="w-5 h-5" />
                  {checkingIn ? 'Checking in...' : 'Check In'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-lg font-semibold text-sm transition whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        ) : (
          <>
            {/* Attendees Tab */}
            {activeTab === 'checkins' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold dark:text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    Who's Here ({checkins.length})
                  </h2>
                  <button onClick={() => loadCheckins(currentUser?.user_id)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                    <RefreshCw className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                {checkins.length === 0 ? (
                  <div className="text-center py-10">
                    <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 mb-4">No one has checked in yet — be the first!</p>
                    {!isCheckedIn && (
                      <button onClick={handleCheckIn} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700">
                        Check In Now
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {checkins.map(checkin => (
                      <div
                        key={checkin.checkin_id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-700 hover:shadow-sm transition cursor-pointer"
                        onClick={() => router.push(`/profile/${checkin.user_id}`)}
                      >
                        {checkin.picture ? (
                          <Image src={checkin.picture} alt={checkin.name} width={44} height={44} className="rounded-full flex-shrink-0" unoptimized />
                        ) : (
                          <div className="w-11 h-11 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                            {checkin.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-sm dark:text-white truncate">{checkin.name}</p>
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(checkin.checked_in_at)}
                          </p>
                        </div>
                        <div className="ml-auto flex gap-1">
                          <button
                            onClick={e => { e.stopPropagation(); router.push(`/messages?user=${checkin.user_id}`); }}
                            className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-blue-600"
                            title="Message"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Top Traders Tab */}
            {activeTab === 'traders' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-bold dark:text-white flex items-center gap-2 mb-5">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Top Traders at This Event
                </h2>
                {topTraders.length === 0 ? (
                  <div className="text-center py-10">
                    <Trophy className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">No traders yet — complete some trades!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topTraders.map((trader, idx) => (
                      <div
                        key={trader.user_id}
                        className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-sm transition cursor-pointer"
                        onClick={() => router.push(`/profile/${trader.user_id}`)}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                          idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                          idx === 1 ? 'bg-gray-300 text-gray-700' :
                          idx === 2 ? 'bg-amber-600 text-white' :
                          'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}>
                          {idx + 1}
                        </div>
                        {trader.picture ? (
                          <Image src={trader.picture} alt={trader.name} width={44} height={44} className="rounded-full" unoptimized />
                        ) : (
                          <div className="w-11 h-11 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                            {trader.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-bold dark:text-white">{trader.name}</p>
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span className="flex items-center gap-1"><ArrowRight className="w-3 h-3" />{trader.trade_count} trades</span>
                            <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400" />{trader.reputation}</span>
                          </div>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); router.push(`/messages?user=${trader.user_id}`); }}
                          className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition"
                        >
                          Message
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Most Wanted Cards Tab */}
            {activeTab === 'wanted' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-bold dark:text-white flex items-center gap-2 mb-5">
                  <Heart className="w-5 h-5 text-red-500" />
                  Most Wanted Cards Nearby
                </h2>
                {wantedCards.length === 0 ? (
                  <div className="text-center py-10">
                    <Heart className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 mb-2">No wishlist data yet.</p>
                    <button onClick={() => router.push('/wishlist')} className="text-blue-600 hover:underline text-sm font-semibold">
                      Add cards to your wishlist →
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {wantedCards.map((card, idx) => (
                      <div key={idx} className="rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition">
                        {card.image_url ? (
                          <img src={card.image_url} alt={card.card_name} className="w-full h-auto" />
                        ) : (
                          <div className="w-full h-32 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center">
                            <ShoppingBag className="w-8 h-8 text-blue-300" />
                          </div>
                        )}
                        <div className="p-3">
                          <p className="font-semibold text-sm dark:text-white truncate">{card.card_name}</p>
                          <p className="text-xs text-gray-500">{card.game}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Heart className="w-3 h-3 text-red-400" />
                            <span className="text-xs font-bold text-red-500">{card.want_count} want{card.want_count !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Trade Board Tab */}
            {activeTab === 'trades' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold dark:text-white flex items-center gap-2">
                    <ArrowRight className="w-5 h-5 text-green-500" />
                    Convention Trade Board
                  </h2>
                  <button
                    onClick={() => setShowTradeForm(!showTradeForm)}
                    className="px-4 py-2 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition text-sm"
                  >
                    + Post Trade
                  </button>
                </div>

                {showTradeForm && (
                  <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                    <h3 className="font-bold text-green-800 dark:text-green-300 mb-3">Post a Trade Offer</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">I'm offering</label>
                        <input
                          type="text"
                          value={newTrade.offering}
                          onChange={e => setNewTrade(p => ({ ...p, offering: e.target.value }))}
                          placeholder="e.g. Charizard Holo, Black Lotus..."
                          className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">I'm looking for</label>
                        <input
                          type="text"
                          value={newTrade.looking_for}
                          onChange={e => setNewTrade(p => ({ ...p, looking_for: e.target.value }))}
                          placeholder="e.g. Mew, any rare Pokémon..."
                          className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Meet at (optional)</label>
                        <input
                          type="text"
                          value={newTrade.location}
                          onChange={e => setNewTrade(p => ({ ...p, location: e.target.value }))}
                          placeholder="e.g. Table 12, Main Hall entrance..."
                          className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => setShowTradeForm(false)} className="flex-1 py-2 border border-gray-200 dark:border-gray-600 rounded-xl dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700">
                          Cancel
                        </button>
                        <button
                          onClick={handlePostTrade}
                          disabled={postingTrade || !newTrade.offering.trim() || !newTrade.looking_for.trim()}
                          className="flex-1 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50"
                        >
                          {postingTrade ? 'Posting...' : 'Post Offer'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {trades.length === 0 ? (
                  <div className="text-center py-10">
                    <ArrowRight className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 mb-4">No trade offers yet — post the first one!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {trades.map(trade => (
                      <div key={trade.trade_id} className="flex gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-sm transition">
                        {trade.user_picture ? (
                          <Image src={trade.user_picture} alt={trade.user_name} width={44} height={44} className="rounded-full flex-shrink-0" unoptimized />
                        ) : (
                          <div className="w-11 h-11 bg-green-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                            {trade.user_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <p className="font-semibold text-sm dark:text-white">{trade.user_name}</p>
                            <span className="text-xs text-gray-400">{formatTime(trade.created_at)}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">
                              <p className="text-xs text-green-600 dark:text-green-400 font-bold mb-0.5">OFFERING</p>
                              <p className="text-gray-800 dark:text-gray-200 font-medium">{trade.offering}</p>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
                              <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mb-0.5">WANTS</p>
                              <p className="text-gray-800 dark:text-gray-200 font-medium">{trade.looking_for}</p>
                            </div>
                          </div>
                          {trade.location && (
                            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {trade.location}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => router.push(`/messages?user=${trade.user_id}`)}
                          className="self-start px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-100 transition"
                        >
                          DM
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* My QR Code Modal */}
      {showQR && currentUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm text-center p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold dark:text-white">My Convention QR</h3>
              <button onClick={() => setShowQR(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <X className="w-5 h-5 dark:text-white" />
              </button>
            </div>
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-white rounded-2xl shadow-inner border border-gray-100">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent('https://hatake.eu/profile/' + currentUser.user_id)}`}
                  alt="Profile QR Code"
                  width={200}
                  height={200}
                  className="rounded-xl"
                />
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-1 font-semibold">{currentUser.name}</p>
            <p className="text-gray-400 text-xs mb-6">Let others scan this to find your profile, collection & trades</p>
            <button
              onClick={() => navigator.clipboard?.writeText('https://hatake.eu/profile/' + currentUser.user_id)}
              className="w-full py-3 border border-gray-200 dark:border-gray-600 dark:text-white rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Copy Profile Link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
