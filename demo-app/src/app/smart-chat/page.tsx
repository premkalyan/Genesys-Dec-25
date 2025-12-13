'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface RoutingFactor {
  name: string;
  score: number;
  weight: number;
  reasoning: string;
  favors: 'SLM' | 'LLM' | 'neutral';
}

interface RoutingAnalysis {
  factors: RoutingFactor[];
  slmScore: number;
  llmScore: number;
  decision: 'SLM' | 'LLM';
  confidence: number;
  piiDetected: string[];
  estimatedLatency: string;
  estimatedCost: string;
  queryText: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  routing?: RoutingAnalysis;
  model?: 'SLM' | 'LLM';
  latency?: number;
}

// PII Detection patterns
const PII_PATTERNS = [
  { type: 'SSN', pattern: /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g },
  { type: 'Email', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g },
  { type: 'Phone', pattern: /\b(\+1[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}\b/g },
  { type: 'Credit Card', pattern: /\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/g },
  { type: 'Account Number', pattern: /\b(account|acct)[\s#:]*\d{6,12}\b/gi },
  { type: 'Date of Birth', pattern: /\b(dob|birth|born)[\s:]*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/gi },
  { type: 'Address', pattern: /\b\d{1,5}\s+\w+\s+(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln)\b/gi },
];

// Complexity indicators
const COMPLEXITY_INDICATORS = {
  high: [
    /compare|contrast|analyze|evaluate|assess/i,
    /trade-?off|pros?\s+and\s+cons?|advantages?\s+and\s+disadvantages?/i,
    /recommend|suggest|advise|should\s+i/i,
    /explain\s+(why|how|the\s+difference)/i,
    /what\s+if|hypothetical|scenario/i,
    /optimize|improve|enhance|best\s+(way|approach|practice)/i,
    /multiple|several|various|different\s+options/i,
    /step[\s-]?by[\s-]?step|detailed|comprehensive/i,
    /strategy|planning|roadmap/i,
    /integration|architecture|design/i,
  ],
  medium: [
    /how\s+(do|does|can|to)/i,
    /what\s+(is|are|does)/i,
    /when\s+(should|do|does)/i,
    /where\s+(is|are|can)/i,
    /which\s+(one|is|are)/i,
    /list|enumerate|describe/i,
  ],
  simple: [
    /^(yes|no|what|when|where|who|how much|how many)\b/i,
    /fee|cost|price|rate/i,
    /hours?|time|schedule/i,
    /location|address|phone/i,
    /policy|limit|requirement/i,
  ],
};

// Domain keywords for specificity
const DOMAIN_KEYWORDS = {
  banking: ['transfer', 'wire', 'account', 'balance', 'deposit', 'withdrawal', 'loan', 'mortgage', 'interest', 'credit', 'debit', 'fee', 'atm', 'branch', 'savings', 'checking', 'overdraft', 'statement'],
  technical: ['api', 'integration', 'configuration', 'setup', 'troubleshoot', 'error', 'bug', 'code', 'system', 'server'],
  compliance: ['regulation', 'compliance', 'gdpr', 'hipaa', 'pci', 'audit', 'policy', 'legal', 'requirement'],
  general: ['help', 'support', 'question', 'information', 'know', 'tell'],
};

function detectPII(text: string): string[] {
  const detected: string[] = [];
  for (const { type, pattern } of PII_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      detected.push(`${type} (${matches.length})`);
    }
  }
  return detected;
}

function analyzeComplexity(text: string): { level: 'simple' | 'medium' | 'complex'; score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 30;

  for (const pattern of COMPLEXITY_INDICATORS.high) {
    if (pattern.test(text)) {
      score += 25;
      reasons.push('Analytical/comparative query');
      break;
    }
  }

  for (const pattern of COMPLEXITY_INDICATORS.medium) {
    if (pattern.test(text)) {
      score += 10;
      reasons.push('Explanatory query');
      break;
    }
  }

  const wordCount = text.split(/\s+/).length;
  if (wordCount > 30) {
    score += 20;
    reasons.push('Long query (detailed context)');
  } else if (wordCount > 15) {
    score += 10;
    reasons.push('Moderate length query');
  }

  const questionMarks = (text.match(/\?/g) || []).length;
  if (questionMarks > 1) {
    score += 15;
    reasons.push('Multiple questions');
  }

  if (/if|when|suppose|assuming|given that/i.test(text)) {
    score += 15;
    reasons.push('Conditional/hypothetical scenario');
  }

  const level = score >= 70 ? 'complex' : score >= 45 ? 'medium' : 'simple';
  return { level, score: Math.min(score, 100), reasons };
}

function analyzeDomainSpecificity(text: string): { domain: string; score: number; reasons: string[] } {
  const reasons: string[] = [];
  let bestDomain = 'general';
  let maxMatches = 0;
  const lowerText = text.toLowerCase();

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    const matches = keywords.filter(kw => lowerText.includes(kw)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      bestDomain = domain;
    }
  }

  const score = Math.min(maxMatches * 25, 100);
  if (maxMatches > 0) {
    reasons.push(`${maxMatches} ${bestDomain} domain keyword(s) detected`);
  }

  return { domain: bestDomain, score, reasons };
}

function performRoutingAnalysis(text: string, conversationLength: number): RoutingAnalysis {
  const piiDetected = detectPII(text);
  const complexity = analyzeComplexity(text);
  const domain = analyzeDomainSpecificity(text);

  const factors: RoutingFactor[] = [];

  const hasPII = piiDetected.length > 0;
  factors.push({
    name: 'Data Privacy',
    score: hasPII ? 95 : 10,
    weight: 1.5,
    reasoning: hasPII
      ? `PII detected: ${piiDetected.join(', ')}. Local processing preferred.`
      : 'No sensitive data detected.',
    favors: hasPII ? 'SLM' : 'neutral',
  });

  factors.push({
    name: 'Query Complexity',
    score: complexity.score,
    weight: 1.3,
    reasoning: complexity.reasons.join('. ') || 'Standard query complexity.',
    favors: complexity.level === 'complex' ? 'LLM' : complexity.level === 'simple' ? 'SLM' : 'neutral',
  });

  factors.push({
    name: 'Domain Match',
    score: domain.score,
    weight: 1.2,
    reasoning: domain.domain === 'banking'
      ? 'Banking domain - SLM fine-tuned for this.'
      : domain.domain === 'general'
      ? 'General query - either model suitable.'
      : `${domain.domain} domain detected.`,
    favors: domain.domain === 'banking' ? 'SLM' : domain.domain === 'general' ? 'neutral' : 'LLM',
  });

  const needsFastResponse = /urgent|asap|quick|immediately|right now/i.test(text);
  factors.push({
    name: 'Response Time',
    score: needsFastResponse ? 90 : 40,
    weight: 1.1,
    reasoning: needsFastResponse
      ? 'Urgency detected - fast response required.'
      : 'Standard response time acceptable.',
    favors: needsFastResponse ? 'SLM' : 'neutral',
  });

  const isHighVolume = conversationLength > 5;
  factors.push({
    name: 'Cost Efficiency',
    score: 70,
    weight: 1.0,
    reasoning: isHighVolume
      ? 'Extended conversation - cost optimization important.'
      : 'Cost factor within normal parameters.',
    favors: 'SLM',
  });

  const needsReasoning = /why|explain|reasoning|logic|because|understand/i.test(text);
  factors.push({
    name: 'Reasoning Depth',
    score: needsReasoning ? 80 : 30,
    weight: 1.2,
    reasoning: needsReasoning
      ? 'Deep reasoning/explanation requested.'
      : 'Direct answer sufficient.',
    favors: needsReasoning && complexity.level === 'complex' ? 'LLM' : 'SLM',
  });

  factors.push({
    name: 'Context Window',
    score: conversationLength > 3 ? 60 : 20,
    weight: 0.8,
    reasoning: conversationLength > 3
      ? `${conversationLength} messages in conversation - context tracking active.`
      : 'New or short conversation.',
    favors: conversationLength > 5 ? 'LLM' : 'neutral',
  });

  const ambiguous = /maybe|perhaps|not sure|possibly|might/i.test(text);
  factors.push({
    name: 'Query Clarity',
    score: ambiguous ? 40 : 85,
    weight: 0.9,
    reasoning: ambiguous
      ? 'Ambiguous query - may need clarification.'
      : 'Clear, well-formed query.',
    favors: ambiguous ? 'LLM' : 'SLM',
  });

  let slmScore = 0;
  let llmScore = 0;
  let totalWeight = 0;

  for (const factor of factors) {
    totalWeight += factor.weight;
    if (factor.favors === 'SLM') {
      slmScore += factor.score * factor.weight;
    } else if (factor.favors === 'LLM') {
      llmScore += factor.score * factor.weight;
    } else {
      slmScore += (factor.score * factor.weight) * 0.6;
      llmScore += (factor.score * factor.weight) * 0.4;
    }
  }

  slmScore = Math.round(slmScore / totalWeight);
  llmScore = Math.round(llmScore / totalWeight);

  const decision = slmScore >= llmScore ? 'SLM' : 'LLM';
  const confidence = Math.abs(slmScore - llmScore) + 50;

  const finalDecision = (hasPII && complexity.level === 'complex') ? 'LLM' : decision;

  return {
    factors,
    slmScore,
    llmScore,
    decision: finalDecision,
    confidence: Math.min(confidence, 98),
    piiDetected,
    estimatedLatency: finalDecision === 'SLM' ? '~90ms' : '~1.2s',
    estimatedCost: finalDecision === 'SLM' ? '$0.0001' : '$0.02',
    queryText: text,
  };
}

// Sample responses
const SAMPLE_RESPONSES: Record<string, string> = {
  'wire transfer': 'Wire transfer fees at our bank:\n\n• Domestic wire (outgoing): $25\n• Domestic wire (incoming): $15\n• International wire (outgoing): $45\n• International wire (incoming): $15\n\nPlatinum members receive 2 free domestic wires per month.\n\n📚 Source: Banking Fee Schedule 2024',
  'balance': 'I can help you check your account balance. For security, please:\n\n1. Log into our mobile app, or\n2. Visit any branch with valid ID, or\n3. Call our secure line at 1-800-XXX-XXXX\n\nI cannot access specific account information through this channel to protect your privacy.',
  'overdraft': 'Our overdraft protection options:\n\n• **Standard Overdraft**: $35 per occurrence, max 3/day\n• **Overdraft Line of Credit**: 18.99% APR, no per-transaction fee\n• **Savings Link**: Free transfers from linked savings\n\nTo enroll, visit any branch or call 1-800-XXX-XXXX.\n\n📚 Source: Overdraft Protection Policy',
  'loan': 'Current loan rates (as of today):\n\n• **Personal Loan**: 8.99% - 15.99% APR\n• **Auto Loan**: 5.49% - 9.99% APR\n• **Home Equity**: 7.25% - 8.75% APR\n• **Mortgage**: Starting at 6.875% APR\n\nRates vary based on credit score and term length.\n\n📚 Source: Current Rate Sheet',
  'compare': 'Let me provide a comprehensive analysis...\n\nWhen comparing these options, I consider multiple factors:\n\n**Cost Analysis:**\n• Upfront fees and ongoing costs\n• Hidden charges and penalties\n\n**Risk Assessment:**\n• Market volatility exposure\n• Liquidity constraints\n\n**Strategic Fit:**\n• Alignment with your goals\n• Timeline considerations\n\nThis type of complex analytical query benefits from advanced reasoning to weigh trade-offs specific to your situation.',
  'default_slm': 'Based on our banking policies, I can help you with that.\n\n',
  'default_llm': 'Let me provide a detailed analysis of your query.\n\n',
};

function generateResponse(text: string, model: 'SLM' | 'LLM'): string {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('wire transfer') || lowerText.includes('wire fee')) {
    return SAMPLE_RESPONSES['wire transfer'];
  }
  if (lowerText.includes('balance')) {
    return SAMPLE_RESPONSES['balance'];
  }
  if (lowerText.includes('overdraft')) {
    return SAMPLE_RESPONSES['overdraft'];
  }
  if (lowerText.includes('loan') || lowerText.includes('interest rate')) {
    return SAMPLE_RESPONSES['loan'];
  }
  if (lowerText.includes('compare') || lowerText.includes('analyze') || lowerText.includes('trade-off')) {
    return SAMPLE_RESPONSES['compare'];
  }

  return model === 'SLM'
    ? SAMPLE_RESPONSES['default_slm'] + 'This query was handled by our domain-tuned SLM for fast, accurate responses within our banking knowledge base.\n\n📚 Source: Banking Policy Documentation'
    : SAMPLE_RESPONSES['default_llm'] + 'This query required advanced reasoning capabilities, so it was routed to our LLM for comprehensive analysis while ensuring any sensitive data was protected.';
}

// Sample queries for the demo - routing decision revealed after selection
const SAMPLE_QUERIES = [
  'What are the wire transfer fees?',
  'What is the overdraft policy?',
  'What are current loan rates?',
  'How do I open a savings account?',
  'My SSN is 123-45-6789, what is my account status?',
  'Check balance for account #12345678',
  'Compare the trade-offs between fixed and variable rate mortgages for a first-time buyer',
  'Analyze different retirement savings strategies considering tax implications',
  'My account #12345678 - analyze my spending patterns and suggest a budget',
];

export default function SmartChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<RoutingAnalysis | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(true);
  const [totalCostSaved, setTotalCostSaved] = useState(0);
  const [avgLatency, setAvgLatency] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Calculate stats
  useEffect(() => {
    const assistantMessages = messages.filter(m => m.role === 'assistant' && m.routing);
    if (assistantMessages.length > 0) {
      const slmCount = assistantMessages.filter(m => m.model === 'SLM').length;
      // Cost saved = LLM cost - SLM cost for each SLM query
      const saved = slmCount * (0.02 - 0.0001);
      setTotalCostSaved(saved);

      const totalLatency = assistantMessages.reduce((sum, m) => sum + (m.latency || 0), 0);
      setAvgLatency(Math.round(totalLatency / assistantMessages.length));
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isAnalyzing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsAnalyzing(true);

    const analysis = performRoutingAnalysis(userMessage.content, messages.length);
    setLastAnalysis(analysis);

    await new Promise(resolve => setTimeout(resolve, 1500));

    const responseDelay = analysis.decision === 'SLM' ? 100 : 1200;
    await new Promise(resolve => setTimeout(resolve, responseDelay));

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: generateResponse(userMessage.content, analysis.decision),
      timestamp: new Date(),
      routing: analysis,
      model: analysis.decision,
      latency: responseDelay,
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsAnalyzing(false);
  };

  const handleStarterClick = (query: string) => {
    setInput(query);
  };

  const slmCount = messages.filter(m => m.model === 'SLM').length;
  const llmCount = messages.filter(m => m.model === 'LLM').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-white flex items-center gap-2">
                  Intelligent Banking Assistant
                  <span className="px-2 py-0.5 text-xs rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-300 border border-purple-500/30">
                    Auto-Routing
                  </span>
                </h1>
                <p className="text-sm text-slate-400">Banking policy assistant with intelligent SLM/LLM routing</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {messages.length > 0 && (
                <div className="hidden sm:flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-slate-400">SLM: {slmCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    <span className="text-slate-400">LLM: {llmCount}</span>
                  </div>
                  {totalCostSaved > 0 && (
                    <div className="text-green-400">
                      Saved: ${totalCostSaved.toFixed(4)}
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={() => setShowAnalysis(!showAnalysis)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  showAnalysis
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'bg-slate-700/50 text-slate-400 border border-slate-600/50'
                }`}
              >
                {showAnalysis ? 'Hide' : 'Show'} Analysis
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className={`grid gap-6 ${showAnalysis ? 'lg:grid-cols-3' : 'lg:grid-cols-1 max-w-3xl mx-auto'}`}>
          {/* Chat Panel */}
          <div className={showAnalysis ? 'lg:col-span-2' : ''}>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden flex flex-col h-[calc(100vh-200px)]">
              {/* Chat Context Banner */}
              <div className="px-4 py-3 bg-slate-700/30 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <span className="text-white font-bold">B</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white">Bounteous Banking Policy Assistant</h3>
                    <p className="text-xs text-slate-400">Ask about fees, policies, accounts, loans, and more</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                      <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">Intelligent Query Routing Demo</h3>
                    <p className="text-slate-400 text-sm max-w-md mx-auto mb-4">
                      This banking assistant automatically routes each query to the optimal AI model.
                      Watch the analysis panel to see 8 factors being evaluated in real-time.
                    </p>
                    <p className="text-xs text-slate-500">
                      Try the conversation starters on the right, or type your own question below
                    </p>
                  </div>
                )}

                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : ''}`}>
                      <div className={`rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700/50 text-slate-100'
                      }`}>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                      {message.routing && (
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                          <span className={`px-2 py-0.5 rounded ${
                            message.model === 'SLM'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-orange-500/20 text-orange-400'
                          }`}>
                            {message.model}
                          </span>
                          <span>{message.latency}ms</span>
                          <span>{message.routing.estimatedCost}</span>
                          {message.routing.piiDetected.length > 0 && (
                            <span className="text-yellow-400 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m8-11V5a2 2 0 00-2-2H8a2 2 0 00-2 2v2m10 0H6m10 0a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V9a2 2 0 012-2" />
                              </svg>
                              PII Protected
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isAnalyzing && (
                  <div className="flex justify-start">
                    <div className="bg-slate-700/50 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2 text-slate-400">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-sm">Analyzing & routing query...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSubmit} className="p-4 border-t border-slate-700/50">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about banking policies, fees, accounts..."
                    className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500/50"
                    disabled={isAnalyzing}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isAnalyzing}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Analysis Panel */}
          {showAnalysis && (
            <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-200px)]">
              {/* Sample Queries */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
                <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Try These Queries
                </h3>
                <div className="space-y-1.5">
                  {SAMPLE_QUERIES.map((query, i) => (
                    <button
                      key={i}
                      onClick={() => handleStarterClick(query)}
                      className="w-full text-left px-3 py-2.5 text-sm rounded-lg bg-slate-700/30 text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
                      title={query}
                    >
                      {query}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-3 text-center">
                  Click a query to see how routing is determined
                </p>
              </div>

              {/* Routing Analysis */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
                <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isAnalyzing ? 'bg-purple-400 animate-pulse' : lastAnalysis ? 'bg-green-400' : 'bg-slate-600'}`} />
                  Routing Analysis
                  {lastAnalysis && !isAnalyzing && (
                    <span className="text-xs text-slate-500 ml-auto">Last query</span>
                  )}
                </h3>

                {(lastAnalysis || isAnalyzing) ? (
                  <div className="space-y-3">
                    {/* Query being analyzed */}
                    {lastAnalysis && (
                      <div className="p-2 rounded-lg bg-slate-700/30 text-xs text-slate-400 italic truncate">
                        "{lastAnalysis.queryText}"
                      </div>
                    )}

                    {/* Decision */}
                    {lastAnalysis && (
                      <div className={`p-3 rounded-lg ${
                        lastAnalysis.decision === 'SLM'
                          ? 'bg-green-500/10 border border-green-500/30'
                          : 'bg-orange-500/10 border border-orange-500/30'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-white">Routing Decision</span>
                          <span className={`text-lg font-bold ${
                            lastAnalysis.decision === 'SLM' ? 'text-green-400' : 'text-orange-400'
                          }`}>
                            {lastAnalysis.decision}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>Confidence: {lastAnalysis.confidence}%</span>
                          <span>{lastAnalysis.estimatedLatency} · {lastAnalysis.estimatedCost}</span>
                        </div>
                      </div>
                    )}

                    {/* PII Alert */}
                    {lastAnalysis && lastAnalysis.piiDetected.length > 0 && (
                      <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                        <div className="flex items-center gap-2 text-yellow-400 text-sm font-medium mb-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          PII Detected
                        </div>
                        <p className="text-xs text-yellow-300/70">
                          {lastAnalysis.piiDetected.join(', ')}
                          {lastAnalysis.decision === 'LLM' && (
                            <span className="block mt-1 text-yellow-400">
                              → Will be scrubbed before external processing
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    {/* Factors */}
                    {lastAnalysis && (
                      <div className="space-y-2">
                        <div className="text-xs text-slate-500 font-medium">Factor Scores:</div>
                        {lastAnalysis.factors.map((factor, i) => (
                          <div key={i} className="p-2 rounded-lg bg-slate-700/30">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-slate-300">{factor.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">{factor.weight}x</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  factor.favors === 'SLM'
                                    ? 'bg-green-500/20 text-green-400'
                                    : factor.favors === 'LLM'
                                    ? 'bg-orange-500/20 text-orange-400'
                                    : 'bg-slate-600/50 text-slate-400'
                                }`}>
                                  {factor.favors === 'neutral' ? '—' : factor.favors}
                                </span>
                              </div>
                            </div>
                            <div className="h-1.5 bg-slate-600/50 rounded-full overflow-hidden mb-1">
                              <div
                                className={`h-full transition-all duration-500 ${
                                  factor.favors === 'SLM'
                                    ? 'bg-green-500'
                                    : factor.favors === 'LLM'
                                    ? 'bg-orange-500'
                                    : 'bg-slate-400'
                                }`}
                                style={{ width: `${factor.score}%` }}
                              />
                            </div>
                            <p className="text-xs text-slate-500 truncate" title={factor.reasoning}>
                              {factor.reasoning}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Score Summary */}
                    {lastAnalysis && (
                      <div className="pt-2 border-t border-slate-700/50">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded bg-green-500" />
                            <span className="text-slate-400">SLM Score</span>
                          </div>
                          <span className="text-white font-bold">{lastAnalysis.slmScore}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded bg-orange-500" />
                            <span className="text-slate-400">LLM Score</span>
                          </div>
                          <span className="text-white font-bold">{lastAnalysis.llmScore}</span>
                        </div>
                        {/* Visual comparison bar */}
                        <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden flex">
                          <div
                            className="bg-green-500 transition-all duration-500"
                            style={{ width: `${(lastAnalysis.slmScore / (lastAnalysis.slmScore + lastAnalysis.llmScore)) * 100}%` }}
                          />
                          <div
                            className="bg-orange-500 transition-all duration-500"
                            style={{ width: `${(lastAnalysis.llmScore / (lastAnalysis.slmScore + lastAnalysis.llmScore)) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-500 text-sm">
                    <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p>Send a message to see<br />routing analysis</p>
                  </div>
                )}
              </div>

              {/* Session Stats */}
              {messages.length > 0 && (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
                  <h3 className="text-sm font-medium text-slate-300 mb-3">Session Statistics</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <div className="text-2xl font-bold text-green-400">{slmCount}</div>
                      <div className="text-xs text-slate-400">SLM Queries</div>
                      <div className="text-xs text-green-400/70 mt-1">~90ms avg</div>
                    </div>
                    <div className="text-center p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                      <div className="text-2xl font-bold text-orange-400">{llmCount}</div>
                      <div className="text-xs text-slate-400">LLM Queries</div>
                      <div className="text-xs text-orange-400/70 mt-1">~1.2s avg</div>
                    </div>
                  </div>
                  {totalCostSaved > 0 && (
                    <div className="mt-3 p-3 bg-slate-700/30 rounded-lg text-center">
                      <div className="text-xs text-slate-400 mb-1">Cost Saved by SLM Routing</div>
                      <div className="text-lg font-bold text-green-400">${totalCostSaved.toFixed(4)}</div>
                      <div className="text-xs text-slate-500">vs all-LLM approach</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
