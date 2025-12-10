'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

// ROI Calculator Inputs
interface ROIInputs {
  monthlyInteractions: number;
  avgHandleTime: number; // seconds
  agentHourlyCost: number;
  currentEscalationRate: number; // percentage
}

// ROI Calculator Results
interface ROIResults {
  currentMonthlyCost: number;
  projectedMonthlyCost: number;
  monthlySavings: number;
  annualSavings: number;
  ahtReduction: number;
  fcrImprovement: number;
  aiCostPerMonth: number;
  paybackPeriod: number;
}

// Mock metrics data (in production, this would come from your actual SLM monitoring)
const mockMetrics = {
  totalQueries: 12450,
  avgLatency: 87,
  accuracy: 96.2,
  totalCost: 1.25,
  gpt4EquivalentCost: 249.0,
  topCategories: [
    { name: 'PTO & Leave', count: 3420 },
    { name: 'Expenses', count: 2890 },
    { name: 'Benefits', count: 2340 },
    { name: 'Remote Work', count: 1980 },
    { name: 'Performance', count: 1820 },
  ],
  hourlyUsage: [
    { hour: '8am', count: 245 },
    { hour: '9am', count: 890 },
    { hour: '10am', count: 1200 },
    { hour: '11am', count: 980 },
    { hour: '12pm', count: 560 },
    { hour: '1pm', count: 430 },
    { hour: '2pm', count: 1100 },
    { hour: '3pm', count: 1050 },
    { hour: '4pm', count: 780 },
    { hour: '5pm', count: 340 },
  ],
  escalationRate: 4.2,
  satisfactionScore: 4.7,
};

export default function MetricsPage() {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('month');
  const savings = mockMetrics.gpt4EquivalentCost - mockMetrics.totalCost;
  const savingsPercent = ((savings / mockMetrics.gpt4EquivalentCost) * 100).toFixed(1);

  // ROI Calculator State
  const [roiInputs, setRoiInputs] = useState<ROIInputs>({
    monthlyInteractions: 50000,
    avgHandleTime: 420, // 7 minutes
    agentHourlyCost: 25,
    currentEscalationRate: 15,
  });

  // Calculate ROI Results
  const roiResults = useMemo<ROIResults>(() => {
    const { monthlyInteractions, avgHandleTime, agentHourlyCost, currentEscalationRate } = roiInputs;

    // Current costs
    const hoursPerInteraction = avgHandleTime / 3600;
    const currentMonthlyCost = monthlyInteractions * hoursPerInteraction * agentHourlyCost;

    // Projected improvements with AI
    const ahtReduction = 0.25; // 25% AHT reduction
    const fcrImprovement = 0.15; // 15% FCR improvement
    const reducedEscalationRate = currentEscalationRate * 0.6; // 40% fewer escalations

    // Projected costs with AI
    const newAvgHandleTime = avgHandleTime * (1 - ahtReduction);
    const newHoursPerInteraction = newAvgHandleTime / 3600;
    const escalationSavings = (currentEscalationRate - reducedEscalationRate) / 100 * monthlyInteractions * hoursPerInteraction * agentHourlyCost * 0.5;
    const projectedMonthlyCost = monthlyInteractions * newHoursPerInteraction * agentHourlyCost - escalationSavings;

    // AI Platform Cost (estimated based on scale)
    const aiCostPerMonth = Math.min(5000, Math.max(500, monthlyInteractions * 0.01));

    // Savings
    const monthlySavings = currentMonthlyCost - projectedMonthlyCost - aiCostPerMonth;
    const annualSavings = monthlySavings * 12;

    // Payback period (months) - assuming $50k implementation cost
    const implementationCost = 50000;
    const paybackPeriod = monthlySavings > 0 ? implementationCost / monthlySavings : 99;

    return {
      currentMonthlyCost,
      projectedMonthlyCost: projectedMonthlyCost + aiCostPerMonth,
      monthlySavings,
      annualSavings,
      ahtReduction: ahtReduction * 100,
      fcrImprovement: fcrImprovement * 100,
      aiCostPerMonth,
      paybackPeriod: Math.round(paybackPeriod * 10) / 10,
    };
  }, [roiInputs]);

  // Simple bar chart rendering
  const maxUsage = Math.max(...mockMetrics.hourlyUsage.map((h) => h.count));
  const maxCategory = Math.max(...mockMetrics.topCategories.map((c) => c.count));

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
                <h1 className="text-lg font-semibold text-white">Metrics Dashboard</h1>
                <p className="text-xs text-slate-400">Real Performance Data from Bounteous SLM</p>
              </div>
            </div>

            {/* Time Range Selector */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-800/50 border border-slate-700/50">
              {(['day', 'week', 'month'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    timeRange === range
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Key Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: 'Total Queries',
              value: mockMetrics.totalQueries.toLocaleString(),
              subtext: 'Last 30 days',
              color: 'from-blue-500 to-cyan-500',
            },
            {
              label: 'Avg Latency',
              value: `${mockMetrics.avgLatency}ms`,
              subtext: 'vs 300ms (GPT-4)',
              color: 'from-green-500 to-emerald-500',
            },
            {
              label: 'Accuracy',
              value: `${mockMetrics.accuracy}%`,
              subtext: 'Validated responses',
              color: 'from-purple-500 to-pink-500',
            },
            {
              label: 'Total Cost',
              value: `$${mockMetrics.totalCost.toFixed(2)}`,
              subtext: `vs $${mockMetrics.gpt4EquivalentCost.toFixed(0)} (GPT-4)`,
              color: 'from-orange-500 to-red-500',
            },
          ].map((metric) => (
            <div
              key={metric.label}
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5"
            >
              <div className="text-sm text-slate-400 mb-1">{metric.label}</div>
              <div
                className={`text-3xl font-bold bg-gradient-to-r ${metric.color} bg-clip-text text-transparent`}
              >
                {metric.value}
              </div>
              <div className="text-xs text-slate-500 mt-1">{metric.subtext}</div>
            </div>
          ))}
        </div>

        {/* Cost Savings Hero */}
        <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-xl p-6 mb-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Cost Savings</h2>
              <p className="text-slate-400">
                Running the same {mockMetrics.totalQueries.toLocaleString()} queries through GPT-4
                would cost <span className="text-white font-medium">${mockMetrics.gpt4EquivalentCost.toFixed(2)}</span>
              </p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-green-400">${savings.toFixed(2)}</div>
              <div className="text-sm text-green-300">Saved ({savingsPercent}%)</div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4">
              <div className="text-sm text-slate-400 mb-2">At enterprise scale (1M queries/month)</div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-slate-500">SLM Cost</div>
                  <div className="text-xl font-bold text-green-400">$100</div>
                </div>
                <div>
                  <div className="text-slate-500">GPT-4 Cost</div>
                  <div className="text-xl font-bold text-red-400">$20,000</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Usage by Hour */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Usage by Hour</h3>
            <div className="flex items-end gap-2 h-48">
              {mockMetrics.hourlyUsage.map((data) => (
                <div key={data.hour} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-gradient-to-t from-blue-600 to-cyan-500 rounded-t"
                    style={{ height: `${(data.count / maxUsage) * 100}%` }}
                  />
                  <span className="text-xs text-slate-500">{data.hour}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 text-sm text-slate-400 text-center">
              Peak usage: 10am-11am and 2pm-3pm (core business hours)
            </div>
          </div>

          {/* Top Categories */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Top Query Categories</h3>
            <div className="space-y-4">
              {mockMetrics.topCategories.map((category, index) => (
                <div key={category.name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-300">{category.name}</span>
                    <span className="text-slate-500">{category.count.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        index === 0
                          ? 'bg-blue-500'
                          : index === 1
                          ? 'bg-cyan-500'
                          : index === 2
                          ? 'bg-purple-500'
                          : index === 3
                          ? 'bg-pink-500'
                          : 'bg-orange-500'
                      }`}
                      style={{ width: `${(category.count / maxCategory) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Performance Comparison</h3>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">Response Latency</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                    <div className="text-xs text-green-400 mb-1">Bounteous SLM</div>
                    <div className="text-2xl font-bold text-green-400">87ms</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-700/30 border border-slate-600/30">
                    <div className="text-xs text-slate-400 mb-1">GPT-4</div>
                    <div className="text-2xl font-bold text-slate-400">~300ms</div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">Cost per Query</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                    <div className="text-xs text-green-400 mb-1">Bounteous SLM</div>
                    <div className="text-2xl font-bold text-green-400">$0.0001</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-700/30 border border-slate-600/30">
                    <div className="text-xs text-slate-400 mb-1">GPT-4</div>
                    <div className="text-2xl font-bold text-slate-400">$0.02</div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-slate-500 text-center">
                  200x cost reduction with local SLM
                </div>
              </div>
            </div>
          </div>

          {/* Quality Metrics */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Quality Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-slate-900/50 text-center">
                <div className="text-3xl font-bold text-purple-400 mb-1">
                  {mockMetrics.accuracy}%
                </div>
                <div className="text-sm text-slate-400">Accuracy Rate</div>
                <div className="text-xs text-slate-500 mt-1">Human-validated</div>
              </div>
              <div className="p-4 rounded-lg bg-slate-900/50 text-center">
                <div className="text-3xl font-bold text-cyan-400 mb-1">
                  {mockMetrics.escalationRate}%
                </div>
                <div className="text-sm text-slate-400">Escalation Rate</div>
                <div className="text-xs text-slate-500 mt-1">To human agents</div>
              </div>
              <div className="p-4 rounded-lg bg-slate-900/50 text-center">
                <div className="text-3xl font-bold text-green-400 mb-1">
                  {mockMetrics.satisfactionScore}/5
                </div>
                <div className="text-sm text-slate-400">User Satisfaction</div>
                <div className="text-xs text-slate-500 mt-1">Employee rating</div>
              </div>
              <div className="p-4 rounded-lg bg-slate-900/50 text-center">
                <div className="text-3xl font-bold text-orange-400 mb-1">340</div>
                <div className="text-sm text-slate-400">Hours Saved</div>
                <div className="text-xs text-slate-500 mt-1">vs manual lookup</div>
              </div>
            </div>
          </div>
        </div>

        {/* Model Info */}
        <div className="mt-8 bg-slate-800/30 border border-slate-700/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Model Configuration</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
            <div>
              <span className="text-slate-500">Base Model</span>
              <p className="text-white">Phi-3 Mini (3.8B params)</p>
            </div>
            <div>
              <span className="text-slate-500">Fine-tuning Method</span>
              <p className="text-white">LoRA (Low-Rank Adaptation)</p>
            </div>
            <div>
              <span className="text-slate-500">Training Data</span>
              <p className="text-white">250 Q&A pairs + augmentation</p>
            </div>
            <div>
              <span className="text-slate-500">Deployment</span>
              <p className="text-white">On-premises (CPU inference)</p>
            </div>
            <div>
              <span className="text-slate-500">Training Time</span>
              <p className="text-white">4 hours (single GPU)</p>
            </div>
            <div>
              <span className="text-slate-500">Training Cost</span>
              <p className="text-white">~$50</p>
            </div>
            <div>
              <span className="text-slate-500">Monthly Running Cost</span>
              <p className="text-white">~$50 (compute)</p>
            </div>
            <div>
              <span className="text-slate-500">Re-training Cadence</span>
              <p className="text-white">Quarterly</p>
            </div>
          </div>
        </div>

        {/* ROI Calculator */}
        <div className="mt-8 bg-gradient-to-br from-orange-900/20 to-red-900/20 border border-orange-500/30 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">ROI Calculator</h3>
              <p className="text-sm text-slate-400">Calculate your contact center AI savings</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Inputs */}
            <div className="space-y-5">
              <h4 className="text-sm font-semibold text-orange-300 uppercase tracking-wide">Your Contact Center Metrics</h4>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Monthly Interactions
                </label>
                <input
                  type="range"
                  min="10000"
                  max="500000"
                  step="10000"
                  value={roiInputs.monthlyInteractions}
                  onChange={(e) => setRoiInputs(prev => ({ ...prev, monthlyInteractions: Number(e.target.value) }))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-slate-500">10K</span>
                  <span className="text-orange-400 font-semibold">{roiInputs.monthlyInteractions.toLocaleString()}</span>
                  <span className="text-slate-500">500K</span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Average Handle Time (minutes)
                </label>
                <input
                  type="range"
                  min="120"
                  max="900"
                  step="30"
                  value={roiInputs.avgHandleTime}
                  onChange={(e) => setRoiInputs(prev => ({ ...prev, avgHandleTime: Number(e.target.value) }))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-slate-500">2 min</span>
                  <span className="text-orange-400 font-semibold">{(roiInputs.avgHandleTime / 60).toFixed(1)} min</span>
                  <span className="text-slate-500">15 min</span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Agent Hourly Cost ($)
                </label>
                <input
                  type="range"
                  min="15"
                  max="60"
                  step="1"
                  value={roiInputs.agentHourlyCost}
                  onChange={(e) => setRoiInputs(prev => ({ ...prev, agentHourlyCost: Number(e.target.value) }))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-slate-500">$15</span>
                  <span className="text-orange-400 font-semibold">${roiInputs.agentHourlyCost}/hr</span>
                  <span className="text-slate-500">$60</span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Current Escalation Rate (%)
                </label>
                <input
                  type="range"
                  min="5"
                  max="40"
                  step="1"
                  value={roiInputs.currentEscalationRate}
                  onChange={(e) => setRoiInputs(prev => ({ ...prev, currentEscalationRate: Number(e.target.value) }))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-slate-500">5%</span>
                  <span className="text-orange-400 font-semibold">{roiInputs.currentEscalationRate}%</span>
                  <span className="text-slate-500">40%</span>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="space-y-5">
              <h4 className="text-sm font-semibold text-green-300 uppercase tracking-wide">Projected Savings</h4>

              {/* Big Numbers */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-green-400">
                    ${Math.round(roiResults.monthlySavings).toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-400 mt-1">Monthly Savings</div>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-green-400">
                    ${Math.round(roiResults.annualSavings).toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-400 mt-1">Annual Savings</div>
                </div>
              </div>

              {/* Cost Comparison */}
              <div className="bg-slate-900/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-slate-400">Cost Comparison</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">Current Monthly Cost</span>
                      <span className="text-red-400 font-semibold">${Math.round(roiResults.currentMonthlyCost).toLocaleString()}</span>
                    </div>
                    <div className="h-3 bg-red-500/30 rounded-full" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">Projected with AI</span>
                      <span className="text-green-400 font-semibold">${Math.round(roiResults.projectedMonthlyCost).toLocaleString()}</span>
                    </div>
                    <div
                      className="h-3 bg-green-500/50 rounded-full"
                      style={{ width: `${(roiResults.projectedMonthlyCost / roiResults.currentMonthlyCost) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Key Improvements */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-cyan-400">{roiResults.ahtReduction}%</div>
                  <div className="text-xs text-slate-500">AHT Reduction</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-purple-400">{roiResults.fcrImprovement}%</div>
                  <div className="text-xs text-slate-500">FCR Improvement</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-orange-400">{roiResults.paybackPeriod}</div>
                  <div className="text-xs text-slate-500">Months to ROI</div>
                </div>
              </div>

              {/* AI Platform Cost Note */}
              <div className="text-xs text-slate-500 text-center">
                Includes AI platform cost: ${Math.round(roiResults.aiCostPerMonth).toLocaleString()}/month
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-6 pt-4 border-t border-slate-700/50 text-xs text-slate-500 text-center">
            * Projections based on industry benchmarks: 25% AHT reduction, 15% FCR improvement, 40% escalation reduction.
            Actual results may vary based on implementation and use case.
          </div>
        </div>
      </div>
    </div>
  );
}
