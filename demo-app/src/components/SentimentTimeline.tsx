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
  call: '📞',
  chat: '💬',
  email: '✉️',
  survey: '📋',
  social: '👥',
};

const CHANNEL_COLORS: Record<SentimentChannel, string> = {
  call: '#3B82F6',    // blue
  chat: '#8B5CF6',    // purple
  email: '#F59E0B',   // amber
  survey: '#10B981',  // emerald
  social: '#EC4899',  // pink
};

const CHANNEL_NAMES: Record<SentimentChannel, string> = {
  call: 'Phone Call',
  chat: 'Live Chat',
  email: 'Email',
  survey: 'Survey',
  social: 'Social Media',
};

// Get sentiment color
function getSentimentColor(score: number): string {
  if (score >= 0.15) return '#10B981'; // green
  if (score <= -0.15) return '#EF4444'; // red
  return '#6B7280'; // gray
}

function getSentimentBg(score: number): string {
  if (score >= 0.15) return 'bg-green-500/20 border-green-500/30';
  if (score <= -0.15) return 'bg-red-500/20 border-red-500/30';
  return 'bg-gray-500/20 border-gray-500/30';
}

// Format date for display
function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatFullDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Trend indicator component
function TrendIndicator({ trend }: { trend: SentimentTrend }) {
  const config = {
    improving: { icon: '↑', color: '#10B981', label: 'Improving' },
    stable: { icon: '↔', color: '#6B7280', label: 'Stable' },
    declining: { icon: '↓', color: '#EF4444', label: 'Declining' },
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
  const [selectedPoint, setSelectedPoint] = useState<HistoricalInteraction | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Chart dimensions - larger when expanded
  const width = isExpanded ? 800 : compact ? 280 : 500;
  const height = isExpanded ? 300 : compact ? 120 : 180;
  const padding = { top: 25, right: 25, bottom: 35, left: 45 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate date range based on selectedDays (not data range)
  const dateRange = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - selectedDays);
    return { start: startDate, end: endDate };
  }, [selectedDays]);

  // Process data points for the chart
  const dataPoints = useMemo(() => {
    if (interactions.length === 0) return [];

    const sorted = [...interactions].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const minTime = dateRange.start.getTime();
    const maxTime = dateRange.end.getTime();
    const timeRange = maxTime - minTime || 1;

    return sorted.map((interaction) => {
      const time = new Date(interaction.timestamp).getTime();
      const x = padding.left + ((time - minTime) / timeRange) * chartWidth;
      const y = padding.top + ((1 - interaction.sentiment_score) / 2) * chartHeight;

      return { ...interaction, x, y };
    });
  }, [interactions, chartWidth, chartHeight, padding.left, padding.top, dateRange]);

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
        y: e.clientY - rect.top - 80,
      });
    }
    setHoveredPoint(point);
  };

  // Handle click to select point
  const handlePointClick = (point: HistoricalInteraction) => {
    setSelectedPoint(selectedPoint?.id === point.id ? null : point);
  };

  if (interactions.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 text-center text-gray-400">
        No historical data available
      </div>
    );
  }

  const chartContent = (
    <div className={`bg-gray-800 rounded-lg ${compact ? 'p-3' : 'p-4'} ${isExpanded ? 'fixed inset-4 z-50 overflow-auto' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className={`font-semibold text-white ${compact ? 'text-sm' : 'text-base'}`}>
            {customerName ? `${customerName}'s Sentiment History` : 'Sentiment History'}
          </h3>
          <p className="text-xs text-gray-400">
            {summary.total_interactions} interactions over {selectedDays} days
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>
        </div>
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
                  x={padding.left - 8}
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

          {/* Zero line (highlighted) */}
          <line
            x1={padding.left}
            y1={padding.top + chartHeight / 2}
            x2={width - padding.right}
            y2={padding.top + chartHeight / 2}
            stroke="#4B5563"
            strokeWidth="1"
          />

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

          {/* Data points - Channel colored */}
          {dataPoints.map((point) => (
            <g key={point.id} className="cursor-pointer">
              {/* Outer ring - Channel color */}
              <circle
                cx={point.x}
                cy={point.y}
                r={isExpanded ? 10 : 7}
                fill={CHANNEL_COLORS[point.channel]}
                opacity={selectedPoint?.id === point.id ? 1 : 0.8}
                stroke={selectedPoint?.id === point.id ? '#fff' : 'none'}
                strokeWidth={2}
                onClick={() => handlePointClick(point)}
                onMouseEnter={(e) => handleMouseMove(e, point)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
              {/* Inner dot - Sentiment indicator */}
              <circle
                cx={point.x}
                cy={point.y}
                r={isExpanded ? 4 : 3}
                fill={getSentimentColor(point.sentiment_score)}
                pointerEvents="none"
              />
            </g>
          ))}

          {/* X-axis date labels */}
          <text
            x={padding.left}
            y={height - 10}
            textAnchor="start"
            fill="#9CA3AF"
            fontSize="10"
          >
            {formatDate(dateRange.start.toISOString())}
          </text>
          <text
            x={width - padding.right}
            y={height - 10}
            textAnchor="end"
            fill="#9CA3AF"
            fontSize="10"
          >
            {formatDate(dateRange.end.toISOString())}
          </text>
        </svg>

        {/* Hover Tooltip */}
        {hoveredPoint && !selectedPoint && (
          <div
            className="absolute bg-gray-900 rounded-lg p-3 shadow-xl border border-gray-600 z-20 pointer-events-none min-w-48"
            style={{
              left: Math.min(tooltipPosition.x, width - 200),
              top: tooltipPosition.y,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: CHANNEL_COLORS[hoveredPoint.channel] }}
              />
              <span className="text-sm font-medium text-white">
                {CHANNEL_NAMES[hoveredPoint.channel]}
              </span>
              <span
                className="px-1.5 py-0.5 rounded text-xs font-medium ml-auto"
                style={{
                  backgroundColor: `${getSentimentColor(hoveredPoint.sentiment_score)}20`,
                  color: getSentimentColor(hoveredPoint.sentiment_score),
                }}
              >
                {hoveredPoint.sentiment_score >= 0 ? '+' : ''}{hoveredPoint.sentiment_score.toFixed(2)}
              </span>
            </div>
            <div className="text-xs text-gray-400 mb-1">
              {formatFullDate(hoveredPoint.timestamp)}
            </div>
            <div className="text-xs text-gray-300">{hoveredPoint.summary}</div>
            <div className="text-xs text-blue-400 mt-2">Click for details</div>
          </div>
        )}
      </div>

      {/* Channel Legend - Clickable */}
      <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-700">
        {Object.entries(summary.channel_breakdown).map(([channel, count]) => (
          <button
            key={channel}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-700/50 transition-colors"
            onClick={() => {
              // Filter to show only this channel's interactions
              const channelInteraction = interactions.find(i => i.channel === channel);
              if (channelInteraction) setSelectedPoint(channelInteraction);
            }}
          >
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: CHANNEL_COLORS[channel as SentimentChannel] }}
            />
            <span className="text-xs text-gray-300">
              {CHANNEL_ICONS[channel as SentimentChannel]} {CHANNEL_NAMES[channel as SentimentChannel]}: {count}
            </span>
          </button>
        ))}
      </div>

      {/* Selected Interaction Detail Panel */}
      {selectedPoint && (
        <div className={`mt-4 p-4 rounded-lg border ${getSentimentBg(selectedPoint.sentiment_score)}`}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: CHANNEL_COLORS[selectedPoint.channel] }}
              />
              <span className="font-medium text-white">
                {CHANNEL_ICONS[selectedPoint.channel]} {CHANNEL_NAMES[selectedPoint.channel]}
              </span>
            </div>
            <button
              onClick={() => setSelectedPoint(null)}
              className="text-gray-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <div className="text-xs text-gray-400">Date & Time</div>
              <div className="text-sm text-white">{formatFullDate(selectedPoint.timestamp)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Sentiment Score</div>
              <div className="text-sm font-bold" style={{ color: getSentimentColor(selectedPoint.sentiment_score) }}>
                {selectedPoint.sentiment_score >= 0 ? '+' : ''}{selectedPoint.sentiment_score.toFixed(3)}
                <span className="ml-2 font-normal text-gray-400">({selectedPoint.sentiment_label})</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Resolution</div>
              <div className={`text-sm ${
                selectedPoint.resolution === 'resolved' ? 'text-green-400' :
                selectedPoint.resolution === 'escalated' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {selectedPoint.resolution || 'Pending'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Agent</div>
              <div className="text-sm text-white">{selectedPoint.agent_id || 'N/A'}</div>
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-400 mb-1">Interaction Summary</div>
            <div className="text-sm text-gray-200 bg-gray-800/50 rounded p-2">
              {selectedPoint.summary}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-600/50">
            <div className="text-xs text-gray-400 mb-1">Why this sentiment?</div>
            <div className="text-xs text-gray-300">
              {selectedPoint.sentiment_score >= 0.15
                ? 'Positive language indicators detected: satisfaction, appreciation, or resolved issue.'
                : selectedPoint.sentiment_score <= -0.15
                ? 'Negative language indicators detected: frustration, complaint, or unresolved issue.'
                : 'Neutral language indicators: informational inquiry or routine interaction.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render with overlay if expanded
  if (isExpanded) {
    return (
      <>
        <div className="fixed inset-0 bg-black/70 z-40" onClick={() => setIsExpanded(false)} />
        {chartContent}
      </>
    );
  }

  return chartContent;
}
