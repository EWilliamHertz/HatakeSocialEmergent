'use client';

import { useState, useEffect } from 'react';

export function useTabData(activeTab: string) {
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [loadingWishlist, setLoadingWishlist] = useState(false);
  const [sealedProducts, setSealedProducts] = useState<any[]>([]);
  const [loadingSealed, setLoadingSealed] = useState(false);
  const [bookmarkedCollections, setBookmarkedCollections] = useState<any[]>([]);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);

  // Add Sealed modal state
  const [showAddSealedModal, setShowAddSealedModal] = useState(false);
  const [sealedSearch, setSealedSearch] = useState('');
  const [sealedSearchResults, setSealedSearchResults] = useState<any[]>([]);
  const [isSearchingSealed, setIsSearchingSealed] = useState(false);
  const [manualSealed, setManualSealed] = useState({
    name: '', game: 'pokemon', price: '', type: 'Booster Box',
  });
  const [addingSealedProduct, setAddingSealedProduct] = useState(false);

  useEffect(() => {
    if (activeTab === 'wishlist') loadWishlist();
    else if (activeTab === 'sealed') loadSealedProducts();
    else if (activeTab === 'bookmarks') loadBookmarks();
  }, [activeTab]);

  const loadWishlist = async () => {
    setLoadingWishlist(true);
    try {
      const res = await fetch('/api/wishlist', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setWishlistItems(data.items || []);
    } catch (error) {
      console.error('Load wishlist error:', error);
    } finally {
      setLoadingWishlist(false);
    }
  };

  const loadSealedProducts = async () => {
    setLoadingSealed(true);
    try {
      const res = await fetch('/api/sealed', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setSealedProducts(data.products || []);
    } catch (error) {
      console.error('Load sealed products error:', error);
    } finally {
      setLoadingSealed(false);
    }
  };

  const loadBookmarks = async () => {
    setLoadingBookmarks(true);
    try {
      const res = await fetch('/api/bookmarks/list', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setBookmarkedCollections(data.collections || []);
    } catch (error) {
      console.error('Load bookmarks error:', error);
    } finally {
      setLoadingBookmarks(false);
    }
  };

  const removeBookmark = async (userId: string) => {
    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });
      if (res.ok) setBookmarkedCollections(prev => prev.filter((c: any) => c.user_id !== userId));
    } catch (error) {
      console.error('Remove bookmark error:', error);
    }
  };

  const handleSealedSearch = async () => {
    if (sealedSearch.length < 3) return;
    setIsSearchingSealed(true);
    try {
      const res = await fetch(`/api/sealed/search?q=${encodeURIComponent(sealedSearch)}`);
      const data = await res.json();
      setSealedSearchResults(data.results || []);
    } catch (error) {
      console.error('Sealed search error:', error);
    } finally {
      setIsSearchingSealed(false);
    }
  };

  const addSealedFromSearch = async (product: any) => {
    setAddingSealedProduct(true);
    try {
      const res = await fetch('/api/sealed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: product.name,
          game: 'pokemon',
          product_type: product.type,
          image_url: product.imageUrl,
          current_value: product.price,
          scrydex_id: product.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await loadSealedProducts();
        setShowAddSealedModal(false);
        setSealedSearch('');
        setSealedSearchResults([]);
      } else {
        alert(data.error || 'Failed to add product');
      }
    } catch (error) {
      console.error('Add sealed product error:', error);
    } finally {
      setAddingSealedProduct(false);
    }
  };

  const addSealedManually = async () => {
    if (!manualSealed.name.trim()) { alert('Please enter a product name'); return; }
    setAddingSealedProduct(true);
    try {
      const res = await fetch('/api/sealed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: manualSealed.name,
          game: manualSealed.game,
          product_type: manualSealed.type,
          purchase_price: manualSealed.price ? parseFloat(manualSealed.price) : null,
          current_value: manualSealed.price ? parseFloat(manualSealed.price) : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await loadSealedProducts();
        setShowAddSealedModal(false);
        setManualSealed({ name: '', game: 'pokemon', price: '', type: 'Booster Box' });
      } else {
        alert(data.error || 'Failed to add product');
      }
    } catch (error) {
      console.error('Add sealed manual error:', error);
    } finally {
      setAddingSealedProduct(false);
    }
  };

  return {
    wishlistItems, loadingWishlist,
    sealedProducts, loadingSealed,
    bookmarkedCollections, loadingBookmarks,
    showAddSealedModal, setShowAddSealedModal,
    sealedSearch, setSealedSearch,
    sealedSearchResults,
    isSearchingSealed,
    manualSealed, setManualSealed,
    addingSealedProduct,
    removeBookmark, handleSealedSearch,
    addSealedFromSearch, addSealedManually,
    loadSealedProducts,
  };
}
