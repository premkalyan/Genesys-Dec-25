// Types for Agent Assist Demo

export interface Message {
  id: string;
  role: 'customer' | 'agent' | 'system';
  content: string;
  timestamp: Date;
}

export interface KnowledgeCard {
  title: string;
  summary: string;
  url: string;
  category: string;
  relevance: number;
  // B3: Enhanced formatting
  steps?: string[];
  keyPoints?: string[];
  actionRequired?: boolean;
}

export interface SentimentHistoryEntry {
  value: 'positive' | 'neutral' | 'negative';
  confidence: number;
  timestamp: Date;
  messageIndex: number;
}

export interface EscalationAlert {
  type: 'warning' | 'critical';
  reason: string;
  suggestedAction: string;
  timestamp: Date;
}

export interface SentimentData {
  value: 'positive' | 'neutral' | 'negative';
  confidence: number; // 0-100
  urgency: 'low' | 'medium' | 'high' | 'critical';
  trend: 'improving' | 'stable' | 'declining';
  indicators: string[]; // Keywords that triggered the sentiment
  history?: SentimentHistoryEntry[]; // Last 5 sentiment readings
  escalationAlert?: EscalationAlert; // Active escalation if any
}

export interface AIAssistData {
  suggestions: string[];
  knowledgeCards: KnowledgeCard[];
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentData?: SentimentData; // Enhanced sentiment with full details
  latencyMs: number;
  intent?: string; // Detected customer intent
  suggestedActions?: string[]; // Quick action buttons
}

export interface CustomerProfile {
  name: string;
  tier: string;
  issue: string;
  accountId: string;
  previousInteractions: number;
}

export interface EmotionalArc {
  startSentiment: 'positive' | 'neutral' | 'negative';
  peakMoment: number; // Message index where emotion peaks
  resolution: 'positive' | 'neutral' | 'negative';
  description: string; // Description of emotional journey
}

export interface ConversationScenario {
  id: string;
  name: string;
  description: string;
  customer: CustomerProfile;
  messages: ScriptedMessage[];
  emotionalArc?: EmotionalArc;
}

export interface ScriptedMessage {
  role: 'customer';
  content: string;
  delayMs: number;
  triggerKeywords?: string[];
  expectedSentiment?: 'positive' | 'neutral' | 'negative'; // Expected sentiment for this message
  emotionalNote?: string; // Context for the agent about this moment
}

export interface SearchResult {
  content: string;
  title: string;
  url: string;
  category: string;
  relevance: number;
}

export interface KnowledgeStats {
  total_chunks: number;
  unique_documents: number;
  categories: Record<string, number>;
  embedding_model: string;
}

export interface DocumentInfo {
  id: string;
  title: string;
  url: string;
  category: string;
  chunks: number;
}

// =====================
// Sentiment Analysis API Types
// =====================

export type SentimentChannel = 'call' | 'chat' | 'email' | 'survey' | 'social';
export type SentimentLabel = 'positive' | 'neutral' | 'negative';
export type SentimentTrend = 'improving' | 'stable' | 'declining';
export type SentimentProvider = 'vader' | 'transformer';
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

export interface CustomerInfo {
  name: string;
  email?: string;
  tier?: string;
  persona?: string;
  account_age?: string;
}

export interface CustomerSentimentHistory {
  customer_id: string;
  customer_info: CustomerInfo;
  interactions: HistoricalInteraction[];
  summary: SentimentSummary;
}

export interface SentimentAnalysisResult {
  provider: string;
  sentiment: SentimentLabel;
  score: number;
  confidence: number;
  processing_time_ms: number;
  breakdown: Record<string, unknown>;
}

export interface SentimentProviderInfo {
  id: string;
  name: string;
  description: string;
  speed: string;
  accuracy: string;
  best_for: string;
}

export interface DemoCustomer {
  id: string;
  name: string;
  email: string;
  tier: string;
  persona: string;
  persona_description: string;
}
