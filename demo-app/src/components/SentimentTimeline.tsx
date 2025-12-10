'use client';

import { useState, useMemo } from 'react';
import {
  HistoricalInteraction,
  SentimentSummary,
  SentimentChannel,
  SentimentTrend,
} from '@/lib/types';

interface SentimentTimelineProps {
  interactions: HistoricalInteraction[];
  summary: SentimentSummary;
  customerName?: string;
  onRangeChange?: (days: 30 | 60 | 90) => void;
  selectedDays?: 30 | 60 | 90;
}

// Channel icons
const CHANNEL_ICONS: Record<SentimentChannel, string> = {
  call: '\uD83D\uDCDE',
  chat: '\uD83D\uDCAC',
  email: '\u2709\uFE0F',
  survey: '\uD83D\uDCCB',
  social: '\uD83D\uDC65',
};

const CHANNEL_COLORS: Record<SentimentChannel, string> = {
  call: '#3B82F6',
  chat: '#8B5CF6',
  email: '#F59E0B',
  survey: '#10B981',
  social: '#EC4899',
};

function getSentimentColor(score: number): string {
  if (score >= 0.15) return '#10B981';
  if (score <= -0.15) return '#EF4444';
  return '#6B7280';
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function TrendIndicator({ trend }: { trend: SentimentTrend }) {
  const config = {
    improving: { icon: '\u2191', color: '#10B981', label: 'Improving' },
    stable: { icon: '\u2194', color: '#6B7280', label: 'Stable' },
    declining: { icon: '\u2193', color: '#EF4444', label: 'Declining' },
  };
  const { icon, color, label } = config[trend];

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
      style={{ backgroundColor: `${color}20`, color }}
    >
      <span>{icon}</span> {label}
    </span>
  );
}

export default function SentimentTimeline({
  interactions,
  summary,
  customerName,
  onRangeChange,
  selectedDays = 90,
}: SentimentTimelineProps) {
  const [hoveredPoint, setHoveredPoint] = useState<HistoricalInteraction | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const width = 400;
  const height = 140;
  const padding = { top: 15, right: 15, bottom: 25, left: 35 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const dataPoints = useMemo(() => {
    if (interactions.length === 0) return [];

    const sorted = [...interactions].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const minTime = new Date(sorted[0].timestamp).getTime();
    const maxTime = new Date(sorted[sorted.length - 1].timestamp).getTime();
    const timeRange = maxTime - minTime || 1;

    return sorted.map((interaction) => {
      const time = new Date(interaction.timestamp).getTime();
      const x = padding.left + ((time - minTime) / timeRange) * chartWidth;
      const y = padding.top + ((1 - interaction.sentiment_score) / 2) * chartHeight;
      return { ...interaction, x, y };
    });
  }, [interactions, chartWidth, chartHeight, padding.left, padding.top]);

  const linePath = useMemo(() => {
    if (dataPoints.length === 0) return '';
    return dataPoints
      .map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');
  }, [dataPoints]);

  const areaPath = useMemo(() => {
    if (dataPoints.length === 0) return '';
    const baseline = padding.top + chartHeight;
    return `${linePath} L ${dataPoints[dataPoints.length - 1].x} ${baseline} L ${dataPoints[0].x} ${baseline} Z`;
  }, [linePath, dataPoints, padding.top, chartHeight]);

  const handleMouseMove = (
    e: React.MouseEvent<SVGCircleElement>,
    point: HistoricalInteraction & { x: number; y: number }
  ) => {
    const svg = e.currentTarget.closest('svg');
    if (svg) {
      const rect = svg.getBoundingClientRect();
      setTooltipPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top - 60,
      });
    }
    setHoveredPoint(point);
  };

  if (interactions.length === 0) {
    return (
      <div className="rounded-xl bg-slate-900/50 border border-slate-700/30 p-4 text-center text-slate-400">
        No historical data available
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-slate-900/50 border border-slate-700/30 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Sentiment History
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {summary.total_interactions} interactions over {summary.period_days} days
          </p>
        </div>
        {onRangeChange && (
          <div className="flex gap-1">
            {([30, 60, 90] as const).map((days) => (
              <button
                key={days}
                onClick={() => onRangeChange(days)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  selectedDays === days
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-slate-800/50 rounded p-2">
          <div className="text-xs text-slate-500">Avg Score</div>
          <div
            className="text-base font-bold"
            style={{ color: getSentimentColor(summary.average_sentiment) }}
          >
            {summary.average_sentiment >= 0 ? '+' : ''}
            {summary.average_sentiment.toFixed(2)}
          </div>
        </div>
        <div className="bg-slate-800/50 rounded p-2">
          <div className="text-xs text-slate-500">Trend</div>
          <div className="mt-0.5">
            <TrendIndicator trend={summary.trend} />
          </div>
        </div>
        <div className="bg-slate-800/50 rounded p-2">
          <div className="text-xs text-slate-500">Distribution</div>
          <div className="flex gap-1 mt-0.5 text-xs">
            <span className="text-green-400">{summary.sentiment_distribution.positive}</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400">{summary.sentiment_distribution.neutral}</span>
            <span className="text-slate-600">/</span>
            <span className="text-red-400">{summary.sentiment_distribution.negative}</span>
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative">
        <svg width={width} height={height} className="w-full">
          <defs>
            <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={
                  summary.trend === 'improving'
                    ? '#10B981'
                    : summary.trend === 'declining'
                    ? '#EF4444'
                    : '#6B7280'
                }
                stopOpacity="0.3"
              />
              <stop
                offset="100%"
                stopColor={
                  summary.trend === 'improving'
                    ? '#10B981'
                    : summary.trend === 'declining'
                    ? '#EF4444'
                    : '#6B7280'
                }
                stopOpacity="0.05"
              />
            </linearGradient>
          </defs>

          {/* Y-axis gridlines */}
          {[-1, 0, 1].map((val) => {
            const y = padding.top + ((1 - val) / 2) * chartHeight;
            return (
              <g key={val}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#374151"
                  strokeDasharray="3,3"
                />
                <text
                  x={padding.left - 5}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fill="#6B7280"
                  fontSize="9"
                >
                  {val === 1 ? '+1' : val === -1 ? '-1' : '0'}
                </text>
              </g>
            );
          })}

          <line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke="#374151"
          />

          <path d={areaPath} fill="url(#sentimentGradient)" />

          <path
            d={linePath}
            fill="none"
            stroke={
              summary.trend === 'improving'
                ? '#10B981'
                : summary.trend === 'declining'
                ? '#EF4444'
                : '#6B7280'
            }
            strokeWidth="2"
          />

          {dataPoints.map((point) => (
            <g key={point.id}>
              <circle
                cx={point.x}
                cy={point.y}
                r={5}
                fill={CHANNEL_COLORS[point.channel]}
                opacity={0.3}
              />
              <circle
                cx={point.x}
                cy={point.y}
                r={3}
                fill={getSentimentColor(point.sentiment_score)}
                stroke="#1F2937"
                strokeWidth="1"
                className="cursor-pointer"
                onMouseEnter={(e) => handleMouseMove(e, point)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            </g>
          ))}

          {dataPoints.length > 0 && (
            <>
              <text
                x={padding.left}
                y={height - 8}
                textAnchor="start"
                fill="#6B7280"
                fontSize="9"
              >
                {formatDate(dataPoints[0].timestamp)}
              </text>
              <text
                x={width - padding.right}
                y={height - 8}
                textAnchor="end"
                fill="#6B7280"
                fontSize="9"
              >
                {formatDate(dataPoints[dataPoints.length - 1].timestamp)}
              </text>
            </>
          )}
        </svg>

        {hoveredPoint && (
          <div
            className="absolute bg-slate-900 rounded-lg p-2 shadow-xl border border-slate-700 z-10 pointer-events-none text-xs"
            style={{
              left: tooltipPosition.x,
              top: tooltipPosition.y,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span>{CHANNEL_ICONS[hoveredPoint.channel]}</span>
              <span className="font-medium text-white capitalize">{hoveredPoint.channel}</span>
              <span
                className="px-1 py-0.5 rounded text-xs"
                style={{
                  backgroundColor: `${getSentimentColor(hoveredPoint.sentiment_score)}20`,
                  color: getSentimentColor(hoveredPoint.sentiment_score),
                }}
              >
                {hoveredPoint.sentiment_label}
              </span>
            </div>
            <div className="text-slate-400">{new Date(hoveredPoint.timestamp).toLocaleDateString()}</div>
            <div className="text-slate-300 mt-1">{hoveredPoint.summary}</div>
          </div>
        )}
      </div>

      {/* Channel Legend */}
      <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-slate-700/50">
        {Object.entries(summary.channel_breakdown).map(([channel, count]) => (
          <div key={channel} className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: CHANNEL_COLORS[channel as SentimentChannel] }}
            />
            <span className="text-xs text-slate-500 capitalize">
              {channel}: {count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
