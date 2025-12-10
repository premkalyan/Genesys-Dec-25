'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface MetricComparison {
  label: string;
  withoutAI: string | number;
  withAI: string | number;
  improvement: string;
  unit?: string;
}

const metrics: MetricComparison[] = [
  {
    label: 'Average Handle Time',
    withoutAI: '7:30',
    withAI: '5:15',
    improvement: '-30%',
    unit: 'min:sec',
  },
  {
    label: 'First Contact Resolution',
    withoutAI: '65%',
    withAI: '82%',
    improvement: '+17%',
  },
  {
    label: 'Agent Onboarding Time',
    withoutAI: '6 weeks',
    withAI: '3 weeks',
    improvement: '-50%',
  },
  {
    label: 'Knowledge Search Time',
    withoutAI: '45 sec',
    withAI: '< 1 sec',
    improvement: '-98%',
  },
  {
    label: 'Customer Satisfaction',
    withoutAI: '3.8/5',
    withAI: '4.5/5',
    improvement: '+18%',
  },
  {
    label: 'Escalation Rate',
    withoutAI: '18%',
    withAI: '8%',
    improvement: '-56%',
  },
];

interface TimelineEvent {
  time: string;
  withoutAI: string;
  withAI: string;
  highlight?: 'better' | 'worse' | 'neutral';
}

const timeline: TimelineEvent[] = [
  {
    time: '0:00',
    withoutAI: 'Customer connects',
    withAI: 'Customer connects',
    highlight: 'neutral',
  },
  {
    time: '0:15',
    withoutAI: 'Agent reads customer history...',
    withAI: 'AI surfaces context + sentiment instantly',
    highlight: 'better',
  },
  {
    time: '0:45',
    withoutAI: 'Agent still searching knowledge base',
    withAI: 'AI shows relevant KB articles automatically',
    highlight: 'better',
  },
  {
    time: '1:30',
    withoutAI: 'Agent types response manually',
    withAI: 'Agent clicks suggested response',
    highlight: 'better',
  },
  {
    time: '2:00',
    withoutAI: 'Customer repeats issue (agent missed context)',
    withAI: 'AI tracks full conversation, no repetition needed',
    highlight: 'better',
  },
  {
    time: '3:00',
    withoutAI: 'Agent looks up policy document',
    withAI: 'AI shows policy with citation',
    highlight: 'better',
  },
  {
    time: '4:30',
    withoutAI: 'Agent unsure, considers escalation',
    withAI: 'AI provides confidence score, suggests next action',
    highlight: 'better',
  },
  {
    time: '6:00',
    withoutAI: 'Agent wrapping up (if not escalated)',
    withAI: 'Issue resolved 2 minutes ago',
    highlight: 'better',
  },
  {
    time: '7:30',
    withoutAI: 'Call ends',
    withAI: 'Agent already helped next customer',
    highlight: 'better',
  },
];

export default function ComparePage() {
  const [activeTimeline, setActiveTimeline] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (isPlaying && activeTimeline < timeline.length - 1) {
      const timer = setTimeout(() => {
        setActiveTimeline(prev => prev + 1);
      }, 2000);
      return () => clearTimeout(timer);
    } else if (activeTimeline >= timeline.length - 1) {
      setIsPlaying(false);
    }
  }, [isPlaying, activeTimeline]);

  return (
    <div className="min-h-screen bg-[#0F0F1A]">
      {/* Header */}
      <header className="gcx-header">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-[#9999B3] hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">Without AI vs With AI</h1>
                <p className="text-sm text-[#9999B3]">Side-by-side comparison of agent experience</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Metrics Grid */}
        <div className="mb-12">
          <h2 className="text-lg font-semibold text-white mb-6">Key Metrics Comparison</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="bg-[#1E1E3F] border border-[#3D3D5C] rounded-xl p-5 hover:border-[#FF4F1F]/50 transition-colors"
              >
                <div className="text-sm text-[#9999B3] mb-4">{metric.label}</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-[#9999B3] mb-1">Without AI</div>
                    <div className="text-2xl font-bold text-[#FF4D4D]">{metric.withoutAI}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#9999B3] mb-1">With AI</div>
                    <div className="text-2xl font-bold text-[#00D084]">{metric.withAI}</div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-[#3D3D5C] flex items-center justify-center">
                  <span className={`text-lg font-bold ${
                    metric.improvement.startsWith('+') || metric.improvement.startsWith('-5') || metric.improvement.startsWith('-9') || metric.improvement.startsWith('-3')
                      ? 'text-[#00D084]'
                      : 'text-[#FF4D4D]'
                  }`}>
                    {metric.improvement}
                  </span>
                  <span className="text-sm text-[#9999B3] ml-2">improvement</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Comparison */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Interaction Timeline</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setActiveTimeline(0);
                  setIsPlaying(true);
                }}
                className="gcx-btn-primary flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                </svg>
                Play Timeline
              </button>
              <button
                onClick={() => setActiveTimeline(0)}
                className="gcx-btn-secondary"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Without AI Column */}
            <div className="bg-[#1E1E3F] border border-[#FF4D4D]/30 rounded-xl overflow-hidden">
              <div className="bg-[#FF4D4D]/10 px-5 py-3 border-b border-[#3D3D5C]">
                <h3 className="font-semibold text-[#FF4D4D]">Without AI Assist</h3>
                <p className="text-xs text-[#9999B3]">Traditional agent workflow</p>
              </div>
              <div className="p-5 space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                {timeline.map((event, index) => (
                  <div
                    key={index}
                    className={`flex gap-4 transition-all duration-300 ${
                      index <= activeTimeline ? 'opacity-100' : 'opacity-30'
                    }`}
                  >
                    <div className="w-12 text-xs text-[#9999B3] font-mono pt-1">{event.time}</div>
                    <div className={`flex-1 p-3 rounded-lg ${
                      index === activeTimeline
                        ? 'bg-[#FF4D4D]/20 border border-[#FF4D4D]/50'
                        : 'bg-[#252542]'
                    }`}>
                      <p className="text-sm text-[#E8E8F0]">{event.withoutAI}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* With AI Column */}
            <div className="bg-[#1E1E3F] border border-[#00D084]/30 rounded-xl overflow-hidden">
              <div className="bg-[#00D084]/10 px-5 py-3 border-b border-[#3D3D5C]">
                <h3 className="font-semibold text-[#00D084]">With AI Assist</h3>
                <p className="text-xs text-[#9999B3]">AI-powered agent workflow</p>
              </div>
              <div className="p-5 space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                {timeline.map((event, index) => (
                  <div
                    key={index}
                    className={`flex gap-4 transition-all duration-300 ${
                      index <= activeTimeline ? 'opacity-100' : 'opacity-30'
                    }`}
                  >
                    <div className="w-12 text-xs text-[#9999B3] font-mono pt-1">{event.time}</div>
                    <div className={`flex-1 p-3 rounded-lg ${
                      index === activeTimeline
                        ? 'bg-[#00D084]/20 border border-[#00D084]/50'
                        : 'bg-[#252542]'
                    }`}>
                      <p className="text-sm text-[#E8E8F0]">{event.withAI}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ROI Summary */}
        <div className="bg-gradient-to-br from-[#FF4F1F]/10 to-[#00D084]/10 border border-[#3D3D5C] rounded-xl p-8">
          <h2 className="text-xl font-bold text-white mb-6 text-center">Bottom Line Impact</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-[#00D084]">30%</div>
              <div className="text-sm text-[#9999B3] mt-2">Faster Resolution</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-[#00D084]">2x</div>
              <div className="text-sm text-[#9999B3] mt-2">Agent Productivity</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-[#00D084]">56%</div>
              <div className="text-sm text-[#9999B3] mt-2">Fewer Escalations</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-[#00D084]">$1.2M</div>
              <div className="text-sm text-[#9999B3] mt-2">Annual Savings*</div>
            </div>
          </div>
          <p className="text-xs text-[#9999B3] text-center mt-6">
            *Based on 500-seat contact center with 100K monthly interactions
          </p>
        </div>
      </div>
    </div>
  );
}
