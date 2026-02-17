'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { ArrowRightLeft, ArrowLeft, Clock, CheckCircle, XCircle, Package, MessageCircle, User, MapPin, CreditCard } from 'lucide-react';
import Image from 'next/image';

interface TradeItem {
  card_id: string;
  card_name: string;
  card_image?: string;
  game: string;
  quantity: number;
  condition?: string;
  foil?: boolean;
  value?: number;
}

interface Trade {
  trade_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  initiator_id: string;
  initiator_name: string;
  initiator_picture?: string;
  initiator_shipping_address?: string;
  initiator_payment_swish?: string;
  initiator_payment_account?: string;
  initiator_payment_bankgiro?: string;
  receiver_id: string;
  recipient_name: string;
  recipient_picture?: string;
  recipient_shipping_address?: string;
  recipient_payment_swish?: string;
  recipient_payment_account?: string;
  recipient_payment_bankgiro?: string;
  initiator_cards: TradeItem[];
  receiver_cards: TradeItem[];
  message?: string;
}

export default function TradeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const tradeId = params.id as string;
  
  const [trade, setTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');
  const [updating, setUpdating] = useState(false);

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
          loadTrade();
        }
      })
      .catch(() => router.push('/auth/login'));
  }, [router, tradeId]);

  const loadTrade = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trades/${tradeId}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setTrade(data.trade);
      } else {
        alert('Trade not found');
        router.push('/trades');
      }
    } catch (error) {
      console.error('Load trade error:', error);
      router.push('/trades');
    } finally {
      setLoading(false);
    }
  };

  const respondToTrade = async (action: 'accept' | 'reject' | 'cancel' | 'complete') => {
    if (!trade) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/trades/${trade.trade_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        loadTrade();
      } else {
        alert(data.error || 'Failed to update trade');
      }
    } catch (error) {
      console.error('Respond to trade error:', error);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-6 h-6 text-yellow-500" />;
      case 'accepted': return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'completed': return <CheckCircle className="w-6 h-6 text-blue-500" />;
      case 'rejected':
      case 'cancelled': return <XCircle className="w-6 h-6 text-red-500" />;
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
      case 'accepted': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'completed': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      case 'rejected':
      case 'cancelled': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!trade) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Trade not found</p>
          </div>
        </div>
      </div>
    );
  }

  const isInitiator = trade.initiator_id === currentUserId;
  const otherParty = isInitiator 
    ? { id: trade.receiver_id, name: trade.recipient_name, picture: trade.recipient_picture }
    : { id: trade.initiator_id, name: trade.initiator_name, picture: trade.initiator_picture };

  const myItems = isInitiator ? trade.initiator_cards : trade.receiver_cards;
  const theirItems = isInitiator ? trade.receiver_cards : trade.initiator_cards;

  // Calculate total values
  const calculateTotal = (items: TradeItem[] | undefined) => {
    if (!items) return 0;
    return items.reduce((sum, item) => sum + ((item.value || 0) * (item.quantity || 1)), 0);
  };
  
  const myTotal = calculateTotal(myItems);
  const theirTotal = calculateTotal(theirItems);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <button
          onClick={() => router.push('/trades')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Trades
        </button>

        {/* Trade Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <ArrowRightLeft className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold dark:text-white">Trade Details</h1>
                <p className="text-gray-500 dark:text-gray-400">
                  Created {new Date(trade.created_at).toLocaleDateString()} at {new Date(trade.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${getStatusColor(trade.status)}`}>
              {getStatusIcon(trade.status)}
              <span className="font-semibold">{getStatusLabel(trade.status)}</span>
            </div>
          </div>

          {/* Trade Parties */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-3">
              {trade.initiator_picture ? (
                <Image src={trade.initiator_picture} alt={trade.initiator_name} width={48} height={48} className="rounded-full" />
              ) : (
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-lg font-semibold">
                  {trade.initiator_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-semibold dark:text-white">{trade.initiator_name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {trade.initiator_id === currentUserId ? '(You) ' : ''}Initiator
                </p>
              </div>
            </div>
            
            <ArrowRightLeft className="w-6 h-6 text-gray-400" />
            
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-semibold dark:text-white">{trade.recipient_name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {trade.receiver_id === currentUserId ? '(You) ' : ''}Recipient
                </p>
              </div>
              {trade.recipient_picture ? (
                <Image src={trade.recipient_picture} alt={trade.recipient_name} width={48} height={48} className="rounded-full" />
              ) : (
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white text-lg font-semibold">
                  {trade.recipient_name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Trade Items */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Your Items */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold dark:text-white flex items-center gap-2">
                <User className="w-5 h-5 text-blue-500" />
                {isInitiator ? 'You Offer' : 'They Offer'}
              </h2>
              {myTotal > 0 && (
                <span className="text-lg font-bold text-green-600">€{myTotal.toFixed(2)}</span>
              )}
            </div>
            <div className="space-y-3">
              {(isInitiator ? trade.initiator_cards : trade.receiver_cards)?.length > 0 ? (
                (isInitiator ? trade.initiator_cards : trade.receiver_cards).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    {item.card_image ? (
                      <Image src={item.card_image} alt={item.card_name} width={48} height={68} className="rounded object-cover" />
                    ) : (
                      <div className="w-12 h-17 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium dark:text-white">{item.card_name || 'Unknown Card'}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="capitalize">{item.game}</span>
                        {item.quantity > 1 && <span>× {item.quantity}</span>}
                        {item.foil && <span className="text-purple-500">Foil</span>}
                        {item.condition && <span>{item.condition}</span>}
                        {item.value && item.value > 0 && (
                          <span className="text-green-600 font-medium">€{item.value.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center py-4">No items</p>
              )}
            </div>
          </div>

          {/* Their Items */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4 dark:text-white flex items-center gap-2">
              <User className="w-5 h-5 text-green-500" />
              {isInitiator ? 'They Offer' : 'You Offer'}
            </h2>
            <div className="space-y-3">
              {(isInitiator ? trade.receiver_cards : trade.initiator_cards)?.length > 0 ? (
                (isInitiator ? trade.receiver_cards : trade.initiator_cards).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    {item.card_image ? (
                      <Image src={item.card_image} alt={item.card_name} width={48} height={68} className="rounded object-cover" />
                    ) : (
                      <div className="w-12 h-17 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium dark:text-white">{item.card_name || 'Unknown Card'}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="capitalize">{item.game}</span>
                        {item.quantity > 1 && <span>× {item.quantity}</span>}
                        {item.foil && <span className="text-purple-500">Foil</span>}
                        {item.condition && <span>{item.condition}</span>}
                        {item.value && item.value > 0 && (
                          <span className="text-green-600 font-medium">€{item.value.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center py-4">No items</p>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        {trade.message && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold mb-3 dark:text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-gray-500" />
              Notes
            </h2>
            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{trade.message}</p>
          </div>
        )}

        {/* Shipping & Payment Info - Show when trade is accepted or completed */}
        {(trade.status === 'accepted' || trade.status === 'completed') && (
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Their Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold mb-4 dark:text-white flex items-center gap-2">
                <User className="w-5 h-5 text-blue-500" />
                {otherParty.name}&apos;s Details
              </h2>
              
              {/* Shipping Address */}
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1 mb-2">
                  <MapPin className="w-4 h-4" /> Shipping Address
                </h3>
                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg text-sm">
                  {(isInitiator ? trade.recipient_shipping_address : trade.initiator_shipping_address) || 'Not provided'}
                </p>
              </div>
              
              {/* Payment Details */}
              <div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1 mb-2">
                  <CreditCard className="w-4 h-4" /> Payment Details
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg space-y-2 text-sm">
                  {(isInitiator ? trade.recipient_payment_swish : trade.initiator_payment_swish) && (
                    <p className="dark:text-gray-200">
                      <span className="text-gray-500 dark:text-gray-400">Swish:</span> {isInitiator ? trade.recipient_payment_swish : trade.initiator_payment_swish}
                    </p>
                  )}
                  {(isInitiator ? trade.recipient_payment_account : trade.initiator_payment_account) && (
                    <p className="dark:text-gray-200">
                      <span className="text-gray-500 dark:text-gray-400">Account:</span> {isInitiator ? trade.recipient_payment_account : trade.initiator_payment_account}
                    </p>
                  )}
                  {(isInitiator ? trade.recipient_payment_bankgiro : trade.initiator_payment_bankgiro) && (
                    <p className="dark:text-gray-200">
                      <span className="text-gray-500 dark:text-gray-400">Bankgiro:</span> {isInitiator ? trade.recipient_payment_bankgiro : trade.initiator_payment_bankgiro}
                    </p>
                  )}
                  {!(isInitiator ? trade.recipient_payment_swish : trade.initiator_payment_swish) && 
                   !(isInitiator ? trade.recipient_payment_account : trade.initiator_payment_account) && 
                   !(isInitiator ? trade.recipient_payment_bankgiro : trade.initiator_payment_bankgiro) && (
                    <p className="text-gray-500">Not provided</p>
                  )}
                </div>
              </div>
            </div>

            {/* Your Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold mb-4 dark:text-white flex items-center gap-2">
                <User className="w-5 h-5 text-green-500" />
                Your Details (shared with them)
              </h2>
              
              {/* Shipping Address */}
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1 mb-2">
                  <MapPin className="w-4 h-4" /> Your Shipping Address
                </h3>
                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg text-sm">
                  {(isInitiator ? trade.initiator_shipping_address : trade.recipient_shipping_address) || 'Not provided - update in Settings'}
                </p>
              </div>
              
              {/* Payment Details */}
              <div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1 mb-2">
                  <CreditCard className="w-4 h-4" /> Your Payment Details
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg space-y-2 text-sm">
                  {(isInitiator ? trade.initiator_payment_swish : trade.recipient_payment_swish) && (
                    <p className="dark:text-gray-200">
                      <span className="text-gray-500 dark:text-gray-400">Swish:</span> {isInitiator ? trade.initiator_payment_swish : trade.recipient_payment_swish}
                    </p>
                  )}
                  {(isInitiator ? trade.initiator_payment_account : trade.recipient_payment_account) && (
                    <p className="dark:text-gray-200">
                      <span className="text-gray-500 dark:text-gray-400">Account:</span> {isInitiator ? trade.initiator_payment_account : trade.recipient_payment_account}
                    </p>
                  )}
                  {(isInitiator ? trade.initiator_payment_bankgiro : trade.recipient_payment_bankgiro) && (
                    <p className="dark:text-gray-200">
                      <span className="text-gray-500 dark:text-gray-400">Bankgiro:</span> {isInitiator ? trade.initiator_payment_bankgiro : trade.recipient_payment_bankgiro}
                    </p>
                  )}
                  {!(isInitiator ? trade.initiator_payment_swish : trade.recipient_payment_swish) && 
                   !(isInitiator ? trade.initiator_payment_account : trade.recipient_payment_account) && 
                   !(isInitiator ? trade.initiator_payment_bankgiro : trade.recipient_payment_bankgiro) && (
                    <p className="text-gray-500">Not provided - update in Settings</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold mb-4 dark:text-white">Actions</h2>
          <div className="flex flex-wrap gap-3">
            {/* Pending trade - recipient can accept/reject */}
            {trade.status === 'pending' && !isInitiator && (
              <>
                <button
                  onClick={() => respondToTrade('accept')}
                  disabled={updating}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Accept Trade
                </button>
                <button
                  onClick={() => respondToTrade('reject')}
                  disabled={updating}
                  className="px-6 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50 flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Decline Trade
                </button>
              </>
            )}

            {/* Pending trade - initiator can cancel */}
            {trade.status === 'pending' && isInitiator && (
              <button
                onClick={() => respondToTrade('cancel')}
                disabled={updating}
                className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Cancel Trade
              </button>
            )}

            {/* Accepted trade - either party can mark as complete */}
            {trade.status === 'accepted' && (
              <button
                onClick={() => respondToTrade('complete')}
                disabled={updating}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Mark as Completed
              </button>
            )}

            {/* Message the other party */}
            <button
              onClick={() => router.push('/messages')}
              className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Message {otherParty.name}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
