'use client';

import Link from 'next/link';

const demos = [
  {
    title: 'SLM Chat Demo',
    description: 'Local SLM for fast, private queries. PII-safe by default since data never leaves your environment.',
    href: '/chat',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    stats: ['87ms avg latency', '$0.0001/query', 'PII-safe local'],
    color: 'from-blue-500 to-cyan-500',
  },
  {
    title: 'PII Protection',
    description: 'When queries need external LLM power, PII is detected and scrubbed before leaving your environment.',
    href: '/pii',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    stats: ['LLM escalation', 'Auto-redaction', 'Full audit trail'],
    color: 'from-green-500 to-emerald-500',
  },
  {
    title: 'Agent Handoff',
    description: 'Watch how conversation context is packaged for seamless transfer to human agents.',
    href: '/handoff',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    stats: ['Zero repetition', 'Full context', 'Intent + sentiment'],
    color: 'from-purple-500 to-pink-500',
  },
  {
    title: 'Metrics Dashboard',
    description: 'Real-time analytics showing SLM performance, cost savings, and usage patterns.',
    href: '/metrics',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    stats: ['200x cost savings', 'Real-time metrics', 'ROI calculator'],
    color: 'from-orange-500 to-red-500',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <span className="text-white font-bold text-lg">B</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">Bounteous AI Layer</h1>
                <p className="text-sm text-slate-400">Enterprise AI Enhancement for Genesys Cloud</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                Production Ready
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Enterprise AI,{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Proven in Production
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Two-tier AI architecture: Local SLM for speed and privacy, External LLM for complex reasoning.
            Intelligent routing decides the optimal path for each query.
          </p>
        </div>

        {/* Stats Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-16">
          {[
            { value: '500+', label: 'Employees Using Daily' },
            { value: '87ms', label: 'Avg Response Time' },
            { value: '96.2%', label: 'Accuracy Rate' },
            { value: '$1.25', label: 'Monthly Cost' },
          ].map((stat) => (
            <div key={stat.label} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
              <div className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</div>
              <div className="text-sm text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Featured Demo - Unified Enterprise AI */}
        <div className="mb-6">
          <Link
            href="/unified-demo"
            className="group relative block bg-gradient-to-br from-purple-500/10 via-cyan-500/5 to-blue-500/10 border-2 border-purple-500/30 rounded-2xl p-8 hover:border-purple-500/50 transition-all hover:shadow-xl hover:shadow-purple-900/20"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 text-xs rounded bg-gradient-to-r from-purple-500/30 to-cyan-500/30 text-purple-300 font-semibold border border-purple-500/30">UNIFIED DEMO</span>
              <span className="text-xs text-slate-400">Complete Enterprise AI Pipeline</span>
            </div>
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white flex-shrink-0">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-semibold text-white mb-2 group-hover:text-purple-400 transition-colors">
                  Intelligent Routing + PII Protection
                </h3>
                <p className="text-slate-400 mb-4">
                  See the complete enterprise AI pipeline in action. Queries are analyzed, routed to SLM or LLM,
                  and sensitive data is automatically scrubbed before external processing. One demo, full protection.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Smart Routing', 'Auto PII Scrubbing', 'Dual-Model Architecture', 'Real-time Analysis'].map((stat) => (
                    <span key={stat} className="px-3 py-1 text-sm rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-purple-300 border border-purple-500/20">
                      {stat}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute top-8 right-8 text-slate-600 group-hover:text-purple-400 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>

        {/* Secondary Featured - Routing Deep Dive */}
        <div className="mb-8">
          <Link
            href="/smart-chat"
            className="group relative block bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 hover:border-purple-500/30 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 flex-shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white group-hover:text-purple-400 transition-colors">
                  Routing Analysis Deep Dive
                </h3>
                <p className="text-sm text-slate-400">
                  Explore the 8-factor weighted scoring system that decides SLM vs LLM routing
                </p>
              </div>
              <div className="text-slate-600 group-hover:text-purple-400 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        {/* Other Demo Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {demos.map((demo) => (
            <Link
              key={demo.href}
              href={demo.href}
              className="group relative bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 hover:border-slate-600 transition-all hover:shadow-xl hover:shadow-slate-900/50"
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${demo.color} flex items-center justify-center text-white mb-4`}>
                {demo.icon}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                {demo.title}
              </h3>
              <p className="text-slate-400 text-sm mb-4">{demo.description}</p>
              <div className="flex flex-wrap gap-2">
                {demo.stats.map((stat) => (
                  <span
                    key={stat}
                    className="px-2 py-1 text-xs rounded-full bg-slate-700/50 text-slate-300"
                  >
                    {stat}
                  </span>
                ))}
              </div>
              <div className="absolute top-6 right-6 text-slate-600 group-hover:text-slate-400 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Value Prop */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-slate-700/50">
        <h3 className="text-2xl font-bold text-white text-center mb-12">
          What Bounteous Adds to Genesys Cloud
        </h3>
        <div className="grid sm:grid-cols-3 gap-8">
          {[
            {
              title: 'Domain-Tuned SLM',
              description: 'Not generic LLMs — models fine-tuned on your specific policies, products, and tone.',
              genesys: 'AI Studio for generic flows',
              bounteous: 'Custom SLM per domain',
            },
            {
              title: 'PII Protection',
              description: 'Customer data never leaves your perimeter. Full audit trail for compliance.',
              genesys: 'Standard data handling',
              bounteous: 'On-prem redaction + audit',
            },
            {
              title: 'Cost Efficiency',
              description: '200x cheaper than GPT-4 at scale. Same accuracy, fraction of the cost.',
              genesys: 'Per-token pricing',
              bounteous: '$0.0001/query local SLM',
            },
          ].map((item) => (
            <div key={item.title} className="bg-slate-800/30 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-white mb-2">{item.title}</h4>
              <p className="text-slate-400 text-sm mb-4">{item.description}</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Genesys:</span>
                  <span className="text-slate-400">{item.genesys}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-400">+ Bounteous:</span>
                  <span className="text-blue-300">{item.bounteous}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-slate-500 text-sm">
          <p>Bounteous AI Enhancement Layer Demo | Integrates with Genesys Cloud CX</p>
        </div>
      </footer>
    </div>
  );
}
