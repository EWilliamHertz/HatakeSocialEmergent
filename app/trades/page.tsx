'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { ArrowRightLeft, Clock, CheckCircle, XCircle, Package, Send, Eye } from 'lucide-react';
import Image from 'next/image';

interface Trade {
  trade_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  initiator_id: string;
  initiator_name: string;
  initiator_picture?: string;
  receiver_id: string;
  recipient_name: string;
  recipient_picture?: string;
  initiator_cards: any[];
  receiver_cards: any[];
}

export default function TradesPage() {
  const router = useRouter();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');
  const [tab, setTab] = useState<'active' | 'completed' | 'all'>('active');

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) {
          router.push('/auth/login');
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.user) {
          setCurrentUserId(data.user.user_id);
          loadTrades();
        }
      })
      .catch(() => router.push('/auth/login'));
  }, [router]);

  const loadTrades = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/trades', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setTrades(data.trades || []);
      }
    } catch (error) {
      console.error('Load trades error:', error);
    } finally {
      setLoading(false);
    }
  };

  const respondToTrade = async (tradeId: string, action: 'accept' | 'reject') => {
    try {
      await fetch(`/api/trades/${tradeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action })
      });
      loadTrades();
    } catch (error) {
      console.error('Respond to trade error:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'accepted': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'completed': return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case 'rejected':
      case 'cancelled': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'accepted': return 'Accepted';
      case 'completed': return 'Completed';
      case 'rejected': return 'Rejected';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const filteredTrades = trades.filter(trade => {
    if (tab === 'active') return ['pending', 'accepted'].includes(trade.status);
    if (tab === 'completed') return ['completed', 'rejected', 'cancelled'].includes(trade.status);
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2 dark:text-white">My Trades</h1>
              <p className="text-gray-600 dark:text-gray-400">Manage your card trades with other collectors</p>
            </div>
            <button
              onClick={() => router.push('/trades/new')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 flex items-center gap-2"
              data-testid="new-trade-btn"
            >
              <ArrowRightLeft className="w-4 h-4" />
              New Trade
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setTab('active')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                tab === 'active' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setTab('completed')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                tab === 'completed' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setTab('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                tab === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              All
            </button>
          </div>
        </div>

        {/* Trades List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : filteredTrades.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
            <ArrowRightLeft className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {tab === 'active' ? 'No active trades' : tab === 'completed' ? 'No completed trades' : 'No trades yet'}
            </p>
            <button
              onClick={() => router.push('/trades/new')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              Start a Trade
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTrades.map((trade) => {
              const isInitiator = trade.initiator_id === currentUserId;
              const otherParty = isInitiator 
                ? { name: trade.recipient_name, picture: trade.recipient_picture }
                : { name: trade.initiator_name, picture: trade.initiator_picture };
              
              return (
                <div 
                  key={trade.trade_id} 
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
                  data-testid={`trade-${trade.trade_id}`}
                >
                  {/* Trade Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      {otherParty.picture ? (
                        <Image src={otherParty.picture} alt={otherParty.name} width={48} height={48} className="rounded-full" />
                      ) : (
                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-lg font-semibold">
                          {otherParty.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold dark:text-white">Trade with {otherParty.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {isInitiator ? 'You initiated' : 'They initiated'} • {new Date(trade.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(trade.status)}
                      <span className={`text-sm font-semibold ${
                        trade.status === 'pending' ? 'text-yellow-600 dark:text-yellow-400' :
                        trade.status === 'accepted' ? 'text-green-600 dark:text-green-400' :
                        trade.status === 'completed' ? 'text-blue-600 dark:text-blue-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {getStatusLabel(trade.status)}
                      </span>
                    </div>
                  </div>

                  {/* Trade Items */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
                        {isInitiator ? 'You offer' : 'They offer'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(isInitiator ? trade.initiator_items : trade.recipient_items)?.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 bg-white dark:bg-gray-700 rounded px-2 py-1 text-sm dark:text-white">
                            <Package className="w-4 h-4 text-gray-400" />
                            {item.card_name || 'Card'}
                          </div>
                        )) || <span className="text-gray-400 text-sm">No items</span>}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
                        {isInitiator ? 'They offer' : 'You offer'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(isInitiator ? trade.recipient_items : trade.initiator_items)?.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 bg-white dark:bg-gray-700 rounded px-2 py-1 text-sm dark:text-white">
                            <Package className="w-4 h-4 text-gray-400" />
                            {item.card_name || 'Card'}
                          </div>
                        )) || <span className="text-gray-400 text-sm">No items</span>}
                      </div>
                    </div>
                  </div>

                  {/* Trade Actions */}
                  <div className="flex justify-end gap-2">
                    {trade.status === 'pending' && !isInitiator && (
                      <>
                        <button
                          onClick={() => respondToTrade(trade.trade_id, 'accept')}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Accept
                        </button>
                        <button
                          onClick={() => respondToTrade(trade.trade_id, 'reject')}
                          className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 flex items-center gap-2"
                        >
                          <XCircle className="w-4 h-4" />
                          Decline
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => router.push(`/trades/${trade.trade_id}`)}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
