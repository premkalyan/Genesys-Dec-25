'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface PIIMatch {
  type: string;
  value: string;
  masked: string;
  identifier?: string; // The actual value to use for internal lookup
}

interface DataFetch {
  source: string;
  query: string;
  dataRetrieved: string;
  scrubbedData: string;
}

interface ProcessingPipeline {
  step: number;
  steps: {
    name: string;
    status: 'pending' | 'active' | 'complete';
    detail?: string;
  }[];
  piiDetected: PIIMatch[];
  identifiersExtracted: { type: string; value: string; usedFor: string }[];
  dataFetch?: DataFetch;
  routingDecision: 'SLM' | 'LLM' | null;
  scrubbedQuery?: string;
  queryToModel?: string; // Final query sent to model (may include scrubbed data)
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  pipeline?: ProcessingPipeline;
  model?: 'SLM' | 'LLM';
  latency?: number;
}

// PII Detection patterns
const PII_PATTERNS = [
  {
    type: 'SSN',
    pattern: /\b(\d{3})[-.]?(\d{2})[-.]?(\d{4})\b/g,
    mask: (m: string) => '***-**-' + m.slice(-4).replace(/\D/g, ''),
    extract: (m: string) => m.replace(/\D/g, '')
  },
  {
    type: 'Account Number',
    pattern: /(account|acct)[\s#:]*(\d{6,12})/gi,
    mask: () => 'Account #****',
    extract: (m: string) => m.replace(/\D/g, '')
  },
  {
    type: 'Email',
    pattern: /\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})\b/g,
    mask: () => '[EMAIL]',
    extract: (m: string) => m
  },
  {
    type: 'Phone',
    pattern: /\b(\+1[-.]?)?\(?(\d{3})\)?[-.]?(\d{3})[-.]?(\d{4})\b/g,
    mask: (m: string) => '(***) ***-' + m.slice(-4),
    extract: (m: string) => m.replace(/\D/g, '')
  },
];

// Mock internal data based on identifiers
const MOCK_INTERNAL_DATA: Record<string, { type: string; data: string; scrubbedData: string }> = {
  '123456789': {
    type: 'Customer Profile',
    data: 'Customer: John Smith, SSN: 123-45-6789, Account: 98765432, Balance: $15,234.50',
    scrubbedData: 'Customer: [NAME], SSN: ***-**-6789, Account: ****5432, Balance: $15,234.50'
  },
  '12345678': {
    type: 'Account Data',
    data: 'Account #12345678, Owner: Sarah Johnson, Spending: Dining $450, Shopping $1,200, Utilities $380, Transport $250',
    scrubbedData: 'Account #****5678, Owner: [NAME], Spending: Dining $450, Shopping $1,200, Utilities $380, Transport $250'
  },
  '98765432': {
    type: 'Account Data',
    data: 'Account #98765432, Owner: Mike Chen, Balance: $8,920.00, Recent: -$150 Amazon, -$45 Starbucks',
    scrubbedData: 'Account #****5432, Owner: [NAME], Balance: $8,920.00, Recent: -$150 Amazon, -$45 Starbucks'
  },
  '87654321': {
    type: 'Transaction History',
    data: 'Account #87654321, Owner: Emily Davis, Last 30 days: 45 transactions, Total spent: $3,450',
    scrubbedData: 'Account #****4321, Owner: [NAME], Last 30 days: 45 transactions, Total spent: $3,450'
  }
};

function detectPII(text: string): PIIMatch[] {
  const matches: PIIMatch[] = [];

  for (const { type, pattern, mask, extract } of PII_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        type,
        value: match[0],
        masked: mask(match[0]),
        identifier: extract(match[0])
      });
    }
  }

  return matches;
}

function scrubText(text: string, piiMatches: PIIMatch[]): string {
  let scrubbed = text;
  // Sort by position descending to replace from end
  const sorted = [...piiMatches].sort((a, b) => {
    const aIdx = text.indexOf(a.value);
    const bIdx = text.indexOf(b.value);
    return bIdx - aIdx;
  });

  for (const pii of sorted) {
    scrubbed = scrubbed.replace(pii.value, pii.masked);
  }
  return scrubbed;
}

function analyzeQueryIntent(text: string): { needsData: boolean; needsLLM: boolean; dataType: string } {
  const lowerText = text.toLowerCase();

  // Check if query needs data fetch
  const needsData = /balance|spending|transaction|history|account|status|analyze|pattern/i.test(lowerText);

  // Check if query needs LLM (complex analysis)
  const needsLLM = /analyze|compare|recommend|suggest|pattern|trend|strategy|explain why|trade-?off/i.test(lowerText);

  // Determine data type
  let dataType = 'Account Data';
  if (/spending|transaction/i.test(lowerText)) dataType = 'Transaction History';
  if (/balance/i.test(lowerText)) dataType = 'Account Balance';

  return { needsData, needsLLM, dataType };
}

// Sample responses
const RESPONSES: Record<string, string> = {
  'wire_fees': 'Wire transfer fees:\n\n• **Domestic outgoing:** $25\n• **Domestic incoming:** $15\n• **International outgoing:** $45\n• **International incoming:** $15\n\nPlatinum members get 2 free domestic wires/month.\n\n📚 Source: Fee Schedule 2024',

  'balance_simple': 'Your current account balance is **$15,234.50**\n\nLast transaction: -$45.00 (Starbucks, Dec 12)\n\n💡 Tip: Enable alerts for real-time balance notifications.',

  'spending_analysis': 'Based on your transaction data, here\'s your spending analysis:\n\n**Monthly Breakdown:**\n• Dining: $450 (18%)\n• Shopping: $1,200 (48%)\n• Utilities: $380 (15%)\n• Transport: $250 (10%)\n• Other: $220 (9%)\n\n**Insights:**\n• Shopping is your largest category - consider setting a budget\n• Dining spending is within healthy range\n• You could save ~$200/month by reducing discretionary shopping\n\n📊 Full analysis available in the mobile app.',

  'overdraft': 'Overdraft protection options:\n\n• **Standard:** $35 per occurrence, max 3/day\n• **Line of Credit:** 18.99% APR, no per-item fee\n• **Savings Link:** Free automatic transfers\n\nTo enroll: Visit any branch or call 1-800-555-BANK.\n\n📚 Source: Overdraft Policy',

  'loan_rates': 'Current loan rates:\n\n• **Personal:** 8.99% - 15.99% APR\n• **Auto (new):** 5.49% - 7.99% APR\n• **Home Equity:** 7.25% - 8.75% APR\n• **Mortgage:** Starting at 6.875% APR\n\nRates vary by credit score and term.\n\n📚 Source: Rate Sheet',

  'pii_protected': '🔒 Your request was processed securely.\n\nI\'ve retrieved your account information and the analysis is complete. Your sensitive data was protected throughout - identifiers were used only for internal lookup and scrubbed before any external processing.\n\n✓ Account verified\n✓ Data retrieved securely\n✓ PII scrubbed from analysis request',

  'default_slm': 'Thank you for your question! Based on our banking policies:\n\nFor specific account information, please:\n• Log into online banking\n• Call 1-800-555-BANK\n• Visit your nearest branch\n\nIs there something specific I can help with?',

  'default_llm': 'I\'ve analyzed your request comprehensively.\n\nThis topic may depend on your specific situation. For personalized guidance, I recommend scheduling a consultation with our specialists.\n\nWould you like more details on any aspect?'
};

function generateResponse(text: string, pipeline: ProcessingPipeline): string {
  const lowerText = text.toLowerCase();

  // Check for specific query types
  if (lowerText.includes('wire') && lowerText.includes('fee')) {
    return RESPONSES['wire_fees'];
  }
  if (lowerText.includes('overdraft')) {
    return RESPONSES['overdraft'];
  }
  if (lowerText.includes('loan') || lowerText.includes('rate')) {
    return RESPONSES['loan_rates'];
  }

  // If data was fetched and analyzed
  if (pipeline.dataFetch) {
    if (lowerText.includes('spending') || lowerText.includes('analyze')) {
      return RESPONSES['spending_analysis'];
    }
    if (lowerText.includes('balance')) {
      return RESPONSES['balance_simple'];
    }
    return RESPONSES['pii_protected'];
  }

  // Default responses
  return pipeline.routingDecision === 'SLM' ? RESPONSES['default_slm'] : RESPONSES['default_llm'];
}

// Sample queries with expected flows
const SAMPLE_QUERIES = [
  {
    query: 'What are the wire transfer fees?',
    description: 'Simple policy lookup → SLM',
    flow: 'direct'
  },
  {
    query: 'What is the overdraft policy?',
    description: 'Policy lookup → SLM',
    flow: 'direct'
  },
  {
    query: 'Check balance for account #12345678',
    description: 'Extract ID → Internal fetch → Response',
    flow: 'data-fetch'
  },
  {
    query: 'My account #98765432 - analyze my spending patterns',
    description: 'Extract ID → Fetch data → Scrub → LLM analysis',
    flow: 'full-pipeline'
  },
  {
    query: 'For SSN 123-45-6789, show account status',
    description: 'Extract SSN → Internal lookup → Scrubbed response',
    flow: 'data-fetch'
  },
  {
    query: 'Analyze spending for account #87654321 and suggest budget',
    description: 'Full flow: Extract → Fetch → Scrub → LLM → Response',
    flow: 'full-pipeline'
  }
];

export default function UnifiedDemoPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPipeline, setCurrentPipeline] = useState<ProcessingPipeline | null>(null);
  const [showPipeline, setShowPipeline] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const processQuery = async (text: string) => {
    setIsProcessing(true);

    // Initialize pipeline
    const pipeline: ProcessingPipeline = {
      step: 0,
      steps: [
        { name: 'Analyze Query', status: 'pending' },
        { name: 'Detect PII', status: 'pending' },
        { name: 'Route Decision', status: 'pending' },
        { name: 'Generate Response', status: 'pending' },
      ],
      piiDetected: [],
      identifiersExtracted: [],
      routingDecision: null,
    };

    setCurrentPipeline({ ...pipeline });

    // Step 1: Analyze Query
    pipeline.steps[0].status = 'active';
    setCurrentPipeline({ ...pipeline });
    await new Promise(r => setTimeout(r, 600));

    const intent = analyzeQueryIntent(text);
    pipeline.steps[0].status = 'complete';
    pipeline.steps[0].detail = intent.needsLLM ? 'Complex analysis needed' : 'Simple lookup';

    // Step 2: Detect PII
    pipeline.steps[1].status = 'active';
    setCurrentPipeline({ ...pipeline });
    await new Promise(r => setTimeout(r, 500));

    const piiMatches = detectPII(text);
    pipeline.piiDetected = piiMatches;

    if (piiMatches.length > 0) {
      pipeline.scrubbedQuery = scrubText(text, piiMatches);
      pipeline.identifiersExtracted = piiMatches.map(p => ({
        type: p.type,
        value: p.identifier || p.value,
        usedFor: 'Internal data lookup'
      }));

      // If we need data, add fetch steps
      if (intent.needsData && piiMatches.length > 0) {
        pipeline.steps.splice(2, 0,
          { name: 'Fetch Internal Data', status: 'pending' },
          { name: 'Scrub Retrieved Data', status: 'pending' }
        );
      }
    }

    pipeline.steps[1].status = 'complete';
    pipeline.steps[1].detail = piiMatches.length > 0
      ? `Found: ${piiMatches.map(p => p.type).join(', ')}`
      : 'No PII detected';
    setCurrentPipeline({ ...pipeline });

    // Step 3: Fetch Internal Data (if needed)
    const fetchStepIdx = pipeline.steps.findIndex(s => s.name === 'Fetch Internal Data');
    if (fetchStepIdx !== -1 && piiMatches.length > 0) {
      pipeline.steps[fetchStepIdx].status = 'active';
      setCurrentPipeline({ ...pipeline });
      await new Promise(r => setTimeout(r, 800));

      // Look up data using extracted identifier
      const identifier = piiMatches[0].identifier || '';
      const mockData = MOCK_INTERNAL_DATA[identifier];

      if (mockData) {
        pipeline.dataFetch = {
          source: 'Internal Database',
          query: `SELECT * FROM ${mockData.type.toLowerCase().replace(' ', '_')} WHERE id = '${identifier}'`,
          dataRetrieved: mockData.data,
          scrubbedData: mockData.scrubbedData
        };
        pipeline.steps[fetchStepIdx].status = 'complete';
        pipeline.steps[fetchStepIdx].detail = `Retrieved ${mockData.type}`;
      } else {
        pipeline.steps[fetchStepIdx].status = 'complete';
        pipeline.steps[fetchStepIdx].detail = 'No data found';
      }
      setCurrentPipeline({ ...pipeline });

      // Step 4: Scrub Retrieved Data
      const scrubStepIdx = pipeline.steps.findIndex(s => s.name === 'Scrub Retrieved Data');
      if (scrubStepIdx !== -1 && pipeline.dataFetch) {
        pipeline.steps[scrubStepIdx].status = 'active';
        setCurrentPipeline({ ...pipeline });
        await new Promise(r => setTimeout(r, 500));
        pipeline.steps[scrubStepIdx].status = 'complete';
        pipeline.steps[scrubStepIdx].detail = 'PII removed from data';
        setCurrentPipeline({ ...pipeline });
      }
    }

    // Route Decision step
    const routeStepIdx = pipeline.steps.findIndex(s => s.name === 'Route Decision');
    pipeline.steps[routeStepIdx].status = 'active';
    setCurrentPipeline({ ...pipeline });
    await new Promise(r => setTimeout(r, 400));

    // Determine routing
    const hasPII = piiMatches.length > 0;
    const needsLLM = intent.needsLLM;

    if (needsLLM) {
      pipeline.routingDecision = 'LLM';
      // Compose final query to send
      if (pipeline.dataFetch) {
        pipeline.queryToModel = `${pipeline.scrubbedQuery || text}\n\nContext data:\n${pipeline.dataFetch.scrubbedData}`;
      } else {
        pipeline.queryToModel = pipeline.scrubbedQuery || text;
      }
    } else {
      pipeline.routingDecision = 'SLM';
      pipeline.queryToModel = pipeline.scrubbedQuery || text;
    }

    pipeline.steps[routeStepIdx].status = 'complete';
    pipeline.steps[routeStepIdx].detail = `→ ${pipeline.routingDecision}${hasPII ? ' (PII scrubbed)' : ''}`;
    setCurrentPipeline({ ...pipeline });

    // Generate Response step
    const responseStepIdx = pipeline.steps.findIndex(s => s.name === 'Generate Response');
    pipeline.steps[responseStepIdx].status = 'active';
    setCurrentPipeline({ ...pipeline });

    const responseDelay = pipeline.routingDecision === 'SLM' ? 200 : 1000;
    await new Promise(r => setTimeout(r, responseDelay));

    pipeline.steps[responseStepIdx].status = 'complete';
    setCurrentPipeline({ ...pipeline });

    return { pipeline, latency: responseDelay };
  };

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
    const queryText = input.trim();
    setInput('');

    const { pipeline, latency } = await processQuery(queryText);

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: generateResponse(queryText, pipeline),
      timestamp: new Date(),
      pipeline,
      model: pipeline.routingDecision || 'SLM',
      latency,
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsProcessing(false);
  };

  const piiProtectedCount = messages.filter(m => m.pipeline?.piiDetected.length).length;
  const dataFetchCount = messages.filter(m => m.pipeline?.dataFetch).length;

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
                  Enterprise AI Pipeline
                  <span className="px-2 py-0.5 text-xs rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Unified
                  </span>
                </h1>
                <p className="text-sm text-slate-400">Routing + Data Fetch + PII Protection</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {messages.length > 0 && (
                <div className="hidden sm:flex items-center gap-4 text-sm">
                  {piiProtectedCount > 0 && (
                    <div className="flex items-center gap-1.5 text-yellow-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span>{piiProtectedCount} Protected</span>
                    </div>
                  )}
                  {dataFetchCount > 0 && (
                    <div className="flex items-center gap-1.5 text-blue-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" />
                      </svg>
                      <span>{dataFetchCount} Data Fetches</span>
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={() => setShowPipeline(!showPipeline)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  showPipeline
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'bg-slate-700/50 text-slate-400 border border-slate-600/50'
                }`}
              >
                {showPipeline ? 'Hide' : 'Show'} Pipeline
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className={`grid gap-6 ${showPipeline ? 'lg:grid-cols-3' : 'lg:grid-cols-1 max-w-3xl mx-auto'}`}>
          {/* Chat Panel */}
          <div className={showPipeline ? 'lg:col-span-2' : ''}>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden flex flex-col h-[calc(100vh-200px)]">
              {/* Chat Header */}
              <div className="px-4 py-3 bg-slate-700/30 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                    <span className="text-white font-bold">B</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white">Bounteous Banking Assistant</h3>
                    <p className="text-xs text-slate-400">Secure • Intelligent • Enterprise-grade</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center">
                      <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">Complete Enterprise AI Flow</h3>
                    <p className="text-slate-400 text-sm max-w-md mx-auto mb-4">
                      Watch the full pipeline: query analysis → PII detection → internal data fetch →
                      data scrubbing → model routing → secure response.
                    </p>
                  </div>
                )}

                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[80%]">
                      <div className={`rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700/50 text-slate-100'
                      }`}>
                        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                      </div>
                      {message.pipeline && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                          <span className={`px-2 py-0.5 rounded ${
                            message.model === 'SLM'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-orange-500/20 text-orange-400'
                          }`}>
                            {message.model}
                          </span>
                          <span className="text-slate-500">{message.latency}ms</span>
                          {message.pipeline.piiDetected.length > 0 && (
                            <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                              PII Scrubbed
                            </span>
                          )}
                          {message.pipeline.dataFetch && (
                            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                              Data Fetched
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isProcessing && currentPipeline && (
                  <div className="flex justify-start">
                    <div className="bg-slate-700/50 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2 text-slate-400">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-sm">
                          {currentPipeline.steps.find(s => s.status === 'active')?.name || 'Processing...'}
                        </span>
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
                    placeholder="Try: 'Check balance for account #12345678'"
                    className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500/50 text-sm"
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

          {/* Pipeline Panel */}
          {showPipeline && (
            <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-200px)]">
              {/* Sample Queries */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
                <h3 className="text-sm font-medium text-slate-300 mb-3">Try These Examples</h3>
                <div className="space-y-2">
                  {SAMPLE_QUERIES.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(item.query)}
                      className="w-full text-left p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="text-sm text-white">{item.query}</div>
                      <div className="text-xs text-slate-500 mt-1">{item.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Pipeline */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
                <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-cyan-400 animate-pulse' : currentPipeline ? 'bg-green-400' : 'bg-slate-600'}`} />
                  Processing Pipeline
                </h3>

                {currentPipeline ? (
                  <div className="space-y-4">
                    {/* Steps */}
                    <div className="space-y-2">
                      {currentPipeline.steps.map((step, i) => (
                        <div key={i} className={`flex items-center gap-3 p-2 rounded-lg ${
                          step.status === 'active' ? 'bg-cyan-500/10 border border-cyan-500/30' :
                          step.status === 'complete' ? 'bg-green-500/10' : 'bg-slate-700/20'
                        }`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                            step.status === 'active' ? 'bg-cyan-500 text-white' :
                            step.status === 'complete' ? 'bg-green-500 text-white' : 'bg-slate-600 text-slate-400'
                          }`}>
                            {step.status === 'complete' ? '✓' : i + 1}
                          </div>
                          <div className="flex-1">
                            <div className={`text-sm ${step.status === 'active' ? 'text-cyan-300' : step.status === 'complete' ? 'text-white' : 'text-slate-500'}`}>
                              {step.name}
                            </div>
                            {step.detail && (
                              <div className="text-xs text-slate-400">{step.detail}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* PII Detection */}
                    {currentPipeline.piiDetected.length > 0 && (
                      <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                        <div className="text-sm font-medium text-yellow-400 mb-2">PII Detected & Scrubbed</div>
                        {currentPipeline.piiDetected.map((pii, i) => (
                          <div key={i} className="text-xs mb-2">
                            <span className="text-yellow-300">{pii.type}:</span>
                            <div className="font-mono mt-1 p-2 rounded bg-slate-800/50">
                              <div className="text-red-400 line-through">{pii.value}</div>
                              <div className="text-green-400">→ {pii.masked}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Data Fetch */}
                    {currentPipeline.dataFetch && (
                      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                        <div className="text-sm font-medium text-blue-400 mb-2">Internal Data Retrieved</div>
                        <div className="text-xs space-y-2">
                          <div>
                            <span className="text-slate-400">Source:</span>
                            <span className="text-white ml-2">{currentPipeline.dataFetch.source}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Raw data (internal only):</span>
                            <div className="font-mono p-2 mt-1 rounded bg-slate-800/50 text-slate-500 text-[10px] line-through">
                              {currentPipeline.dataFetch.dataRetrieved}
                            </div>
                          </div>
                          <div>
                            <span className="text-green-400">Scrubbed for LLM:</span>
                            <div className="font-mono p-2 mt-1 rounded bg-slate-800/50 text-green-300 text-[10px]">
                              {currentPipeline.dataFetch.scrubbedData}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Final Query to Model */}
                    {currentPipeline.queryToModel && currentPipeline.routingDecision === 'LLM' && (
                      <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                        <div className="text-sm font-medium text-orange-400 mb-2">Sent to LLM</div>
                        <div className="font-mono p-2 rounded bg-slate-800/50 text-xs text-slate-300 whitespace-pre-wrap">
                          {currentPipeline.queryToModel}
                        </div>
                      </div>
                    )}
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

              {/* Flow Explanation */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
                <h3 className="text-sm font-medium text-slate-300 mb-3">How It Works</h3>
                <div className="space-y-2 text-xs text-slate-400">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0 text-[10px]">1</span>
                    <span><b className="text-white">Analyze</b> - Understand query intent & complexity</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center flex-shrink-0 text-[10px]">2</span>
                    <span><b className="text-white">Detect PII</b> - Find & extract identifiers</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 text-[10px]">3</span>
                    <span><b className="text-white">Fetch Data</b> - Use identifiers for internal lookup</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center flex-shrink-0 text-[10px]">4</span>
                    <span><b className="text-white">Scrub Both</b> - Remove PII from query AND data</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center flex-shrink-0 text-[10px]">5</span>
                    <span><b className="text-white">Route & Send</b> - SLM for simple, LLM for complex</span>
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
