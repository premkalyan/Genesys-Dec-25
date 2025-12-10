'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PIIEntity, PIIAuditEntry } from '@/lib/types';
import { detectPII, redactPII, createAuditEntry } from '@/lib/pii-detector';
import { querySLM } from '@/lib/slm-service';

const exampleQueries = [
  "What is John Smith's PTO balance? His email is john.smith@company.com",
  'Can you check account #123456789 for Sarah Johnson?',
  'Please update the file for employee 555-12-3456 at 123 Main Street',
  'Contact Michael Brown at (555) 123-4567 about the benefits question',
];

const piiColors: Record<string, string> = {
  NAME: 'bg-purple-500/20 text-purple-300 border-purple-500/50',
  EMAIL: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
  PHONE: 'bg-green-500/20 text-green-300 border-green-500/50',
  SSN: 'bg-red-500/20 text-red-300 border-red-500/50',
  ADDRESS: 'bg-orange-500/20 text-orange-300 border-orange-500/50',
  ACCOUNT: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50',
};

export default function PIIPage() {
  const [input, setInput] = useState('');
  const [detectedPII, setDetectedPII] = useState<PIIEntity[]>([]);
  const [redactedText, setRedactedText] = useState('');
  const [response, setResponse] = useState('');
  const [auditLog, setAuditLog] = useState<PIIAuditEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'input' | 'detected' | 'redacted' | 'response'>('input');

  const handleAnalyze = () => {
    if (!input.trim()) return;

    const entities = detectPII(input);
    setDetectedPII(entities);
    setStep('detected');
  };

  const handleRedact = () => {
    const { redacted, entities } = redactPII(input);
    setRedactedText(redacted);

    const entry = createAuditEntry(input, redacted, entities);
    setAuditLog((prev) => [entry, ...prev]);
    setStep('redacted');
  };

  const handleProcess = async () => {
    setIsProcessing(true);

    try {
      const slmResponse = await querySLM(redactedText);
      setResponse(slmResponse.answer);
      setStep('response');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setInput('');
    setDetectedPII([]);
    setRedactedText('');
    setResponse('');
    setStep('input');
  };

  const highlightPII = (text: string, entities: PIIEntity[]) => {
    if (entities.length === 0) return <span>{text}</span>;

    const parts: React.ReactElement[] = [];
    let lastEnd = 0;

    entities.forEach((entity, index) => {
      if (entity.start > lastEnd) {
        parts.push(
          <span key={`text-${index}`}>{text.slice(lastEnd, entity.start)}</span>
        );
      }
      parts.push(
        <span
          key={`entity-${index}`}
          className={`px-1 py-0.5 rounded border ${piiColors[entity.type]}`}
          title={entity.type}
        >
          {entity.text}
        </span>
      );
      lastEnd = entity.end;
    });

    if (lastEnd < text.length) {
      parts.push(<span key="text-last">{text.slice(lastEnd)}</span>);
    }

    return <>{parts}</>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-white">PII Protection for LLM Escalation</h1>
                <p className="text-xs text-slate-400">When SLM escalates to external LLM, PII is automatically scrubbed</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {Object.entries(piiColors).map(([type, color]) => (
                <span key={type} className={`px-2 py-1 text-xs rounded border ${color}`}>
                  {type}
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Demo Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Steps */}
            <div className="flex items-center justify-between bg-slate-800/30 rounded-xl p-4">
              {['Input', 'Detect', 'Redact', 'Process'].map((label, index) => {
                const stepIndex = ['input', 'detected', 'redacted', 'response'].indexOf(step);
                const isActive = index <= stepIndex;
                const isCurrent = index === stepIndex;

                return (
                  <div key={label} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        isCurrent
                          ? 'bg-green-500 text-white'
                          : isActive
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-slate-700/50 text-slate-500'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span
                      className={`ml-2 text-sm ${
                        isActive ? 'text-white' : 'text-slate-500'
                      }`}
                    >
                      {label}
                    </span>
                    {index < 3 && (
                      <div
                        className={`w-12 h-0.5 mx-2 ${
                          index < stepIndex ? 'bg-green-500' : 'bg-slate-700'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Input Area */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                {step === 'input' && 'Enter Query with PII (Simulating LLM Escalation)'}
                {step === 'detected' && 'PII Detected - Will Redact Before External LLM'}
                {step === 'redacted' && 'Redacted Query Ready for External LLM'}
                {step === 'response' && 'Response from External LLM (PII Reconstructed)'}
              </h3>

              {step === 'input' && (
                <>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Enter a query that might contain personal information..."
                    className="w-full h-32 px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                  />
                  <div className="flex flex-wrap gap-2 mt-4">
                    {exampleQueries.map((query) => (
                      <button
                        key={query}
                        onClick={() => setInput(query)}
                        className="px-3 py-1.5 text-xs rounded-full bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 transition-colors"
                      >
                        {query.length > 40 ? query.slice(0, 40) + '...' : query}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleAnalyze}
                    disabled={!input.trim()}
                    className="mt-4 px-6 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Analyze for PII
                  </button>
                </>
              )}

              {step === 'detected' && (
                <>
                  <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/50 text-lg leading-relaxed">
                    {highlightPII(input, detectedPII)}
                  </div>
                  <div className="mt-4 p-4 rounded-lg bg-slate-900/30 border border-slate-700/30">
                    <h4 className="text-sm font-medium text-slate-400 mb-2">
                      Found {detectedPII.length} PII entities:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {detectedPII.map((entity, index) => (
                        <span
                          key={index}
                          className={`px-2 py-1 text-sm rounded border ${piiColors[entity.type]}`}
                        >
                          {entity.type}: {entity.text}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={handleRedact}
                      className="px-6 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors"
                    >
                      Redact & Continue
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-6 py-2 rounded-lg bg-slate-700 text-white font-medium hover:bg-slate-600 transition-colors"
                    >
                      Reset
                    </button>
                  </div>
                </>
              )}

              {step === 'redacted' && (
                <>
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs text-red-400 uppercase tracking-wide">Original (Internal Only)</span>
                      <div className="mt-1 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-slate-300 line-through">
                        {input}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-green-400 uppercase tracking-wide">Sent to Model</span>
                      <div className="mt-1 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-white">
                        {redactedText}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={handleProcess}
                      disabled={isProcessing}
                      className="px-6 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {isProcessing ? 'Processing...' : 'Send to External LLM'}
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-6 py-2 rounded-lg bg-slate-700 text-white font-medium hover:bg-slate-600 transition-colors"
                    >
                      Reset
                    </button>
                  </div>
                </>
              )}

              {step === 'response' && (
                <>
                  <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/50">
                    <p className="text-white leading-relaxed">{response}</p>
                  </div>
                  <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span>External LLM never saw real PII - only placeholders. PII restored in final response.</span>
                    </div>
                  </div>
                  <button
                    onClick={handleReset}
                    className="mt-4 px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                  >
                    Try Another Query
                  </button>
                </>
              )}
            </div>

            {/* Two-Tier Architecture Diagram */}
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Two-Tier Architecture</h3>

              {/* Tier 1: SLM Path */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 text-xs rounded bg-green-500/20 text-green-400 border border-green-500/30">TIER 1</span>
                  <span className="text-sm text-slate-300">SLM (90% of queries) - PII stays local</span>
                </div>
                <div className="flex items-center justify-between text-center bg-green-500/5 rounded-lg p-3">
                  {[
                    { label: 'Customer', icon: '👤', color: 'border-blue-500' },
                    { label: 'SLM (Local)', icon: '🏠', color: 'border-green-500' },
                    { label: 'Response', icon: '✅', color: 'border-green-500' },
                  ].map((item, index) => (
                    <div key={item.label} className="flex items-center">
                      <div className={`p-2 rounded-lg border ${item.color} bg-slate-900/50`}>
                        <div className="text-xl mb-1">{item.icon}</div>
                        <div className="text-xs text-slate-400">{item.label}</div>
                      </div>
                      {index < 2 && (
                        <svg className="w-5 h-5 text-green-600 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-green-400 mt-2 text-center">No PII scrubbing needed - data never leaves your environment</p>
              </div>

              {/* Tier 2: LLM Path */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 text-xs rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">TIER 2</span>
                  <span className="text-sm text-slate-300">External LLM (Complex queries) - PII scrubbed</span>
                </div>
                <div className="flex items-center justify-between text-center bg-orange-500/5 rounded-lg p-3">
                  {[
                    { label: 'Customer', icon: '👤', color: 'border-blue-500' },
                    { label: 'PII Detect', icon: '🔍', color: 'border-yellow-500' },
                    { label: 'Redact', icon: '🛡️', color: 'border-red-500' },
                    { label: 'LLM (Cloud)', icon: '☁️', color: 'border-purple-500' },
                    { label: 'Restore', icon: '✅', color: 'border-green-500' },
                  ].map((item, index) => (
                    <div key={item.label} className="flex items-center">
                      <div className={`p-2 rounded-lg border ${item.color} bg-slate-900/50`}>
                        <div className="text-xl mb-1">{item.icon}</div>
                        <div className="text-xs text-slate-400">{item.label}</div>
                      </div>
                      {index < 4 && (
                        <svg className="w-4 h-4 text-orange-600 mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-orange-400 mt-2 text-center">External LLM never sees real PII - only redacted placeholders</p>
              </div>
            </div>
          </div>

          {/* Audit Log Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Audit Log
              </h3>

              {auditLog.length === 0 ? (
                <p className="text-slate-500 text-sm">
                  No PII detections yet. Process a query to see the audit trail.
                </p>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {auditLog.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/30 text-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            entry.action === 'REDACTED'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}
                        >
                          {entry.action}
                        </span>
                        <span className="text-slate-500 text-xs">
                          {entry.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-slate-400 text-xs mb-1">
                        {entry.entitiesFound.length} entities found
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {entry.entitiesFound.map((entity, i) => (
                          <span
                            key={i}
                            className={`px-1.5 py-0.5 text-xs rounded ${piiColors[entity.type]}`}
                          >
                            {entity.type}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 p-3 rounded-lg bg-slate-900/30 border border-slate-700/30">
                <h4 className="text-sm font-medium text-white mb-2">Two-Tier Benefits</h4>
                <ul className="text-xs text-slate-400 space-y-1">
                  <li className="flex items-center gap-2">
                    <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    SLM: PII-safe by default
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    LLM: Auto-redaction
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Full audit trail
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    GDPR/HIPAA/PCI-DSS
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
