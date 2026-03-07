'use client';

import { useState } from 'react';
import { CollectionItem } from './useCollection';

export function useSelection(
  items: CollectionItem[],
  filteredItems: CollectionItem[],
  getCardPrice: (item: CollectionItem) => { value: number; currency: string }
) {
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [showBulkMenu, setShowBulkMenu] = useState(false);

  // List modal state
  const [showListModal, setShowListModal] = useState(false);
  const [listCondition, setListCondition] = useState('Near Mint');
  const [listPercent, setListPercent] = useState('90');
  const [individualPrices, setIndividualPrices] = useState<Record<number, string>>({});
  const [listingInProgress, setListingInProgress] = useState(false);

  const toggleItemSelection = (itemId: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) { newSelected.delete(itemId); } else { newSelected.add(itemId); }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.id)));
    }
  };

  const clearSelection = () => setSelectedItems(new Set());

  const calculateSelectedValue = () => {
    let total = 0;
    items.forEach(item => {
      if (selectedItems.has(item.id)) total += getCardPrice(item).value * item.quantity;
    });
    return total;
  };

  const calculateListingTotal = () => {
    let total = 0;
    items.forEach(item => {
      if (selectedItems.has(item.id) && individualPrices[item.id]) {
        total += parseFloat(individualPrices[item.id]) * item.quantity;
      }
    });
    return total;
  };

  const recalculateAllPrices = (percent: string) => {
    const newPrices: Record<number, string> = {};
    items.filter(item => selectedItems.has(item.id)).forEach(item => {
      const marketPrice = getCardPrice(item).value;
      newPrices[item.id] = (marketPrice * (parseFloat(percent) / 100)).toFixed(2);
    });
    setIndividualPrices(newPrices);
  };

  const openBulkList = () => {
    const initialPrices: Record<number, string> = {};
    items.filter(item => selectedItems.has(item.id)).forEach(item => {
      const marketPrice = getCardPrice(item).value;
      initialPrices[item.id] = (marketPrice * (parseFloat(listPercent) / 100)).toFixed(2);
    });
    setIndividualPrices(initialPrices);
    setShowListModal(true);
  };

  const bulkDelete = async (onSuccess: () => void) => {
    if (selectedItems.size === 0) return;
    if (!confirm(`Delete ${selectedItems.size} selected cards?`)) return;
    try {
      await fetch('/api/collection/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids: Array.from(selectedItems) }),
      });
      setSelectedItems(new Set());
      onSuccess();
    } catch (error) {
      console.error('Bulk delete error:', error);
    }
  };

  const submitBulkList = async (onSuccess: () => void) => {
    setListingInProgress(true);
    try {
      const listings = items.filter(item => selectedItems.has(item.id)).map(item => {
        const price = individualPrices[item.id]
          ? parseFloat(individualPrices[item.id])
          : getCardPrice(item).value * (parseFloat(listPercent) / 100);
        return {
          card_id: item.card_id, card_data: item.card_data, game: item.game,
          price: Math.max(0.01, price), condition: listCondition,
          quantity: item.quantity, foil: item.foil,
        };
      });

      const res = await fetch('/api/collection/bulk-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ listings }),
      });
      const data = await res.json();

      if (data.success) {
        setSelectedItems(new Set());
        setShowListModal(false);
        setListPercent('90');
        setIndividualPrices({});
        alert(`Successfully listed ${data.listed} card(s) for sale!`);
        onSuccess();
      } else {
        alert('Failed to list cards: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Bulk list error:', error);
      alert('Failed to list cards. Please try again.');
    } finally {
      setListingInProgress(false);
    }
  };

  const closeBulkListModal = () => {
    setShowListModal(false);
    setListPercent('90');
    setIndividualPrices({});
  };

  return {
    selectedItems, showBulkMenu, setShowBulkMenu,
    showListModal, listCondition, setListCondition, listPercent, setListPercent,
    individualPrices, setIndividualPrices, listingInProgress,
    toggleItemSelection, selectAll, clearSelection,
    calculateSelectedValue, calculateListingTotal, recalculateAllPrices,
    openBulkList, bulkDelete, submitBulkList, closeBulkListModal,
  };
}
