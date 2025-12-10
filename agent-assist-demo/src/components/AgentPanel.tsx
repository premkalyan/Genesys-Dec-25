'use client';

import { useState, useRef, useEffect } from 'react';
import { Message } from '@/lib/types';

interface Supervisor {
  id: string;
  name: string;
  role: string;
  status: 'available' | 'busy' | 'away';
  specialty: string;
}

const SUPERVISORS: Supervisor[] = [
  { id: 'sup-001', name: 'Jennifer Martinez', role: 'Team Lead', status: 'available', specialty: 'Agent Copilot, AI Features' },
  { id: 'sup-002', name: 'David Chen', role: 'Senior Support', status: 'available', specialty: 'Routing, Queue Configuration' },
  { id: 'sup-003', name: 'Amanda Wilson', role: 'Technical Lead', status: 'busy', specialty: 'Integrations, API Issues' },
];

interface AgentPanelProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  suggestedResponse: string | null;
  onClearSuggestion: () => void;
  isLoading: boolean;
}

export default function AgentPanel({
  messages,
  onSendMessage,
  suggestedResponse,
  onClearSuggestion,
  isLoading
}: AgentPanelProps) {
  const [input, setInput] = useState('');
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferNote, setTransferNote] = useState('');
  const [transferSuccess, setTransferSuccess] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-fill suggested response
  useEffect(() => {
    if (suggestedResponse) {
      setInput(suggestedResponse);
      textareaRef.current?.focus();
    }
  }, [suggestedResponse]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    onSendMessage(input.trim());
    setInput('');
    onClearSuggestion();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleTransfer = (supervisor: Supervisor) => {
    setTransferSuccess(true);
    setTimeout(() => {
      setTransferSuccess(false);
      setShowTransfer(false);
      setTransferNote('');
    }, 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-medium">Agent Desktop</h3>
            <p className="text-xs text-slate-400">Compose your response</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs text-green-400">Active</span>
          </div>
        </div>
      </div>

      {/* Conversation History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p>Waiting for conversation...</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'agent' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                  message.role === 'agent'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-slate-800/70 text-slate-200 rounded-bl-sm'
                }`}
              >
                <p>{message.content}</p>
                <div className={`text-xs mt-1 ${message.role === 'agent' ? 'text-blue-200' : 'text-slate-500'}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {message.role === 'agent' && ' - Sent'}
                </div>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-center">
            <div className="px-4 py-2 rounded-full bg-slate-800/50 text-slate-400 text-sm">
              Processing...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
        {suggestedResponse && (
          <div className="mb-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-between">
            <span className="text-xs text-blue-300">AI suggestion applied - edit or send</span>
            <button
              onClick={() => {
                setInput('');
                onClearSuggestion();
              }}
              className="text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your response..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Send
            </button>
            <button
              type="button"
              onClick={() => setShowTransfer(true)}
              className="px-4 py-2 rounded-xl bg-slate-700/50 text-slate-300 font-medium hover:bg-slate-600/50 transition-colors text-sm"
            >
              Transfer
            </button>
          </div>
        </form>
      </div>

      {/* Transfer Modal */}
      {showTransfer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Transfer to Supervisor</h3>
                <p className="text-sm text-slate-400">Select a supervisor to escalate this conversation</p>
              </div>
              <button
                onClick={() => setShowTransfer(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {transferSuccess ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h4 className="text-lg font-medium text-white mb-2">Transfer Initiated</h4>
                <p className="text-sm text-slate-400">The supervisor has been notified and will join shortly.</p>
              </div>
            ) : (
              <div className="p-6">
                <div className="space-y-3 mb-4">
                  {SUPERVISORS.map((supervisor) => (
                    <button
                      key={supervisor.id}
                      onClick={() => handleTransfer(supervisor)}
                      disabled={supervisor.status !== 'available'}
                      className={`w-full p-4 rounded-xl border text-left transition-all ${
                        supervisor.status === 'available'
                          ? 'bg-slate-800/50 border-slate-700/50 hover:border-blue-500/50 hover:bg-slate-800'
                          : 'bg-slate-800/20 border-slate-700/30 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-medium">
                            {supervisor.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div className="font-medium text-white">{supervisor.name}</div>
                            <div className="text-xs text-slate-400">{supervisor.role}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(supervisor.status)}`}></div>
                          <span className="text-xs text-slate-400 capitalize">{supervisor.status}</span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        Specialty: {supervisor.specialty}
                      </div>
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Transfer Note (optional)</label>
                  <textarea
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                    placeholder="Add context for the supervisor..."
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
