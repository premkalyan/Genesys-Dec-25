// RAG Service - Connects to knowledge backend

import {
  AIAssistData,
  KnowledgeCard,
  SearchResult,
  KnowledgeStats,
  DocumentInfo,
  SentimentData,
  SentimentHistoryEntry,
  EscalationAlert,
  CustomerSentimentHistory,
  SentimentAnalysisResult,
  SentimentProviderInfo,
  DemoCustomer,
  SentimentProvider as SentimentProviderType
} from './types';

const RAG_API_URL = process.env.NEXT_PUBLIC_RAG_API_URL || 'http://localhost:3336';

// B4: Knowledge result caching
interface CacheEntry {
  results: SearchResult[];
  timestamp: number;
  query: string;
}

const knowledgeCache: Map<string, CacheEntry> = new Map();
const CACHE_TTL_MS = 60000; // 1 minute cache TTL
const MAX_CACHE_SIZE = 50;

// B4: Normalize query for cache key (lowercase, trim, remove extra spaces)
function normalizeQuery(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, ' ');
}

// B4: Check if cache entry is still valid
function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL_MS;
}

// B4: Get from cache if available
function getFromCache(query: string): SearchResult[] | null {
  const key = normalizeQuery(query);
  const entry = knowledgeCache.get(key);

  if (entry && isCacheValid(entry)) {
    return entry.results;
  }

  // Clean up expired entry
  if (entry) {
    knowledgeCache.delete(key);
  }

  return null;
}

// B4: Add to cache with LRU eviction
function addToCache(query: string, results: SearchResult[]): void {
  const key = normalizeQuery(query);

  // Evict oldest entries if cache is full
  if (knowledgeCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = knowledgeCache.keys().next().value;
    if (oldestKey) {
      knowledgeCache.delete(oldestKey);
    }
  }

  knowledgeCache.set(key, {
    results,
    timestamp: Date.now(),
    query: key
  });
}

// B4: Clear cache (useful for refresh)
export function clearKnowledgeCache(): void {
  knowledgeCache.clear();
}

// D4: Connection state and retry logic
interface ConnectionState {
  isConnected: boolean;
  lastAttempt: number;
  failureCount: number;
  lastError: string | null;
}

const connectionState: ConnectionState = {
  isConnected: false,
  lastAttempt: 0,
  failureCount: 0,
  lastError: null
};

// D4: Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2
};

// D4: Calculate backoff delay with jitter
function calculateBackoff(attempt: number): number {
  const delay = Math.min(
    RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt),
    RETRY_CONFIG.maxDelayMs
  );
  // Add 0-20% jitter
  const jitter = delay * 0.2 * Math.random();
  return Math.round(delay + jitter);
}

// D4: Retry wrapper for fetch operations
async function fetchWithRetry<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const result = await operation();
      // Reset failure count on success
      connectionState.failureCount = 0;
      connectionState.isConnected = true;
      connectionState.lastError = null;
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      connectionState.failureCount++;
      connectionState.lastError = lastError.message;
      connectionState.lastAttempt = Date.now();

      console.warn(`D4: ${operationName} attempt ${attempt + 1} failed:`, lastError.message);

      // Don't wait on last attempt
      if (attempt < RETRY_CONFIG.maxRetries - 1) {
        const backoff = calculateBackoff(attempt);
        console.log(`D4: Retrying in ${backoff}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
      }
    }
  }

  connectionState.isConnected = false;
  throw lastError || new Error(`${operationName} failed after ${RETRY_CONFIG.maxRetries} attempts`);
}

// D4: Get current connection status
export function getConnectionStatus(): ConnectionState {
  return { ...connectionState };
}

// D4: Reset connection state (useful for manual retry)
export function resetConnectionState(): void {
  connectionState.failureCount = 0;
  connectionState.lastError = null;
}

export async function searchKnowledge(query: string, topK: number = 5, useCache: boolean = true): Promise<SearchResult[]> {
  // B4: Check cache first
  if (useCache) {
    const cached = getFromCache(query);
    if (cached) {
      console.log('B4: Cache hit for query:', query.slice(0, 30));
      return cached;
    }
  }

  try {
    const response = await fetch(`${RAG_API_URL}/api/knowledge/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, top_k: topK }),
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }

    const data = await response.json();
    const results = data.results || [];

    // B4: Cache results
    if (results.length > 0) {
      addToCache(query, results);
    }

    return results;
  } catch (error) {
    console.error('Knowledge search error:', error);
    return [];
  }
}

export async function getAISuggestions(
  conversation: Array<{ role: string; content: string }>
): Promise<AIAssistData> {
  try {
    const response = await fetch(`${RAG_API_URL}/api/assist/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation }),
    });

    if (!response.ok) {
      throw new Error(`Suggestions failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      suggestions: data.suggestions || [],
      knowledgeCards: data.knowledge_cards || [],
      sentiment: data.sentiment || 'neutral',
      latencyMs: data.latency_ms || 0,
    };
  } catch (error) {
    console.error('AI suggestions error:', error);
    return {
      suggestions: ['I can help you with that. Could you provide more details?'],
      knowledgeCards: [],
      sentiment: 'neutral',
      latencyMs: 0,
    };
  }
}

export async function getKnowledgeStats(): Promise<KnowledgeStats | null> {
  try {
    const response = await fetch(`${RAG_API_URL}/api/knowledge/stats`);
    if (!response.ok) throw new Error('Stats fetch failed');
    return await response.json();
  } catch (error) {
    console.error('Stats error:', error);
    return null;
  }
}

export async function getDocuments(): Promise<DocumentInfo[]> {
  try {
    const response = await fetch(`${RAG_API_URL}/api/knowledge/documents`);
    if (!response.ok) throw new Error('Documents fetch failed');
    const data = await response.json();
    return data.documents || [];
  } catch (error) {
    console.error('Documents error:', error);
    return [];
  }
}

export async function loadSampleDocuments(): Promise<boolean> {
  try {
    const response = await fetch(`${RAG_API_URL}/api/knowledge/load-samples`, {
      method: 'POST',
    });
    return response.ok;
  } catch (error) {
    console.error('Load samples error:', error);
    return false;
  }
}

export async function checkRAGHealth(): Promise<boolean> {
  try {
    // D4: Use retry logic for health check
    const result = await fetchWithRetry(async () => {
      const response = await fetch(`${RAG_API_URL}/health`, {
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      const data = await response.json();
      if (data.healthy !== true) {
        throw new Error('Service unhealthy');
      }
      return true;
    }, 'RAG health check');
    return result;
  } catch (error) {
    console.error('D4: RAG health check failed after retries:', error);
    return false;
  }
}

// D4: Enhanced health check with auto-reconnect
let healthCheckInterval: NodeJS.Timeout | null = null;
let onConnectionChange: ((connected: boolean) => void) | null = null;

export function startHealthMonitor(
  callback: (connected: boolean) => void,
  intervalMs: number = 30000
): void {
  // Store callback for updates
  onConnectionChange = callback;

  // Clear any existing interval
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }

  // Initial check
  checkRAGHealth().then(callback);

  // Periodic checks
  healthCheckInterval = setInterval(async () => {
    const healthy = await checkRAGHealth();
    if (onConnectionChange) {
      onConnectionChange(healthy);
    }
  }, intervalMs);
}

export function stopHealthMonitor(): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
  onConnectionChange = null;
}

// Sentiment keyword categories with weights
const SENTIMENT_KEYWORDS = {
  strongNegative: {
    phrases: [
      'frustrated', 'frustrating', 'annoyed', 'angry', 'unacceptable',
      'terrible', 'awful', 'worst', 'ridiculous', 'useless',
      'waste of time', 'not happy', 'unhappy', 'disappointed',
      'this is ridiculous', 'doesn\'t make sense', 'makes no sense'
    ],
    weight: 3,
    sentiment: 'negative' as const
  },
  moderateNegative: {
    phrases: [
      'not working', 'doesn\'t work', 'won\'t work', 'stopped working',
      'broken', 'issue', 'problem', 'trouble', 'error', 'fail',
      'can\'t', 'cannot', 'unable', 'still not', 'still having',
      'already checked', 'already tried', 'already did', 'already done',
      'been trying', 'tried everything', 'nothing works',
      'not showing', 'not appearing', 'missing', 'disappeared'
    ],
    weight: 2,
    sentiment: 'negative' as const
  },
  escalation: {
    phrases: [
      'was working', 'used to work', 'worked last week', 'worked before',
      'anymore', 'suddenly', 'again', 'still'
    ],
    weight: 1,
    sentiment: 'negative' as const
  },
  positive: {
    phrases: [
      'thanks', 'thank you', 'appreciate', 'helpful', 'great',
      'perfect', 'awesome', 'excellent', 'wonderful', 'works',
      'fixed', 'solved', 'resolved', 'working now', 'that worked'
    ],
    weight: 2,
    sentiment: 'positive' as const
  }
};

// A3: Advanced nuance patterns for deeper sentiment analysis
const NUANCE_PATTERNS = {
  // Sarcasm indicators
  sarcasm: {
    patterns: [
      /great[\.\!\?]*\s+(another|more|just)/i,
      /thanks?\s+(for\s+nothing|a\s+lot)/i,
      /oh\s+(wonderful|great|perfect)/i,
      /sure[\.\,]\s+(that|it)\s+(will|helps?)/i,
      /how\s+(helpful|convenient)/i,
    ],
    weight: 2,
    sentiment: 'negative' as const,
    label: 'sarcasm detected'
  },
  // Passive aggression
  passiveAggression: {
    patterns: [
      /i\s+guess\s+(i\'ll|we\'ll|that)/i,
      /if\s+you\s+say\s+so/i,
      /whatever\s+(you|works)/i,
      /fine[\.\,]?\s+(i\'ll|just)/i,
      /never\s+mind/i,
    ],
    weight: 1.5,
    sentiment: 'negative' as const,
    label: 'passive tone'
  },
  // Urgency indicators
  urgency: {
    patterns: [
      /right\s+now/i,
      /immediately/i,
      /asap/i,
      /urgent(ly)?/i,
      /as\s+soon\s+as\s+possible/i,
      /can\'t\s+wait/i,
      /time\s+sensitive/i,
    ],
    weight: 1.5,
    sentiment: 'negative' as const,
    label: 'urgent request'
  },
  // Repeated attempts
  repeatedAttempts: {
    patterns: [
      /\b(again|another|multiple)\s+times?\b/i,
      /\b(third|fourth|fifth)\s+time\b/i,
      /\bhow\s+many\s+times\b/i,
      /\bkeep(s)?\s+(having|getting|seeing)\b/i,
      /\bover\s+and\s+over\b/i,
    ],
    weight: 2,
    sentiment: 'negative' as const,
    label: 'repeated issue'
  },
  // Business impact
  businessImpact: {
    patterns: [
      /losing\s+(money|customers|business)/i,
      /costing\s+(us|me)/i,
      /revenue/i,
      /customers?\s+(are|waiting|complaining)/i,
      /production\s+(down|issue|problem)/i,
      /business\s+(critical|impact)/i,
    ],
    weight: 2.5,
    sentiment: 'negative' as const,
    label: 'business impact'
  },
  // Loyalty mention
  loyalty: {
    patterns: [
      /\b(loyal|long[\-\s]?time)\s+(customer|user)/i,
      /\byears?\s+(with|using)\b/i,
      /\bpaying\s+customer\b/i,
      /\bpremium\s+(plan|subscription|account)\b/i,
    ],
    weight: 1,
    sentiment: 'negative' as const,
    label: 'loyalty expectation'
  },
  // Relief/gratitude
  relief: {
    patterns: [
      /finally[\!\.]*/i,
      /at\s+last/i,
      /that\'s\s+(exactly|just)\s+what/i,
      /you\'ve\s+been\s+(so\s+)?helpful/i,
      /life\s+saver/i,
    ],
    weight: 2,
    sentiment: 'positive' as const,
    label: 'relief expressed'
  }
};

// Intensity modifiers that amplify sentiment
const INTENSITY_MODIFIERS = {
  amplifiers: ['very', 'extremely', 'incredibly', 'absolutely', 'completely', 'totally', 'so', 'really'],
  diminishers: ['a bit', 'a little', 'somewhat', 'slightly', 'kind of', 'sort of'],
};

// Analyze punctuation and caps for emotional intensity
function analyzeTextStyle(message: string): { capsRatio: number; exclamationCount: number; questionCount: number } {
  const words = message.split(/\s+/);
  const capsWords = words.filter(w => w.length > 2 && w === w.toUpperCase() && /[A-Z]/.test(w));
  const capsRatio = words.length > 0 ? capsWords.length / words.length : 0;
  const exclamationCount = (message.match(/!/g) || []).length;
  const questionCount = (message.match(/\?/g) || []).length;

  return { capsRatio, exclamationCount, questionCount };
}

// Calculate sentiment trend from history
function calculateTrend(
  currentValue: 'positive' | 'neutral' | 'negative',
  history: SentimentHistoryEntry[]
): 'improving' | 'stable' | 'declining' {
  if (history.length < 2) return 'stable';

  // Convert sentiment to numeric for trend analysis
  const sentimentToNum = (s: string) => s === 'positive' ? 1 : s === 'neutral' ? 0 : -1;

  const currentNum = sentimentToNum(currentValue);
  const recentHistory = history.slice(-3); // Look at last 3 readings
  const avgRecent = recentHistory.reduce((sum, h) => sum + sentimentToNum(h.value), 0) / recentHistory.length;

  if (currentNum > avgRecent + 0.3) return 'improving';
  if (currentNum < avgRecent - 0.3) return 'declining';
  return 'stable';
}

// Generate escalation alert if needed
function checkEscalation(
  value: 'positive' | 'neutral' | 'negative',
  urgency: 'low' | 'medium' | 'high' | 'critical',
  trend: 'improving' | 'stable' | 'declining',
  indicators: string[]
): EscalationAlert | undefined {
  // Critical escalation
  if (urgency === 'critical') {
    return {
      type: 'critical',
      reason: `Customer shows high frustration (${indicators.slice(0, 2).join(', ')})`,
      suggestedAction: 'Consider immediate supervisor transfer or escalation',
      timestamp: new Date()
    };
  }

  // Warning: declining trend with negative sentiment
  if (value === 'negative' && trend === 'declining') {
    return {
      type: 'warning',
      reason: 'Customer sentiment is declining',
      suggestedAction: 'Proactively offer additional assistance or compensation',
      timestamp: new Date()
    };
  }

  // Warning: high urgency
  if (urgency === 'high') {
    return {
      type: 'warning',
      reason: 'Customer requires immediate attention',
      suggestedAction: 'Prioritize resolution or offer escalation',
      timestamp: new Date()
    };
  }

  return undefined;
}

// Enhanced sentiment detection with confidence, indicators, trend, and escalation
export function detectSentimentEnhanced(
  message: string,
  conversationHistory: string[] = [],
  sentimentHistory: SentimentHistoryEntry[] = [],
  messageIndex: number = 0
): SentimentData {
  const messageLower = message.toLowerCase();
  const allText = [messageLower, ...conversationHistory.map(m => m.toLowerCase())].join(' ');

  const detectedIndicators: string[] = [];
  let negativeScore = 0;
  let positiveScore = 0;

  // Check each category and collect indicators
  for (const [category, data] of Object.entries(SENTIMENT_KEYWORDS)) {
    for (const phrase of data.phrases) {
      if (messageLower.includes(phrase)) {
        detectedIndicators.push(phrase);
        if (data.sentiment === 'negative') {
          negativeScore += data.weight;
        } else {
          positiveScore += data.weight;
        }
      }
      // Also check history for context (with reduced weight)
      else if (conversationHistory.length > 0 && allText.includes(phrase) && category === 'strongNegative') {
        negativeScore += data.weight * 0.5;
      }
    }
  }

  // A3: Check nuance patterns (regex-based)
  for (const [, pattern] of Object.entries(NUANCE_PATTERNS)) {
    for (const regex of pattern.patterns) {
      if (regex.test(message)) {
        detectedIndicators.push(pattern.label);
        if (pattern.sentiment === 'negative') {
          negativeScore += pattern.weight;
        } else {
          positiveScore += pattern.weight;
        }
        break; // Only count each pattern category once
      }
    }
  }

  // A3: Check for intensity modifiers
  let intensityMultiplier = 1;
  for (const amplifier of INTENSITY_MODIFIERS.amplifiers) {
    if (messageLower.includes(amplifier + ' ')) {
      intensityMultiplier = Math.max(intensityMultiplier, 1.3);
    }
  }
  for (const diminisher of INTENSITY_MODIFIERS.diminishers) {
    if (messageLower.includes(diminisher)) {
      intensityMultiplier = Math.min(intensityMultiplier, 0.7);
    }
  }

  // A3: Analyze text style (caps, punctuation)
  const textStyle = analyzeTextStyle(message);
  if (textStyle.capsRatio > 0.3) {
    negativeScore += 1.5;
    detectedIndicators.push('raised voice');
  }
  if (textStyle.exclamationCount >= 3) {
    negativeScore += 1;
    detectedIndicators.push('emphasis');
  }
  if (textStyle.exclamationCount >= 2 && textStyle.questionCount >= 1) {
    negativeScore += 0.5; // Frustrated questioning
  }

  // Apply intensity multiplier
  negativeScore *= intensityMultiplier;
  positiveScore *= intensityMultiplier;

  // A4: Edge case handling
  const wordCount = message.split(/\s+/).filter(Boolean).length;
  const isShortMessage = wordCount <= 3;
  const isQuestionOnly = message.trim().endsWith('?') && !messageLower.includes('why') && negativeScore === 0;
  const isMixedSentiment = negativeScore > 0 && positiveScore > 0;

  // A4: Confidence calibration factors
  let confidenceMultiplier = 1;
  if (isShortMessage) confidenceMultiplier *= 0.7; // Less confident for short messages
  if (detectedIndicators.length === 0) confidenceMultiplier *= 0.6; // Less confident without indicators
  if (isMixedSentiment) confidenceMultiplier *= 0.8; // Less confident for mixed signals
  if (conversationHistory.length > 2) confidenceMultiplier *= 1.1; // More confident with context

  // Determine sentiment value
  let value: 'positive' | 'neutral' | 'negative' = 'neutral';
  let confidence = 50; // Base confidence for neutral

  // A4: Handle question-only messages as neutral with lower confidence
  if (isQuestionOnly && positiveScore === 0) {
    value = 'neutral';
    confidence = 45;
  } else if (negativeScore > positiveScore && negativeScore >= 2) {
    value = 'negative';
    confidence = Math.min(95, 60 + negativeScore * 8);
  } else if (positiveScore > negativeScore && positiveScore >= 2) {
    value = 'positive';
    confidence = Math.min(95, 60 + positiveScore * 8);
  } else if (negativeScore > 0) {
    value = 'negative';
    confidence = 55 + negativeScore * 5;
  } else if (positiveScore > 0) {
    value = 'positive';
    confidence = 55 + positiveScore * 5;
  }

  // A4: Apply confidence calibration
  confidence = Math.round(Math.max(30, Math.min(95, confidence * confidenceMultiplier)));

  // Determine urgency based on sentiment and indicators
  let urgency: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (value === 'negative') {
    if (negativeScore >= 6) urgency = 'critical';
    else if (negativeScore >= 4) urgency = 'high';
    else if (negativeScore >= 2) urgency = 'medium';
  }

  // A3: Boost urgency for business impact or loyalty mentions
  if (detectedIndicators.includes('business impact') && urgency !== 'critical') {
    urgency = urgency === 'low' ? 'medium' : urgency === 'medium' ? 'high' : 'critical';
  }
  if (detectedIndicators.includes('loyalty expectation') && urgency === 'low') {
    urgency = 'medium';
  }

  // Calculate trend from history
  const trend = calculateTrend(value, sentimentHistory);

  // Update history with current reading
  const newHistoryEntry: SentimentHistoryEntry = {
    value,
    confidence: Math.round(confidence),
    timestamp: new Date(),
    messageIndex
  };
  const updatedHistory = [...sentimentHistory, newHistoryEntry].slice(-5); // Keep last 5

  // Check for escalation alerts
  const escalationAlert = checkEscalation(value, urgency, trend, detectedIndicators);

  return {
    value,
    confidence: Math.round(confidence),
    urgency,
    trend,
    indicators: detectedIndicators.slice(0, 5),
    history: updatedHistory,
    escalationAlert
  };
}

// Simple sentiment detection (returns just the value for backward compatibility)
export function detectSentiment(message: string, conversationHistory: string[] = []): 'positive' | 'neutral' | 'negative' {
  return detectSentimentEnhanced(message, conversationHistory).value;
}

// Intent detection - identify what the customer is asking about
const INTENT_PATTERNS: Record<string, { keywords: string[]; label: string; priority: number }> = {
  troubleshoot: {
    keywords: ['not working', 'doesn\'t work', 'problem', 'issue', 'error', 'broken', 'help', 'trouble', 'fix'],
    label: 'Troubleshooting Issue',
    priority: 2
  },
  configure: {
    keywords: ['configure', 'setup', 'set up', 'enable', 'how do i', 'how to', 'create', 'add'],
    label: 'Configuration Help',
    priority: 1
  },
  information: {
    keywords: ['what is', 'what are', 'explain', 'tell me', 'how does', 'overview', 'about'],
    label: 'Information Request',
    priority: 0
  },
  escalation: {
    keywords: ['supervisor', 'manager', 'escalate', 'speak to', 'transfer', 'someone else'],
    label: 'Escalation Request',
    priority: 3
  },
  billing: {
    keywords: ['billing', 'invoice', 'payment', 'charge', 'cost', 'price', 'subscription'],
    label: 'Billing Inquiry',
    priority: 1
  },
  technical: {
    keywords: ['api', 'integration', 'code', 'developer', 'sdk', 'webhook', 'technical'],
    label: 'Technical Support',
    priority: 2
  }
};

// D3: Topic/product keywords for context tracking
const TOPIC_KEYWORDS: Record<string, string[]> = {
  'Agent Copilot': ['agent copilot', 'copilot', 'suggestions', 'ai assist', 'real-time suggestions'],
  'Routing': ['routing', 'skills', 'bullseye', 'queue', 'agent skills', 'skill-based'],
  'Quality Management': ['quality', 'evaluation', 'coaching', 'forms', 'speech analytics', 'qm'],
  'Workforce Management': ['workforce', 'wfm', 'scheduling', 'forecasting', 'adherence'],
  'Web Messaging': ['web messaging', 'messenger', 'chat', 'messaging widget'],
  'IVR': ['ivr', 'interactive voice', 'call flow', 'menu', 'voice menu'],
  'Analytics': ['analytics', 'reports', 'dashboard', 'metrics', 'kpi'],
  'Integrations': ['integration', 'api', 'salesforce', 'crm', 'data actions'],
};

// D3: Extract conversation topic from history
export function extractConversationTopic(conversationHistory: string[]): string | null {
  const allText = conversationHistory.join(' ').toLowerCase();

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    for (const keyword of keywords) {
      if (allText.includes(keyword)) {
        return topic;
      }
    }
  }
  return null;
}

// D3: Detect if customer is following up on previous topic
function isFollowUp(message: string): boolean {
  const followUpIndicators = [
    'that', 'it', 'this', 'those', 'where', 'which', 'also',
    'and what about', 'one more thing', 'another question',
    'following up', 'back to', 'regarding', 'about that'
  ];
  const msgLower = message.toLowerCase();
  return followUpIndicators.some(indicator => msgLower.includes(indicator));
}

// D3: Summarize conversation for context
export function summarizeConversation(conversationHistory: string[]): {
  topic: string | null;
  turnCount: number;
  issueResolved: boolean;
  keyMentions: string[];
} {
  const topic = extractConversationTopic(conversationHistory);
  const allText = conversationHistory.join(' ').toLowerCase();

  // Check for resolution indicators
  const resolutionKeywords = ['fixed', 'solved', 'working now', 'that worked', 'thank you'];
  const issueResolved = resolutionKeywords.some(kw => allText.includes(kw));

  // Extract key mentions
  const keyMentions: string[] = [];
  if (allText.includes('threshold')) keyMentions.push('threshold setting');
  if (allText.includes('queue')) keyMentions.push('queue configuration');
  if (allText.includes('knowledge base')) keyMentions.push('knowledge base');
  if (allText.includes('permission')) keyMentions.push('permissions');

  return {
    topic,
    turnCount: conversationHistory.length,
    issueResolved,
    keyMentions,
  };
}

export function detectIntent(message: string, conversationHistory: string[] = []): string {
  const messageLower = message.toLowerCase();

  // D3: Weight recent messages more heavily
  const recentHistory = conversationHistory.slice(-3).map(m => m.toLowerCase());
  const olderHistory = conversationHistory.slice(0, -3).map(m => m.toLowerCase());
  const fullContext = [
    messageLower,
    ...recentHistory,
    ...olderHistory.map(m => m.split(' ').slice(0, 20).join(' ')) // Truncate older messages
  ].join(' ');

  let bestMatch = 'General Inquiry';
  let highestScore = 0;

  // D3: Check if this is a follow-up - inherit previous intent with lower threshold
  const isFollowUpMsg = isFollowUp(message);

  for (const [key, pattern] of Object.entries(INTENT_PATTERNS)) {
    // Score based on current message (weight: 2x)
    let score = pattern.keywords.filter(kw => messageLower.includes(kw)).length * 2;
    // Score based on recent context (weight: 1x)
    score += pattern.keywords.filter(kw => recentHistory.some(m => m.includes(kw))).length;
    // Add priority bonus for high-priority intents
    score += (pattern.priority * 0.5);

    // D3: For follow-ups, give bonus to previously detected intents
    if (isFollowUpMsg && score > 0) {
      score += 1;
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = pattern.label;
    }
  }

  // D3: Append topic if detected for context
  const topic = extractConversationTopic([message, ...conversationHistory]);
  if (topic && bestMatch !== 'Escalation Request') {
    return `${bestMatch} - ${topic}`;
  }

  return bestMatch;
}

// Suggested quick actions based on context
export function getSuggestedActions(
  intent: string,
  sentiment: 'positive' | 'neutral' | 'negative',
  urgency: 'low' | 'medium' | 'high' | 'critical'
): string[] {
  const actions: string[] = [];

  // Always include based on urgency
  if (urgency === 'critical' || urgency === 'high') {
    actions.push('Escalate to Supervisor');
  }

  // Based on sentiment
  if (sentiment === 'negative') {
    actions.push('Offer Callback');
  }

  // Based on intent
  if (intent === 'Escalation Request') {
    actions.push('Transfer to Supervisor');
    actions.push('Create Priority Ticket');
  } else if (intent === 'Troubleshooting Issue') {
    actions.push('Create Support Ticket');
    actions.push('Schedule Follow-up');
  } else if (intent === 'Configuration Help') {
    actions.push('Share Knowledge Article');
    actions.push('Schedule Training');
  }

  // Default actions
  if (actions.length === 0) {
    actions.push('Send Follow-up Email');
  }

  return actions.slice(0, 3); // Max 3 actions
}

// B3: Format knowledge content with step-by-step extraction
export function formatKnowledgeSnippet(content: string): {
  summary: string;
  steps: string[];
  keyPoints: string[];
} {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  const steps: string[] = [];
  const keyPoints: string[] = [];

  // Extract numbered steps (1., 2., Step 1:, etc.)
  const stepPatterns = [
    /^(\d+)\.\s+(.+)/,
    /^step\s*(\d+)[:\-\s]+(.+)/i,
    /^-\s+(.+)/,
  ];

  // Extract key navigation paths (Admin > X > Y)
  const navPattern = /Admin\s*>\s*[^.]+/gi;

  for (const line of lines) {
    // Check for numbered steps
    for (const pattern of stepPatterns) {
      const match = line.match(pattern);
      if (match) {
        const stepText = match[2] || match[1];
        if (stepText && stepText.length > 10) {
          steps.push(stepText);
        }
        break;
      }
    }

    // Extract navigation paths as key points
    const navMatches = line.match(navPattern);
    if (navMatches) {
      for (const nav of navMatches) {
        if (!keyPoints.includes(nav)) {
          keyPoints.push(nav);
        }
      }
    }
  }

  // Create summary from first meaningful sentences
  let summary = '';
  for (const line of lines) {
    if (line.length > 30 && !line.match(/^\d+\./) && !line.match(/^step/i) && !line.match(/^-/)) {
      summary = line.slice(0, 200);
      break;
    }
  }

  if (!summary && lines.length > 0) {
    summary = lines.slice(0, 2).join(' ').slice(0, 200);
  }

  return {
    summary: summary + (summary.length >= 200 ? '...' : ''),
    steps: steps.slice(0, 5),
    keyPoints: keyPoints.slice(0, 3),
  };
}

// B3: Enhanced knowledge card with formatted content
export interface FormattedKnowledgeCard extends KnowledgeCard {
  steps?: string[];
  keyPoints?: string[];
  actionRequired?: boolean;
}

// B4: Deduplicate knowledge cards by title similarity
export function deduplicateKnowledgeCards(cards: KnowledgeCard[]): KnowledgeCard[] {
  const seen = new Set<string>();
  const deduplicated: KnowledgeCard[] = [];

  for (const card of cards) {
    // Create normalized key from title
    const normalizedTitle = card.title.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Check for exact or near duplicates
    let isDuplicate = false;
    for (const seenTitle of seen) {
      // Simple similarity: if >80% characters match, consider duplicate
      const similarity = calculateSimilarity(normalizedTitle, seenTitle);
      if (similarity > 0.8) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      seen.add(normalizedTitle);
      deduplicated.push(card);
    }
  }

  return deduplicated;
}

// B4: Simple string similarity (Jaccard-like)
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (str1.length === 0 || str2.length === 0) return 0;

  const set1 = new Set(str1.split(''));
  const set2 = new Set(str2.split(''));

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

// B4: Enhanced relevance scoring with multiple signals
export function enhanceRelevanceScore(
  card: KnowledgeCard,
  currentTopic: string | null,
  intent: string,
  messageKeywords: string[]
): number {
  let score = card.relevance;

  // Boost for topic match
  if (currentTopic && card.category.toLowerCase().includes(currentTopic.toLowerCase())) {
    score += 0.1;
  }

  // Boost for intent-category alignment
  const intentCategoryMap: Record<string, string[]> = {
    'Troubleshooting Issue': ['troubleshooting', 'issues', 'problems'],
    'Configuration Help': ['configuration', 'setup', 'admin'],
    'Information Request': ['overview', 'about', 'introduction'],
  };

  const relevantCategories = intentCategoryMap[intent.split(' - ')[0]] || [];
  if (relevantCategories.some(c => card.category.toLowerCase().includes(c))) {
    score += 0.08;
  }

  // Boost for keyword matches in title
  const titleLower = card.title.toLowerCase();
  const keywordMatches = messageKeywords.filter(kw => titleLower.includes(kw.toLowerCase()));
  score += keywordMatches.length * 0.05;

  // Cap at 0.99
  return Math.min(0.99, score);
}

// B4: Sort and filter knowledge cards
export function processKnowledgeCards(
  cards: KnowledgeCard[],
  currentTopic: string | null,
  intent: string,
  message: string
): KnowledgeCard[] {
  // Extract keywords from message
  const messageKeywords = message.split(/\s+/).filter(w => w.length > 3);

  // Enhance relevance scores
  const enhanced = cards.map(card => ({
    ...card,
    relevance: enhanceRelevanceScore(card, currentTopic, intent, messageKeywords)
  }));

  // Deduplicate
  const deduplicated = deduplicateKnowledgeCards(enhanced);

  // Sort by relevance and limit
  return deduplicated
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 4); // Max 4 cards
}

// Fallback suggestions when RAG backend is unavailable
export function getFallbackSuggestions(
  message: string,
  conversationHistory: string[] = [],
  sentimentHistory: SentimentHistoryEntry[] = [],
  messageIndex: number = 0
): AIAssistData {
  const messageLower = message.toLowerCase();
  const suggestions: string[] = [];
  const knowledgeCards: KnowledgeCard[] = [];

  // Use enhanced sentiment detection with history for trend calculation
  const sentimentData = detectSentimentEnhanced(message, conversationHistory, sentimentHistory, messageIndex);
  const sentiment = sentimentData.value;

  // Check what context was already provided
  const fullContext = [messageLower, ...conversationHistory.map(m => m.toLowerCase())].join(' ');
  const alreadyMentionedQueueSettings = fullContext.includes('queue settings') || fullContext.includes('enabled in the queue');
  const alreadyMentionedAgentCopilot = fullContext.includes('agent copilot');
  const customerMentionedCheckedSomething = messageLower.includes('already checked') || messageLower.includes('already tried');
  const isFollowUp = conversationHistory.length > 0;

  // Check if previous messages mentioned Agent Copilot issue keywords
  const previousMentionedIssue = conversationHistory.some(msg => {
    const msgLower = msg.toLowerCase();
    return msgLower.includes('not showing') || msgLower.includes('not appearing') ||
           msgLower.includes('suggestions') || msgLower.includes('not working') ||
           msgLower.includes('aren\'t appearing');
  });

  // Agent Copilot specific - suggestions not appearing
  // Trigger if current message mentions agent copilot OR we're in a follow-up about agent copilot
  const isAgentCopilotContext = messageLower.includes('agent copilot') ||
    (alreadyMentionedAgentCopilot && isFollowUp);

  const hasIssueKeywords = messageLower.includes('not showing') || messageLower.includes('not appearing') ||
      messageLower.includes('suggestions') || messageLower.includes('not working') ||
      previousMentionedIssue;

  if (isAgentCopilotContext && (hasIssueKeywords || customerMentionedCheckedSomething)) {
    // If they already mentioned queue settings or checked something, provide next steps
    if (alreadyMentionedQueueSettings || customerMentionedCheckedSomething) {
      // Check if customer is frustrated
      if (sentiment === 'negative' || messageLower.includes('frustrat')) {
        suggestions.push(
          "I completely understand your frustration - this is impacting your agents' ability to assist customers effectively.",
          "Since you've already verified the queue settings, let's move to the next troubleshooting step: Navigate to Admin > AI > Agent Copilot Settings and try lowering the NLU confidence threshold to 0.5.",
          "If that doesn't resolve it, we should also verify your knowledge base has sufficient indexed content at Admin > Knowledge > Knowledge Bases."
        );
      } else {
        suggestions.push(
          "I see you've already verified the queue settings - that's a good first step. Let me help you with the next troubleshooting steps.",
          "Since the queue is configured, let's check the NLU confidence threshold. Navigate to Admin > AI > Agent Copilot Settings and try lowering the threshold to 0.5 or 0.6.",
          "Also, please verify your knowledge base is properly connected and has indexed content by going to Admin > Knowledge > Knowledge Bases."
        );
      }
    } else {
      suggestions.push(
        "I understand the Agent Copilot suggestions aren't appearing. Let's troubleshoot this together.",
        "First, can you check Admin > Contact Center > Queues and verify Agent Copilot is enabled for your specific queue?",
        "If that's already enabled, we should check the NLU confidence threshold in Admin > AI > Agent Copilot Settings - try setting it to 0.6."
      );
    }

    knowledgeCards.push({
      title: 'Troubleshoot Agent Copilot Issues',
      summary: 'Common causes include: NLU confidence threshold too high, knowledge base not connected, queue settings misconfigured, or insufficient indexed content.',
      url: 'https://help.mypurecloud.com/articles/troubleshoot-agent-copilot/',
      category: 'Troubleshooting',
      relevance: 0.95,
    });

    knowledgeCards.push({
      title: 'Configure Queue Settings',
      summary: 'Ensure Agent Copilot is enabled: Navigate to Admin > Contact Center > Queues > Select Queue > Enable Agent Copilot.',
      url: 'https://help.mypurecloud.com/articles/queue-configuration-agent-copilot/',
      category: 'Agent Copilot',
      relevance: 0.90,
    });
  } else if (isAgentCopilotContext && (messageLower.includes('configure') || messageLower.includes('setup'))) {
      suggestions.push(
        "I can help you configure Agent Copilot. Let me walk you through the key steps.",
        "Step 1: Enable Agent Copilot in Admin > Organization Settings > Features",
        "Step 2: Connect a knowledge base in Admin > Knowledge > Knowledge Bases with your FAQ content."
      );
      knowledgeCards.push({
        title: 'Configure Agent Copilot',
        summary: 'Step-by-step guide to enable and configure Agent Copilot in Genesys Cloud including knowledge base setup.',
        url: 'https://help.mypurecloud.com/articles/configure-agent-copilot/',
        category: 'Agent Copilot',
        relevance: 0.92,
      });
  }

  // If customer mentioned they already checked/tried something
  if (customerMentionedCheckedSomething && suggestions.length === 0) {
    // Check if customer is frustrated
    if (sentiment === 'negative' || messageLower.includes('frustrat')) {
      suggestions.push(
        "I hear your frustration, and I appreciate the troubleshooting you've already done. Let me help escalate this investigation.",
        "Since you've already verified the basics, let's look at some less common causes that might be at play here.",
        "I want to make sure we resolve this quickly - would it help if I connected you with a specialist who can look deeper into this?"
      );
    } else {
      suggestions.push(
        "Thank you for the troubleshooting steps you've already taken. Let me suggest some additional areas to investigate.",
        "Since the basic configuration is verified, let's dig deeper into the specific settings."
      );
    }
  }

  // Routing questions
  if (messageLower.includes('routing') || messageLower.includes('skills') || messageLower.includes('bullseye')) {
    if (messageLower.includes('skills') || messageLower.includes('specialize') || messageLower.includes('expertise')) {
      suggestions.push(
        "Skills-based routing is perfect for matching customers with specialized agents. Let me explain how to set it up.",
        "First, create skills in Admin > Contact Center > Skills. Then assign them to agents with proficiency levels 1-5.",
        "Configure your queue to require specific skills: Admin > Contact Center > Queues > Skill Requirements."
      );
      knowledgeCards.push({
        title: 'Skills-Based Routing Configuration',
        summary: 'Match customers with the most qualified agents based on skills and proficiency levels.',
        url: 'https://help.mypurecloud.com/articles/skills-based-routing/',
        category: 'Routing',
        relevance: 0.95,
      });
    } else if (messageLower.includes('bullseye') || messageLower.includes('overflow') || messageLower.includes('fallback') || messageLower.includes('waiting')) {
      suggestions.push(
        "Bullseye routing is great for balancing skill matching with wait times.",
        "It works in rings: Ring 1 looks for best-matched agents, then expands to Ring 2 with relaxed requirements, and so on.",
        "Configure ring timings: typically 30 seconds per ring. Navigate to Admin > Contact Center > Queues > Bullseye Settings."
      );
      knowledgeCards.push({
        title: 'Bullseye Routing Explained',
        summary: 'Progressive skill relaxation to balance quality matching with service levels.',
        url: 'https://help.mypurecloud.com/articles/bullseye-routing/',
        category: 'Routing',
        relevance: 0.92,
      });
    } else {
      suggestions.push(
        "I can help with routing configuration. What specific routing behavior are you trying to achieve?",
        "Genesys Cloud offers Skills-Based, Priority, Bullseye, and Preferred Agent routing methods."
      );
    }
    knowledgeCards.push({
      title: 'About Genesys Cloud Routing',
      summary: 'Intelligently directs customer interactions to the most appropriate agent based on skills, availability, and business rules.',
      url: 'https://help.mypurecloud.com/articles/about-routing/',
      category: 'Routing',
      relevance: 0.88,
    });
  }

  // Quality Management questions
  if (messageLower.includes('quality') || messageLower.includes('evaluation') || messageLower.includes('coaching') ||
      messageLower.includes('speech analytics') || messageLower.includes('forms')) {
    if (messageLower.includes('evaluation') || messageLower.includes('forms')) {
      suggestions.push(
        "I can help you set up evaluation forms. Best practice is to keep forms focused with 20-30 questions.",
        "Create forms in Admin > Quality > Evaluation Forms. Group related questions and assign weights.",
        "You can mark critical questions as 'auto-fail' for compliance violations."
      );
      knowledgeCards.push({
        title: 'Creating Evaluation Forms',
        summary: 'Build evaluation forms with questions, weights, scoring thresholds, and auto-fail conditions.',
        url: 'https://help.mypurecloud.com/articles/create-evaluation-forms/',
        category: 'Quality Management',
        relevance: 0.95,
      });
    } else if (messageLower.includes('coaching') || messageLower.includes('improvement')) {
      suggestions.push(
        "Coaching connects evaluations with agent development for continuous improvement.",
        "Create coaching sessions in Performance > Coaching. Attach relevant evaluations and recordings.",
        "Set specific, measurable development goals and schedule follow-up sessions."
      );
      knowledgeCards.push({
        title: 'Coaching Sessions and Development',
        summary: 'Create closed-loop improvement processes connecting evaluations to agent coaching.',
        url: 'https://help.mypurecloud.com/articles/coaching-sessions/',
        category: 'Quality Management',
        relevance: 0.93,
      });
    } else if (messageLower.includes('speech') || messageLower.includes('analytics') || messageLower.includes('sentiment')) {
      suggestions.push(
        "Speech and Text Analytics can automatically analyze interactions for sentiment, topics, and compliance.",
        "Enable analytics in Admin > Quality > Analytics Settings. Then configure topics and keywords.",
        "Use analytics to automatically flag interactions for review based on sentiment or keyword detection."
      );
      knowledgeCards.push({
        title: 'Speech and Text Analytics',
        summary: 'AI-powered analysis for sentiment detection, topic identification, and compliance monitoring.',
        url: 'https://help.mypurecloud.com/articles/speech-text-analytics/',
        category: 'Quality Management',
        relevance: 0.94,
      });
    } else {
      suggestions.push(
        "Quality Management helps you evaluate and improve agent performance consistently.",
        "Key components include evaluation forms, calibration sessions, coaching, and speech analytics."
      );
    }
    knowledgeCards.push({
      title: 'Quality Management Best Practices',
      summary: 'Implement world-class QM with evaluation forms, calibration, coaching, and analytics.',
      url: 'https://help.mypurecloud.com/articles/qm-best-practices/',
      category: 'Quality Management',
      relevance: 0.85,
    });
  }

  // Escalation and urgent issues
  if (messageLower.includes('supervisor') || messageLower.includes('manager') || messageLower.includes('escalate') ||
      messageLower.includes('urgent') || messageLower.includes('unacceptable') || messageLower.includes('outage') ||
      messageLower.includes('down') || messageLower.includes('critical')) {
    suggestions.push(
      "I completely understand your frustration, and I want to help resolve this as quickly as possible.",
      "Let me escalate this to a supervisor who can provide immediate assistance. They'll have full context from our conversation.",
      "While I connect you with a supervisor, is there any additional information I should share with them?"
    );
    knowledgeCards.push({
      title: 'Escalation Best Practices',
      summary: 'Handle escalations effectively: acknowledge concerns, gather context, warm transfer with full history.',
      url: 'https://help.mypurecloud.com/articles/handle-escalations/',
      category: 'Best Practices',
      relevance: 0.90,
    });
    knowledgeCards.push({
      title: 'Transfer to Supervisor',
      summary: 'Use the Transfer button to connect customer with available supervisor. Include transfer notes.',
      url: 'https://help.mypurecloud.com/articles/transfer-interactions/',
      category: 'Agent Desktop',
      relevance: 0.88,
    });
  }

  // Default suggestions - but be contextual
  if (suggestions.length === 0) {
    if (messageLower.includes('hi') || messageLower.includes('hello')) {
      suggestions.push("Hello! Thank you for contacting Genesys support. How can I assist you today?");
    } else if (isFollowUp) {
      // This is a follow-up message, be more specific
      suggestions.push(
        "I understand. Let me look into this specific issue for you.",
        "Thank you for that additional context. Based on what you've described, here's what I recommend..."
      );
    } else {
      suggestions.push(
        "I'd be happy to help you with that. Could you tell me more about the specific issue you're experiencing?",
        "Let me look into this for you. Which Genesys Cloud feature is this related to?"
      );
    }
  }

  // Detect intent and get suggested actions
  const intent = detectIntent(message, conversationHistory);
  const suggestedActions = getSuggestedActions(intent, sentiment, sentimentData.urgency);

  // B4: Process knowledge cards with enhanced relevance and deduplication
  const topic = extractConversationTopic([message, ...conversationHistory]);
  const processedCards = processKnowledgeCards(knowledgeCards, topic, intent, message);

  return {
    suggestions: suggestions.slice(0, 3),
    knowledgeCards: processedCards,
    sentiment,
    sentimentData, // Enhanced sentiment with confidence, urgency, indicators
    latencyMs: 15, // Simulated fast response
    intent,
    suggestedActions,
  };
}

// =====================
// Sentiment Analysis API Functions
// =====================

/**
 * Analyze text sentiment using backend NLP providers (VADER or Transformer)
 */
export async function analyzeSentimentBackend(
  text: string,
  provider: SentimentProviderType = 'vader'
): Promise<SentimentAnalysisResult | null> {
  try {
    const response = await fetch(`${RAG_API_URL}/api/sentiment/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, provider }),
    });

    if (!response.ok) {
      throw new Error(`Sentiment analysis failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    return null;
  }
}

/**
 * Get historical sentiment data for a customer (mock data for demos)
 */
export async function getCustomerSentimentHistory(
  customerId: string,
  days: number = 90
): Promise<CustomerSentimentHistory | null> {
  try {
    const response = await fetch(
      `${RAG_API_URL}/api/sentiment/history/${encodeURIComponent(customerId)}?days=${days}`
    );

    if (!response.ok) {
      throw new Error(`History fetch failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Sentiment history error:', error);
    return null;
  }
}

/**
 * List available demo customers for sentiment history
 */
export async function listDemoCustomers(): Promise<DemoCustomer[]> {
  try {
    const response = await fetch(`${RAG_API_URL}/api/sentiment/customers`);

    if (!response.ok) {
      throw new Error(`Customers fetch failed: ${response.status}`);
    }

    const data = await response.json();
    return data.customers || [];
  } catch (error) {
    console.error('Demo customers error:', error);
    return [];
  }
}

/**
 * List available sentiment analysis providers
 */
export async function listSentimentProviders(): Promise<SentimentProviderInfo[]> {
  try {
    const response = await fetch(`${RAG_API_URL}/api/sentiment/providers`);

    if (!response.ok) {
      throw new Error(`Providers fetch failed: ${response.status}`);
    }

    const data = await response.json();
    return data.providers || [];
  } catch (error) {
    console.error('Sentiment providers error:', error);
    return [];
  }
}
