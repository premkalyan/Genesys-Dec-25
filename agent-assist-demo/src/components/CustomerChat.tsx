'use client';

import { useEffect, useRef, useState } from 'react';
import { Message, CustomerProfile } from '@/lib/types';

interface PreviousInteraction {
  id: string;
  date: string;
  issue: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  resolution: string;
  summary: string;
}

const MOCK_PREVIOUS_INTERACTIONS: PreviousInteraction[] = [
  {
    id: 'prev-001',
    date: '2024-11-15',
    issue: 'Knowledge Base Setup',
    sentiment: 'positive',
    resolution: 'Resolved',
    summary: 'Customer needed help setting up their first knowledge base. Walked through the Knowledge Workbench setup process. Customer was satisfied with the guidance.',
  },
  {
    id: 'prev-002',
    date: '2024-10-28',
    issue: 'Routing Configuration',
    sentiment: 'neutral',
    resolution: 'Resolved',
    summary: 'Questions about skills-based routing configuration. Explained how to create skills and assign to agents. Follow-up scheduled for advanced routing setup.',
  },
  {
    id: 'prev-003',
    date: '2024-10-10',
    issue: 'Agent Desktop Issues',
    sentiment: 'negative',
    resolution: 'Escalated',
    summary: 'Agent desktop was freezing during peak hours. Initial troubleshooting unsuccessful. Escalated to Tier 2 support. Issue resolved after browser cache clear and extension removal.',
  },
];

interface CustomerChatProps {
  messages: Message[];
  customer: CustomerProfile;
  isTyping: boolean;
  onCustomerMessage?: (content: string) => void;
}

export default function CustomerChat({ messages, customer, isTyping, onCustomerMessage }: CustomerChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [customerInput, setCustomerInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerInput.trim() || !onCustomerMessage) return;
    onCustomerMessage(customerInput.trim());
    setCustomerInput('');
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-400 bg-green-500/10';
      case 'negative': return 'text-red-400 bg-red-500/10';
      default: return 'text-slate-400 bg-slate-500/10';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
            {customer.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <h3 className="text-white font-medium">{customer.name}</h3>
            <div className="flex items-center gap-2 text-xs">
              <span className={`px-1.5 py-0.5 rounded ${
                customer.tier === 'Platinum' ? 'bg-purple-500/20 text-purple-300' :
                customer.tier === 'Enterprise' ? 'bg-blue-500/20 text-blue-300' :
                'bg-yellow-500/20 text-yellow-300'
              }`}>
                {customer.tier}
              </span>
              <span className="text-slate-400">ID: {customer.accountId}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.filter(m => m.role === 'customer').map((message) => (
          <div key={message.id} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex-shrink-0 flex items-center justify-center text-white text-xs font-semibold">
              {customer.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1">
              <div className="bg-slate-800/70 rounded-2xl rounded-tl-sm px-4 py-2.5 text-slate-200">
                {message.content}
              </div>
              <div className="text-xs text-slate-500 mt-1 ml-1">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex-shrink-0 flex items-center justify-center text-white text-xs font-semibold">
              {customer.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="bg-slate-800/70 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Customer Input (for testing) */}
      {onCustomerMessage && (
        <div className="px-4 py-3 border-t border-slate-700/50 bg-slate-800/30">
          <form onSubmit={handleCustomerSubmit} className="flex gap-2">
            <input
              type="text"
              value={customerInput}
              onChange={(e) => setCustomerInput(e.target.value)}
              placeholder="Type as customer to test..."
              className="flex-1 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!customerInput.trim()}
              className="px-3 py-2 rounded-lg bg-blue-600/50 text-blue-200 text-sm hover:bg-blue-600/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </form>
          <p className="text-[10px] text-slate-500 mt-1">Test mode: Type as customer to see real-time AI response</p>
        </div>
      )}

      {/* Customer Info Footer */}
      <div className="px-4 py-2 border-t border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Issue: {customer.issue}</span>
          <button
            onClick={() => setShowHistory(true)}
            className="hover:text-white transition-colors underline decoration-dotted underline-offset-2"
          >
            {customer.previousInteractions} previous interactions
          </button>
        </div>
      </div>

      {/* Previous Interactions Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Previous Interactions</h3>
                <p className="text-sm text-slate-400">{customer.name} - {customer.previousInteractions} interactions</p>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
              {MOCK_PREVIOUS_INTERACTIONS.map((interaction) => (
                <div key={interaction.id} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-white">{interaction.issue}</h4>
                      <p className="text-xs text-slate-400">{interaction.date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${getSentimentColor(interaction.sentiment)}`}>
                        {interaction.sentiment === 'positive' ? '😊' : interaction.sentiment === 'negative' ? '😟' : '😐'} {interaction.sentiment}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        interaction.resolution === 'Resolved' ? 'bg-green-500/10 text-green-400' : 'bg-orange-500/10 text-orange-400'
                      }`}>
                        {interaction.resolution}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300">{interaction.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
