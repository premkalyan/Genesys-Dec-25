// Types for the Genesys AI Demo

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  latency?: number; // ms
  cost?: number; // dollars
  source?: string; // citation source
}

export interface PIIEntity {
  text: string;
  type: 'NAME' | 'EMAIL' | 'PHONE' | 'SSN' | 'ADDRESS' | 'ACCOUNT';
  start: number;
  end: number;
}

export interface PIIAuditEntry {
  id: string;
  timestamp: Date;
  originalText: string;
  redactedText: string;
  entitiesFound: PIIEntity[];
  action: 'REDACTED' | 'ALLOWED' | 'BLOCKED';
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  tier: 'Standard' | 'Silver' | 'Gold' | 'Platinum';
  accountAge: string;
  totalInteractions: number;
  lastContact: string;
  preferences: string[];
}

export interface ConversationSummary {
  intent: string;
  sentiment: 'Positive' | 'Neutral' | 'Frustrated' | 'Angry';
  questionsAsked: string[];
  resolutionAttempts: { question: string; resolved: boolean }[];
  recommendedAction: string;
  escalationReason?: string;
}

export interface MetricsData {
  totalQueries: number;
  avgLatency: number;
  accuracy: number;
  totalCost: number;
  gpt4EquivalentCost: number;
  topCategories: { name: string; count: number }[];
  hourlyUsage: { hour: string; count: number }[];
  escalationRate: number;
}

// =====================
// Sentiment Analysis Types
// =====================

export type SentimentChannel = 'call' | 'chat' | 'email' | 'survey' | 'social';
export type SentimentLabel = 'positive' | 'neutral' | 'negative';
export type SentimentTrend = 'improving' | 'stable' | 'declining';
export type ResolutionStatus = 'resolved' | 'escalated' | 'pending';

export interface HistoricalInteraction {
  id: string;
  customer_id: string;
  timestamp: string;
  channel: SentimentChannel;
  sentiment_score: number;
  sentiment_label: SentimentLabel;
  confidence: number;
  summary: string;
  agent_id?: string;
  resolution?: ResolutionStatus;
}

export interface SentimentSummary {
  total_interactions: number;
  average_sentiment: number;
  trend: SentimentTrend;
  channel_breakdown: Record<string, number>;
  sentiment_distribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  period_days: number;
  last_interaction: string | null;
}

export interface CustomerSentimentHistory {
  customer_id: string;
  customer_info: {
    name: string;
    email?: string;
    tier?: string;
    persona?: string;
    account_age?: string;
  };
  interactions: HistoricalInteraction[];
  summary: SentimentSummary;
}
