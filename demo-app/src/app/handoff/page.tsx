'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Message, CustomerProfile, ConversationSummary, CustomerSentimentHistory } from '@/lib/types';
import { getCustomerSentimentHistory } from '@/lib/sentiment-service';
import SentimentTimeline from '@/components/SentimentTimeline';

const mockCustomer: CustomerProfile = {
  id: 'CUST-12345',
  name: 'Sarah Johnson',
  email: 's.johnson@email.com',
  tier: 'Platinum',
  accountAge: '4 years',
  totalInteractions: 47,
  lastContact: '2 days ago',
  preferences: ['Email notifications', 'Paperless statements', 'Auto-pay enabled'],
};

const demoConversation: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: "Hello Sarah! I'm the Bounteous AI assistant. How can I help you today?",
    timestamp: new Date(),
  },
  {
    id: '2',
    role: 'user',
    content: "Hi, I need to understand why my expense report was rejected. I submitted $750 for a client dinner last week.",
    timestamp: new Date(),
  },
  {
    id: '3',
    role: 'assistant',
    content: "I can help with that. According to our expense policy (Section 3.4), client entertainment expenses require pre-approval regardless of amount. Let me check if pre-approval was obtained for this expense.\n\nI don't see a pre-approval record for this expense. Would you like me to help you submit a retroactive approval request?",
    timestamp: new Date(),
    source: 'Finance Policy Manual Section 3.4',
  },
  {
    id: '4',
    role: 'user',
    content: "That's frustrating. My manager told me it would be fine. Can I talk to someone about this? I need this resolved today because I'm traveling tomorrow.",
    timestamp: new Date(),
  },
];

const mockSummary: ConversationSummary = {
  intent: 'Expense Report Dispute Resolution',
  sentiment: 'Frustrated',
  questionsAsked: [
    'Why was expense report rejected?',
    'Can they speak to someone about resolution?',
  ],
  resolutionAttempts: [
    {
      question: 'Expense rejection reason',
      resolved: true,
    },
    {
      question: 'Escalation to human agent',
      resolved: false,
    },
  ],
  recommendedAction: 'Approve retroactive pre-approval or escalate to Finance Manager',
  escalationReason: 'Customer frustrated and time-sensitive (traveling tomorrow)',
};

export default function HandoffPage() {
  const [messages, setMessages] = useState<Message[]>(demoConversation);
  const [isTransferred, setIsTransferred] = useState(false);
  const [showAgentView, setShowAgentView] = useState(false);
  const [sentimentHistory, setSentimentHistory] = useState<CustomerSentimentHistory | null>(null);
  const [historyDays, setHistoryDays] = useState<30 | 60 | 90>(90);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch sentiment history when agent view opens
  useEffect(() => {
    if (showAgentView && !sentimentHistory) {
      setLoadingHistory(true);
      getCustomerSentimentHistory(mockCustomer.id, historyDays)
        .then((data) => {
          setSentimentHistory(data);
        })
        .finally(() => {
          setLoadingHistory(false);
        });
    }
  }, [showAgentView, sentimentHistory, historyDays]);

  // Handle days change
  const handleDaysChange = (days: 30 | 60 | 90) => {
    setHistoryDays(days);
    setLoadingHistory(true);
    getCustomerSentimentHistory(mockCustomer.id, days)
      .then((data) => {
        setSentimentHistory(data);
      })
      .finally(() => {
        setLoadingHistory(false);
      });
  };

  const handleTransfer = () => {
    const systemMessage: Message = {
      id: crypto.randomUUID(),
      role: 'system',
      content: 'Transferring you to a human agent. They will have full context of our conversation. Please hold...',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, systemMessage]);

    setTimeout(() => {
      setIsTransferred(true);
      setShowAgentView(true);
    }, 1500);
  };

  const handleReset = () => {
    setMessages(demoConversation);
    setIsTransferred(false);
    setShowAgentView(false);
    setSentimentHistory(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-white">Agent Handoff Demo</h1>
                <p className="text-xs text-slate-400">Zero-Repetition Context Transfer</p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition-colors"
            >
              Reset Demo
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className={`grid gap-8 ${showAgentView ? 'lg:grid-cols-2' : 'lg:grid-cols-1 max-w-3xl mx-auto'}`}>
          {/* Customer Chat View */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm">
                  👤
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Customer View</div>
                  <div className="text-xs text-slate-400">Chat with AI Assistant</div>
                </div>
              </div>
            </div>

            <div className="h-[550px] overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'user'
                      ? 'justify-end'
                      : message.role === 'system'
                      ? 'justify-center'
                      : 'justify-start'
                  }`}
                >
                  {message.role === 'system' ? (
                    <div className="px-4 py-2 rounded-full bg-yellow-500/20 text-yellow-300 text-sm border border-yellow-500/30">
                      {message.content}
                    </div>
                  ) : (
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700/50 text-slate-200'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  )}
                </div>
              ))}

              {isTransferred && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl px-4 py-2 bg-green-600/20 border border-green-500/30 text-green-300">
                    <p className="text-sm">
                      Hi Sarah, this is Alex from the Finance team. I can see you had a question about your expense report rejection. I have all the context - no need to repeat anything. Let me help you resolve this right away.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {!isTransferred && (
              <div className="p-4 border-t border-slate-700/50">
                <button
                  onClick={handleTransfer}
                  className="w-full px-4 py-3 rounded-xl bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Transfer to Human Agent
                </button>
              </div>
            )}
          </div>

          {/* Agent Desktop View */}
          {showAgentView && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700/50 bg-gradient-to-r from-purple-900/50 to-pink-900/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm">
                      🎧
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">Agent Desktop</div>
                      <div className="text-xs text-slate-400">Genesys Agent Workspace</div>
                    </div>
                  </div>
                  <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                    New Transfer
                  </span>
                </div>
              </div>

              <div className="h-[550px] overflow-y-auto p-4 space-y-4">
                {/* Customer Profile */}
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/30">
                  <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Customer Profile
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-500">Name</span>
                      <p className="text-white">{mockCustomer.name}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Tier</span>
                      <p className="text-yellow-400">{mockCustomer.tier}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Customer Since</span>
                      <p className="text-white">{mockCustomer.accountAge}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Interactions</span>
                      <p className="text-white">{mockCustomer.totalInteractions}</p>
                    </div>
                  </div>
                </div>

                {/* Sentiment History Timeline */}
                {loadingHistory ? (
                  <div className="rounded-xl bg-slate-900/50 border border-slate-700/30 p-4">
                    <div className="flex items-center justify-center gap-2 text-slate-400">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-sm">Loading sentiment history...</span>
                    </div>
                  </div>
                ) : sentimentHistory ? (
                  <SentimentTimeline
                    interactions={sentimentHistory.interactions}
                    summary={sentimentHistory.summary}
                    customerName={mockCustomer.name}
                    selectedDays={historyDays}
                    onRangeChange={handleDaysChange}
                  />
                ) : null}

                {/* AI Summary */}
                <div className="p-4 rounded-xl bg-purple-900/20 border border-purple-500/30">
                  <h3 className="text-sm font-medium text-purple-300 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    AI Conversation Summary
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Intent:</span>
                      <span className="px-2 py-0.5 text-xs rounded bg-blue-500/20 text-blue-300">
                        {mockSummary.intent}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Sentiment:</span>
                      <span className="px-2 py-0.5 text-xs rounded bg-orange-500/20 text-orange-300">
                        {mockSummary.sentiment}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-slate-400 block mb-1">Questions Asked:</span>
                      <ul className="space-y-1">
                        {mockSummary.questionsAsked.map((q, i) => (
                          <li key={i} className="text-sm text-slate-300 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                            {q}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <span className="text-xs text-slate-400 block mb-1">Resolution Status:</span>
                      {mockSummary.resolutionAttempts.map((attempt, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          {attempt.resolved ? (
                            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                          )}
                          <span className={attempt.resolved ? 'text-slate-400' : 'text-white'}>
                            {attempt.question}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recommended Action */}
                <div className="p-4 rounded-xl bg-green-900/20 border border-green-500/30">
                  <h3 className="text-sm font-medium text-green-300 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    Recommended Action
                  </h3>
                  <p className="text-sm text-white">{mockSummary.recommendedAction}</p>
                  {mockSummary.escalationReason && (
                    <p className="text-xs text-yellow-400 mt-2">
                      ⚠️ {mockSummary.escalationReason}
                    </p>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2">
                  <button className="flex-1 px-3 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors">
                    Approve Request
                  </button>
                  <button className="flex-1 px-3 py-2 text-sm rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition-colors">
                    View Full Transcript
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Benefits Banner */}
        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          {[
            {
              title: 'Zero Repetition',
              description: 'Customer never has to explain their issue again',
              icon: '🔄',
            },
            {
              title: 'Full Context',
              description: 'Agent sees entire conversation history and AI analysis',
              icon: '📋',
            },
            {
              title: 'Faster Resolution',
              description: 'Agent can act immediately on AI recommendations',
              icon: '⚡',
            },
          ].map((benefit) => (
            <div
              key={benefit.title}
              className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/30 text-center"
            >
              <div className="text-2xl mb-2">{benefit.icon}</div>
              <h4 className="text-sm font-medium text-white">{benefit.title}</h4>
              <p className="text-xs text-slate-400 mt-1">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
