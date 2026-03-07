'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface CollectionItem {
  id: number;
  card_id: string;
  game: string;
  card_data: any;
  quantity: number;
  condition?: string;
  foil?: boolean;
  finish?: string;
  is_signed?: boolean;
  is_graded?: boolean;
  grading_company?: string;
  grade_value?: string;
  custom_image_url?: string;
  notes?: string;
  added_at: string;
}

export function useCollection(filter: string) {
  const router = useRouter();
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ user_id: string; name?: string } | null>(null);
  const [priceOverrides, setPriceOverrides] = useState<Record<number, number | null>>({});
  const [pricesLoading, setPricesLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) { router.push('/auth/login'); return null; }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.user) setCurrentUser(data.user);
        return loadCollection();
      })
      .catch(() => router.push('/auth/login'));
  }, [router, filter]);

  const enrichForeignPrices = async (loadedItems: CollectionItem[]) => {
    const allForeignItems = loadedItems.filter(item => {
      if (item.game !== 'pokemon') return false;
      const card = item.card_data;
      if (!card) return false;
      if (card.pricing?.cardmarket?.avg || card.pricing?.cardmarket?.trend) return false;
      if (card.tcgplayer?.prices?.holofoil?.market || card.tcgplayer?.prices?.normal?.market) return false;
      return true;
    });

    const zhItems = allForeignItems.filter(item => {
      const lang = item.card_data?.language || item.card_data?._srcLang || '';
      return lang === 'zh-tw' || lang === 'zh';
    });
    const needsLookup = allForeignItems.filter(item => {
      const lang = item.card_data?.language || item.card_data?._srcLang || '';
      return lang !== 'zh-tw' && lang !== 'zh';
    });

    if (zhItems.length > 0) {
      setPriceOverrides(prev => {
        const next = { ...prev };
        for (const item of zhItems) {
          if (!(item.id in next)) next[item.id] = null;
        }
        return next;
      });
    }

    if (needsLookup.length === 0) return;
    setPricesLoading(true);

    try {
      const cardsPayload = needsLookup.map(item => {
        const card = item.card_data;
        const tcgdexId = card?.id || `${card?.set?.id || card?.set_code}-${card?.localId || card?.number}`;
        const dexIds: number[] = Array.isArray(card?.dexId) ? card.dexId : (card?.dexId ? [card.dexId] : []);
        return { collectionId: item.id, tcgdexId, lang: card?.language || card?._srcLang || 'ja', dexIds };
      });

      const res = await fetch('/api/prices/cardmarket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cards: cardsPayload }),
      });

      if (res.ok) {
        const data = await res.json();
        const prices: Record<number, number | null> = data.prices || {};
        setPriceOverrides(prev => {
          const next = { ...prev };
          for (const [k, v] of Object.entries(prices)) {
            const id = Number(k);
            if (v !== null && v !== undefined) {
              const num = parseFloat(String(v));
              if (!isNaN(num) && num > 0) { next[id] = num; }
              else if (!(id in next)) { next[id] = null; }
            } else if (!(id in next)) {
              next[id] = null;
            }
          }
          return next;
        });
      }
    } catch (err) {
      console.error('CardMarket price enrichment failed:', err);
    } finally {
      setPricesLoading(false);
    }
  };

  const loadCollection = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/collection?game=${filter === 'all' ? '' : filter}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        const loadedItems = data.items || [];
        setItems(loadedItems);
        enrichForeignPrices(loadedItems);
      }
    } catch (error) {
      console.error('Load collection error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCardPrice = (item: CollectionItem): { value: number; currency: string; noPrice?: boolean; isEstimated?: boolean } => {
    const card = item.card_data;
    if (item.game === 'pokemon') {
      if (card?.pricing?.cardmarket) {
        const v = Number(card.pricing.cardmarket.avg || card.pricing.cardmarket.trend || 0);
        if (v > 0) return { value: v, currency: 'EUR' };
      }
      if (card?.tcgplayer?.prices) {
        const prices = card.tcgplayer.prices;
        const usdPrice = Number(prices.holofoil?.market || prices.normal?.market || 0);
        if (usdPrice > 0) return { value: usdPrice * 0.92, currency: 'EUR' };
      }
      if (card?.pricing?.usd) {
        const usd = parseFloat(String(card.pricing.usd));
        if (!isNaN(usd) && usd > 0) return { value: usd * 0.92, currency: 'EUR' };
      }
      if (item.id in priceOverrides) {
        const overridePrice = priceOverrides[item.id];
        if (overridePrice !== null) return { value: Number(overridePrice), currency: 'EUR', isEstimated: true };
        return { value: 0, currency: 'EUR', noPrice: true };
      }
      return { value: 0, currency: 'EUR' };
    } else if (item.game === 'mtg') {
      if (card?.prices?.eur) return { value: parseFloat(card.prices.eur), currency: 'EUR' };
      if (card?.prices?.eur_foil && item.foil) return { value: parseFloat(card.prices.eur_foil), currency: 'EUR' };
      if (card?.prices?.usd) return { value: parseFloat(card.prices.usd) * 0.92, currency: 'EUR' };
      if (card?.prices?.usd_foil && item.foil) return { value: parseFloat(card.prices.usd_foil) * 0.92, currency: 'EUR' };
    } else if (item.game === 'lorcana') {
      const usdPrice = card?.pricing?.usd ? parseFloat(String(card.pricing.usd)) : 0;
      if (usdPrice > 0) return { value: usdPrice * 0.92, currency: 'EUR' };
    }
    if (card?.purchase_price && card.purchase_price > 0) return { value: card.purchase_price, currency: 'EUR' };
    return { value: 0, currency: 'EUR' };
  };

  const getPriceDisplay = (item: CollectionItem): string => {
    const result = getCardPrice(item);
    if (result.noPrice) return 'N/A';
    if (result.value === 0 && item.game === 'pokemon' && pricesLoading && !(item.id in priceOverrides)) return '...';
    return `${result.isEstimated ? '~' : ''}€${Number(result.value).toFixed(2)}`;
  };

  const calculateTotalValue = () => {
    let totalEUR = 0;
    items.forEach(item => {
      const price = getCardPrice(item);
      totalEUR += price.value * item.quantity;
    });
    return totalEUR > 0 ? `€${totalEUR.toFixed(2)}` : '€0.00';
  };

  const removeItem = async (itemId: number) => {
    if (!confirm('Remove this card from your collection?')) return;
    try {
      await fetch(`/api/collection?id=${itemId}`, { method: 'DELETE', credentials: 'include' });
      loadCollection();
    } catch (error) {
      console.error('Remove item error:', error);
    }
  };

  const updateItem = async (itemId: number, updates: {
    quantity?: number; condition?: string; foil?: boolean; finish?: string;
    isSigned?: boolean; isGraded?: boolean; gradingCompany?: string | null;
    gradeValue?: string | null; notes?: string;
  }) => {
    try {
      await fetch('/api/collection', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: itemId, ...updates }),
      });
      loadCollection();
    } catch (error) {
      console.error('Update item error:', error);
    }
  };

  const handleShareCollection = async () => {
    if (!currentUser) return;
    const url = `https://hatake.eu/share/${currentUser.user_id}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'My Hatake Collection', url }); } catch { /* cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(url); alert('Collection link copied to clipboard!'); }
      catch { alert(`Share this link: ${url}`); }
    }
  };

  const getCardImage = (item: CollectionItem) => {
    if (item.custom_image_url) return item.custom_image_url;
    const card = item.card_data || {};
    if (card.images?.small) return card.images.small;
    if (card.image_uris?.small) return card.image_uris.small;
    if (card.images?.large) return card.images.large;
    if (card.image_uris?.normal) return card.image_uris.normal;
    return '/placeholder-card.png';
  };

  return {
    items, loading, currentUser, priceOverrides, pricesLoading,
    loadCollection, getCardPrice, getPriceDisplay, calculateTotalValue,
    removeItem, updateItem, handleShareCollection, getCardImage,
  };
}
