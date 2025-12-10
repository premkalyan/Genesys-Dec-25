'use client';

import { useState } from 'react';
import {
  AIAssistData,
  KnowledgeCard,
  SentimentData,
  SentimentHistoryEntry,
  CustomerSentimentHistory,
  SentimentProvider,
} from '@/lib/types';
import SentimentTimeline from './SentimentTimeline';

interface AIAssistPanelProps {
  data: AIAssistData;
  onSelectSuggestion: (suggestion: string) => void;
  onQuickAction?: (action: string) => void;
  latencyMs: number;
  ragConnected: boolean;
  isLoading?: boolean;
  // Historical sentiment data
  historicalData?: CustomerSentimentHistory | null;
  historyDays?: 30 | 60 | 90;
  onHistoryDaysChange?: (days: 30 | 60 | 90) => void;
  loadingHistory?: boolean;
  // Sentiment provider
  sentimentProvider?: SentimentProvider;
  onProviderChange?: (provider: SentimentProvider) => void;
}

// E4: Skeleton loading component
function Skeleton({ className = '', animate = true }: { className?: string; animate?: boolean }) {
  return (
    <div
      className={`bg-slate-700/50 rounded ${animate ? 'animate-pulse' : ''} ${className}`}
      aria-hidden="true"
    />
  );
}

// E4: Suggestion skeleton
function SuggestionSkeleton() {
  return (
    <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50" aria-hidden="true">
      <div className="flex items-start gap-2">
        <Skeleton className="w-5 h-5 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}

// E4: Knowledge card skeleton
function KnowledgeCardSkeleton() {
  return (
    <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/50" aria-hidden="true">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
        <Skeleton className="h-5 w-16 rounded" />
      </div>
    </div>
  );
}

// A5: Animated sentiment gauge component
function SentimentGauge({
  sentiment,
  confidence
}: {
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
}) {
  // Map sentiment to angle: negative=-45°, neutral=0°, positive=45°
  const sentimentToAngle = {
    negative: -45,
    neutral: 0,
    positive: 45
  };

  const baseAngle = sentimentToAngle[sentiment];
  // Adjust angle based on confidence (higher confidence = more extreme)
  const confidenceMultiplier = confidence / 100;
  const angle = baseAngle * confidenceMultiplier;

  // Colors for the gauge segments
  const segmentColors = {
    negative: '#ef4444',
    neutral: '#64748b',
    positive: '#22c55e'
  };

  return (
    <div className="relative w-full h-20 flex items-center justify-center" aria-label={`Sentiment gauge showing ${sentiment} with ${confidence}% confidence`}>
      <svg viewBox="0 0 200 100" className="w-full max-w-[180px]">
        {/* Background arc segments */}
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>

        {/* Gauge background arc */}
        <path
          d="M 20 90 A 80 80 0 0 1 180 90"
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="12"
          strokeLinecap="round"
          opacity="0.3"
        />

        {/* Active segment highlight */}
        <path
          d="M 20 90 A 80 80 0 0 1 180 90"
          fill="none"
          stroke={segmentColors[sentiment]}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray="125.6"
          strokeDashoffset={sentiment === 'negative' ? '83.7' : sentiment === 'positive' ? '0' : '41.9'}
          opacity="0.8"
          style={{
            transform: sentiment === 'negative' ? 'none' : sentiment === 'positive' ? 'scaleX(-1)' : 'none',
            transformOrigin: 'center'
          }}
        />

        {/* Tick marks */}
        <line x1="20" y1="90" x2="30" y2="90" stroke="#475569" strokeWidth="2" />
        <line x1="100" y1="10" x2="100" y2="20" stroke="#475569" strokeWidth="2" />
        <line x1="180" y1="90" x2="170" y2="90" stroke="#475569" strokeWidth="2" />

        {/* Labels */}
        <text x="15" y="85" fill="#ef4444" fontSize="8" textAnchor="middle">😟</text>
        <text x="100" y="8" fill="#64748b" fontSize="8" textAnchor="middle">😐</text>
        <text x="185" y="85" fill="#22c55e" fontSize="8" textAnchor="middle">😊</text>

        {/* Needle */}
        <g style={{
          transform: `rotate(${angle}deg)`,
          transformOrigin: '100px 90px',
          transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}>
          <line
            x1="100"
            y1="90"
            x2="100"
            y2="25"
            stroke={segmentColors[sentiment]}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="100" cy="90" r="6" fill={segmentColors[sentiment]} />
          <circle cx="100" cy="90" r="3" fill="#0f172a" />
        </g>

        {/* Confidence value */}
        <text x="100" y="75" fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="bold">
          {confidence}%
        </text>
      </svg>
    </div>
  );
}

const sentimentConfig = {
  positive: {
    icon: '😊',
    label: 'Positive',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    barColor: 'bg-green-500',
  },
  neutral: {
    icon: '😐',
    label: 'Neutral',
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    barColor: 'bg-slate-500',
  },
  negative: {
    icon: '😟',
    label: 'Needs Attention',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    barColor: 'bg-red-500',
  },
};

const urgencyConfig = {
  low: { label: 'Low', color: 'text-slate-400', bg: 'bg-slate-500/20' },
  medium: { label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  high: { label: 'High', color: 'text-orange-400', bg: 'bg-orange-500/20' },
  critical: { label: 'Critical', color: 'text-red-400', bg: 'bg-red-500/20', pulse: true },
};

// Mini chart for sentiment history
function SentimentTrendChart({ history }: { history?: SentimentHistoryEntry[] }) {
  if (!history || history.length < 2) return null;

  const sentimentToValue = (s: 'positive' | 'neutral' | 'negative') => {
    return s === 'positive' ? 2 : s === 'neutral' ? 1 : 0;
  };

  const points = history.slice(-6).map((entry, idx) => ({
    x: idx,
    y: sentimentToValue(entry.value),
    confidence: entry.confidence,
  }));

  const width = 120;
  const height = 32;
  const padding = 4;
  const stepX = (width - padding * 2) / Math.max(points.length - 1, 1);
  const stepY = (height - padding * 2) / 2;

  const pathData = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${padding + p.x * stepX} ${height - padding - p.y * stepY}`)
    .join(' ');

  const lastPoint = points[points.length - 1];
  const pointColor = lastPoint.y === 2 ? '#22c55e' : lastPoint.y === 1 ? '#64748b' : '#ef4444';

  return (
    <div className="flex items-center gap-2">
      <svg width={width} height={height} className="overflow-visible">
        {/* Grid lines */}
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#334155" strokeWidth="0.5" />
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#334155" strokeWidth="0.5" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#334155" strokeWidth="0.5" />

        {/* Trend line */}
        <path d={pathData} fill="none" stroke={pointColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={padding + p.x * stepX}
            cy={height - padding - p.y * stepY}
            r={i === points.length - 1 ? 4 : 2}
            fill={p.y === 2 ? '#22c55e' : p.y === 1 ? '#64748b' : '#ef4444'}
            className={i === points.length - 1 ? 'animate-pulse' : ''}
          />
        ))}
      </svg>
      <div className="text-[10px] text-slate-500 leading-tight">
        <div>😊 Good</div>
        <div>😐 Ok</div>
        <div>😟 Low</div>
      </div>
    </div>
  );
}

// Quick action button component
function QuickActionButton({ action, onClick }: { action: string; onClick: () => void }) {
  const actionConfig: Record<string, { icon: string; color: string; bg: string }> = {
    'Transfer to Specialist': { icon: '🔄', color: 'text-blue-400', bg: 'bg-blue-500/20 hover:bg-blue-500/30' },
    'Initiate Escalation': { icon: '⬆️', color: 'text-orange-400', bg: 'bg-orange-500/20 hover:bg-orange-500/30' },
    'Create Support Ticket': { icon: '🎫', color: 'text-purple-400', bg: 'bg-purple-500/20 hover:bg-purple-500/30' },
    'Schedule Callback': { icon: '📞', color: 'text-green-400', bg: 'bg-green-500/20 hover:bg-green-500/30' },
    'Send Documentation': { icon: '📄', color: 'text-cyan-400', bg: 'bg-cyan-500/20 hover:bg-cyan-500/30' },
    'Offer Compensation': { icon: '💰', color: 'text-yellow-400', bg: 'bg-yellow-500/20 hover:bg-yellow-500/30' },
    'Request Screen Share': { icon: '🖥️', color: 'text-indigo-400', bg: 'bg-indigo-500/20 hover:bg-indigo-500/30' },
    'Send Step-by-Step Guide': { icon: '📋', color: 'text-teal-400', bg: 'bg-teal-500/20 hover:bg-teal-500/30' },
  };

  const config = actionConfig[action] || { icon: '⚡', color: 'text-slate-400', bg: 'bg-slate-500/20 hover:bg-slate-500/30' };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${config.bg} ${config.color} border border-transparent hover:border-current/30 transition-all`}
    >
      <span>{config.icon}</span>
      <span>{action}</span>
    </button>
  );
}

export default function AIAssistPanel({
  data,
  onSelectSuggestion,
  onQuickAction,
  latencyMs,
  ragConnected,
  isLoading = false,
  historicalData,
  historyDays = 90,
  onHistoryDaysChange,
  loadingHistory = false,
  sentimentProvider = 'vader',
  onProviderChange,
}: AIAssistPanelProps) {
  const sentiment = sentimentConfig[data.sentiment];
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div
      className="flex flex-col h-full bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden"
      role="complementary"
      aria-label="AI Assistant Panel"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-medium">AI Assist</h3>
              <p className="text-xs text-slate-400">Powered by Bounteous RAG</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {/* Provider Toggle */}
            {onProviderChange && (
              <div className="flex items-center gap-1 bg-slate-700/50 rounded-lg p-0.5">
                <button
                  onClick={() => onProviderChange('vader')}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                    sentimentProvider === 'vader'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Fast rule-based analysis (~5ms)"
                >
                  VADER
                </button>
                <button
                  onClick={() => onProviderChange('transformer')}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                    sentimentProvider === 'transformer'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="ML-based analysis (~50-200ms)"
                >
                  ML
                </button>
              </div>
            )}
            <div className={`w-2 h-2 rounded-full ${ragConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            <span className="text-slate-400">{latencyMs}ms</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* A5: Sentiment Gauge */}
        {data.sentimentData && (
          <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/50">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs font-medium text-slate-400">Customer Sentiment</h4>
              {data.sentimentData.urgency !== 'low' && (
                <div className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${urgencyConfig[data.sentimentData.urgency].bg} ${urgencyConfig[data.sentimentData.urgency].color} ${'pulse' in urgencyConfig[data.sentimentData.urgency] ? 'animate-pulse' : ''}`}>
                  {urgencyConfig[data.sentimentData.urgency].label}
                </div>
              )}
            </div>
            <SentimentGauge
              sentiment={data.sentiment}
              confidence={data.sentimentData.confidence}
            />
          </div>
        )}

        {/* Enhanced Sentiment Indicator */}
        <div className={`p-3 rounded-xl ${sentiment.bg} border ${sentiment.border}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{sentiment.icon}</span>
              <div>
                <div className={`font-medium ${sentiment.color}`}>{sentiment.label}</div>
                <div className="text-xs text-slate-400">Customer sentiment</div>
              </div>
            </div>
            {/* Urgency Badge */}
            {data.sentimentData && data.sentimentData.urgency !== 'low' && (
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${urgencyConfig[data.sentimentData.urgency].bg} ${urgencyConfig[data.sentimentData.urgency].color} ${'pulse' in urgencyConfig[data.sentimentData.urgency] ? 'animate-pulse' : ''}`}>
                {urgencyConfig[data.sentimentData.urgency].label} Priority
              </div>
            )}
          </div>

          {/* Confidence Bar */}
          {data.sentimentData && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-400">Confidence</span>
                <span className={sentiment.color}>{data.sentimentData.confidence}%</span>
              </div>
              <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className={`h-full ${sentiment.barColor} rounded-full transition-all duration-500`}
                  style={{ width: `${data.sentimentData.confidence}%` }}
                />
              </div>
            </div>
          )}

          {/* Trend Indicator */}
          {data.sentimentData && data.sentimentData.trend !== 'stable' && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-slate-400">Trend:</span>
              <span className={`flex items-center gap-1 text-xs ${
                data.sentimentData.trend === 'improving' ? 'text-green-400' : 'text-red-400'
              }`}>
                {data.sentimentData.trend === 'improving' ? (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    Improving
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                    </svg>
                    Declining
                  </>
                )}
              </span>
            </div>
          )}

          {/* Detected Indicators */}
          {data.sentimentData && data.sentimentData.indicators.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-700/30">
              <div className="text-xs text-slate-500 mb-1">Detected keywords:</div>
              <div className="flex flex-wrap gap-1">
                {data.sentimentData.indicators.map((indicator, idx) => (
                  <span key={idx} className={`px-1.5 py-0.5 rounded text-[10px] ${sentiment.bg} ${sentiment.color} border ${sentiment.border}`}>
                    {indicator}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sentiment Trend Chart */}
        {data.sentimentData?.history && data.sentimentData.history.length >= 2 && (
          <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
                Sentiment Trend
              </h4>
              <span className="text-[10px] text-slate-500">{data.sentimentData.history.length} messages</span>
            </div>
            <SentimentTrendChart history={data.sentimentData.history} />
          </div>
        )}

        {/* Historical Sentiment Timeline */}
        {(historicalData || loadingHistory) && (
          <div className="space-y-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <svg className={`w-3 h-3 transition-transform ${showHistory ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {showHistory ? 'Hide' : 'Show'} Customer History
              {historicalData && (
                <span className="text-slate-500">
                  ({historicalData.summary.total_interactions} interactions)
                </span>
              )}
            </button>
            {showHistory && (
              loadingHistory ? (
                <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                  <div className="flex items-center justify-center gap-2 text-slate-400">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm">Loading history...</span>
                  </div>
                </div>
              ) : historicalData ? (
                <SentimentTimeline
                  interactions={historicalData.interactions}
                  summary={historicalData.summary}
                  selectedDays={historyDays}
                  onRangeChange={onHistoryDaysChange}
                  compact
                />
              ) : null
            )}
          </div>
        )}

        {/* Detected Intent */}
        {data.intent && (
          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <div className="text-xs text-slate-400">Detected Intent</div>
                <div className="text-sm font-medium text-indigo-300">{data.intent}</div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {data.suggestedActions && data.suggestedActions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Quick Actions
            </h4>
            <div className="flex flex-wrap gap-2">
              {data.suggestedActions.map((action, index) => (
                <QuickActionButton
                  key={index}
                  action={action}
                  onClick={() => onQuickAction?.(action)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Suggested Responses - E3: With staggered animations, E4: With loading skeletons */}
        <div role="region" aria-label="Suggested Responses" aria-busy={isLoading}>
          <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            Suggested Responses
            {/* E3: New suggestion indicator, E4: Loading indicator */}
            {isLoading ? (
              <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] bg-slate-500/20 text-slate-400 flex items-center gap-1">
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
              </span>
            ) : (
              <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-400 animate-pulse">
                AI Generated
              </span>
            )}
          </h4>
          <div className="space-y-2" role="list" aria-label="Response suggestions">
            {/* E4: Show skeletons when loading */}
            {isLoading ? (
              <>
                <SuggestionSkeleton />
                <SuggestionSkeleton />
                <SuggestionSkeleton />
              </>
            ) : (
              data.suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => onSelectSuggestion(suggestion)}
                  style={{ animationDelay: `${index * 100}ms` }}
                  className="w-full text-left p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-blue-500/50 hover:bg-slate-800 transition-all duration-300 group animate-fadeSlideIn hover:scale-[1.01] hover:shadow-lg hover:shadow-blue-500/10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                  role="listitem"
                  aria-label={`Suggestion ${index + 1}: ${suggestion.slice(0, 50)}...`}
                >
                  <div className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-blue-400 text-[10px] flex items-center justify-center font-medium" aria-hidden="true">
                      {index + 1}
                    </span>
                    <p className="text-sm text-slate-300 group-hover:text-white line-clamp-3 flex-1">
                      {suggestion}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 mt-2 ml-7 text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" aria-hidden="true">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                    Click to use
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Knowledge Cards */}
        {data.knowledgeCards.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Knowledge Articles
            </h4>
            <div className="space-y-2">
              {data.knowledgeCards.map((card, index) => (
                <KnowledgeCardItem key={index} card={card} />
              ))}
            </div>
          </div>
        )}

        {/* Dynamic Escalation Alert */}
        {data.sentimentData?.escalationAlert && (
          <div className={`p-3 rounded-xl ${
            data.sentimentData.escalationAlert.type === 'critical'
              ? 'bg-red-500/10 border border-red-500/30'
              : 'bg-orange-500/10 border border-orange-500/30'
          } ${data.sentimentData.escalationAlert.type === 'critical' ? 'animate-pulse' : ''}`}>
            <div className="flex items-start gap-2">
              <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                data.sentimentData.escalationAlert.type === 'critical' ? 'text-red-400' : 'text-orange-400'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <div className={`font-medium text-sm ${
                  data.sentimentData.escalationAlert.type === 'critical' ? 'text-red-400' : 'text-orange-400'
                }`}>
                  {data.sentimentData.escalationAlert.type === 'critical' ? '🚨 Critical Escalation' : '⚠️ Escalation Warning'}
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  {data.sentimentData.escalationAlert.reason}
                </p>
                <p className="text-xs text-slate-400 mt-1 italic">
                  Suggested: {data.sentimentData.escalationAlert.suggestedAction}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>RAG: {ragConnected ? 'Connected' : 'Fallback Mode'}</span>
          <span>Bounteous AI Layer</span>
        </div>
      </div>
    </div>
  );
}

function KnowledgeCardItem({ card }: { card: KnowledgeCard }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/50 hover:border-cyan-500/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h5 className="text-sm font-medium text-slate-200 truncate">{card.title}</h5>
            {card.actionRequired && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-orange-500/20 text-orange-300 animate-pulse">
                Action
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{card.summary}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-300">
            {card.category}
          </span>
          <span className="text-[10px] text-slate-500">
            {Math.round(card.relevance * 100)}% match
          </span>
        </div>
      </div>

      {/* B3: Show steps if available */}
      {card.steps && card.steps.length > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-700/30">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
          >
            <svg className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {expanded ? 'Hide' : 'Show'} {card.steps.length} steps
          </button>
          {expanded && (
            <ol className="mt-2 space-y-1.5 text-xs">
              {card.steps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2 text-slate-300">
                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="line-clamp-2">{step}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {/* B3: Show key navigation points */}
      {card.keyPoints && card.keyPoints.length > 0 && !expanded && (
        <div className="mt-2 pt-2 border-t border-slate-700/30">
          <div className="text-[10px] text-slate-500 mb-1">Quick navigation:</div>
          <div className="flex flex-wrap gap-1">
            {card.keyPoints.map((point, idx) => (
              <span key={idx} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-700/50 text-slate-300 font-mono">
                {point}
              </span>
            ))}
          </div>
        </div>
      )}

      {card.url && (
        <a
          href={card.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-2 text-xs text-blue-400 hover:text-blue-300"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          View Article
        </a>
      )}
    </div>
  );
}
