'use client';

import { TrendingUp, Award, Layers, DollarSign, PieChart, Package } from 'lucide-react';

interface CollectionItem {
  id: number;
  card_data: any;
  quantity: number;
  game: string;
}

interface DashboardProps {
  items: CollectionItem[];
}

export default function CollectionDashboard({ items }: DashboardProps) {
  // 1. Calculate Total Value
  const totalValue = items.reduce((sum, item) => {
    const price = item.card_data?.prices?.eur || item.card_data?.pricing?.cardmarket?.avg || 0;
    return sum + (parseFloat(price) * item.quantity);
  }, 0);

  // 2. Find Top Card
  const topCard = items.reduce((prev, current) => {
    const prevPrice = parseFloat(prev.card_data?.prices?.eur || prev.card_data?.pricing?.cardmarket?.avg || '0');
    const currPrice = parseFloat(current.card_data?.prices?.eur || current.card_data?.pricing?.cardmarket?.avg || '0');
    return (prevPrice > currPrice) ? prev : current;
  }, items[0]);

  // 3. Group by Set for "Completion" Progress
  const setCounts: Record<string, { count: number, name: string }> = {};
  items.forEach(item => {
    const setId = item.card_data?.set?.id || item.card_data?.set_code || 'unknown';
    const setName = item.card_data?.set?.name || item.card_data?.set_name || setId;
    
    if (!setCounts[setId]) setCounts[setId] = { count: 0, name: setName };
    setCounts[setId].count += 1; // Count unique cards, not quantity
  });

  // Sort sets by count (most collected first)
  const topSets = Object.values(setCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3); // Show top 3 sets

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      {/* Metric 1: Total Value */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <DollarSign className="w-16 h-16" />
        </div>
        <div className="flex items-center gap-2 mb-2 text-green-600 dark:text-green-400">
          <TrendingUp className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Portfolio Value</span>
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
          €{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h2>
        <p className="text-xs text-gray-500 mt-1">{items.length} total items collected</p>
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
                €{parseFloat(topCard.card_data?.prices?.eur || topCard.card_data?.pricing?.cardmarket?.avg || '0').toFixed(2)}
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
                  style={{ width: `${Math.min((set.count / 200) * 100, 100)}%` }} // Assuming ~200 cards per set for visualization
                ></div>
              </div>
            </div>
          ))}
          {topSets.length === 0 && <p className="text-sm text-gray-400">Add cards to see set progress</p>}
        </div>
      </div>
    </div>
  );
}