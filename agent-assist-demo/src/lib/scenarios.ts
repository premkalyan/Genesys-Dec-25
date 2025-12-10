// Demo Scenarios for Agent Assist
// C2: Enhanced with emotional arcs and sentiment tracking

import { ConversationScenario } from './types';

export const DEMO_SCENARIOS: ConversationScenario[] = [
  // ========== SCENARIO 1: Agent Copilot Troubleshooting (Frustrated → Relieved) ==========
  {
    id: 'agent-copilot-troubleshoot',
    name: 'Agent Copilot Troubleshooting',
    description: 'Frustrated customer - Agent Copilot suggestions not appearing',
    customer: {
      name: 'Sarah Johnson',
      tier: 'Platinum',
      issue: 'Agent Copilot',
      accountId: 'GC-2024-8842',
      previousInteractions: 3,
    },
    emotionalArc: {
      startSentiment: 'negative',
      peakMoment: 2, // Most frustrated when mentioning they already tried
      resolution: 'positive',
      description: 'Customer starts frustrated about a feature not working, becomes more frustrated when initial suggestions don\'t help, then relieved when solution is found.',
    },
    messages: [
      {
        role: 'customer',
        content: "Hi, I'm having trouble with Agent Copilot in our contact center.",
        delayMs: 0,
        expectedSentiment: 'neutral',
        emotionalNote: 'Opening - neutral inquiry, slight concern',
      },
      {
        role: 'customer',
        content: "The suggestions just aren't appearing during calls anymore. It was working fine last week.",
        delayMs: 3000,
        triggerKeywords: ['help', 'assist', 'issue'],
        expectedSentiment: 'negative',
        emotionalNote: 'Frustration building - feature stopped working unexpectedly',
      },
      {
        role: 'customer',
        content: "I've already checked that it's enabled in the queue settings. This is frustrating because our agents rely on it.",
        delayMs: 4000,
        triggerKeywords: ['check', 'threshold', 'settings'],
        expectedSentiment: 'negative',
        emotionalNote: 'PEAK FRUSTRATION - Already tried basic troubleshooting, expressing frustration',
      },
      {
        role: 'customer',
        content: "Where exactly do I find the NLU confidence threshold setting? I can't seem to locate it.",
        delayMs: 3500,
        triggerKeywords: ['NLU', 'confidence', 'navigate'],
        expectedSentiment: 'neutral',
        emotionalNote: 'Slightly calmer - engaged in problem-solving',
      },
      {
        role: 'customer',
        content: "Found it! The threshold was set to 0.9 - that must have been too high. I'll lower it to 0.6 and test.",
        delayMs: 5000,
        triggerKeywords: ['found', 'lower', '0.6'],
        expectedSentiment: 'neutral',
        emotionalNote: 'Relief emerging - found the issue',
      },
      {
        role: 'customer',
        content: "That fixed it! The suggestions are appearing now. Thank you so much for your help!",
        delayMs: 4000,
        triggerKeywords: ['working', 'fixed', 'thank'],
        expectedSentiment: 'positive',
        emotionalNote: 'RESOLUTION - Happy, grateful, issue resolved',
      },
    ],
  },

  // ========== SCENARIO 2: Skills-Based Routing Setup (Neutral → Satisfied) ==========
  {
    id: 'routing-setup',
    name: 'Skills-Based Routing Setup',
    description: 'Technical customer - needs help configuring skills-based routing',
    customer: {
      name: 'Michael Chen',
      tier: 'Gold',
      issue: 'Routing Configuration',
      accountId: 'GC-2024-5567',
      previousInteractions: 1,
    },
    emotionalArc: {
      startSentiment: 'neutral',
      peakMoment: 3, // Slight concern about customers waiting
      resolution: 'positive',
      description: 'Technical user starts neutral, has mild concern about edge cases, becomes satisfied as comprehensive solution is provided.',
    },
    messages: [
      {
        role: 'customer',
        content: "Hello, I need help setting up skills-based routing for our support team.",
        delayMs: 0,
        expectedSentiment: 'neutral',
        emotionalNote: 'Professional opening - seeking guidance',
      },
      {
        role: 'customer',
        content: "We have agents who specialize in different products - billing, technical support, and sales. How do I route calls to the right agents based on their expertise?",
        delayMs: 4000,
        triggerKeywords: ['skills', 'configure', 'setup'],
        expectedSentiment: 'neutral',
        emotionalNote: 'Engaged - explaining requirements',
      },
      {
        role: 'customer',
        content: "That makes sense. So I create skills first, then assign them to agents with proficiency levels. How do I set up the queue to use these skills?",
        delayMs: 3500,
        triggerKeywords: ['assign', 'agents', 'skills'],
        expectedSentiment: 'neutral',
        emotionalNote: 'Following along - confirming understanding',
      },
      {
        role: 'customer',
        content: "Got it. And what about if no agent with the required skill is available? We don't want customers waiting forever.",
        delayMs: 4000,
        triggerKeywords: ['overflow', 'bullseye', 'fallback'],
        expectedSentiment: 'neutral',
        emotionalNote: 'Slight concern - thinking about edge cases',
      },
      {
        role: 'customer',
        content: "Bullseye routing sounds perfect - start with best match and expand. What's the recommended timing for each ring?",
        delayMs: 3500,
        triggerKeywords: ['timing', 'ring', 'configuration'],
        expectedSentiment: 'neutral',
        emotionalNote: 'Satisfied with solution - seeking implementation details',
      },
      {
        role: 'customer',
        content: "This is really helpful. I have a clear plan now. I'll set this up and reach out if I have questions. Thanks!",
        delayMs: 3000,
        triggerKeywords: ['thank', 'helpful'],
        expectedSentiment: 'positive',
        emotionalNote: 'RESOLUTION - Grateful, confident to proceed',
      },
    ],
  },

  // ========== SCENARIO 3: Quality Management Setup (Positive Throughout) ==========
  {
    id: 'quality-management-setup',
    name: 'Quality Management Setup',
    description: 'Positive new customer - setting up evaluation forms and coaching',
    customer: {
      name: 'Emily Rodriguez',
      tier: 'Enterprise',
      issue: 'Quality Management',
      accountId: 'GC-2024-1234',
      previousInteractions: 0,
    },
    emotionalArc: {
      startSentiment: 'positive',
      peakMoment: 5, // Most excited at the end
      resolution: 'positive',
      description: 'Enthusiastic new customer, excited about the platform, stays positive throughout as features exceed expectations.',
    },
    messages: [
      {
        role: 'customer',
        content: "Hi! We just signed up for Genesys Cloud and I'm excited to set up our Quality Management program.",
        delayMs: 0,
        expectedSentiment: 'positive',
        emotionalNote: 'Enthusiastic opening - new customer excitement',
      },
      {
        role: 'customer',
        content: "I want to create evaluation forms for our agents. What are the best practices for designing effective forms?",
        delayMs: 3500,
        triggerKeywords: ['evaluation', 'forms', 'quality'],
        expectedSentiment: 'neutral',
        emotionalNote: 'Curious - seeking best practices',
      },
      {
        role: 'customer',
        content: "Great advice! I like the idea of keeping it focused. Can I add auto-fail questions for compliance issues?",
        delayMs: 4000,
        triggerKeywords: ['auto-fail', 'compliance', 'questions'],
        expectedSentiment: 'positive',
        emotionalNote: 'Pleased with guidance - exploring features',
      },
      {
        role: 'customer',
        content: "Perfect. Now, how do I connect evaluations to coaching? I want a closed-loop improvement process.",
        delayMs: 3500,
        triggerKeywords: ['coaching', 'improvement', 'sessions'],
        expectedSentiment: 'positive',
        emotionalNote: 'Strategic thinking - building comprehensive program',
      },
      {
        role: 'customer',
        content: "This is exactly what we need. Can I also use Speech Analytics to automatically flag interactions for review?",
        delayMs: 4000,
        triggerKeywords: ['speech', 'analytics', 'automatic'],
        expectedSentiment: 'positive',
        emotionalNote: 'Excited - discovering additional capabilities',
      },
      {
        role: 'customer',
        content: "Wonderful! This platform has everything we need. Thank you for the excellent guidance - I'm ready to get started!",
        delayMs: 3000,
        triggerKeywords: ['thank', 'wonderful', 'excellent'],
        expectedSentiment: 'positive',
        emotionalNote: 'PEAK ENTHUSIASM - Delighted, confident, ready to implement',
      },
    ],
  },

  // ========== SCENARIO 4: Escalation Flow (Angry → De-escalated) ==========
  {
    id: 'escalation-angry-customer',
    name: 'Escalation - Angry Customer',
    description: 'Very frustrated customer requiring supervisor escalation',
    customer: {
      name: 'Robert Williams',
      tier: 'Platinum',
      issue: 'System Outage',
      accountId: 'GC-2024-9911',
      previousInteractions: 5,
    },
    emotionalArc: {
      startSentiment: 'negative',
      peakMoment: 3, // Demanding supervisor immediately
      resolution: 'neutral',
      description: 'Customer starts very angry, escalates to peak frustration demanding supervisor, then de-escalates when request is honored and empathy is shown.',
    },
    messages: [
      {
        role: 'customer',
        content: "I've been trying to get this issue resolved for THREE DAYS now. This is unacceptable.",
        delayMs: 0,
        expectedSentiment: 'negative',
        emotionalNote: 'HOT ENTRY - Immediately expressing strong frustration',
      },
      {
        role: 'customer',
        content: "Our entire contact center has been down since Tuesday. We're losing thousands of dollars in revenue and I'm getting nowhere with support.",
        delayMs: 3000,
        triggerKeywords: ['escalate', 'urgent', 'critical'],
        expectedSentiment: 'negative',
        emotionalNote: 'Explaining severity - business impact, increasing frustration',
      },
      {
        role: 'customer',
        content: "I've already talked to 4 different agents. Each one tells me something different. I've been a Platinum customer for 3 years and this is how I'm treated?",
        delayMs: 4000,
        triggerKeywords: ['frustrated', 'different', 'agents'],
        expectedSentiment: 'negative',
        emotionalNote: 'Escalating anger - poor experience, loyalty not valued',
      },
      {
        role: 'customer',
        content: "I need to speak with a supervisor or technical lead RIGHT NOW. Not later, not tomorrow - NOW.",
        delayMs: 3500,
        triggerKeywords: ['supervisor', 'manager', 'escalate'],
        expectedSentiment: 'negative',
        emotionalNote: 'PEAK ANGER - Demanding immediate escalation, all caps emphasis',
      },
      {
        role: 'customer',
        content: "Thank you. Please make sure they have all the context from my previous calls. I don't want to repeat myself again.",
        delayMs: 4000,
        triggerKeywords: ['context', 'transfer', 'history'],
        expectedSentiment: 'neutral',
        emotionalNote: 'De-escalating - request honored, now focused on solution',
      },
      {
        role: 'customer',
        content: "I appreciate you taking this seriously. I'll wait for the supervisor. Thank you for understanding.",
        delayMs: 3500,
        triggerKeywords: ['appreciate', 'thank', 'understand'],
        expectedSentiment: 'neutral',
        emotionalNote: 'RESOLVED ESCALATION - Calmed down, appreciates being heard',
      },
    ],
  },

  // ========== SCENARIO 5: Billing Dispute (Angry → Satisfied) ==========
  {
    id: 'billing-dispute',
    name: 'Billing Dispute',
    description: 'Frustrated customer disputing unexpected charges on their invoice',
    customer: {
      name: 'Jennifer Martinez',
      tier: 'Enterprise',
      issue: 'Billing Issue',
      accountId: 'GC-2024-4421',
      previousInteractions: 2,
    },
    emotionalArc: {
      startSentiment: 'negative',
      peakMoment: 2, // Most upset when explaining financial impact
      resolution: 'positive',
      description: 'Customer starts upset about billing, peaks when explaining the charge impact, then satisfied when credit is applied and explanation given.',
    },
    messages: [
      {
        role: 'customer',
        content: "Hi, I just received our monthly invoice and there are charges I don't recognize. This is the second time this has happened.",
        delayMs: 0,
        expectedSentiment: 'negative',
        emotionalNote: 'Opening - Frustrated, recurring issue',
      },
      {
        role: 'customer',
        content: "There's a $2,500 charge for 'Premium Analytics Add-on' that we never ordered. I need this resolved immediately - our CFO is asking questions.",
        delayMs: 3500,
        triggerKeywords: ['billing', 'charge', 'invoice'],
        expectedSentiment: 'negative',
        emotionalNote: 'Escalating - explaining specific issue, business pressure',
      },
      {
        role: 'customer',
        content: "This is really frustrating. We've been customers for over a year and I feel like I have to audit every invoice. That's not how a partnership should work.",
        delayMs: 4000,
        triggerKeywords: ['frustrating', 'disappointed', 'issue'],
        expectedSentiment: 'negative',
        emotionalNote: 'PEAK FRUSTRATION - Trust eroding, questioning relationship',
      },
      {
        role: 'customer',
        content: "Can you tell me exactly when this add-on was supposedly activated? We definitely didn't request it through our admin console.",
        delayMs: 3500,
        triggerKeywords: ['when', 'activated', 'request'],
        expectedSentiment: 'neutral',
        emotionalNote: 'Seeking information - calmer, focused on facts',
      },
      {
        role: 'customer',
        content: "I see. So it was a system error during the platform update. Can you process a credit for this charge and ensure it doesn't happen again?",
        delayMs: 4000,
        triggerKeywords: ['credit', 'refund', 'process'],
        expectedSentiment: 'neutral',
        emotionalNote: 'Solution-focused - understanding the issue, requesting resolution',
      },
      {
        role: 'customer',
        content: "Thank you for handling this so quickly. The credit and explanation help. Please escalate the system issue to prevent this for other customers.",
        delayMs: 3500,
        triggerKeywords: ['thank', 'appreciate', 'helpful'],
        expectedSentiment: 'positive',
        emotionalNote: 'RESOLUTION - Satisfied, appreciates quick resolution, caring about others',
      },
    ],
  },

  // ========== SCENARIO 6: New Feature Request (Positive → Very Positive) ==========
  {
    id: 'new-feature-inquiry',
    name: 'New Feature Inquiry',
    description: 'Enthusiastic customer asking about new platform capabilities',
    customer: {
      name: 'David Thompson',
      tier: 'Gold',
      issue: 'Feature Inquiry',
      accountId: 'GC-2024-7788',
      previousInteractions: 0,
    },
    emotionalArc: {
      startSentiment: 'positive',
      peakMoment: 4, // Most excited discovering AI capabilities
      resolution: 'positive',
      description: 'Customer starts curious about new features, becomes increasingly excited as capabilities exceed expectations, leaves very enthusiastic.',
    },
    messages: [
      {
        role: 'customer',
        content: "Hi there! I heard Genesys recently released some new AI features. I'd love to learn what's available for our contact center.",
        delayMs: 0,
        expectedSentiment: 'positive',
        emotionalNote: 'Opening - Curious, eager to learn',
      },
      {
        role: 'customer',
        content: "We're particularly interested in anything that can help our agents be more efficient. What's new with Agent Assist and knowledge suggestions?",
        delayMs: 3500,
        triggerKeywords: ['agent', 'assist', 'suggestions'],
        expectedSentiment: 'positive',
        emotionalNote: 'Engaged - specific interest in agent productivity',
      },
      {
        role: 'customer',
        content: "Real-time knowledge cards and suggested responses? That sounds incredible! Does it integrate with our existing knowledge base?",
        delayMs: 4000,
        triggerKeywords: ['knowledge', 'integrate', 'base'],
        expectedSentiment: 'positive',
        emotionalNote: 'Excited - features exceeding expectations',
      },
      {
        role: 'customer',
        content: "What about predictive engagement? I've heard you can now predict customer intent and route them proactively. Is that available to us?",
        delayMs: 3500,
        triggerKeywords: ['predictive', 'engagement', 'intent'],
        expectedSentiment: 'positive',
        emotionalNote: 'Very interested - exploring advanced capabilities',
      },
      {
        role: 'customer',
        content: "This is amazing! AI-powered sentiment analysis, predictive routing, AND automated quality scoring? Our executives are going to love this roadmap.",
        delayMs: 4000,
        triggerKeywords: ['amazing', 'love', 'excellent'],
        expectedSentiment: 'positive',
        emotionalNote: 'PEAK EXCITEMENT - Overwhelmed with capabilities',
      },
      {
        role: 'customer',
        content: "Can you send me documentation on all these AI features? I want to put together a proposal for expanding our Genesys implementation. Thank you so much!",
        delayMs: 3500,
        triggerKeywords: ['documentation', 'thank', 'proposal'],
        expectedSentiment: 'positive',
        emotionalNote: 'RESOLUTION - Highly engaged, ready to expand, grateful',
      },
    ],
  },
];

export function getScenario(id: string): ConversationScenario | undefined {
  return DEMO_SCENARIOS.find(s => s.id === id);
}

export function getDefaultScenario(): ConversationScenario {
  return DEMO_SCENARIOS[0];
}

// Helper to get emotional context for current message
export function getEmotionalContext(scenario: ConversationScenario, messageIndex: number): {
  expectedSentiment: string;
  emotionalNote: string;
  isEscalationPoint: boolean;
  arcPhase: 'opening' | 'building' | 'peak' | 'resolving' | 'resolved';
} {
  const message = scenario.messages[messageIndex];
  const totalMessages = scenario.messages.length;
  const arc = scenario.emotionalArc;

  let arcPhase: 'opening' | 'building' | 'peak' | 'resolving' | 'resolved';
  if (messageIndex === 0) {
    arcPhase = 'opening';
  } else if (arc && messageIndex === arc.peakMoment) {
    arcPhase = 'peak';
  } else if (arc && messageIndex < arc.peakMoment) {
    arcPhase = 'building';
  } else if (messageIndex === totalMessages - 1) {
    arcPhase = 'resolved';
  } else {
    arcPhase = 'resolving';
  }

  return {
    expectedSentiment: message.expectedSentiment || 'neutral',
    emotionalNote: message.emotionalNote || '',
    isEscalationPoint: arc ? messageIndex === arc.peakMoment : false,
    arcPhase,
  };
}
