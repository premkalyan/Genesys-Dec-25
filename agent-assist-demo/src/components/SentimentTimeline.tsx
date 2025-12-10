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
  compact?: boolean;
}

// Channel icons
const CHANNEL_ICONS: Record<SentimentChannel, string> = {
  call: '\uD83D\uDCDE',    // phone
  chat: '\uD83D\uDCAC',    // speech bubble
  email: '\u2709\uFE0F',   // envelope
  survey: '\uD83D\uDCCB', // clipboard
  social: '\uD83D\uDC65', // people
};

const CHANNEL_COLORS: Record<SentimentChannel, string> = {
  call: '#3B82F6',    // blue
  chat: '#8B5CF6',    // purple
  email: '#F59E0B',   // amber
  survey: '#10B981',  // emerald
  social: '#EC4899',  // pink
};

// Get sentiment color
function getSentimentColor(score: number): string {
  if (score >= 0.15) return '#10B981'; // green
  if (score <= -0.15) return '#EF4444'; // red
  return '#6B7280'; // gray
}

// Format date for display
function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// Trend indicator component
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
  compact = false,
}: SentimentTimelineProps) {
  const [hoveredPoint, setHoveredPoint] = useState<HistoricalInteraction | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Chart dimensions
  const width = compact ? 280 : 500;
  const height = compact ? 120 : 180;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Process data points for the chart
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
      // Score is -1 to 1, map to chart height (inverted because SVG y increases downward)
      const y =
        padding.top + ((1 - interaction.sentiment_score) / 2) * chartHeight;

      return {
        ...interaction,
        x,
        y,
      };
    });
  }, [interactions, chartWidth, chartHeight, padding.left, padding.top]);

  // Generate SVG path for the line
  const linePath = useMemo(() => {
    if (dataPoints.length === 0) return '';
    return dataPoints
      .map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');
  }, [dataPoints]);

  // Generate gradient fill path
  const areaPath = useMemo(() => {
    if (dataPoints.length === 0) return '';
    const baseline = padding.top + chartHeight;
    return `${linePath} L ${dataPoints[dataPoints.length - 1].x} ${baseline} L ${dataPoints[0].x} ${baseline} Z`;
  }, [linePath, dataPoints, padding.top, chartHeight]);

  // Handle mouse move for tooltip
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
      <div className="bg-gray-800 rounded-lg p-4 text-center text-gray-400">
        No historical data available
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 rounded-lg ${compact ? 'p-3' : 'p-4'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className={`font-semibold text-white ${compact ? 'text-sm' : 'text-base'}`}>
            {customerName ? `${customerName}'s Sentiment History` : 'Sentiment History'}
          </h3>
          <p className="text-xs text-gray-400">
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
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className={`grid ${compact ? 'grid-cols-3' : 'grid-cols-4'} gap-2 mb-3`}>
        <div className="bg-gray-700/50 rounded p-2">
          <div className="text-xs text-gray-400">Avg Score</div>
          <div
            className="text-lg font-bold"
            style={{ color: getSentimentColor(summary.average_sentiment) }}
          >
            {summary.average_sentiment >= 0 ? '+' : ''}
            {summary.average_sentiment.toFixed(2)}
          </div>
        </div>
        <div className="bg-gray-700/50 rounded p-2">
          <div className="text-xs text-gray-400">Trend</div>
          <div className="mt-1">
            <TrendIndicator trend={summary.trend} />
          </div>
        </div>
        <div className="bg-gray-700/50 rounded p-2">
          <div className="text-xs text-gray-400">Distribution</div>
          <div className="flex gap-1 mt-1 text-xs">
            <span className="text-green-400">{summary.sentiment_distribution.positive}</span>
            <span className="text-gray-500">/</span>
            <span className="text-gray-400">{summary.sentiment_distribution.neutral}</span>
            <span className="text-gray-500">/</span>
            <span className="text-red-400">{summary.sentiment_distribution.negative}</span>
          </div>
        </div>
        {!compact && (
          <div className="bg-gray-700/50 rounded p-2">
            <div className="text-xs text-gray-400">Last Contact</div>
            <div className="text-sm text-white">
              {summary.last_interaction
                ? formatDate(summary.last_interaction)
                : 'N/A'}
            </div>
          </div>
        )}
      </div>

      {/* SVG Chart */}
      <div className="relative">
        <svg width={width} height={height} className="w-full">
          {/* Gradient for area fill */}
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

          {/* Y-axis gridlines and labels */}
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
                  fill="#9CA3AF"
                  fontSize="10"
                >
                  {val === 1 ? '+1' : val === -1 ? '-1' : '0'}
                </text>
              </g>
            );
          })}

          {/* X-axis line */}
          <line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke="#374151"
          />

          {/* Area fill */}
          <path d={areaPath} fill="url(#sentimentGradient)" />

          {/* Line */}
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

          {/* Data points */}
          {dataPoints.map((point) => (
            <g key={point.id}>
              {/* Outer circle for channel color */}
              <circle
                cx={point.x}
                cy={point.y}
                r={6}
                fill={CHANNEL_COLORS[point.channel]}
                opacity={0.3}
              />
              {/* Inner circle for sentiment */}
              <circle
                cx={point.x}
                cy={point.y}
                r={4}
                fill={getSentimentColor(point.sentiment_score)}
                stroke="#1F2937"
                strokeWidth="1"
                className="cursor-pointer transition-all hover:r-6"
                onMouseEnter={(e) => handleMouseMove(e, point)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            </g>
          ))}

          {/* X-axis date labels */}
          {dataPoints.length > 0 && (
            <>
              <text
                x={padding.left}
                y={height - 10}
                textAnchor="start"
                fill="#9CA3AF"
                fontSize="10"
              >
                {formatDate(dataPoints[0].timestamp)}
              </text>
              <text
                x={width - padding.right}
                y={height - 10}
                textAnchor="end"
                fill="#9CA3AF"
                fontSize="10"
              >
                {formatDate(dataPoints[dataPoints.length - 1].timestamp)}
              </text>
            </>
          )}
        </svg>

        {/* Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute bg-gray-900 rounded-lg p-3 shadow-xl border border-gray-700 z-10 pointer-events-none"
            style={{
              left: tooltipPosition.x,
              top: tooltipPosition.y,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span>{CHANNEL_ICONS[hoveredPoint.channel]}</span>
              <span className="text-sm font-medium text-white capitalize">
                {hoveredPoint.channel}
              </span>
              <span
                className="px-1.5 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: `${getSentimentColor(hoveredPoint.sentiment_score)}20`,
                  color: getSentimentColor(hoveredPoint.sentiment_score),
                }}
              >
                {hoveredPoint.sentiment_label}
              </span>
            </div>
            <div className="text-xs text-gray-400 mb-1">
              {new Date(hoveredPoint.timestamp).toLocaleString()}
            </div>
            <div className="text-xs text-gray-300">{hoveredPoint.summary}</div>
            {hoveredPoint.resolution && (
              <div className="text-xs text-gray-400 mt-1">
                Resolution:{' '}
                <span
                  className={
                    hoveredPoint.resolution === 'resolved'
                      ? 'text-green-400'
                      : hoveredPoint.resolution === 'escalated'
                      ? 'text-red-400'
                      : 'text-yellow-400'
                  }
                >
                  {hoveredPoint.resolution}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Channel Legend */}
      {!compact && (
        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-700">
          {Object.entries(summary.channel_breakdown).map(([channel, count]) => (
            <div key={channel} className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: CHANNEL_COLORS[channel as SentimentChannel] }}
              />
              <span className="text-xs text-gray-400 capitalize">
                {channel}: {count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
