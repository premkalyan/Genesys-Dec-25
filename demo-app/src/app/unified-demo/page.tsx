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

interface PIIMatch {
  type: string;
  value: string;
  masked: string;
  start: number;
  end: number;
}

interface RoutingAnalysis {
  factors: RoutingFactor[];
  slmScore: number;
  llmScore: number;
  decision: 'SLM' | 'LLM';
  confidence: number;
  piiDetected: PIIMatch[];
  estimatedLatency: string;
  estimatedCost: string;
  queryText: string;
  scrubbedQuery?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  routing?: RoutingAnalysis;
  model?: 'SLM' | 'LLM';
  latency?: number;
  piiProtected?: boolean;
}

// PII Detection patterns with masking
const PII_PATTERNS = [
  { type: 'SSN', pattern: /\b(\d{3})[-.]?(\d{2})[-.]?(\d{4})\b/g, mask: (m: string) => '***-**-' + m.slice(-4).replace(/\D/g, '') },
  { type: 'Email', pattern: /\b([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[A-Z|a-z]{2,})\b/g, mask: () => '[EMAIL_REDACTED]' },
  { type: 'Phone', pattern: /\b(\+1[-.]?)?\(?(\d{3})\)?[-.]?(\d{3})[-.]?(\d{4})\b/g, mask: (m: string) => '(***) ***-' + m.slice(-4) },
  { type: 'Credit Card', pattern: /\b(\d{4})[-.\s]?(\d{4})[-.\s]?(\d{4})[-.\s]?(\d{4})\b/g, mask: (m: string) => '**** **** **** ' + m.slice(-4) },
  { type: 'Account Number', pattern: /\b(account|acct)[\s#:]*(\d{6,12})\b/gi, mask: (m: string) => 'Account #****' + m.slice(-4) },
  { type: 'Date of Birth', pattern: /\b(dob|birth|born)[\s:]*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/gi, mask: () => '[DOB_REDACTED]' },
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
  ],
  medium: [
    /how\s+(do|does|can|to)/i,
    /what\s+(is|are|does)/i,
    /list|enumerate|describe/i,
  ],
  simple: [
    /^(yes|no|what|when|where|who|how much|how many)\b/i,
    /fee|cost|price|rate/i,
    /hours?|time|schedule/i,
  ],
};

// Domain keywords
const DOMAIN_KEYWORDS = {
  banking: ['transfer', 'wire', 'account', 'balance', 'deposit', 'withdrawal', 'loan', 'mortgage', 'interest', 'credit', 'debit', 'fee', 'atm', 'branch', 'savings', 'checking', 'overdraft', 'statement'],
  general: ['help', 'support', 'question', 'information', 'know', 'tell'],
};

function detectAndMaskPII(text: string): { matches: PIIMatch[]; scrubbedText: string } {
  const matches: PIIMatch[] = [];
  let scrubbedText = text;

  for (const { type, pattern, mask } of PII_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      const masked = mask(match[0]);
      matches.push({
        type,
        value: match[0],
        masked,
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  // Sort by position (reverse) to replace from end to start
  matches.sort((a, b) => b.start - a.start);
  for (const m of matches) {
    scrubbedText = scrubbedText.slice(0, m.start) + m.masked + scrubbedText.slice(m.end);
  }

  // Re-sort by position for display
  matches.sort((a, b) => a.start - b.start);

  return { matches, scrubbedText };
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

  if (/if|when|suppose|assuming|given that/i.test(text)) {
    score += 15;
    reasons.push('Conditional/hypothetical scenario');
  }

  const level = score >= 70 ? 'complex' : score >= 45 ? 'medium' : 'simple';
  return { level, score: Math.min(score, 100), reasons };
}

function analyzeDomainSpecificity(text: string): { domain: string; score: number } {
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

  return { domain: bestDomain, score: Math.min(maxMatches * 25, 100) };
}

function performRoutingAnalysis(text: string, conversationLength: number): RoutingAnalysis {
  const { matches: piiDetected, scrubbedText } = detectAndMaskPII(text);
  const complexity = analyzeComplexity(text);
  const domain = analyzeDomainSpecificity(text);

  const factors: RoutingFactor[] = [];

  const hasPII = piiDetected.length > 0;
  factors.push({
    name: 'Data Privacy',
    score: hasPII ? 95 : 10,
    weight: 1.5,
    reasoning: hasPII
      ? `PII detected: ${piiDetected.map(p => p.type).join(', ')}. Will scrub before external processing.`
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
      : 'General query - either model suitable.',
    favors: domain.domain === 'banking' ? 'SLM' : 'neutral',
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

  factors.push({
    name: 'Cost Efficiency',
    score: 70,
    weight: 1.0,
    reasoning: conversationLength > 5
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
      ? `${conversationLength} messages in conversation.`
      : 'New or short conversation.',
    favors: conversationLength > 5 ? 'LLM' : 'neutral',
  });

  const ambiguous = /maybe|perhaps|not sure|possibly|might/i.test(text);
  factors.push({
    name: 'Query Clarity',
    score: ambiguous ? 40 : 85,
    weight: 0.9,
    reasoning: ambiguous ? 'Ambiguous query.' : 'Clear, well-formed query.',
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

  // Complex queries with PII should still go to LLM (with scrubbing)
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
    scrubbedQuery: hasPII ? scrubbedText : undefined,
  };
}

// Sample responses
const SAMPLE_RESPONSES: Record<string, string> = {
  'wire transfer': 'Wire transfer fees at our bank:\n\n• **Domestic wire (outgoing):** $25\n• **Domestic wire (incoming):** $15\n• **International wire (outgoing):** $45\n• **International wire (incoming):** $15\n\nPlatinum members receive 2 free domestic wires per month. Processing times: domestic wires complete same-day if submitted before 4 PM ET.\n\n📚 Source: Banking Fee Schedule 2024',

  'balance': 'For your security, I can help you check your account balance through these secure channels:\n\n1. **Mobile App** - Instant access with Face ID/fingerprint\n2. **Online Banking** - Log in at bank.example.com\n3. **Phone Banking** - Call 1-800-555-BANK (24/7)\n4. **ATM** - Use your debit card at any network ATM\n\nI\'m unable to display specific account details in this chat to protect your privacy.',

  'overdraft': 'Our overdraft protection options:\n\n• **Standard Overdraft:** $35 per occurrence, max 3 per day\n• **Overdraft Line of Credit:** 18.99% APR, no per-transaction fee\n• **Savings Link:** Free automatic transfers from linked savings\n\nTo enroll or change your overdraft settings, visit any branch or call 1-800-555-BANK.\n\n📚 Source: Overdraft Protection Policy',

  'loan': 'Current loan rates (as of today):\n\n• **Personal Loan:** 8.99% - 15.99% APR\n• **Auto Loan (new):** 5.49% - 7.99% APR\n• **Auto Loan (used):** 6.49% - 9.99% APR\n• **Home Equity:** 7.25% - 8.75% APR\n• **Mortgage (30-yr fixed):** Starting at 6.875% APR\n\nRates vary based on credit score, loan term, and down payment.\n\n📚 Source: Current Rate Sheet',

  'savings': 'Opening a savings account is easy! Here\'s how:\n\n**Online (5 minutes):**\n1. Visit bank.example.com/open-account\n2. Choose your savings account type\n3. Provide ID and personal information\n4. Fund with initial deposit ($25 minimum)\n\n**Account Types:**\n• **Basic Savings:** 0.50% APY, no monthly fee\n• **High-Yield Savings:** 4.25% APY, $500 minimum\n• **Money Market:** 4.50% APY, limited check-writing\n\n📚 Source: Deposit Account Guide',

  'pii_response': 'I\'ve securely processed your request. Based on your account information:\n\n✓ Your account is in **good standing**\n✓ No pending issues or holds\n✓ All recent transactions have been verified\n\nFor detailed account activity, please log into online banking or the mobile app where you can view:\n• Full transaction history\n• Statement downloads\n• Account alerts and notifications\n\n🔒 Your sensitive information was protected during this interaction.',

  'spending_analysis': 'Based on your account analysis:\n\n**Spending Breakdown (Last 30 Days):**\n• Housing & Utilities: 35%\n• Food & Dining: 22%\n• Transportation: 15%\n• Shopping: 12%\n• Entertainment: 8%\n• Other: 8%\n\n**Budget Recommendations:**\n• Your dining spending is above average - consider meal prep\n• Good job keeping entertainment costs low!\n• Suggested monthly savings target: $500\n\n📊 For interactive charts, visit the mobile app → Insights.',

  'mortgage_compare': '**Fixed vs. Variable Rate Mortgages for First-Time Buyers**\n\n**Fixed Rate (30-year at 6.875%):**\n✓ Predictable monthly payments\n✓ Protection from rate increases\n✓ Easier budgeting for first-time buyers\n✗ Higher initial rate than variable\n\n**Variable/ARM (5/1 at 5.75%):**\n✓ Lower initial payments\n✓ Good if you plan to move in 5-7 years\n✗ Payment uncertainty after fixed period\n✗ Risk of significant increases\n\n**Recommendation:** Most first-time buyers prefer fixed rates for stability.\n\n📚 Source: Mortgage Planning Guide',

  'retirement_strategies': '**Retirement Savings Strategies & Tax Implications**\n\n**Tax-Advantaged Accounts:**\n• **401(k):** $23,000 limit, pre-tax contributions\n• **Roth IRA:** $7,000 limit, tax-free withdrawals\n• **HSA:** $4,150 limit, triple tax advantage\n\n**Strategy Recommendations:**\n1. Maximize employer 401(k) match first\n2. Consider Roth if you expect higher taxes later\n3. Diversify tax treatment for flexibility\n\n📚 Based on 2024 IRS guidelines',
};

function generateResponse(text: string, model: 'SLM' | 'LLM', hasPII: boolean): string {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('wire transfer') || lowerText.includes('wire fee')) {
    return SAMPLE_RESPONSES['wire transfer'];
  }
  if (lowerText.includes('savings account') || lowerText.includes('open a savings')) {
    return SAMPLE_RESPONSES['savings'];
  }
  if (lowerText.includes('overdraft')) {
    return SAMPLE_RESPONSES['overdraft'];
  }
  if (lowerText.includes('loan') || lowerText.includes('interest rate')) {
    return SAMPLE_RESPONSES['loan'];
  }
  if (lowerText.includes('mortgage') || (lowerText.includes('fixed') && lowerText.includes('variable'))) {
    return SAMPLE_RESPONSES['mortgage_compare'];
  }
  if (lowerText.includes('retirement') || lowerText.includes('401k') || lowerText.includes('ira')) {
    return SAMPLE_RESPONSES['retirement_strategies'];
  }
  if (lowerText.includes('spending') || lowerText.includes('budget') || lowerText.includes('analyze')) {
    return SAMPLE_RESPONSES['spending_analysis'];
  }

  // If PII was detected and processed
  if (hasPII) {
    if (lowerText.includes('balance') || lowerText.includes('account') || lowerText.includes('status')) {
      return SAMPLE_RESPONSES['pii_response'];
    }
    return SAMPLE_RESPONSES['pii_response'];
  }

  if (lowerText.includes('balance')) {
    return SAMPLE_RESPONSES['balance'];
  }

  // Default responses
  if (model === 'SLM') {
    return 'Thank you for your question! Based on our banking policies:\n\nFor the most accurate information, I recommend:\n• Checking our FAQ at bank.example.com/help\n• Calling our support line at 1-800-555-BANK\n• Visiting your nearest branch\n\nIs there a specific banking topic I can help you with?';
  }
  return 'I\'ve analyzed your question comprehensively.\n\nThis topic may depend on your specific situation. For personalized guidance:\n• Schedule a consultation with our specialists\n• Review detailed information at bank.example.com\n\nWould you like more details on any specific aspect?';
}

// Sample queries
const SAMPLE_QUERIES = [
  { query: 'What are the wire transfer fees?', hint: 'Simple → SLM' },
  { query: 'What is the overdraft policy?', hint: 'Policy → SLM' },
  { query: 'How do I open a savings account?', hint: 'Simple → SLM' },
  { query: 'My SSN is 123-45-6789, what is my account status?', hint: 'PII → Scrub + Process' },
  { query: 'Check balance for account #12345678', hint: 'PII → Scrub + Process' },
  { query: 'Compare fixed vs variable rate mortgages for a first-time buyer', hint: 'Complex → LLM' },
  { query: 'Analyze retirement savings strategies considering tax implications', hint: 'Complex → LLM' },
  { query: 'My account #98765432 - analyze my spending and suggest a budget', hint: 'Complex + PII → Scrub + LLM' },
];

export default function UnifiedDemoPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [lastAnalysis, setLastAnalysis] = useState<RoutingAnalysis | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    // Step 1: Analyze query
    setProcessingStep('Analyzing query...');
    await new Promise(resolve => setTimeout(resolve, 500));

    const analysis = performRoutingAnalysis(userMessage.content, messages.length);
    setLastAnalysis(analysis);

    // Step 2: Routing decision
    setProcessingStep(`Routing to ${analysis.decision}...`);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 3: If PII detected and going to LLM, show scrubbing
    if (analysis.piiDetected.length > 0 && analysis.decision === 'LLM') {
      setProcessingStep('Scrubbing PII data...');
      await new Promise(resolve => setTimeout(resolve, 800));
      setProcessingStep('Sending scrubbed query to LLM...');
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    // Step 4: Get response
    setProcessingStep('Generating response...');
    const responseDelay = analysis.decision === 'SLM' ? 100 : 1000;
    await new Promise(resolve => setTimeout(resolve, responseDelay));

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: generateResponse(userMessage.content, analysis.decision, analysis.piiDetected.length > 0),
      timestamp: new Date(),
      routing: analysis,
      model: analysis.decision,
      latency: responseDelay,
      piiProtected: analysis.piiDetected.length > 0,
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsProcessing(false);
    setProcessingStep('');
  };

  const slmCount = messages.filter(m => m.model === 'SLM').length;
  const llmCount = messages.filter(m => m.model === 'LLM').length;
  const piiProtectedCount = messages.filter(m => m.piiProtected).length;

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
                  <span className="px-2 py-0.5 text-xs rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-purple-300 border border-purple-500/30">
                    Unified Demo
                  </span>
                </h1>
                <p className="text-sm text-slate-400">Smart routing + PII protection in one flow</p>
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
                  {piiProtectedCount > 0 && (
                    <div className="flex items-center gap-1.5 text-yellow-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span>{piiProtectedCount} Protected</span>
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
              {/* Chat Header */}
              <div className="px-4 py-3 bg-slate-700/30 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                    <span className="text-white font-bold">B</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white">Bounteous Enterprise AI</h3>
                    <p className="text-xs text-slate-400">Intelligent routing • PII protection • Dual-model architecture</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center">
                      <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">Unified Enterprise AI Demo</h3>
                    <p className="text-slate-400 text-sm max-w-md mx-auto mb-4">
                      Experience intelligent query routing with automatic PII protection.
                      Every query is analyzed, routed optimally, and sensitive data is scrubbed before external processing.
                    </p>
                  </div>
                )}

                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%]`}>
                      <div className={`rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700/50 text-slate-100'
                      }`}>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                      {message.routing && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                          <span className={`px-2 py-0.5 rounded ${
                            message.model === 'SLM'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-orange-500/20 text-orange-400'
                          }`}>
                            {message.model}
                          </span>
                          <span className="text-slate-500">{message.latency}ms</span>
                          <span className="text-slate-500">{message.routing.estimatedCost}</span>
                          {message.piiProtected && (
                            <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                              PII Scrubbed
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isProcessing && (
                  <div className="flex justify-start">
                    <div className="bg-slate-700/50 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2 text-slate-400">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-sm">{processingStep}</span>
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
                    placeholder="Ask about banking, include PII to see protection..."
                    className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500/50"
                    disabled={isProcessing}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isProcessing}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-xl font-medium hover:from-purple-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
                  {SAMPLE_QUERIES.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(item.query)}
                      className="w-full text-left px-3 py-2 text-sm rounded-lg bg-slate-700/30 text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
                    >
                      {item.query}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Analysis */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
                <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-purple-400 animate-pulse' : lastAnalysis ? 'bg-green-400' : 'bg-slate-600'}`} />
                  Processing Pipeline
                </h3>

                {lastAnalysis ? (
                  <div className="space-y-3">
                    {/* Routing Decision */}
                    <div className={`p-3 rounded-lg ${
                      lastAnalysis.decision === 'SLM'
                        ? 'bg-green-500/10 border border-green-500/30'
                        : 'bg-orange-500/10 border border-orange-500/30'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-white">Routed to</span>
                        <span className={`text-lg font-bold ${
                          lastAnalysis.decision === 'SLM' ? 'text-green-400' : 'text-orange-400'
                        }`}>
                          {lastAnalysis.decision}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        {lastAnalysis.decision === 'SLM'
                          ? 'Fast, domain-tuned response'
                          : 'Advanced reasoning required'}
                      </div>
                    </div>

                    {/* PII Detection */}
                    {lastAnalysis.piiDetected.length > 0 && (
                      <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                        <div className="flex items-center gap-2 text-yellow-400 text-sm font-medium mb-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          PII Detected & Scrubbed
                        </div>
                        <div className="space-y-2">
                          {lastAnalysis.piiDetected.map((pii, i) => (
                            <div key={i} className="text-xs">
                              <div className="flex items-center justify-between">
                                <span className="text-yellow-300/70">{pii.type}</span>
                              </div>
                              <div className="font-mono mt-1 p-2 rounded bg-slate-800/50">
                                <div className="text-red-400 line-through">{pii.value}</div>
                                <div className="text-green-400">→ {pii.masked}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {lastAnalysis.scrubbedQuery && (
                          <div className="mt-3 pt-3 border-t border-yellow-500/20">
                            <div className="text-xs text-yellow-300/70 mb-1">Sent to {lastAnalysis.decision}:</div>
                            <div className="text-xs text-slate-300 font-mono p-2 rounded bg-slate-800/50">
                              "{lastAnalysis.scrubbedQuery}"
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Top Factors */}
                    <div className="space-y-2">
                      <div className="text-xs text-slate-500 font-medium">Key Factors:</div>
                      {lastAnalysis.factors.slice(0, 4).map((factor, i) => (
                        <div key={i} className="flex items-center justify-between text-xs p-2 rounded bg-slate-700/30">
                          <span className="text-slate-300">{factor.name}</span>
                          <span className={`px-1.5 py-0.5 rounded ${
                            factor.favors === 'SLM'
                              ? 'bg-green-500/20 text-green-400'
                              : factor.favors === 'LLM'
                              ? 'bg-orange-500/20 text-orange-400'
                              : 'bg-slate-600/50 text-slate-400'
                          }`}>
                            {factor.favors === 'neutral' ? '—' : factor.favors}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Score Bar */}
                    <div className="pt-2 border-t border-slate-700/50">
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>SLM: {lastAnalysis.slmScore}</span>
                        <span>LLM: {lastAnalysis.llmScore}</span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden flex">
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
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-500 text-sm">
                    <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <p>Send a message to see<br />the processing pipeline</p>
                  </div>
                )}
              </div>

              {/* How It Works */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
                <h3 className="text-sm font-medium text-slate-300 mb-3">How It Works</h3>
                <div className="space-y-2 text-xs text-slate-400">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0 text-[10px]">1</span>
                    <span>Query analyzed for complexity, domain, and PII</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0 text-[10px]">2</span>
                    <span>Routing decision: SLM for simple, LLM for complex</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center flex-shrink-0 text-[10px]">3</span>
                    <span>If PII + LLM → scrub sensitive data first</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center flex-shrink-0 text-[10px]">4</span>
                    <span>Response generated with privacy preserved</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
