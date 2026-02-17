'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { ArrowRightLeft, Search, Plus, X, Loader2, Package, User, Filter } from 'lucide-react';
import Image from 'next/image';

interface CollectionItem {
  id: number;
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

export default function NewTradePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [myCollection, setMyCollection] = useState<CollectionItem[]>([]);
  const [partnerCollection, setPartnerCollection] = useState<CollectionItem[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<UserResult | null>(null);
  const [offeredCards, setOfferedCards] = useState<{card: CollectionItem, quantity: number}[]>([]);
  const [requestedCards, setRequestedCards] = useState<{card: CollectionItem, quantity: number}[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // User search
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<UserResult[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  
  // My collection search/filter
  const [mySearchQuery, setMySearchQuery] = useState('');
  const [myGameFilter, setMyGameFilter] = useState('all');
  
  // Partner collection search/filter
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

  const selectPartner = async (user: UserResult) => {
    setSelectedPartner(user);
    setUserSearchQuery('');
    setUserSearchResults([]);
    
    // Load partner's collection
    setLoadingPartnerCollection(true);
    try {
      const res = await fetch(`/api/collection/user/${user.user_id}`, { credentials: 'include' });
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

  const addCardToRequest = (item: CollectionItem) => {
    const existing = requestedCards.find(o => o.card.card_id === item.card_id);
    if (existing) {
      if (existing.quantity < item.quantity) {
        setRequestedCards(requestedCards.map(o => 
          o.card.card_id === item.card_id ? { ...o, quantity: o.quantity + 1 } : o
        ));
      }
    } else {
      setRequestedCards([...requestedCards, { card: item, quantity: 1 }]);
    }
  };

  const removeCardFromRequest = (cardId: string) => {
    setRequestedCards(requestedCards.filter(o => o.card.card_id !== cardId));
  };

  const updateRequestQuantity = (cardId: string, quantity: number) => {
    if (quantity <= 0) {
      removeCardFromRequest(cardId);
    } else {
      const item = partnerCollection.find(i => i.card_id === cardId);
      if (item && quantity <= item.quantity) {
        setRequestedCards(requestedCards.map(o => 
          o.card.card_id === cardId ? { ...o, quantity } : o
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
            value: getCardValue(o.card)
          })),
          recipientItems: requestedCards.map(o => ({
            card_id: o.card.card_id,
            card_name: o.card.card_data?.name || 'Unknown Card',
            card_image: getCardImage(o.card),
            game: o.card.game,
            quantity: o.quantity,
            condition: o.card.condition,
            foil: o.card.is_foil,
            value: getCardValue(o.card)
          })),
          message: notes
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

  // Calculate total value of offered/requested cards
  const getCardValue = (item: CollectionItem): number => {
    const prices = item.card_data?.prices;
    // Try USD prices first (Scryfall MTG)
    if (prices?.usd) return parseFloat(prices.usd);
    if (prices?.usd_foil && item.is_foil) return parseFloat(prices.usd_foil);
    if (prices?.eur) return parseFloat(prices.eur);
    if (prices?.eur_foil && item.is_foil) return parseFloat(prices.eur_foil);
    
    // TCGPlayer prices (Pokemon)
    if (item.card_data?.tcgplayer?.prices?.normal?.market) return item.card_data.tcgplayer.prices.normal.market;
    if (item.card_data?.tcgplayer?.prices?.holofoil?.market) return item.card_data.tcgplayer.prices.holofoil.market;
    
    // TCGdex prices
    if (item.card_data?.prices?.firstEdition?.mid) return item.card_data.prices.firstEdition.mid;
    if (item.card_data?.prices?.normal?.mid) return item.card_data.prices.normal.mid;
    
    // Custom purchase price
    if (item.card_data?.purchase_price) return parseFloat(item.card_data.purchase_price);
    
    return 0;
  };

  const offeredValue = offeredCards.reduce((sum, o) => sum + (getCardValue(o.card) * o.quantity), 0);
  const requestedValue = requestedCards.reduce((sum, o) => sum + (getCardValue(o.card) * o.quantity), 0);

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">New Trade</h1>
            <p className="text-gray-600 dark:text-gray-400">Create a trade offer with any user</p>
          </div>
          <button
            onClick={submitTrade}
            disabled={!selectedPartner || (offeredCards.length === 0 && requestedCards.length === 0) || submitting}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            data-testid="submit-trade-btn"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRightLeft className="w-5 h-5" />}
            Send Trade Offer
          </button>
        </div>

        {/* Select Trade Partner */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Trade Partner</h2>
          
          {selectedPartner ? (
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-3">
                {selectedPartner.picture ? (
                  <Image src={selectedPartner.picture} alt={selectedPartner.name} width={40} height={40} className="rounded-full" />
                ) : (
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {selectedPartner.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <span className="font-medium dark:text-white">{selectedPartner.name}</span>
                  <p className="text-sm text-gray-500">{selectedPartner.email}</p>
                </div>
              </div>
              <button onClick={() => { setSelectedPartner(null); setPartnerCollection([]); setRequestedCards([]); }} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
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
                  data-testid="user-search-input"
                />
                {searchingUsers && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
                )}
              </div>
              
              {userSearchResults.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-48 overflow-y-auto">
                  {userSearchResults.map((user) => (
                    <button
                      key={user.user_id}
                      onClick={() => selectPartner(user)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left border-b last:border-b-0 dark:border-gray-700"
                    >
                      {user.picture ? (
                        <Image src={user.picture} alt={user.name} width={36} height={36} className="rounded-full" />
                      ) : (
                        <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <span className="font-medium dark:text-white">{user.name}</span>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {userSearchQuery.length >= 2 && userSearchResults.length === 0 && !searchingUsers && (
                <p className="text-center text-gray-500 py-4">No users found</p>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trade Value Summary */}
          {(offeredCards.length > 0 || requestedCards.length > 0) && (
            <div className="lg:col-span-2 bg-gradient-to-r from-blue-500/10 to-green-500/10 dark:from-blue-900/30 dark:to-green-900/30 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">You Offer</p>
                  <p className="text-2xl font-bold text-green-600">€{offeredValue.toFixed(2)}</p>
                </div>
                <ArrowRightLeft className="w-6 h-6 text-gray-400" />
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">You Request</p>
                  <p className="text-2xl font-bold text-blue-600">€{requestedValue.toFixed(2)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">Difference</p>
                <p className={`text-xl font-bold ${
                  offeredValue > requestedValue ? 'text-red-600' : 
                  offeredValue < requestedValue ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {offeredValue > requestedValue ? '-' : offeredValue < requestedValue ? '+' : ''}
                  €{Math.abs(offeredValue - requestedValue).toFixed(2)}
                </p>
              </div>
            </div>
          )}
          {/* Left: Your Offer */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 dark:text-white">You Offer ({offeredCards.length} cards)</h3>
                <span className="text-lg font-bold text-green-600">€{offeredValue.toFixed(2)}</span>
              </div>
              {offeredCards.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-3">Select cards from your collection below</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {offeredCards.map((offer) => (
                    <SelectedCard 
                      key={offer.card.card_id} 
                      offer={offer} 
                      onRemove={() => removeCardFromOffer(offer.card.card_id)}
                      onUpdateQty={(qty) => updateOfferQuantity(offer.card.card_id, qty)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Your Collection */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 dark:text-white">Your Collection</h3>
                <select 
                  value={myGameFilter} 
                  onChange={(e) => setMyGameFilter(e.target.value)}
                  className="text-sm px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="all">All Games</option>
                  <option value="mtg">MTG</option>
                  <option value="pokemon">Pokemon</option>
                </select>
              </div>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search your cards..."
                  value={mySearchQuery}
                  onChange={(e) => setMySearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                />
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {filteredMyCollection.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">No cards in collection</p>
                ) : (
                  filteredMyCollection.map((item) => (
                    <CardItem 
                      key={item.card_id} 
                      item={item} 
                      onAdd={() => addCardToOffer(item)}
                      isAdded={offeredCards.some(o => o.card.card_id === item.card_id)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right: Your Request */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 dark:text-white">You Request ({requestedCards.length} cards)</h3>
                <span className="text-lg font-bold text-blue-600">€{requestedValue.toFixed(2)}</span>
              </div>
              {requestedCards.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-3">
                  {selectedPartner ? "Select cards from their collection below" : "Select a trade partner first"}
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {requestedCards.map((req) => (
                    <SelectedCard 
                      key={req.card.card_id} 
                      offer={req} 
                      onRemove={() => removeCardFromRequest(req.card.card_id)}
                      onUpdateQty={(qty) => updateRequestQuantity(req.card.card_id, qty)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Partner's Collection */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 dark:text-white">
                  {selectedPartner ? `${selectedPartner.name}'s Collection` : "Partner's Collection"}
                </h3>
                {selectedPartner && (
                  <select 
                    value={partnerGameFilter} 
                    onChange={(e) => setPartnerGameFilter(e.target.value)}
                    className="text-sm px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="all">All Games</option>
                    <option value="mtg">MTG</option>
                    <option value="pokemon">Pokemon</option>
                  </select>
                )}
              </div>
              
              {!selectedPartner ? (
                <p className="text-gray-500 text-sm text-center py-8">Select a trade partner to see their collection</p>
              ) : loadingPartnerCollection ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : (
                <>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search their cards..."
                      value={partnerSearchQuery}
                      onChange={(e) => setPartnerSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                    />
                  </div>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {filteredPartnerCollection.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-4">No tradeable cards in their collection</p>
                    ) : (
                      filteredPartnerCollection.map((item) => (
                        <CardItem 
                          key={item.card_id} 
                          item={item} 
                          onAdd={() => addCardToRequest(item)}
                          isAdded={requestedCards.some(o => o.card.card_id === item.card_id)}
                        />
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mt-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Notes (optional)</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add a message to your trade offer..."
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
