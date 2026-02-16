'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { ArrowRightLeft, Search, Plus, X, Loader2, Package, User } from 'lucide-react';
import Image from 'next/image';

interface CollectionItem {
  id: number;
  card_id: string;
  game: string;
  card_data: any;
  quantity: number;
}

interface Friend {
  user_id: string;
  name: string;
  picture?: string;
}

export default function NewTradePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [myCollection, setMyCollection] = useState<CollectionItem[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [offeredCards, setOfferedCards] = useState<{card: CollectionItem, quantity: number}[]>([]);
  const [requestedCards, setRequestedCards] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
          loadData();
        }
      })
      .catch(() => router.push('/auth/login'));
  }, [router]);

  const loadData = async () => {
    try {
      const [collectionRes, friendsRes] = await Promise.all([
        fetch('/api/collection', { credentials: 'include' }),
        fetch('/api/friends', { credentials: 'include' })
      ]);
      
      const collectionData = await collectionRes.json();
      const friendsData = await friendsRes.json();
      
      if (collectionData.success) {
        setMyCollection(collectionData.items || []);
      }
      if (friendsData.success) {
        setFriends(friendsData.friends || []);
      }
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const addCardToOffer = (item: CollectionItem) => {
    const existing = offeredCards.find(o => o.card.card_id === item.card_id);
    if (existing) {
      if (existing.quantity < item.quantity) {
        setOfferedCards(offeredCards.map(o => 
          o.card.card_id === item.card_id ? { ...o, quantity: o.quantity + 1 } : o
        ));
      }
    } else {
      setOfferedCards([...offeredCards, { card: item, quantity: 1 }]);
    }
  };

  const removeCardFromOffer = (cardId: string) => {
    setOfferedCards(offeredCards.filter(o => o.card.card_id !== cardId));
  };

  const updateOfferQuantity = (cardId: string, quantity: number) => {
    if (quantity <= 0) {
      removeCardFromOffer(cardId);
    } else {
      const item = myCollection.find(i => i.card_id === cardId);
      if (item && quantity <= item.quantity) {
        setOfferedCards(offeredCards.map(o => 
          o.card.card_id === cardId ? { ...o, quantity } : o
        ));
      }
    }
  };

  const submitTrade = async () => {
    if (!selectedFriend || offeredCards.length === 0) return;
    
    setSubmitting(true);
    try {
      const res = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          partnerId: selectedFriend.user_id,
          offeredCards: offeredCards.map(o => ({
            card_id: o.card.card_id,
            card_data: o.card.card_data,
            quantity: o.quantity
          })),
          requestedCards: requestedCards,
          notes: notes
        })
      });
      
      const data = await res.json();
      if (data.success) {
        router.push('/trades');
      } else {
        alert(data.error || 'Failed to create trade');
      }
    } catch (error) {
      console.error('Submit trade error:', error);
      alert('Failed to create trade');
    } finally {
      setSubmitting(false);
    }
  };

  const getCardImage = (item: CollectionItem) => {
    if (item.card_data?.image_uris?.small) return item.card_data.image_uris.small;
    if (item.card_data?.images?.small) return item.card_data.images.small;
    return '/placeholder-card.png';
  };

  const filteredCollection = myCollection.filter(item => {
    if (!searchQuery) return true;
    const name = item.card_data?.name || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">New Trade</h1>
            <p className="text-gray-600 dark:text-gray-400">Create a trade offer with a friend</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Select Friend & Your Offer */}
          <div className="space-y-6">
            {/* Select Friend */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Trade Partner</h2>
              
              {selectedFriend ? (
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    {selectedFriend.picture ? (
                      <Image src={selectedFriend.picture} alt={selectedFriend.name} width={40} height={40} className="rounded-full" />
                    ) : (
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {selectedFriend.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium dark:text-white">{selectedFriend.name}</span>
                  </div>
                  <button onClick={() => setSelectedFriend(null)} className="text-gray-500 hover:text-gray-700">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {friends.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">No friends yet. Add friends to trade!</p>
                  ) : (
                    friends.map((friend) => (
                      <button
                        key={friend.user_id}
                        onClick={() => setSelectedFriend(friend)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition text-left"
                      >
                        {friend.picture ? (
                          <Image src={friend.picture} alt={friend.name} width={40} height={40} className="rounded-full" />
                        ) : (
                          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {friend.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium dark:text-white">{friend.name}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Your Cards to Offer */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Your Offer</h2>
              
              {offeredCards.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">Select cards from your collection to offer</p>
              ) : (
                <div className="space-y-2">
                  {offeredCards.map((offer) => (
                    <div key={offer.card.card_id} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <img src={getCardImage(offer.card)} alt={offer.card.card_data?.name} className="w-10 h-14 rounded object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium dark:text-white truncate">{offer.card.card_data?.name}</p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateOfferQuantity(offer.card.card_id, offer.quantity - 1)}
                            className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded text-sm"
                          >-</button>
                          <span className="text-sm dark:text-gray-300">{offer.quantity}</span>
                          <button
                            onClick={() => updateOfferQuantity(offer.card.card_id, offer.quantity + 1)}
                            className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded text-sm"
                          >+</button>
                        </div>
                      </div>
                      <button onClick={() => removeCardFromOffer(offer.card.card_id)} className="text-red-500 hover:text-red-700">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* What You Want */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">What You Want (Optional)</h2>
              <textarea
                value={requestedCards}
                onChange={(e) => setRequestedCards(e.target.value)}
                placeholder="Describe what cards you're looking for..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg resize-none"
                rows={3}
              />
            </div>

            {/* Notes */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Notes</h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes for this trade..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg resize-none"
                rows={2}
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={submitTrade}
              disabled={!selectedFriend || offeredCards.length === 0 || submitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRightLeft className="w-5 h-5" />}
              Send Trade Offer
            </button>
          </div>

          {/* Right: Your Collection */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Your Collection</h2>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your cards..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
              />
            </div>
            
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[600px] overflow-y-auto">
              {filteredCollection.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400">No cards in collection</p>
                </div>
              ) : (
                filteredCollection.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addCardToOffer(item)}
                    className="relative group"
                  >
                    <img
                      src={getCardImage(item)}
                      alt={item.card_data?.name}
                      className="w-full rounded-lg shadow hover:shadow-md transition"
                    />
                    {item.quantity > 1 && (
                      <span className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1.5 rounded">
                        x{item.quantity}
                      </span>
                    )}
                    <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/20 rounded-lg transition flex items-center justify-center">
                      <Plus className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
