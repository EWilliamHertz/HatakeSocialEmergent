'use client';

import { useMemo, useState } from 'react';
import { BarChart3, PieChart, Layers, AlertTriangle, Shuffle, Play } from 'lucide-react';

interface DeckCard {
  entry_id: string;
  card_id: string;
  card_data: any;
  quantity: number;
  category: string;
}

interface DeckAnalyticsProps {
  cards: DeckCard[];
  game: string;
  format?: string;
  isOwner?: boolean;
}

// MTG Format legality rules
const MTG_FORMAT_RULES: Record<string, { minCards: number; maxCards?: number; maxCopies: number; basicLandUnlimited?: boolean }> = {
  'Standard': { minCards: 60, maxCopies: 4, basicLandUnlimited: true },
  'Modern': { minCards: 60, maxCopies: 4, basicLandUnlimited: true },
  'Legacy': { minCards: 60, maxCopies: 4, basicLandUnlimited: true },
  'Vintage': { minCards: 60, maxCopies: 4, basicLandUnlimited: true },
  'Pioneer': { minCards: 60, maxCopies: 4, basicLandUnlimited: true },
  'Commander': { minCards: 100, maxCards: 100, maxCopies: 1, basicLandUnlimited: true },
  'Pauper': { minCards: 60, maxCopies: 4, basicLandUnlimited: true },
  'Draft': { minCards: 40, maxCopies: 99, basicLandUnlimited: true },
  'Sealed': { minCards: 40, maxCopies: 99, basicLandUnlimited: true },
};

// Pokemon format rules
const POKEMON_FORMAT_RULES: Record<string, { minCards: number; maxCards: number; maxCopies: number }> = {
  'Standard': { minCards: 60, maxCards: 60, maxCopies: 4 },
  'Expanded': { minCards: 60, maxCards: 60, maxCopies: 4 },
  'Legacy': { minCards: 60, maxCards: 60, maxCopies: 4 },
  'Unlimited': { minCards: 60, maxCards: 60, maxCopies: 4 },
};

// Color mapping for MTG
const MTG_COLORS: Record<string, { name: string; color: string; bgColor: string }> = {
  'W': { name: 'White', color: '#F8E7B9', bgColor: 'bg-amber-100' },
  'U': { name: 'Blue', color: '#0E68AB', bgColor: 'bg-blue-500' },
  'B': { name: 'Black', color: '#150B00', bgColor: 'bg-gray-800' },
  'R': { name: 'Red', color: '#D3202A', bgColor: 'bg-red-600' },
  'G': { name: 'Green', color: '#00733E', bgColor: 'bg-green-600' },
  'C': { name: 'Colorless', color: '#CAC5C0', bgColor: 'bg-gray-400' },
};

// Parse mana cost string to get color counts
function parseManaCost(manaCost: string): Record<string, number> {
  if (!manaCost) return {};
  
  const colors: Record<string, number> = {};
  const matches = manaCost.match(/\{([^}]+)\}/g) || [];
  
  for (const match of matches) {
    const symbol = match.replace(/[{}]/g, '');
    if (['W', 'U', 'B', 'R', 'G'].includes(symbol)) {
      colors[symbol] = (colors[symbol] || 0) + 1;
    } else if (symbol === 'C') {
      colors['C'] = (colors['C'] || 0) + 1;
    }
  }
  
  return colors;
}

// Get CMC (converted mana cost) from mana cost string
function getCMC(manaCost: string): number {
  if (!manaCost) return 0;
  
  let cmc = 0;
  const matches = manaCost.match(/\{([^}]+)\}/g) || [];
  
  for (const match of matches) {
    const symbol = match.replace(/[{}]/g, '');
    const num = parseInt(symbol);
    if (!isNaN(num)) {
      cmc += num;
    } else if (['W', 'U', 'B', 'R', 'G', 'C'].includes(symbol)) {
      cmc += 1;
    } else if (symbol.includes('/')) {
      cmc += 1; // Hybrid mana
    }
  }
  
  return cmc;
}

// Get card type category
function getCardType(typeLine: string): string {
  if (!typeLine) return 'Other';
  const lower = typeLine.toLowerCase();
  
  if (lower.includes('creature')) return 'Creature';
  if (lower.includes('instant')) return 'Instant';
  if (lower.includes('sorcery')) return 'Sorcery';
  if (lower.includes('enchantment')) return 'Enchantment';
  if (lower.includes('artifact')) return 'Artifact';
  if (lower.includes('planeswalker')) return 'Planeswalker';
  if (lower.includes('land')) return 'Land';
  if (lower.includes('battle')) return 'Battle';
  
  return 'Other';
}

export default function DeckAnalytics({ cards, game, format, isOwner }: DeckAnalyticsProps) {
  const [activeTab, setActiveTab] = useState<'curve' | 'colors' | 'types' | 'legality' | 'playtest'>('curve');
  const [sampleHand, setSampleHand] = useState<DeckCard[]>([]);
  const [drawnCards, setDrawnCards] = useState<DeckCard[]>([]);
  const [remainingDeck, setRemainingDeck] = useState<DeckCard[]>([]);

  // Calculate mana curve (MTG specific)
  const manaCurve = useMemo(() => {
    if (game !== 'mtg') return {};
    
    const curve: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    
    cards.forEach(card => {
      if (!card.card_data?.type_line?.toLowerCase().includes('land')) {
        const cmc = getCMC(card.card_data?.mana_cost || '');
        const bucket = Math.min(cmc, 6);
        curve[bucket] = (curve[bucket] || 0) + card.quantity;
      }
    });
    
    return curve;
  }, [cards, game]);

  // Calculate color distribution
  const colorDistribution = useMemo(() => {
    if (game !== 'mtg') return {};
    
    const colors: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
    
    cards.forEach(card => {
      const cardColors = parseManaCost(card.card_data?.mana_cost || '');
      Object.entries(cardColors).forEach(([color, count]) => {
        colors[color] = (colors[color] || 0) + (count * card.quantity);
      });
    });
    
    // Remove colors with 0 count
    return Object.fromEntries(Object.entries(colors).filter(([_, v]) => v > 0));
  }, [cards, game]);

  // Calculate type distribution
  const typeDistribution = useMemo(() => {
    if (game !== 'mtg') return {};
    
    const types: Record<string, number> = {};
    
    cards.forEach(card => {
      const type = getCardType(card.card_data?.type_line || '');
      types[type] = (types[type] || 0) + card.quantity;
    });
    
    return types;
  }, [cards, game]);

  // Calculate Pokemon type distribution
  const pokemonTypeDistribution = useMemo(() => {
    if (game !== 'pokemon') return {};
    
    const types: Record<string, number> = {};
    
    cards.forEach(card => {
      const category = card.card_data?.category || 'Unknown';
      const type = card.card_data?.types?.[0] || category;
      types[type] = (types[type] || 0) + card.quantity;
    });
    
    return types;
  }, [cards, game]);

  // Calculate legality issues
  const legalityIssues = useMemo(() => {
    const issues: string[] = [];
    
    const mainDeckCards = cards.filter(c => c.category === 'main' || !c.category);
    const totalCards = mainDeckCards.reduce((sum, c) => sum + c.quantity, 0);
    
    if (game === 'mtg' && format) {
      const rules = MTG_FORMAT_RULES[format];
      if (rules) {
        if (totalCards < rules.minCards) {
          issues.push(`Deck has ${totalCards} cards (minimum: ${rules.minCards})`);
        }
        if (rules.maxCards && totalCards > rules.maxCards) {
          issues.push(`Deck has ${totalCards} cards (maximum: ${rules.maxCards})`);
        }
        
        // Check for too many copies
        const cardCounts: Record<string, number> = {};
        mainDeckCards.forEach(card => {
          const name = card.card_data?.name || card.card_id;
          cardCounts[name] = (cardCounts[name] || 0) + card.quantity;
        });
        
        Object.entries(cardCounts).forEach(([name, count]) => {
          const isBasicLand = cards.find(c => c.card_data?.name === name)?.card_data?.type_line?.toLowerCase().includes('basic land');
          if (!rules.basicLandUnlimited || !isBasicLand) {
            if (count > rules.maxCopies) {
              issues.push(`${name}: ${count} copies (max: ${rules.maxCopies})`);
            }
          }
        });
      }
    }
    
    if (game === 'pokemon' && format) {
      const rules = POKEMON_FORMAT_RULES[format];
      if (rules) {
        if (totalCards < rules.minCards) {
          issues.push(`Deck has ${totalCards} cards (required: ${rules.minCards})`);
        }
        if (totalCards > rules.maxCards) {
          issues.push(`Deck has ${totalCards} cards (maximum: ${rules.maxCards})`);
        }
        
        // Check for too many copies
        const cardCounts: Record<string, number> = {};
        mainDeckCards.forEach(card => {
          const name = card.card_data?.name || card.card_id;
          cardCounts[name] = (cardCounts[name] || 0) + card.quantity;
        });
        
        Object.entries(cardCounts).forEach(([name, count]) => {
          // Basic energy is unlimited
          const isBasicEnergy = cards.find(c => c.card_data?.name === name)?.card_data?.name?.toLowerCase().includes('basic') && 
                               cards.find(c => c.card_data?.name === name)?.card_data?.category === 'Energy';
          if (!isBasicEnergy && count > rules.maxCopies) {
            issues.push(`${name}: ${count} copies (max: ${rules.maxCopies})`);
          }
        });
      }
    }
    
    return issues;
  }, [cards, game, format]);

  // Deck statistics
  const stats = useMemo(() => {
    const mainCards = cards.filter(c => c.category === 'main' || !c.category);
    const sideboardCards = cards.filter(c => c.category === 'sideboard');
    
    return {
      totalMain: mainCards.reduce((sum, c) => sum + c.quantity, 0),
      totalSideboard: sideboardCards.reduce((sum, c) => sum + c.quantity, 0),
      uniqueCards: cards.length,
      averageCMC: game === 'mtg' 
        ? (mainCards.filter(c => !c.card_data?.type_line?.toLowerCase().includes('land'))
            .reduce((sum, c) => sum + (getCMC(c.card_data?.mana_cost || '') * c.quantity), 0) /
           Math.max(1, mainCards.filter(c => !c.card_data?.type_line?.toLowerCase().includes('land'))
            .reduce((sum, c) => sum + c.quantity, 0))).toFixed(2)
        : 'N/A',
    };
  }, [cards, game]);

  // Playtest functions
  const shuffleAndDraw = () => {
    // Create a full deck array from cards
    const fullDeck: DeckCard[] = [];
    cards.filter(c => c.category === 'main' || !c.category).forEach(card => {
      for (let i = 0; i < card.quantity; i++) {
        fullDeck.push({ ...card, entry_id: `${card.entry_id}-${i}` });
      }
    });
    
    // Shuffle using Fisher-Yates
    for (let i = fullDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [fullDeck[i], fullDeck[j]] = [fullDeck[j], fullDeck[i]];
    }
    
    // Draw 7 cards
    setSampleHand(fullDeck.slice(0, 7));
    setDrawnCards([]);
    setRemainingDeck(fullDeck.slice(7));
  };

  const drawCard = () => {
    if (remainingDeck.length === 0) return;
    
    const [drawn, ...rest] = remainingDeck;
    setDrawnCards([...drawnCards, drawn]);
    setRemainingDeck(rest);
  };

  const resetPlaytest = () => {
    setSampleHand([]);
    setDrawnCards([]);
    setRemainingDeck([]);
  };

  // Get max value for chart scaling
  const maxCurveValue = Math.max(...Object.values(manaCurve), 1);
  const totalColorPips = Object.values(colorDistribution).reduce((a, b) => a + b, 0);
  const totalTypeCards = Object.values(typeDistribution).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6" data-testid="deck-analytics">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Main Deck</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalMain}</p>
        </div>
        {stats.totalSideboard > 0 && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Sideboard</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalSideboard}</p>
          </div>
        )}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Unique Cards</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.uniqueCards}</p>
        </div>
        {game === 'mtg' && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Avg. CMC</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.averageCMC}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('curve')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
            activeTab === 'curve' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Mana Curve
        </button>
        <button
          onClick={() => setActiveTab('colors')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
            activeTab === 'colors' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <PieChart className="w-4 h-4" />
          {game === 'mtg' ? 'Colors' : 'Types'}
        </button>
        <button
          onClick={() => setActiveTab('types')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
            activeTab === 'types' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <Layers className="w-4 h-4" />
          Card Types
        </button>
        {format && (
          <button
            onClick={() => setActiveTab('legality')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              activeTab === 'legality' 
                ? 'bg-blue-600 text-white' 
                : legalityIssues.length > 0 
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Legality
            {legalityIssues.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-yellow-500 text-white text-xs rounded-full">
                {legalityIssues.length}
              </span>
            )}
          </button>
        )}
        <button
          onClick={() => setActiveTab('playtest')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
            activeTab === 'playtest' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <Shuffle className="w-4 h-4" />
          Playtest
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[200px]">
        {/* Mana Curve */}
        {activeTab === 'curve' && game === 'mtg' && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Mana Curve (excluding lands)</h3>
            <div className="flex items-end gap-2 h-40">
              {Object.entries(manaCurve).map(([cmc, count]) => (
                <div key={cmc} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-blue-500 rounded-t transition-all duration-300"
                    style={{ height: `${(count / maxCurveValue) * 100}%`, minHeight: count > 0 ? '4px' : '0' }}
                  >
                    {count > 0 && (
                      <div className="text-xs text-white text-center py-1">{count}</div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {cmc === '6' ? '6+' : cmc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'curve' && game === 'pokemon' && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            Mana curve is not applicable for Pokemon TCG
          </div>
        )}

        {/* Color Distribution (MTG) / Type Distribution (Pokemon) */}
        {activeTab === 'colors' && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              {game === 'mtg' ? 'Color Distribution (Mana Pips)' : 'Card Type Distribution'}
            </h3>
            <div className="space-y-3">
              {game === 'mtg' ? (
                Object.entries(colorDistribution).map(([color, count]) => {
                  const colorInfo = MTG_COLORS[color];
                  const percentage = ((count / totalColorPips) * 100).toFixed(1);
                  return (
                    <div key={color} className="flex items-center gap-3">
                      <div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${colorInfo?.bgColor || 'bg-gray-500'}`}
                        style={color === 'W' ? { color: '#333' } : {}}
                      >
                        {color}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700 dark:text-gray-300">{colorInfo?.name || color}</span>
                          <span className="text-gray-500">{count} ({percentage}%)</span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${colorInfo?.bgColor || 'bg-gray-500'}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                Object.entries(pokemonTypeDistribution).map(([type, count]) => {
                  const percentage = ((count / totalTypeCards) * 100).toFixed(1);
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <div className="w-20 text-sm text-gray-700 dark:text-gray-300">{type}</div>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-500">{count} cards ({percentage}%)</span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-yellow-500 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Card Type Distribution */}
        {activeTab === 'types' && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Card Type Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(game === 'mtg' ? typeDistribution : pokemonTypeDistribution)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => (
                  <div key={type} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{type}</p>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* Format Legality */}
        {activeTab === 'legality' && format && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              {format} Format Legality Check
            </h3>
            {legalityIssues.length === 0 ? (
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-green-800 dark:text-green-300">Deck is Legal</p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    This deck meets all {format} format requirements
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {legalityIssues.map((issue, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">{issue}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Playtest */}
        {activeTab === 'playtest' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={shuffleAndDraw}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Shuffle className="w-4 h-4" />
                New Hand
              </button>
              <button
                onClick={drawCard}
                disabled={remainingDeck.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4" />
                Draw Card
              </button>
              {sampleHand.length > 0 && (
                <button
                  onClick={resetPlaytest}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition"
                >
                  Reset
                </button>
              )}
              {remainingDeck.length > 0 && (
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
                  {remainingDeck.length} cards in deck
                </span>
              )}
            </div>

            {sampleHand.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                Click "New Hand" to draw a sample opening hand
              </div>
            ) : (
              <div className="space-y-4">
                {/* Opening Hand */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Opening Hand</h4>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {sampleHand.map((card, idx) => (
                      <div key={`hand-${idx}`} className="flex-shrink-0 w-24">
                        <img
                          src={card.card_data?.image_uris?.small || card.card_data?.images?.small || '/card-back.png'}
                          alt={card.card_data?.name}
                          className="w-full rounded-lg shadow"
                        />
                        <p className="text-xs text-center mt-1 text-gray-600 dark:text-gray-400 truncate">
                          {card.card_data?.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Drawn Cards */}
                {drawnCards.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Drawn Cards (Turn {drawnCards.length})
                    </h4>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {drawnCards.map((card, idx) => (
                        <div key={`drawn-${idx}`} className="flex-shrink-0 w-24">
                          <img
                            src={card.card_data?.image_uris?.small || card.card_data?.images?.small || '/card-back.png'}
                            alt={card.card_data?.name}
                            className="w-full rounded-lg shadow"
                          />
                          <p className="text-xs text-center mt-1 text-gray-600 dark:text-gray-400 truncate">
                            {card.card_data?.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
