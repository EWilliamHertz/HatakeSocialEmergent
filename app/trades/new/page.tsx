'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { ArrowRightLeft, Search, X, Loader2, Package } from 'lucide-react';
import Image from 'next/image';
import UserReputation from '@/components/UserReputation';

interface CollectionItem {
  id: number | string; // Allowed string for temporary counter-offer IDs
  card_id: string;
  game: string;
  card_data: any;
  quantity: number;
  condition?: string;
  is_foil?: boolean;
}

interface UserResult {
  user_id: string;
  name: string;
  email: string;
  picture?: string;
}

// 🔴 THE FIX: A strict matching function that prevents identical cards or undefined IDs from selecting everything
const isSameCard = (a: CollectionItem, b: CollectionItem) => {
  // 1. If both cards have a real numeric database ID, use that for a strict exact match
  if (typeof a.id === 'number' && typeof b.id === 'number') {
    return a.id === b.id;
  }
  
  // 2. Fallback for Counter-Offers (which use temporary string IDs)
  if (a.card_id && b.card_id && a.card_id === b.card_id) {
    return a.is_foil === b.is_foil && a.condition === b.condition;
  }

  // 3. Absolute fallback
  return a.id === b.id;
};

function NewTradeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const counterId = searchParams.get('counterId');
  
  const [loading, setLoading] = useState(true);
  const [myCollection, setMyCollection] = useState<CollectionItem[]>([]);
  const [partnerCollection, setPartnerCollection] = useState<CollectionItem[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<UserResult | null>(null);
  const [offeredCards, setOfferedCards] = useState<{card: CollectionItem, quantity: number}[]>([]);
  const [requestedCards, setRequestedCards] = useState<{card: CollectionItem, quantity: number}[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const [cashAmount, setCashAmount] = useState('');
  const [cashCurrency, setCashCurrency] = useState<'EUR' | 'USD' | 'SEK'>('EUR');
  
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<UserResult[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  
  const [mySearchQuery, setMySearchQuery] = useState('');
  const [myGameFilter, setMyGameFilter] = useState('all');
  
  const [partnerSearchQuery, setPartnerSearchQuery] = useState('');
  const [partnerGameFilter, setPartnerGameFilter] = useState('all');
  const [loadingPartnerCollection, setLoadingPartnerCollection] = useState(false);

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
          loadMyCollection();
        }
      })
      .catch(() => router.push('/auth/login'));
  }, [router]);

  // Handle Counter Offer Prefill
  useEffect(() => {
    if (counterId) {
      fetch(`/api/trades/${counterId}`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            const t = data.trade;
            const partner = {
              user_id: t.initiator_id,
              name: t.initiator_name,
              email: '', 
              picture: t.initiator_picture
            };
            setSelectedPartner(partner);
            
            // Generate temporary unique IDs for counter offers so they don't crash the mapping
            const mappedOffer = t.receiver_cards.map((c: any, i: number) => ({
              card: { id: `counter_my_${i}`, card_id: c.card_id, game: c.game, quantity: c.quantity, is_foil: c.foil, condition: c.condition, card_data: { name: c.card_name, images: { small: c.card_image } } },
              quantity: c.quantity
            }));
            const mappedRequest = t.initiator_cards.map((c: any, i: number) => ({
              card: { id: `counter_their_${i}`, card_id: c.card_id, game: c.game, quantity: c.quantity, is_foil: c.foil, condition: c.condition, card_data: { name: c.card_name, images: { small: c.card_image } } },
              quantity: c.quantity
            }));

            setOfferedCards(mappedOffer);
            setRequestedCards(mappedRequest);
            fetchPartnerCollection(t.initiator_id);
          }
        });
    }
  }, [counterId]);

  const loadMyCollection = async () => {
    try {
      const res = await fetch('/api/collection', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setMyCollection(data.items || []);
      }
    } catch (error) {
      console.error('Load collection error:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setUserSearchResults([]);
      return;
    }
    
    setSearchingUsers(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setUserSearchResults(data.users || []);
      }
    } catch (error) {
      console.error('Search users error:', error);
    } finally {
      setSearchingUsers(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (userSearchQuery) {
        searchUsers(userSearchQuery);
      } else {
        setUserSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [userSearchQuery]);

  const fetchPartnerCollection = async (userId: string) => {
    setLoadingPartnerCollection(true);
    try {
      const res = await fetch(`/api/collection/user/${userId}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setPartnerCollection(data.items || []);
      }
    } catch (error) {
      console.error('Load partner collection error:', error);
    } finally {
      setLoadingPartnerCollection(false);
    }
  };

  const selectPartner = async (user: UserResult) => {
    setSelectedPartner(user);
    setUserSearchQuery('');
    setUserSearchResults([]);
    fetchPartnerCollection(user.user_id);
  };

  // 🔴 Updated logic to use isSameCard
  const addCardToOffer = (item: CollectionItem) => {
    const existing = offeredCards.find(o => isSameCard(o.card, item));
    if (existing) {
      if (existing.quantity < item.quantity) {
        setOfferedCards(offeredCards.map(o => 
          isSameCard(o.card, item) ? { ...o, quantity: o.quantity + 1 } : o
        ));
      }
    } else {
      setOfferedCards([...offeredCards, { card: item, quantity: 1 }]);
    }
  };

  const removeCardFromOffer = (item: CollectionItem) => {
    setOfferedCards(offeredCards.filter(o => !isSameCard(o.card, item)));
  };

  const updateOfferQuantity = (item: CollectionItem, quantity: number) => {
    if (quantity <= 0) {
      removeCardFromOffer(item);
    } else {
      const collectionItem = myCollection.find(i => isSameCard(i, item));
      if (collectionItem && quantity <= collectionItem.quantity) {
        setOfferedCards(offeredCards.map(o => 
          isSameCard(o.card, item) ? { ...o, quantity } : o
        ));
      } else if (!collectionItem) {
        // Fallback for counter offer items
        setOfferedCards(offeredCards.map(o => 
          isSameCard(o.card, item) ? { ...o, quantity } : o
        ));
      }
    }
  };

  const addCardToRequest = (item: CollectionItem) => {
    const existing = requestedCards.find(o => isSameCard(o.card, item));
    if (existing) {
      if (existing.quantity < item.quantity) {
        setRequestedCards(requestedCards.map(o => 
          isSameCard(o.card, item) ? { ...o, quantity: o.quantity + 1 } : o
        ));
      }
    } else {
      setRequestedCards([...requestedCards, { card: item, quantity: 1 }]);
    }
  };

  const removeCardFromRequest = (item: CollectionItem) => {
    setRequestedCards(requestedCards.filter(o => !isSameCard(o.card, item)));
  };

  const updateRequestQuantity = (item: CollectionItem, quantity: number) => {
    if (quantity <= 0) {
      removeCardFromRequest(item);
    } else {
      const collectionItem = partnerCollection.find(i => isSameCard(i, item));
      if (collectionItem && quantity <= collectionItem.quantity) {
        setRequestedCards(requestedCards.map(o => 
          isSameCard(o.card, item) ? { ...o, quantity } : o
        ));
      } else if (!collectionItem) {
        setRequestedCards(requestedCards.map(o => 
          isSameCard(o.card, item) ? { ...o, quantity } : o
        ));
      }
    }
  };

  const submitTrade = async () => {
    if (!selectedPartner || (offeredCards.length === 0 && requestedCards.length === 0)) return;
    
    setSubmitting(true);
    try {
      const res = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          recipientId: selectedPartner.user_id,
          initiatorItems: offeredCards.map(o => ({
            card_id: o.card.card_id,
            card_name: o.card.card_data?.name || 'Unknown Card',
            card_image: getCardImage(o.card),
            game: o.card.game,
            quantity: o.quantity,
            condition: o.card.condition,
            foil: o.card.is_foil,
            value: 0
          })),
          recipientItems: requestedCards.map(o => ({
            card_id: o.card.card_id,
            card_name: o.card.card_data?.name || 'Unknown Card',
            card_image: getCardImage(o.card),
            game: o.card.game,
            quantity: o.quantity,
            condition: o.card.condition,
            foil: o.card.is_foil,
            value: 0
          })),
          message: notes,
          cash_requested: cashAmount ? parseFloat(cashAmount) : null,
          cash_currency: cashAmount ? cashCurrency : null,
          countered_trade_id: counterId
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

  const filterCollection = (items: CollectionItem[], query: string, game: string) => {
    return items.filter(item => {
      const name = item.card_data?.name || '';
      const matchesQuery = !query || name.toLowerCase().includes(query.toLowerCase());
      const matchesGame = game === 'all' || item.game === game;
      return matchesQuery && matchesGame;
    });
  };

  const filteredMyCollection = filterCollection(myCollection, mySearchQuery, myGameFilter);
  const filteredPartnerCollection = filterCollection(partnerCollection, partnerSearchQuery, partnerGameFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const CardItem = ({ item, onAdd, isAdded }: { item: CollectionItem; onAdd: () => void; isAdded: boolean }) => (
    <div 
      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition ${
        isAdded ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
      }`}
      onClick={onAdd}
    >
      <img src={getCardImage(item)} alt={item.card_data?.name} className="w-10 h-14 rounded object-cover" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium dark:text-white truncate">{item.card_data?.name}</p>
        <p className="text-xs text-gray-500">x{item.quantity} • {item.game.toUpperCase()}</p>
      </div>
      {isAdded && <span className="text-green-600 text-xs">Added</span>}
    </div>
  );

  const SelectedCard = ({ offer, onRemove, onUpdateQty }: { 
    offer: {card: CollectionItem, quantity: number}; 
    onRemove: () => void; 
    onUpdateQty: (qty: number) => void 
  }) => (
    <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <img src={getCardImage(offer.card)} alt={offer.card.card_data?.name} className="w-8 h-12 rounded object-cover" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium dark:text-white truncate">{offer.card.card_data?.name}</p>
        <div className="flex items-center gap-1">
          <button onClick={() => onUpdateQty(offer.quantity - 1)} className="w-5 h-5 bg-gray-200 dark:bg-gray-600 rounded text-xs">-</button>
          <span className="text-xs dark:text-gray-300 w-4 text-center">{offer.quantity}</span>
          <button onClick={() => onUpdateQty(offer.quantity + 1)} className="w-5 h-5 bg-gray-200 dark:bg-gray-600 rounded text-xs">+</button>
        </div>
      </div>
      <button onClick={onRemove} className="text-red-500 hover:text-red-700 p-1">
        <X className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {counterId ? 'Counter Trade Offer' : 'New Trade'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {counterId ? 'Modify the trade items to propose a new deal' : 'Create a trade offer with any user'}
          </p>
        </div>
        <button
          onClick={submitTrade}
          disabled={!selectedPartner || (offeredCards.length === 0 && requestedCards.length === 0) || submitting}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRightLeft className="w-5 h-5" />}
          Send Trade Offer
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Trade Partner</h2>
        
        {selectedPartner ? (
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center gap-4">
              {selectedPartner.picture ? (
                <Image src={selectedPartner.picture} alt={selectedPartner.name} width={40} height={40} className="rounded-full" />
              ) : (
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {(selectedPartner.name || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <span className="font-medium dark:text-white">{selectedPartner.name}</span>
                <div className="mt-1">
                  <UserReputation userId={selectedPartner.user_id} compact={true} />
                </div>
              </div>
            </div>
            {!counterId && (
              <button onClick={() => { setSelectedPartner(null); setPartnerCollection([]); setRequestedCards([]); }} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {userSearchResults.length > 0 && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-48 overflow-y-auto">
                {userSearchResults.map((user) => (
                  <button
                    key={user.user_id}
                    onClick={() => selectPartner(user)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition border-b last:border-b-0 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      {user.picture ? (
                        <Image src={user.picture} alt={user.name} width={36} height={36} className="rounded-full" />
                      ) : (
                        <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                          {(user.name || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="text-left">
                        <span className="font-medium dark:text-white block">{user.name}</span>
                      </div>
                    </div>
                    <UserReputation userId={user.user_id} compact={true} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <h3 className="font-bold text-gray-900 dark:text-white mb-3">You Offer ({offeredCards.length} cards)</h3>
            {offeredCards.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-3">Select cards from your collection below</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {offeredCards.map((offer) => (
                  <SelectedCard 
                    key={offer.card.id} 
                    offer={offer} 
                    onRemove={() => removeCardFromOffer(offer.card)}
                    onUpdateQty={(qty) => updateOfferQuantity(offer.card, qty)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <h3 className="font-bold text-gray-900 dark:text-white mb-3">Your Collection</h3>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {filteredMyCollection.map((item) => (
                <CardItem 
                  key={item.id} 
                  item={item} 
                  onAdd={() => addCardToOffer(item)}
                  isAdded={offeredCards.some(o => isSameCard(o.card, item))}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <h3 className="font-bold text-gray-900 dark:text-white mb-3">You Request ({requestedCards.length} cards)</h3>
            {requestedCards.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-3">
                {selectedPartner ? "Select cards from their collection below" : "Select a partner first"}
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {requestedCards.map((req) => (
                  <SelectedCard 
                    key={req.card.id} 
                    offer={req} 
                    onRemove={() => removeCardFromRequest(req.card)}
                    onUpdateQty={(qty) => updateRequestQuantity(req.card, qty)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <h3 className="font-bold text-gray-900 dark:text-white mb-3">Partner's Collection</h3>
            {!selectedPartner ? (
              <p className="text-gray-500 text-sm text-center py-8">Select a trade partner to see their collection</p>
            ) : loadingPartnerCollection ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {filteredPartnerCollection.map((item) => (
                  <CardItem 
                    key={item.id} 
                    item={item} 
                    onAdd={() => addCardToRequest(item)}
                    isAdded={requestedCards.some(o => isSameCard(o.card, item))}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewTradePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <Suspense fallback={
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        </div>
      }>
        <NewTradeContent />
      </Suspense>
    </div>
  );
}