'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import CustomerChat from '@/components/CustomerChat';
import AgentPanel from '@/components/AgentPanel';
import AIAssistPanel from '@/components/AIAssistPanel';
import { Message, AIAssistData, SentimentHistoryEntry, CustomerSentimentHistory, SentimentProvider } from '@/lib/types';
import { getAISuggestions, checkRAGHealth, getFallbackSuggestions, startHealthMonitor, stopHealthMonitor, getCustomerSentimentHistory } from '@/lib/rag-service';
import { DEMO_SCENARIOS, getDefaultScenario } from '@/lib/scenarios';

export default function AgentAssistPage() {
  const [scenario, setScenario] = useState(getDefaultScenario());
  const [messages, setMessages] = useState<Message[]>([]);
  const [aiData, setAiData] = useState<AIAssistData>({
    suggestions: ['Hello! How can I help you today?'],
    knowledgeCards: [],
    sentiment: 'neutral',
    latencyMs: 0,
  });
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
  const [isCustomerTyping, setIsCustomerTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ragConnected, setRagConnected] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [latency, setLatency] = useState(0);
  const [sentimentHistory, setSentimentHistory] = useState<SentimentHistoryEntry[]>([]);

  // Historical sentiment data state
  const [historicalData, setHistoricalData] = useState<CustomerSentimentHistory | null>(null);
  const [historyDays, setHistoryDays] = useState<30 | 60 | 90>(90);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sentimentProvider, setSentimentProvider] = useState<SentimentProvider>('vader');

  // C4: Auto-play mode state
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 0.5x, 1x, 1.5x, 2x
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoPlayProcessingRef = useRef<boolean>(false); // Prevent duplicate auto-sends
  const lastProcessedCustomerMsgId = useRef<string>(''); // Track which customer message we've responded to

  // C5: Custom message injection state
  const [showMessageInjector, setShowMessageInjector] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  // E5: Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  // Confetti state
  const [showConfetti, setShowConfetti] = useState(false);

  // D5: Demo analytics state
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({
    totalMessages: 0,
    customerMessages: 0,
    agentMessages: 0,
    suggestionsUsed: 0,
    quickActionsUsed: 0,
    avgResponseTimeMs: 0,
    responseTimes: [] as number[],
    sentimentJourney: [] as { sentiment: string; timestamp: Date }[],
    escalationTriggered: false,
    peakUrgency: 'low' as 'low' | 'medium' | 'high' | 'critical',
  });
  const lastCustomerMessageTime = useRef<Date | null>(null);

  // D4: Check RAG health with monitoring
  useEffect(() => {
    // Start health monitor with callback for connection changes
    startHealthMonitor(setRagConnected, 30000); // Check every 30 seconds

    // Cleanup on unmount
    return () => {
      stopHealthMonitor();
    };
  }, []);

  // Fetch historical sentiment data when scenario starts
  useEffect(() => {
    if (isRunning && !historicalData) {
      setLoadingHistory(true);
      // Use customer accountId as the customer ID for historical data
      const customerId = scenario.customer.accountId || 'CUST-12345';
      getCustomerSentimentHistory(customerId, historyDays)
        .then((data) => {
          setHistoricalData(data);
        })
        .finally(() => {
          setLoadingHistory(false);
        });
    }
  }, [isRunning, historicalData, historyDays, scenario.customer.accountId]);

  // Handle history days change
  const handleHistoryDaysChange = useCallback((days: 30 | 60 | 90) => {
    setHistoryDays(days);
    setLoadingHistory(true);
    const customerId = scenario.customer.accountId || 'CUST-12345';
    getCustomerSentimentHistory(customerId, days)
      .then((data) => {
        setHistoricalData(data);
      })
      .finally(() => {
        setLoadingHistory(false);
      });
  }, [scenario.customer.accountId]);

  // Get AI suggestions when new customer message arrives
  const fetchSuggestions = useCallback(async (customerMessage: string, msgIndex: number) => {
    const startTime = performance.now();
    setIsLoading(true);

    try {
      // Build conversation for context
      const conversation = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));
      conversation.push({ role: 'customer', content: customerMessage });

      // Extract customer message history for context
      const conversationHistory = messages
        .filter(m => m.role === 'customer')
        .map(m => m.content);

      let data: AIAssistData;

      if (ragConnected) {
        data = await getAISuggestions(conversation);
      } else {
        // Use fallback suggestions with conversation history and sentiment history
        data = getFallbackSuggestions(customerMessage, conversationHistory, sentimentHistory, msgIndex);
      }

      const elapsed = Math.round(performance.now() - startTime);
      setLatency(data.latencyMs || elapsed);
      setAiData(data);

      // Update sentiment history from response
      if (data.sentimentData?.history) {
        setSentimentHistory(data.sentimentData.history);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      const conversationHistory = messages
        .filter(m => m.role === 'customer')
        .map(m => m.content);
      const fallback = getFallbackSuggestions(customerMessage, conversationHistory, sentimentHistory, msgIndex);
      setAiData(fallback);
      if (fallback.sentimentData?.history) {
        setSentimentHistory(fallback.sentimentData.history);
      }
    } finally {
      setIsLoading(false);
    }
  }, [messages, ragConnected, sentimentHistory]);

  // Simulate customer message
  const sendCustomerMessage = useCallback((content: string, msgIndex?: number) => {
    const now = new Date();
    const newMessage: Message = {
      id: crypto.randomUUID(),
      role: 'customer',
      content,
      timestamp: now,
    };
    setMessages(prev => [...prev, newMessage]);
    const customerMsgCount = messages.filter(m => m.role === 'customer').length;
    fetchSuggestions(content, msgIndex ?? customerMsgCount);

    // D5: Track analytics
    lastCustomerMessageTime.current = now;
    setAnalyticsData(prev => ({
      ...prev,
      totalMessages: prev.totalMessages + 1,
      customerMessages: prev.customerMessages + 1,
    }));
  }, [fetchSuggestions, messages]);

  // Start the demo scenario
  const startScenario = useCallback(() => {
    setMessages([]);
    setCurrentMessageIndex(0);
    setIsRunning(true);
    setSentimentHistory([]); // Reset sentiment history
    setAiData({
      suggestions: ['Hello! How can I help you today?'],
      knowledgeCards: [],
      sentiment: 'neutral',
      latencyMs: 0,
    });

    // D5: Track session start
    setSessionStartTime(new Date());
    setAnalyticsData({
      totalMessages: 0,
      customerMessages: 0,
      agentMessages: 0,
      suggestionsUsed: 0,
      quickActionsUsed: 0,
      avgResponseTimeMs: 0,
      responseTimes: [],
      sentimentJourney: [],
      escalationTriggered: false,
      peakUrgency: 'low',
    });

    // Send first message after a short delay
    setTimeout(() => {
      const firstMsg = scenario.messages[0];
      if (firstMsg) {
        setIsCustomerTyping(true);
        setTimeout(() => {
          setIsCustomerTyping(false);
          sendCustomerMessage(firstMsg.content);
          setCurrentMessageIndex(1);
        }, 1500);
      }
    }, 500);
  }, [scenario, sendCustomerMessage]);

  // C3: Calculate realistic typing delay based on message length
  const calculateTypingDelay = useCallback((message: string): number => {
    // Average typing speed: 40 words per minute = ~200 chars per minute
    // So roughly 300ms per character, but capped for UX
    const charCount = message.length;
    const baseDelay = Math.min(charCount * 25, 4000); // Max 4 seconds
    const minDelay = 1200; // Minimum 1.2 seconds
    const variance = Math.random() * 800 - 400; // +/- 400ms variance
    return Math.max(minDelay, baseDelay + variance);
  }, []);

  // C3: Calculate reading/thinking delay before customer responds
  const calculateResponseDelay = useCallback((agentMessage: string, customerMessage: string): number => {
    // Time to read agent message + time to formulate response
    const readingTime = Math.min(agentMessage.length * 20, 2000);
    const thinkingTime = 500 + Math.random() * 1000;
    return readingTime + thinkingTime;
  }, []);

  // C4: Apply playback speed to delays
  const applySpeedMultiplier = useCallback((delay: number): number => {
    return Math.round(delay / playbackSpeed);
  }, [playbackSpeed]);

  // C4: Toggle pause
  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  // C4: Cycle playback speed
  const cycleSpeed = useCallback(() => {
    const speeds = [0.5, 1, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIndex]);
  }, [playbackSpeed]);

  // C5: Handle custom message injection
  const handleInjectMessage = useCallback(() => {
    if (customMessage.trim()) {
      setIsCustomerTyping(true);
      setTimeout(() => {
        setIsCustomerTyping(false);
        sendCustomerMessage(customMessage.trim());
        setCustomMessage('');
        setShowMessageInjector(false);
      }, 800);
    }
  }, [customMessage, sendCustomerMessage]);

  // C5: Preset messages for quick injection
  const presetMessages = [
    { label: 'Frustrated', message: "This is ridiculous! I've been waiting for hours and nothing works!" },
    { label: 'Technical', message: "I'm getting error code 500 when trying to configure the API integration." },
    { label: 'Escalation', message: "I need to speak to a supervisor right now. This is unacceptable." },
    { label: 'Happy', message: "That worked perfectly! Thank you so much for your help!" },
    { label: 'Question', message: "Can you explain how the bullseye routing actually works?" },
  ];

  // Handle agent sending a message
  const handleAgentSend = useCallback((content: string) => {
    const now = new Date();
    const newMessage: Message = {
      id: crypto.randomUUID(),
      role: 'agent',
      content,
      timestamp: now,
    };
    setMessages(prev => [...prev, newMessage]);

    // D5: Track analytics
    setAnalyticsData(prev => {
      const responseTime = lastCustomerMessageTime.current
        ? now.getTime() - lastCustomerMessageTime.current.getTime()
        : 0;
      const newResponseTimes = responseTime > 0 ? [...prev.responseTimes, responseTime] : prev.responseTimes;
      const avgResponse = newResponseTimes.length > 0
        ? Math.round(newResponseTimes.reduce((a, b) => a + b, 0) / newResponseTimes.length)
        : 0;

      // Check if this was a suggestion (compare against current suggestions)
      const wasSuggestion = aiData.suggestions.includes(content);

      return {
        ...prev,
        totalMessages: prev.totalMessages + 1,
        agentMessages: prev.agentMessages + 1,
        suggestionsUsed: wasSuggestion ? prev.suggestionsUsed + 1 : prev.suggestionsUsed,
        responseTimes: newResponseTimes,
        avgResponseTimeMs: avgResponse,
      };
    });

    // Trigger next customer message if available
    if (isRunning && currentMessageIndex < scenario.messages.length) {
      const nextMsg = scenario.messages[currentMessageIndex];
      // C3: Calculate realistic delays
      const responseDelay = calculateResponseDelay(content, nextMsg.content);
      const typingDelay = calculateTypingDelay(nextMsg.content);

      // C4: Apply speed multiplier to delays
      const adjustedResponseDelay = applySpeedMultiplier(Math.max(nextMsg.delayMs || 1500, responseDelay));
      const adjustedTypingDelay = applySpeedMultiplier(typingDelay);

      setTimeout(() => {
        setIsCustomerTyping(true);
        setTimeout(() => {
          setIsCustomerTyping(false);
          sendCustomerMessage(nextMsg.content, currentMessageIndex);
          setCurrentMessageIndex(prev => prev + 1);
        }, adjustedTypingDelay);
      }, adjustedResponseDelay);
    }
  }, [isRunning, currentMessageIndex, scenario.messages, sendCustomerMessage, calculateTypingDelay, calculateResponseDelay, applySpeedMultiplier, aiData.suggestions]);

  // Trigger confetti on scenario completion with positive resolution
  useEffect(() => {
    if (isRunning &&
        messages.length >= scenario.messages.length &&
        scenario.emotionalArc?.resolution === 'positive' &&
        !showConfetti) {
      // Small delay to let the last message appear
      const timer = setTimeout(() => {
        setShowConfetti(true);
        // Hide confetti after 4 seconds
        setTimeout(() => setShowConfetti(false), 4000);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isRunning, messages.length, scenario.messages.length, scenario.emotionalArc, showConfetti]);

  // D5: Track sentiment journey when aiData updates
  useEffect(() => {
    if (aiData.sentiment && isRunning) {
      setAnalyticsData(prev => {
        // Avoid duplicate entries for same sentiment
        const lastSentiment = prev.sentimentJourney[prev.sentimentJourney.length - 1];
        if (lastSentiment?.sentiment === aiData.sentiment) {
          return prev;
        }

        // Track urgency
        const urgencyLevels = ['low', 'medium', 'high', 'critical'];
        const currentUrgency = aiData.sentimentData?.urgency || 'low';
        const currentUrgencyIndex = urgencyLevels.indexOf(currentUrgency);
        const peakUrgencyIndex = urgencyLevels.indexOf(prev.peakUrgency);
        const newPeakUrgency = currentUrgencyIndex > peakUrgencyIndex
          ? currentUrgency as 'low' | 'medium' | 'high' | 'critical'
          : prev.peakUrgency;

        // Track escalation
        const hasEscalation = aiData.sentimentData?.escalationAlert !== undefined;

        return {
          ...prev,
          sentimentJourney: [
            ...prev.sentimentJourney,
            { sentiment: aiData.sentiment, timestamp: new Date() }
          ],
          peakUrgency: newPeakUrgency,
          escalationTriggered: prev.escalationTriggered || hasEscalation,
        };
      });
    }
  }, [aiData.sentiment, aiData.sentimentData, isRunning]);

  // C4: Auto-play effect - automatically send agent response after customer message
  useEffect(() => {
    // Find the last customer message
    const lastCustomerMsg = [...messages].reverse().find(m => m.role === 'customer');

    // Only auto-send if:
    // 1. Auto-play is on and not paused
    // 2. We're running and not loading
    // 3. We have suggestions
    // 4. There's a customer message we haven't responded to yet
    // 5. We're not already processing an auto-play response
    const shouldAutoSend = isAutoPlay &&
                           !isPaused &&
                           isRunning &&
                           !isLoading &&
                           aiData.suggestions.length > 0 &&
                           lastCustomerMsg &&
                           lastCustomerMsg.id !== lastProcessedCustomerMsgId.current &&
                           !autoPlayProcessingRef.current;

    if (shouldAutoSend && lastCustomerMsg) {
      // Clear any existing timeout
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current);
      }

      // Mark as processing and track this customer message
      autoPlayProcessingRef.current = true;
      lastProcessedCustomerMsgId.current = lastCustomerMsg.id;

      // Wait a bit then auto-send agent response
      const delay = applySpeedMultiplier(2000); // 2 seconds at 1x speed
      autoPlayTimeoutRef.current = setTimeout(() => {
        if (aiData.suggestions.length > 0) {
          handleAgentSend(aiData.suggestions[0]);
        }
        // Reset processing flag after send completes
        autoPlayProcessingRef.current = false;
      }, delay);
    }

    return () => {
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current);
      }
    };
  }, [isAutoPlay, isPaused, isRunning, isLoading, messages, aiData.suggestions, applySpeedMultiplier, handleAgentSend]);

  // Reset demo
  const resetDemo = () => {
    // C4: Clear any auto-play timeouts
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
    }
    setMessages([]);
    setCurrentMessageIndex(0);
    setIsRunning(false);
    setSelectedSuggestion(null);
    setSentimentHistory([]); // Reset sentiment history
    setHistoricalData(null); // Reset historical data
    // C4: Reset auto-play state
    setIsAutoPlay(false);
    setIsPaused(false);
    autoPlayProcessingRef.current = false; // Reset processing flag
    lastProcessedCustomerMsgId.current = ''; // Reset tracked message
    setAiData({
      suggestions: ['Hello! How can I help you today?'],
      knowledgeCards: [],
      sentiment: 'neutral',
      latencyMs: 0,
    });
  };

  // Export session data
  const exportSession = useCallback(() => {
    const sessionData = {
      exportedAt: new Date().toISOString(),
      scenario: {
        id: scenario.id,
        name: scenario.name,
        customer: scenario.customer,
      },
      conversation: messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString(),
      })),
      analytics: {
        sessionDuration: sessionStartTime
          ? Math.round((Date.now() - sessionStartTime.getTime()) / 1000)
          : 0,
        totalMessages: analyticsData.totalMessages,
        customerMessages: analyticsData.customerMessages,
        agentMessages: analyticsData.agentMessages,
        suggestionsUsed: analyticsData.suggestionsUsed,
        quickActionsUsed: analyticsData.quickActionsUsed,
        avgResponseTimeMs: analyticsData.avgResponseTimeMs,
        escalationTriggered: analyticsData.escalationTriggered,
        peakUrgency: analyticsData.peakUrgency,
      },
      sentimentJourney: sentimentHistory.map(s => ({
        sentiment: s.sentiment,
        score: s.score,
        timestamp: s.timestamp.toISOString(),
      })),
      aiPerformance: {
        ragConnected,
        lastLatencyMs: latency,
      },
    };

    // Create and download file
    const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `genesys-session-${scenario.id}-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [scenario, messages, sessionStartTime, analyticsData, sentimentHistory, ragConnected, latency]);

  // Keyboard shortcuts (must be after exportSession definition)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (isRunning && isAutoPlay) {
            setIsPaused(prev => !prev);
          } else if (!isRunning) {
            setIsAutoPlay(true);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          const currentIndex = DEMO_SCENARIOS.findIndex(s => s.id === scenario.id);
          const nextIndex = (currentIndex + 1) % DEMO_SCENARIOS.length;
          setScenario(DEMO_SCENARIOS[nextIndex]);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          const currIndex = DEMO_SCENARIOS.findIndex(s => s.id === scenario.id);
          const prevIndex = (currIndex - 1 + DEMO_SCENARIOS.length) % DEMO_SCENARIOS.length;
          setScenario(DEMO_SCENARIOS[prevIndex]);
          break;
        case 'KeyE':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            exportSession();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, isAutoPlay, scenario.id, exportSession]);

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      theme === 'dark'
        ? 'bg-[#0F0F1A]'
        : 'bg-[#F5F5F7]'
    }`}>
      {/* Genesys Cloud Style Header */}
      <header className="gcx-header">
        <div className="max-w-[1800px] mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Genesys Logo */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg gcx-logo flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-semibold text-white">Genesys Cloud CX</h1>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF4F1F]/20 text-[#FF4F1F] border border-[#FF4F1F]/30">AGENT COPILOT</span>
                  </div>
                  <p className="text-xs text-[#9999B3]">Powered by Bounteous AI</p>
                </div>
              </div>
            </div>

            <div className="header-controls">
              {/* Scenario Selector - GCX Style */}
              <select
                value={scenario.id}
                onChange={(e) => {
                  const newScenario = DEMO_SCENARIOS.find(s => s.id === e.target.value);
                  if (newScenario) {
                    setScenario(newScenario);
                    resetDemo();
                  }
                }}
                className="gcx-select text-sm"
              >
                {DEMO_SCENARIOS.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              {/* Voice Indicator */}
              {isRunning && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#252542] border border-[#3D3D5C]">
                  <div className={`voice-indicator ${
                    isCustomerTyping
                      ? 'voice-indicator-customer'
                      : isLoading
                        ? 'voice-indicator-idle'
                        : 'voice-indicator-agent'
                  }`}>
                    <div className="voice-bar"></div>
                    <div className="voice-bar"></div>
                    <div className="voice-bar"></div>
                    <div className="voice-bar"></div>
                    <div className="voice-bar"></div>
                  </div>
                  <span className="text-xs text-[#E8E8F0]">
                    {isCustomerTyping ? 'Customer' : 'Agent'}
                  </span>
                </div>
              )}

              {/* Status Indicators - GCX Style - Hide on mobile */}
              <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[#252542] border border-[#3D3D5C]">
                <div className="flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${ragConnected ? 'bg-[#00D084]' : 'bg-[#FFB020]'} animate-pulse`}></div>
                  <span className="text-[#E8E8F0]">RAG: {ragConnected ? 'Connected' : 'Fallback'}</span>
                </div>
                <div className="w-px h-4 bg-[#3D3D5C]"></div>
                <div className="text-xs text-[#E8E8F0]">
                  Latency: <span className="text-[#00D084]">{latency}ms</span>
                </div>
              </div>

              {/* Control Buttons - GCX Style */}
              {!isRunning ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={startScenario}
                    className="gcx-btn-primary flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Start Demo
                  </button>
                  {/* C4: Auto-play toggle */}
                  <button
                    onClick={() => { setIsAutoPlay(true); startScenario(); }}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#FF4F1F] to-[#FF7A54] text-white font-medium hover:from-[#FF7A54] hover:to-[#FF4F1F] transition-all flex items-center gap-2 shadow-lg shadow-[#FF4F1F]/20"
                    title="Auto-play mode - automatically progresses through the scenario"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Auto-Play
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {/* C4: Speed control */}
                  <button
                    onClick={cycleSpeed}
                    className="px-3 py-2 rounded-lg bg-[#252542] border border-[#3D3D5C] text-[#E8E8F0] font-medium hover:border-[#FF4F1F] transition-all text-sm"
                    title="Click to change playback speed"
                  >
                    {playbackSpeed}x
                  </button>

                  {/* C4: Pause/Resume for auto-play */}
                  {isAutoPlay && (
                    <button
                      onClick={togglePause}
                      className={`px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                        isPaused
                          ? 'bg-[#00D084]/20 text-[#00D084] border border-[#00D084]/30 hover:bg-[#00D084]/30'
                          : 'bg-[#FFB020]/20 text-[#FFB020] border border-[#FFB020]/30 hover:bg-[#FFB020]/30'
                      }`}
                    >
                      {isPaused ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          </svg>
                          Resume
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                          </svg>
                          Pause
                        </>
                      )}
                    </button>
                  )}

                  {/* C4: Auto-play indicator */}
                  {isAutoPlay && (
                    <div className="px-2 py-1 rounded bg-[#FF4F1F]/20 border border-[#FF4F1F]/30 text-[#FF4F1F] text-xs flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#FF4F1F] animate-pulse-orange"></span>
                      Auto
                    </div>
                  )}

                  <button
                    onClick={resetDemo}
                    className="gcx-btn-secondary flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reset
                  </button>
                </div>
              )}

              {/* C5: Message injector toggle - GCX Style */}
              <button
                onClick={() => setShowMessageInjector(!showMessageInjector)}
                className={`px-3 py-2 rounded-lg border text-sm transition-all flex items-center gap-2 ${
                  showMessageInjector
                    ? 'bg-[#FF4F1F]/20 border-[#FF4F1F]/50 text-[#FF4F1F]'
                    : 'bg-[#252542] border-[#3D3D5C] text-[#9999B3] hover:text-[#E8E8F0] hover:border-[#FF4F1F]'
                }`}
                title="Inject custom customer message"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Inject
              </button>

              {/* D5: Analytics toggle - GCX Style */}
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className={`px-3 py-2 rounded-lg border text-sm transition-all flex items-center gap-2 ${
                  showAnalytics
                    ? 'bg-[#00D084]/20 border-[#00D084]/50 text-[#00D084]'
                    : 'bg-[#252542] border-[#3D3D5C] text-[#9999B3] hover:text-[#E8E8F0] hover:border-[#FF4F1F]'
                }`}
                title="View session analytics"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Analytics
              </button>

              {/* E5: Theme toggle - GCX Style */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-[#252542] border border-[#3D3D5C] text-[#9999B3] hover:text-[#E8E8F0] hover:border-[#FF4F1F] transition-all"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {/* Export Session Button */}
              <button
                onClick={exportSession}
                className="px-3 py-2 rounded-lg bg-[#252542] border border-[#3D3D5C] text-[#9999B3] hover:text-[#E8E8F0] hover:border-[#FF4F1F] transition-all text-sm flex items-center gap-2"
                title="Export session transcript and analytics"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export
              </button>

              <Link
                href="/compare"
                className="px-3 py-2 rounded-lg bg-[#252542] border border-[#3D3D5C] text-[#9999B3] hover:text-[#E8E8F0] hover:border-[#FF4F1F] transition-all text-sm"
              >
                Compare
              </Link>

              <Link
                href="/admin"
                className="px-3 py-2 rounded-lg bg-[#252542] border border-[#3D3D5C] text-[#9999B3] hover:text-[#E8E8F0] hover:border-[#FF4F1F] transition-all text-sm"
              >
                Admin
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Three Panel Layout */}
      <div className="flex-1 p-4">
        <div className="max-w-[1800px] mx-auto h-full">
          {/* E5: Responsive grid - stack on mobile, 2-cols on tablet, 3-cols on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 h-auto xl:h-[calc(100vh-140px)]">
            {/* Left Panel - Customer Chat */}
            <CustomerChat
              messages={messages}
              customer={scenario.customer}
              isTyping={isCustomerTyping}
              onCustomerMessage={sendCustomerMessage}
            />

            {/* Center Panel - Agent Desktop */}
            <AgentPanel
              messages={messages}
              onSendMessage={handleAgentSend}
              suggestedResponse={selectedSuggestion}
              onClearSuggestion={() => setSelectedSuggestion(null)}
              isLoading={isLoading}
            />

            {/* Right Panel - AI Assist */}
            <AIAssistPanel
              data={aiData}
              onSelectSuggestion={setSelectedSuggestion}
              onQuickAction={(action) => {
                // Handle quick actions - in a real app these would trigger workflows
                console.log('Quick action triggered:', action);
                // Add a system message showing the action
                const systemMessage: Message = {
                  id: crypto.randomUUID(),
                  role: 'system',
                  content: `Action initiated: ${action}`,
                  timestamp: new Date(),
                };
                setMessages(prev => [...prev, systemMessage]);
                // D5: Track quick action usage
                setAnalyticsData(prev => ({
                  ...prev,
                  quickActionsUsed: prev.quickActionsUsed + 1,
                }));
              }}
              latencyMs={latency}
              ragConnected={ragConnected}
              isLoading={isLoading}
              historicalData={historicalData}
              historyDays={historyDays}
              onHistoryDaysChange={handleHistoryDaysChange}
              loadingHistory={loadingHistory}
              sentimentProvider={sentimentProvider}
              onProviderChange={setSentimentProvider}
            />
          </div>
        </div>
      </div>

      {/* C5: Message Injector Panel - GCX Style */}
      {showMessageInjector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1E1E3F] border border-[#3D3D5C] rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            {/* Panel Header */}
            <div className="px-5 py-4 border-b border-[#3D3D5C] gcx-panel-header">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FF4F1F]/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#FF4F1F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-[#E8E8F0] font-semibold">Inject Customer Message</h3>
                    <p className="text-[#9999B3] text-xs">Simulate any customer message during the demo</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMessageInjector(false)}
                  className="p-1 rounded-lg hover:bg-[#252542] text-[#9999B3] hover:text-[#E8E8F0] transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Preset Messages */}
            <div className="px-5 py-4 border-b border-slate-700/50">
              <p className="text-xs text-slate-400 mb-3">Quick presets:</p>
              <div className="flex flex-wrap gap-2">
                {presetMessages.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setCustomMessage(preset.message)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      preset.label === 'Frustrated' || preset.label === 'Escalation'
                        ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30'
                        : preset.label === 'Happy'
                        ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-500/30'
                        : preset.label === 'Technical'
                        ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/30'
                        : 'bg-slate-600/50 text-slate-300 hover:bg-slate-600/70 border border-slate-600'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Message Input */}
            <div className="px-5 py-4">
              <label className="block text-xs text-slate-400 mb-2">Custom message:</label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Type a customer message to inject..."
                className="w-full h-24 px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 resize-none text-sm"
                autoFocus
              />
              <div className="text-xs text-slate-500 mt-2">
                Character count: {customMessage.length}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-5 py-4 border-t border-slate-700/50 bg-slate-800/50 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setCustomMessage('');
                  setShowMessageInjector(false);
                }}
                className="px-4 py-2 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 transition-all text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleInjectMessage}
                disabled={!customMessage.trim()}
                className={`px-4 py-2 rounded-lg font-medium transition-all text-sm flex items-center gap-2 ${
                  customMessage.trim()
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-400 hover:to-orange-500'
                    : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Inject Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* D5: Analytics Panel */}
      {showAnalytics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[80vh] flex flex-col">
            {/* Panel Header */}
            <div className="px-5 py-4 border-b border-slate-700 bg-slate-800/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Session Analytics</h3>
                    <p className="text-slate-400 text-xs">
                      {sessionStartTime
                        ? `Started ${Math.round((Date.now() - sessionStartTime.getTime()) / 1000)}s ago`
                        : 'No active session'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAnalytics(false)}
                  className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Analytics Content */}
            <div className="p-5 overflow-y-auto flex-1">
              {/* Message Stats Grid */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
                  <div className="text-2xl font-bold text-white">{analyticsData.totalMessages}</div>
                  <div className="text-xs text-slate-400">Total Messages</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {analyticsData.customerMessages} customer / {analyticsData.agentMessages} agent
                  </div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
                  <div className="text-2xl font-bold text-cyan-400">
                    {analyticsData.avgResponseTimeMs > 0
                      ? `${(analyticsData.avgResponseTimeMs / 1000).toFixed(1)}s`
                      : '—'}
                  </div>
                  <div className="text-xs text-slate-400">Avg Response Time</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {analyticsData.responseTimes.length} responses tracked
                  </div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
                  <div className="text-2xl font-bold text-purple-400">
                    {analyticsData.agentMessages > 0
                      ? `${Math.round((analyticsData.suggestionsUsed / analyticsData.agentMessages) * 100)}%`
                      : '—'}
                  </div>
                  <div className="text-xs text-slate-400">AI Suggestion Usage</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {analyticsData.suggestionsUsed} of {analyticsData.agentMessages} responses
                  </div>
                </div>
              </div>

              {/* Quick Actions & Escalation */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-sm text-white font-medium">Quick Actions</span>
                  </div>
                  <div className="text-lg font-bold text-amber-400">{analyticsData.quickActionsUsed}</div>
                  <div className="text-xs text-slate-500">Actions triggered during session</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-sm text-white font-medium">Escalation Status</span>
                  </div>
                  <div className={`text-lg font-bold ${analyticsData.escalationTriggered ? 'text-red-400' : 'text-green-400'}`}>
                    {analyticsData.escalationTriggered ? 'Triggered' : 'None'}
                  </div>
                  <div className="text-xs text-slate-500">
                    Peak urgency: <span className={`font-medium ${
                      analyticsData.peakUrgency === 'critical' ? 'text-red-400' :
                      analyticsData.peakUrgency === 'high' ? 'text-orange-400' :
                      analyticsData.peakUrgency === 'medium' ? 'text-yellow-400' :
                      'text-green-400'
                    }`}>{analyticsData.peakUrgency}</span>
                  </div>
                </div>
              </div>

              {/* Sentiment Journey */}
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                  <span className="text-sm text-white font-medium">Sentiment Journey</span>
                </div>
                {analyticsData.sentimentJourney.length > 0 ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    {analyticsData.sentimentJourney.map((entry, index) => (
                      <div key={index} className="flex items-center gap-1">
                        <div className={`w-3 h-3 rounded-full ${
                          entry.sentiment === 'positive' ? 'bg-green-400' :
                          entry.sentiment === 'negative' ? 'bg-red-400' :
                          'bg-yellow-400'
                        }`} />
                        <span className="text-xs text-slate-400 capitalize">{entry.sentiment}</span>
                        {index < analyticsData.sentimentJourney.length - 1 && (
                          <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">No sentiment data yet</div>
                )}
              </div>
            </div>

            {/* Panel Footer */}
            <div className="px-5 py-4 border-t border-slate-700/50 bg-slate-800/50 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Session duration: {sessionStartTime
                  ? `${Math.floor((Date.now() - sessionStartTime.getTime()) / 60000)}m ${Math.floor(((Date.now() - sessionStartTime.getTime()) % 60000) / 1000)}s`
                  : '—'}
              </div>
              <button
                onClick={() => setShowAnalytics(false)}
                className="px-4 py-2 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 transition-all text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confetti Animation */}
      {showConfetti && (
        <div className="confetti-container">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: ['#FF4F1F', '#00D084', '#4DA6FF', '#FFB020', '#FF7A54'][Math.floor(Math.random() * 5)],
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Footer Info Bar */}
      <div className={`border-t ${
        theme === 'dark'
          ? 'border-slate-700/50 bg-slate-900/50'
          : 'border-gray-200 bg-white/50'
      }`}>
        <div className="max-w-[1800px] mx-auto px-6 py-2">
          <div className={`flex flex-col sm:flex-row items-center justify-between text-xs gap-2 ${
            theme === 'dark' ? 'text-slate-500' : 'text-gray-500'
          }`}>
            <div className="flex items-center gap-4">
              <span>Customer: {scenario.customer.name}</span>
              <span className="hidden sm:inline">|</span>
              <span>Tier: {scenario.customer.tier}</span>
              <span className="hidden sm:inline">|</span>
              <span className="hidden md:inline">Issue: {scenario.customer.issue}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="hidden lg:inline">Powered by Bounteous SLM + ChromaDB RAG</span>
              <span className="hidden lg:inline">|</span>
              <span>Genesys Knowledge Integration</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
