'use client';

import { useState } from 'react';
import { TrendingUp, Award, Layers, DollarSign, PieChart, Package, BarChart3, Tag, FileText, Download } from 'lucide-react';

interface CollectionItem {
  id: number;
  card_data: any;
  quantity: number;
  game: string;
  condition?: string;
  foil?: boolean;
}

interface DashboardProps {
  items: CollectionItem[];
  priceOverrides?: Record<number, number | null>;
  pricesLoading?: boolean;
}

export default function CollectionDashboard({ items, priceOverrides = {}, pricesLoading = false }: DashboardProps) {
  const [showDetailedStats, setShowDetailedStats] = useState(false);

 // Robust pricing calculator
  const getCardPrice = (item: CollectionItem): number => {
    try {
      const card = item.card_data || {};
      const game = item.game || 'unknown';

      // 1. Manual Overrides (Highest Priority)
      if (item.id in priceOverrides && priceOverrides[item.id] !== null) {
        return Number(priceOverrides[item.id]) || 0;
      }

     // 2. Pokemon Pricing (TCGDex & ScryDex)
      if (game === 'pokemon') {
        let price = 0;
        const isJapanese = card.lang === 'ja' || card.language === 'Japanese';

        if (isJapanese) {
          const yenPrice = card.prices?.yen || card.prices?.jpy || card.prices?.market || card.pricing?.market || 0;
          if (yenPrice > 0) return Number(yenPrice) * 0.0061;
        }

        if (card.pricing?.cardmarket) {
          price = card.pricing.cardmarket.avg || card.pricing.cardmarket.trend || card.pricing.cardmarket.low || 0;
        } else if (card.prices?.cardmarket) {
          price = card.prices.cardmarket.avg || card.prices.cardmarket.trend || card.prices.cardmarket.low || 0;
        }
        
        if (!price && card.tcgplayer?.prices) {
          const p = card.tcgplayer.prices;
          const usdPrice = 
            p.holofoil?.market || 
            p.normal?.market || 
            p.reverseHolofoil?.market || 
            p.unlimitedHolofoil?.market || 
            p.unlimited?.market || 
            p["1stEditionHolofoil"]?.market || 
            p["1stEdition"]?.market || 
            p.market || 
            0;
          price = usdPrice * 0.92;
        }

        if (!price && (card.prices?.usd || card.pricing?.usd)) {
          price = Number(card.prices?.usd || card.pricing?.usd) * 0.92;
        }

        if (isJapanese && price > 200) {
          return price * 0.0061; 
        }

        return Number(price) || 0;
      }
      // 3. Magic: The Gathering (Scryfall)
      else if (game === 'mtg') {
        if (item.foil && card.prices?.eur_foil) return parseFloat(card.prices.eur_foil);
        if (!item.foil && card.prices?.eur) return parseFloat(card.prices.eur);
        // Fallback to USD converted to EUR
        if (item.foil && card.prices?.usd_foil) return parseFloat(card.prices.usd_foil) * 0.92;
        if (!item.foil && card.prices?.usd) return parseFloat(card.prices.usd) * 0.92;
      }

      // 4. Lorcana
      else if (game === 'lorcana') {
        // Safely parse Lorcana prices (checks multiple common API structures)
        const eurPrice = card.prices?.eur || card.price?.eur || card.eur;
        const usdPrice = card.prices?.usd || card.price?.usd || card.prices?.market || card.usd;
        
        if (eurPrice) return parseFloat(eurPrice);
        if (usdPrice) return parseFloat(usdPrice) * 0.92; // Convert USD to EUR
      }

      return 0;
    } catch (err) {
      console.error("Error calculating price for item:", item, err);
      return 0;
    }
  }; 
  // 1. Calculate Total Value
  const totalValue = items.reduce((sum, item) => sum + (getCardPrice(item) * item.quantity), 0);

  // Total and Unique cards
  const totalCards = items.reduce((sum, item) => sum + item.quantity, 0);
  const uniqueCards = items.length;

  // 2. Find Top Card
  const topCard = items.reduce((prev, current) => {
    return (getCardPrice(prev) > getCardPrice(current)) ? prev : current;
  }, items[0]);

  // 3. Group by Set for "Completion" Progress
  const setCounts: Record<string, { count: number, name: string }> = {};
  items.forEach(item => {
    const setId = item.card_data?.set?.id || item.card_data?.set_code || 'unknown';
    const setName = item.card_data?.set?.name || item.card_data?.set_name || setId;
    
    if (!setCounts[setId]) setCounts[setId] = { count: 0, name: setName };
    setCounts[setId].count += 1;
  });

  const topSets = Object.values(setCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // 4. Rarity Distribution
  const rarityDistribution: Record<string, number> = {};
  items.forEach(item => {
    const rarity = item.card_data?.rarity || 'Unknown';
    rarityDistribution[rarity] = (rarityDistribution[rarity] || 0) + item.quantity;
  });

  // 5. Game Distribution
  const gameDistribution: Record<string, number> = {};
  items.forEach(item => {
    const game = item.game || 'unknown';
    gameDistribution[game] = (gameDistribution[game] || 0) + item.quantity;
  });

  // 6. Condition Distribution
  const conditionDistribution: Record<string, number> = {};
  items.forEach(item => {
    const condition = item.condition || 'Near Mint';
    conditionDistribution[condition] = (conditionDistribution[condition] || 0) + item.quantity;
  });

  // 7. Foil Count
  const foilCount = items.filter(item => item.foil).reduce((sum, item) => sum + item.quantity, 0);

  // Export collection as CSV
  const exportCollection = () => {
    const headers = ['Name', 'Set', 'Collector Number', 'Quantity', 'Condition', 'Foil', 'Value (EUR)', 'Game'];
    const rows = items.map(item => [
      item.card_data?.name || '',
      item.card_data?.set?.name || item.card_data?.set_name || '',
      item.card_data?.collector_number || item.card_data?.localId || '',
      item.quantity,
      item.condition || 'Near Mint',
      item.foil ? 'Yes' : 'No',
      getCardPrice(item).toFixed(2),
      item.game
    ]);
    
    const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `collection_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 mb-8">
      {/* Main Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric 1: Total Value */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <DollarSign className="w-16 h-16" />
          </div>
          <div className="flex items-center gap-2 mb-2 text-green-600 dark:text-green-400">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Portfolio Value</span>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            €{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            {pricesLoading && (
              <span className="inline-block w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full animate-spin" title="Fetching foreign card prices..." />
            )}
          </h2>
          <p className="text-xs text-gray-500 mt-1">{totalCards} total cards ({uniqueCards} unique cards)</p>
        </div>

        {/* Metric 2: Crown Jewel (Most Expensive) */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2 text-purple-600 dark:text-purple-400">
            <Award className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Crown Jewel</span>
          </div>
          {topCard ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-14 bg-gray-200 rounded overflow-hidden flex-shrink-0 relative">
                 <img 
                   src={topCard.card_data?.images?.small || topCard.card_data?.image_uris?.small || '/placeholder-card.png'} 
                   alt="Top Card"
                   className="w-full h-full object-cover" 
                 />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">{topCard.card_data?.name}</p>
                <p className="text-xs text-gray-500">
                  €{getCardPrice(topCard).toFixed(2)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No cards yet</p>
          )}
        </div>

        {/* Metric 3: Top Sets Progress */}
        <div className="col-span-1 md:col-span-2 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3 text-blue-600 dark:text-blue-400">
            <Layers className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Top Sets Progress</span>
          </div>
          <div className="space-y-3">
            {topSets.map((set) => (
              <div key={set.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[150px]">{set.name}</span>
                  <span className="text-gray-500">{set.count} cards collected</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min((set.count / 200) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
            {topSets.length === 0 && <p className="text-sm text-gray-400">Add cards to see set progress</p>}
          </div>
        </div>
      </div>

      {/* Actions Row */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowDetailedStats(!showDetailedStats)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            showDetailedStats 
              ? 'bg-blue-600 text-white' 
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          {showDetailedStats ? 'Hide Statistics' : 'Detailed Statistics'}
        </button>
        <button
          onClick={exportCollection}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Detailed Stats Panel */}
      {showDetailedStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Rarity Distribution */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-3 text-amber-600 dark:text-amber-400">
              <Tag className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Rarity Distribution</span>
            </div>
            <div className="space-y-2">
              {Object.entries(rarityDistribution)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 6)
                .map(([rarity, count]) => (
                  <div key={rarity} className="flex justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300 capitalize">{rarity}</span>
                    <span className="text-gray-500">{count}</span>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Game Distribution */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-3 text-indigo-600 dark:text-indigo-400">
              <Package className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Game Distribution</span>
            </div>
            <div className="space-y-2">
              {Object.entries(gameDistribution).map(([game, count]) => (
                <div key={game} className="flex justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300 uppercase">{game}</span>
                  <span className="text-gray-500">{count} cards</span>
                </div>
              ))}
              <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-700">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">Foil Cards</span>
                  <span className="text-yellow-500 font-medium">{foilCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Condition Distribution */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-3 text-teal-600 dark:text-teal-400">
              <FileText className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Condition Breakdown</span>
            </div>
            <div className="space-y-2">
              {Object.entries(conditionDistribution)
                .sort(([, a], [, b]) => b - a)
                .map(([condition, count]) => (
                  <div key={condition} className="flex justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{condition}</span>
                    <span className="text-gray-500">{count}</span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}