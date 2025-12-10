'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Message } from '@/lib/types';
import { querySLM, checkSLMHealth } from '@/lib/slm-service';

const quickQuestions = [
  'Can I use ChatGPT for work?',
  'What is the password policy?',
  'What is the work from home policy?',
  'How many vacation days do I get?',
  'What should I do if I suspect a security breach?',
  'Can I work remotely full-time?',
  'What are the AI tools approved for use at Bounteous?',
  'What is the work from home policy for India employees?',
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [totalCost, setTotalCost] = useState(0);
  const [avgLatency, setAvgLatency] = useState(0);
  const [slmHealthy, setSlmHealthy] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check SLM health on mount
  useEffect(() => {
    checkSLMHealth().then(setSlmHealthy);
  }, []);

  const sendMessage = async (query: string) => {
    if (!query.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: query.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await querySLM(query.trim());

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.answer,
        timestamp: new Date(),
        latency: response.latency,
        cost: response.cost,
        source: response.source,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setTotalCost((prev) => prev + response.cost);
      setAvgLatency((prev) => {
        const latencies = [...messages, assistantMessage]
          .filter((m) => m.latency)
          .map((m) => m.latency!);
        return latencies.length > 0
          ? latencies.reduce((a, b) => a + b, 0) / latencies.length
          : response.latency;
      });
    } catch (error) {
      console.error('Error querying SLM:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage(input);
  };

  const handleQuickQuestion = async (query: string) => {
    await sendMessage(query);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-white">SLM Chat Demo</h1>
                <p className="text-xs text-slate-400">Bounteous Fine-Tuned Model</p>
              </div>
            </div>

            {/* Live Metrics */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <div className={`w-2 h-2 rounded-full ${slmHealthy === true ? 'bg-green-500 animate-pulse' : slmHealthy === false ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'}`}></div>
                <span className="text-slate-300">
                  {slmHealthy === true ? (avgLatency > 0 ? `${Math.round(avgLatency)}ms` : 'Connected') : slmHealthy === false ? 'Offline' : 'Checking...'}
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <span className="text-slate-300">
                  Cost: ${totalCost.toFixed(4)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">
                Ask About Bounteous Policies
              </h2>
              <p className="text-slate-400 mb-4">
                This SLM is fine-tuned on Bounteous internal policy documents.<br />
                Click a question below or type your own.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800/50 border border-slate-700/50 text-slate-200'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>

                    {message.role === 'assistant' && (
                      <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-2">
                        {message.source && (
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>{message.source}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-xs">
                          <span className="flex items-center gap-1 text-green-400">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            {message.latency}ms
                          </span>
                          <span className="text-slate-500">
                            ${message.cost?.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"></div>
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area with Quick Questions */}
      <div className="border-t border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 py-4">
          {/* Quick Questions */}
          <div className="mb-4">
            <div className="text-xs text-slate-500 mb-2">Quick questions:</div>
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((question) => (
                <button
                  key={question}
                  onClick={() => handleQuickQuestion(question)}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-xs rounded-full bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:bg-slate-700/50 hover:border-slate-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about Bounteous policies..."
              className="flex-1 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </form>

          <div className="flex items-center justify-center gap-6 mt-3 text-xs text-slate-500">
            <span>Model: Phi-3 Mini (Fine-tuned)</span>
            <span>Deployment: On-premises</span>
            <span>GPT-4 equivalent: ~$0.02/query</span>
          </div>
        </div>
      </div>
    </div>
  );
}
