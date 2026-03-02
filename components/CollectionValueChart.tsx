'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Clock } from 'lucide-react';

interface Snapshot {
  date: string;
  value: number;
  cardCount: number;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatEur(val: number) {
  return val.toLocaleString('en-EU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface LineChartProps {
  snapshots: Snapshot[];
  width?: number;
  height?: number;
}

function LineChart({ snapshots, width = 600, height = 220 }: LineChartProps) {
  if (snapshots.length === 0) return null;

  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const values = snapshots.map(s => s.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const valRange = maxVal - minVal || 1;

  const xStep = snapshots.length > 1 ? chartW / (snapshots.length - 1) : chartW;

  const toX = (i: number) => paddingLeft + (snapshots.length === 1 ? chartW / 2 : i * xStep);
  const toY = (val: number) => paddingTop + chartH - ((val - minVal) / valRange) * chartH;

  // Build path
  const points = snapshots.map((s, i) => `${toX(i)},${toY(s.value)}`);
  const linePath = `M ${points.join(' L ')}`;

  // Area fill
  const areaPath = `M ${toX(0)},${paddingTop + chartH} L ${points.join(' L ')} L ${toX(snapshots.length - 1)},${paddingTop + chartH} Z`;

  // Y-axis labels (3 ticks)
  const yTicks = [minVal, minVal + valRange / 2, maxVal];

  // X-axis labels (show up to 6 evenly spaced)
  const maxLabels = 6;
  const labelStep = snapshots.length <= maxLabels ? 1 : Math.ceil(snapshots.length / maxLabels);
  const xLabels = snapshots.filter((_, i) => i % labelStep === 0 || i === snapshots.length - 1);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yTicks.map((tick, i) => (
        <g key={i}>
          <line
            x1={paddingLeft} y1={toY(tick)}
            x2={paddingLeft + chartW} y2={toY(tick)}
            stroke="currentColor" strokeOpacity="0.1" strokeWidth="1"
            strokeDasharray="4 4"
          />
          <text
            x={paddingLeft - 8} y={toY(tick) + 4}
            textAnchor="end" fontSize="11"
            fill="currentColor" opacity="0.5"
          >
            €{tick >= 1000 ? `${(tick / 1000).toFixed(1)}k` : tick.toFixed(0)}
          </text>
        </g>
      ))}

      {/* Area fill */}
      <path d={areaPath} fill="url(#chartGrad)" />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {snapshots.map((s, i) => (
        <circle
          key={i}
          cx={toX(i)} cy={toY(s.value)}
          r="4" fill="#3b82f6"
          stroke="white" strokeWidth="2"
        />
      ))}

      {/* X-axis labels */}
      {xLabels.map((s, labelI) => {
        const origIdx = snapshots.indexOf(s);
        return (
          <text
            key={labelI}
            x={toX(origIdx)} y={height - 6}
            textAnchor="middle" fontSize="11"
            fill="currentColor" opacity="0.5"
          >
            {formatDate(typeof s.date === 'string' ? s.date : String(s.date))}
          </text>
        );
      })}
    </svg>
  );
}

export default function CollectionValueChart() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/prices/snapshot', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.success) setSnapshots(data.snapshots || []);
        else setError('Could not load price history');
      })
      .catch(() => setError('Could not load price history'))
      .finally(() => setLoading(false));
  }, []);

  const latest = snapshots[snapshots.length - 1];
  const prev = snapshots[snapshots.length - 2];
  const change = latest && prev ? latest.value - prev.value : null;
  const changePct = change !== null && prev && prev.value > 0
    ? (change / prev.value) * 100
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold dark:text-white">Portfolio Analytics</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Collection value over time
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full">
          <Clock className="w-3 h-3" />
          Prices update weekly
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-gray-400">{error}</div>
      ) : snapshots.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No price history yet</p>
          <p className="text-sm mt-1">
            Your first snapshot will appear after the weekly price update runs.
          </p>
          <p className="text-xs mt-3 text-gray-300 dark:text-gray-600">
            Prices are sourced from CardMarket (Pokémon) and Scryfall (Magic)
          </p>
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wide">
                Current Value
              </p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                €{formatEur(latest.value)}
              </p>
              <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">
                {latest.cardCount} cards
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
                Weekly Change
              </p>
              {change !== null ? (
                <div className="flex items-center gap-1.5 mt-1">
                  {change > 0 ? (
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  ) : change < 0 ? (
                    <TrendingDown className="w-5 h-5 text-red-500" />
                  ) : (
                    <Minus className="w-5 h-5 text-gray-400" />
                  )}
                  <span className={`text-xl font-bold ${
                    change > 0 ? 'text-green-600 dark:text-green-400' :
                    change < 0 ? 'text-red-600 dark:text-red-400' :
                    'text-gray-500'
                  }`}>
                    {change >= 0 ? '+' : ''}€{formatEur(Math.abs(change))}
                  </span>
                </div>
              ) : (
                <p className="text-xl font-bold text-gray-400 mt-1">—</p>
              )}
              {changePct !== null && (
                <p className={`text-xs mt-0.5 ${
                  changePct > 0 ? 'text-green-500' :
                  changePct < 0 ? 'text-red-500' :
                  'text-gray-400'
                }`}>
                  {changePct >= 0 ? '+' : ''}{changePct.toFixed(1)}% vs last week
                </p>
              )}
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
                All-Time High
              </p>
              <p className="text-xl font-bold text-gray-700 dark:text-gray-200 mt-1">
                €{formatEur(Math.max(...snapshots.map(s => s.value)))}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {snapshots.length} week{snapshots.length !== 1 ? 's' : ''} of data
              </p>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">
              Value History
            </h3>
            <div className="text-gray-700 dark:text-gray-300">
              <LineChart snapshots={snapshots} />
            </div>
          </div>

          {/* Price sources note */}
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            Pokémon prices from CardMarket via pokemontcg.io · Magic prices from Scryfall ·
            Japanese/Chinese cards use EN equivalent price · Updates every Monday
          </p>
        </>
      )}
    </div>
  );
}
