'use client';

import { useState } from 'react';

export const pokemonSetAliases: Record<string, string> = {
  'jtg': 'sv09', 'journey': 'sv09', 'journeytogether': 'sv09',
  'tef': 'sv05', 'temporal': 'sv05',
  'par': 'sv04',
  'obsidian': 'sv03',
  'paldea': 'sv02',
  'scarlet': 'sv01', 'violet': 'sv01', 'svbase': 'sv01',
};

export const pokemonFinishOptions = [
  'Normal', 'Holofoil', 'Reverse Holofoil', 'Pokeball Holofoil',
  'Masterball Holofoil', 'Full Art', 'Special Art Rare', 'Illustration Rare',
];
export const lorcanaFinishOptions = ['Normal', 'Foil', 'Cold Foil'];
export const mtgFinishOptions = [
  'Normal', 'Foil', 'Etched Foil', 'Gilded Foil', 'Surge Foil', 'Galaxy Foil', 'Textured Foil',
];
export const conditionOptions = ['Mint', 'Near Mint', 'Excellent', 'Good', 'Light Played', 'Played', 'Poor'];
export const gradingCompanies = ['PSA', 'BGS', 'CGC', 'SGC', 'PCG', 'Ace'];
export const gradeValues = ['10', '9.5', '9', '8.5', '8', '7.5', '7', '6.5', '6', '5.5', '5', '4', '3', '2', '1'];

export function getPriceForFinish(card: any, game: string, finish: string) {
  if (!card) return null;
  if (game === 'pokemon') {
    const tcgPrices = card.tcgplayer?.prices || card.pricing?.tcgplayer;
    if (tcgPrices) {
      let key = 'normal';
      if (finish === 'Holofoil') key = 'holofoil';
      else if (finish === 'Reverse Holofoil') key = 'reverseHolofoil';
      else if (finish === 'Pokeball Holofoil') key = 'pokeballHolofoil';
      else if (finish === 'Masterball Holofoil') key = 'masterballHolofoil';
      const finishPrice = tcgPrices[key]?.market !== undefined ? tcgPrices[key].market : tcgPrices[key];
      if (finishPrice !== undefined && finishPrice !== null) return { value: parseFloat(finishPrice) * 0.92, currency: 'EUR' };
    }
    const cmPrices = card.cardmarket?.prices || card.pricing?.cardmarket;
    if (cmPrices) {
      if (finish === 'Reverse Holofoil' && (cmPrices.reverseHoloAvg || cmPrices.reverseHoloSell || cmPrices.reverseHoloTrend)) {
        const price = cmPrices.reverseHoloAvg || cmPrices.reverseHoloSell || cmPrices.reverseHoloTrend;
        if (price) return { value: parseFloat(price), currency: 'EUR' };
      } else if (finish === 'Normal' || finish === 'Holofoil') {
        const price = cmPrices.avg || cmPrices.averageSellPrice || cmPrices.trendPrice || cmPrices.trend;
        if (price) return { value: parseFloat(price), currency: 'EUR' };
      }
    }
    if (finish === 'Normal' || finish === 'Holofoil') {
      const usd = card.pricing?.usd || card.prices?.usd;
      if (usd) return { value: parseFloat(usd) * 0.92, currency: 'EUR' };
    }
  } else if (game === 'mtg') {
    const isFoil = finish !== 'Normal';
    const prices = card.prices || card.pricing;
    if (prices) {
      if (isFoil && prices.eur_foil) return { value: parseFloat(prices.eur_foil), currency: 'EUR' };
      if (!isFoil && prices.eur) return { value: parseFloat(prices.eur), currency: 'EUR' };
      if (isFoil && prices.usd_foil) return { value: parseFloat(prices.usd_foil) * 0.92, currency: 'EUR' };
      if (!isFoil && prices.usd) return { value: parseFloat(prices.usd) * 0.92, currency: 'EUR' };
    }
  } else if (game === 'lorcana') {
    const isFoil = finish !== 'Normal';
    const prices = card.tcgplayer?.prices || card.pricing?.tcgplayer || card.pricing;
    if (prices) {
      if (isFoil && prices.foil?.market) return { value: parseFloat(prices.foil.market) * 0.92, currency: 'EUR' };
      if (!isFoil && prices.normal?.market) return { value: parseFloat(prices.normal.market) * 0.92, currency: 'EUR' };
    }
    if (!isFoil) {
      const usd = card.pricing?.usd;
      if (usd) return { value: parseFloat(usd) * 0.92, currency: 'EUR' };
    }
  }
  return null;
}

export function useCardSearch() {
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [addCardGame, setAddCardGame] = useState<'mtg' | 'pokemon' | 'lorcana'>('mtg');
  const [addCardSetCode, setAddCardSetCode] = useState('');
  const [addCardCollectorNum, setAddCardCollectorNum] = useState('');
  const [addCardName, setAddCardName] = useState('');
  const [addCardSearchResults, setAddCardSearchResults] = useState<any[]>([]);
  const [addCardSearching, setAddCardSearching] = useState(false);
  const [addCardQuantity, setAddCardQuantity] = useState(1);
  const [addCardCondition, setAddCardCondition] = useState('Near Mint');
  const [addCardLang, setAddCardLang] = useState<'all' | 'en' | 'ja'>('all');
  const [addingCard, setAddingCard] = useState(false);

  const [selectedCardToAdd, setSelectedCardToAdd] = useState<any>(null);
  const [cardFinish, setCardFinish] = useState('Normal');
  const [isGraded, setIsGraded] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const [gradingCompany, setGradingCompany] = useState('PSA');
  const [gradeValue, setGradeValue] = useState('10');
  const [cardPriceData, setCardPriceData] = useState<any>(null);

  const resetSearch = () => {
    setAddCardSearchResults([]);
    setAddCardSetCode('');
    setAddCardCollectorNum('');
    setAddCardName('');
  };

  const closeAddModal = () => {
    setShowAddCardModal(false);
    resetSearch();
  };

  const searchCardManually = async () => {
    const hasNameSearch = addCardName.trim().length >= 2;
    const hasSetSearch = addCardSetCode.trim().length > 0;
    if (!hasNameSearch && !hasSetSearch) return;

    setAddCardSearching(true);
    setAddCardSearchResults([]);

    let resolvedSetCode = addCardSetCode.trim().toLowerCase();
    if (addCardGame === 'pokemon' && pokemonSetAliases[resolvedSetCode]) {
      resolvedSetCode = pokemonSetAliases[resolvedSetCode];
    }

    try {
      if (addCardGame === 'mtg') {
        const params = new URLSearchParams();
        if (addCardName.trim()) params.append('q', addCardName.trim());
        if (addCardSetCode.trim()) params.append('set', addCardSetCode.trim());
        if (addCardCollectorNum.trim()) params.append('number', addCardCollectorNum.trim());
        if (!params.toString()) { setAddCardSearchResults([]); return; }
        const res = await fetch(`/api/cards/mtg?${params}`, { credentials: 'include', signal: AbortSignal.timeout(15000) });
        if (res.ok) { const data = await res.json(); setAddCardSearchResults(data.cards || []); }
        else setAddCardSearchResults([]);
      } else if (addCardGame === 'lorcana') {
        const params = new URLSearchParams();
        if (addCardName.trim()) params.append('q', addCardName.trim());
        if (!params.toString()) { setAddCardSearchResults([]); return; }
        const res = await fetch(`/api/search/lorcana?${params}`, { credentials: 'include', signal: AbortSignal.timeout(15000) });
        if (res.ok) { const data = await res.json(); setAddCardSearchResults(data.cards || []); }
        else setAddCardSearchResults([]);
      } else {
       const params = new URLSearchParams();
        if (addCardName.trim()) params.append('q', addCardName.trim());
        if (resolvedSetCode) params.append('set', resolvedSetCode);
        if (addCardCollectorNum.trim()) params.append('number', addCardCollectorNum.trim());
        if (addCardLang) params.append('lang', addCardLang); // Let 'all' pass through
        if (!params.toString()) { setAddCardSearchResults([]); return; }
        const res = await fetch(`/api/search/pokemon?${params}`, { credentials: 'include', signal: AbortSignal.timeout(15000) });
        if (res.ok) { const data = await res.json(); setAddCardSearchResults(data.cards || []); }
        else setAddCardSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setAddCardSearchResults([]);
    } finally {
      setAddCardSearching(false);
    }
  };

  const addCardToCollection = async (onSuccess: () => void) => {
    if (!selectedCardToAdd) return;
    setAddingCard(true);
    try {
      const cardData = {
        ...selectedCardToAdd,
        pricing: cardPriceData,
        finish: cardFinish,
        graded: isGraded ? { company: gradingCompany, grade: gradeValue } : null,
      };
      const res = await fetch('/api/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          cardId: selectedCardToAdd.id, game: addCardGame, cardData,
          quantity: addCardQuantity, condition: addCardCondition,
          foil: cardFinish !== 'Normal', finish: cardFinish,
          isSigned, isGraded,
          gradingCompany: isGraded ? gradingCompany : null,
          gradeValue: isGraded ? gradeValue : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Added ${selectedCardToAdd.name} to collection!`);
        onSuccess();
        setSelectedCardToAdd(null);
        setAddCardQuantity(1);
        setCardFinish('Normal');
        setIsGraded(false);
      } else {
        alert(data.error || 'Failed to add card');
      }
    } catch (error) {
      console.error('Add card error:', error);
      alert('Failed to add card');
    } finally {
      setAddingCard(false);
    }
  };

  return {
    showAddCardModal, setShowAddCardModal,
    addCardGame, setAddCardGame,
    addCardSetCode, setAddCardSetCode,
    addCardCollectorNum, setAddCardCollectorNum,
    addCardName, setAddCardName,
    addCardSearchResults, setAddCardSearchResults,
    addCardSearching, addCardLang, setAddCardLang,
    addCardQuantity, setAddCardQuantity,
    addCardCondition, setAddCardCondition,
    addingCard,
    selectedCardToAdd, setSelectedCardToAdd,
    cardFinish, setCardFinish,
    isGraded, setIsGraded,
    isSigned, setIsSigned,
    gradingCompany, setGradingCompany,
    gradeValue, setGradeValue,
    cardPriceData, setCardPriceData,
    searchCardManually, addCardToCollection, resetSearch, closeAddModal,
  };
}
