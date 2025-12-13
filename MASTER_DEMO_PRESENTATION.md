# Bounteous x Genesys AI Demo - Master Presentation Guide

## Quick Reference

| Demo | URL | Purpose |
|------|-----|---------|
| **AI Journey Infographic** | `bounteous-ai-journey.html` | Executive single-slide: "Enterprise AI, Engineered" |
| **POC-1: AI Layer Demo** | http://localhost:3334 | Customer-facing virtual agent with PII protection |
| **POC-2: Agent Assist Demo** | http://localhost:3335 | Real-time agent desktop with AI assistance (Genesys Cloud UI) |
| **Backend API** | http://localhost:3336 | Shared RAG/Knowledge + Sentiment Analysis backend |

### One-Click Start
```bash
./start-demo.sh    # Starts all 3 services
./stop-demo.sh     # Stops all services
```

---

## Executive Summary

> "Today we're demonstrating Bounteous's AI capabilities for Genesys Cloud CX. We've built two complementary demos:
> 1. A customer-facing virtual agent with PII protection and intelligent handoff
> 2. A real-time agent assist tool that surfaces knowledge and sentiment in real-time
>
> Both are powered by our RAG system and showcase enterprise-grade AI that's production-ready."

---

# Part 1: Bounteous AI Layer (POC-1)

**URL:** http://localhost:3334

## Overview

This demo showcases Bounteous's enterprise AI enhancement layer for Genesys Cloud, featuring:
- **Intelligent Chat** - 8-factor weighted routing engine (SLM vs LLM)
- **Fine-tuned SLM** (locally hosted - PII-safe by default)
- **PII protection** for external LLM escalation
- **Two-tier architecture**: SLM for speed, LLM for complexity
- Context-rich agent handoff
- Real-time metrics dashboard

## Features

### 0. Intelligent Chat (FEATURED)
**Path:** `/smart-chat`

**Routing Factors (8 weighted signals):**
| Factor | Weight | Description |
|--------|--------|-------------|
| Data Privacy | 1.5x | PII detection triggers local-only preference |
| Query Complexity | 1.3x | Analytical/comparative queries favor LLM |
| Domain Match | 1.2x | Banking domain keywords favor fine-tuned SLM |
| Reasoning Depth | 1.2x | "Why/explain" queries may need LLM |
| Response Time | 1.1x | Urgency keywords favor fast SLM |
| Cost Efficiency | 1.0x | Baseline preference for cost-effective SLM |
| Query Clarity | 0.9x | Ambiguous queries may need LLM clarification |
| Context Window | 0.8x | Long conversations may need LLM context |

**Talk Track:**
> "This is where the magic happens. Every query is analyzed against 8 different factors - each with its own weight. Watch the analysis panel as you type. The AI scores each factor, calculates weighted totals for SLM vs LLM, and routes automatically. This isn't a simple if-then decision tree - it's a sophisticated scoring engine."

**Demo Steps:**
1. Navigate to `/smart-chat`
2. Point out the Analysis Panel on the right
3. Type: "What are wire transfer fees?"
   - Watch factors light up: Domain Match (banking), Query Clarity (clear), low Complexity
   - Result: Routes to SLM, ~90ms, $0.0001
4. Type: "My SSN is 123-45-6789, what's my balance?"
   - Watch: Data Privacy factor spikes (PII detected), favors SLM
   - Result: Routes to SLM (PII stays local)
5. Type: "Compare the trade-offs between different authentication methods for mobile banking"
   - Watch: Complexity spikes, Reasoning Depth activates
   - Result: Routes to LLM, ~1.2s, $0.02
6. Type: "My account #12345678 - analyze my spending patterns and suggest optimizations"
   - Watch: BOTH PII detected AND Complexity high
   - Result: Routes to LLM WITH PII scrubbing alert

**Key Points:**
- Not a simple 2x2 matrix - 8 factors with different weights
- Real-time visualization of decision process
- Weighted scoring shows why each decision was made
- PII protection kicks in automatically when LLM is chosen with sensitive data

---

### 1. SLM Chat Demo
**Path:** `/chat`

| Metric | Value |
|--------|-------|
| Average Latency | 87ms |
| Cost per Query | $0.0001 |
| Accuracy | 96% |

**Talk Track:**
> "Our fine-tuned SLM answers banking policy questions with sub-100ms latency. Watch as it provides accurate answers with source citations - this is real AI, not scripted responses."

**Demo Steps:**
1. Navigate to `/chat`
2. Ask: "What are the wire transfer fees?"
3. Point out: Response time, source citation, accuracy

### 2. PII Detection (for LLM Escalation)
**Path:** `/pii`

**Two-Tier Architecture:**
| Tier | Model | PII Handling |
|------|-------|--------------|
| **Tier 1** | SLM (Local) | No scrubbing needed - data stays on-premises |
| **Tier 2** | LLM (Cloud) | PII scrubbed before sending to external APIs |

**Capabilities:**
- Names, emails, SSN detection
- Automatic redaction before external LLM calls
- Reconstruction in responses
- Full audit trail

**Talk Track:**
> "Our SLM is locally hosted - PII never leaves your environment. But when we escalate to external LLMs for complex queries, we automatically detect and redact PII first. The external AI never sees real customer data."

**Demo Steps:**
1. Navigate to `/pii`
2. Enter a message with PII: "My SSN is 123-45-6789 and my email is john@example.com"
3. Explain: This shows what happens when escalating to an external LLM
4. Show the redaction → external processing → reconstruction flow

### 3. Agent Handoff
**Path:** `/handoff`

**Key Points:**
- Zero customer repetition
- Full conversation context packaged
- Intent and sentiment included

**Talk Track:**
> "The number one customer frustration is repeating themselves. When our AI hands off to a human agent, we package the entire conversation context - intent, sentiment, key details - so the agent can pick up seamlessly."

**Demo Steps:**
1. Navigate to `/handoff`
2. Show how conversation context is structured
3. Highlight: Summary, intent classification, sentiment score

### 4. Metrics Dashboard & ROI Calculator
**Path:** `/metrics`

**Metrics Shown:**
- 200x cost savings vs GPT-4
- Real-time query analytics
- **Live ROI Calculator** (NEW)

**Talk Track:**
> "We're not just faster and more secure - we're dramatically more cost-effective. Our SLM delivers 200x cost savings compared to commercial LLMs while maintaining accuracy."

**ROI Calculator Demo Steps:**
1. Scroll to the ROI Calculator section
2. Adjust sliders for your contact center:
   - Monthly Interactions (10K - 500K)
   - Average Handle Time (2-15 minutes)
   - Agent Hourly Cost ($15-$60)
   - Current Escalation Rate (5-40%)
3. Show projected savings update in real-time
4. Point out: Monthly savings, Annual savings, Payback period

**Talk Track for ROI Calculator:**
> "Let's see what this means for YOUR contact center. Input your current metrics... At 50,000 monthly interactions with a 7-minute AHT, you're looking at potential savings of $XX,XXX per month. That's a payback period of just X months."

---

# Part 2: Real-Time Agent Assist (POC-2)

**URL:** http://localhost:3335

## Overview

Three-panel agent desktop with real-time AI assistance, styled to match **Genesys Cloud CX** UI:
- **Left Panel:** Customer chat simulation
- **Center Panel:** Agent response workspace
- **Right Panel:** AI Assist (sentiment, suggestions, knowledge)

### Visual Design (NEW)
- Genesys Cloud orange accent color (#FF4F1F)
- Professional dark theme matching GCX desktop
- "Agent Copilot" branding badge
- GCX-style buttons, inputs, and status indicators

## Implementation Depths (5 Stages)

### Depth 1: Foundation
| Feature | Description |
|---------|-------------|
| Basic Sentiment | Keyword-based detection |
| Knowledge Base | 75 articles indexed |
| Demo Scenarios | 6 conversation flows |
| Fallback Suggestions | Topic-based responses |

### Depth 2: Core Intelligence
| Feature | Description |
|---------|-------------|
| Urgency Levels | Low, Medium, High, Critical |
| Sentiment Trending | Improving, Stable, Declining |
| Escalation Alerts | Warning and Critical triggers |
| Intent Detection | 8 patterns (troubleshoot, configure, escalate, etc.) |
| Quick Actions | Context-aware action buttons |

### Depth 3: Polish & Intelligence
| Feature | Description |
|---------|-------------|
| Advanced Sentiment | Sarcasm, passive aggression, intensity detection |
| Multi-turn Context | Topic tracking across 8 product areas |
| Realistic Pacing | Variable typing delays |
| Knowledge Formatting | Expandable steps, navigation paths |
| Visual Animations | fadeSlideIn, shimmer, glow effects |

### Depth 4: Production Ready
| Feature | Description |
|---------|-------------|
| Confidence Calibration | Edge case handling |
| Knowledge Caching | 60-second TTL, deduplication |
| Auto-Play Mode | Speed controls (0.5x - 2x) |
| Error Recovery | Retry with exponential backoff |
| Accessibility | ARIA labels, loading skeletons |

### Depth 5: Demo Excellence
| Feature | Description |
|---------|-------------|
| Sentiment Gauge | Animated SVG needle |
| Smart Search | Typeahead with highlights (Admin page) |
| Message Injection | Custom message presets |
| Session Analytics | Real-time metrics tracking |
| Theme Toggle | Dark/Light mode |
| **Export Session** | Download transcript + analytics as JSON |
| **Keyboard Shortcuts** | Space (pause), Arrows (scenarios), E (export) |
| **Confetti Animation** | Celebration on positive resolution |
| **Comparison View** | Side-by-side "Without AI vs With AI" page |
| **Voice Indicator** | Animated audio bars showing who's speaking |

## Demo Scenarios

### Scenario 1: Agent Copilot Troubleshooting
**Customer:** Sarah Johnson (Platinum tier)
**Issue:** NLU confidence scores dropping

**Emotional Journey:**
1. Frustrated (initial contact)
2. Peak frustration (already tried basic steps)
3. Relieved (finds solution)

**Talk Track:**
> "Sarah is a Platinum customer frustrated with Agent Copilot. Watch how our AI detects her frustration, surfaces relevant troubleshooting documentation, and provides the agent with contextual suggestions."

### Scenario 2: Skills-Based Routing Setup
**Customer:** Michael Chen (Gold tier)
**Issue:** Configuring multilingual routing

**Emotional Journey:**
1. Neutral (asking for configuration help)
2. Slight concern (worried about wait times)
3. Satisfied (understands bullseye routing)

**Talk Track:**
> "Michael needs help configuring routing. The AI detects the 'configure' intent, surfaces routing documentation, and suggests a training session."

### Scenario 3: Quality Management Setup
**Customer:** Emily Rodriguez (Enterprise tier)
**Issue:** Implementing QA evaluation forms

**Emotional Journey:**
1. Positive (excited about new features)
2. Engaged (learning capabilities)
3. Peak enthusiasm (discovers more features)

**Talk Track:**
> "Emily is enthusiastic about QM features. Notice how the AI maintains positive sentiment tracking and surfaces multiple related knowledge articles."

### Scenario 4: Escalation - Angry Customer
**Customer:** Robert Williams (Platinum tier)
**Issue:** System outage disruption

**Emotional Journey:**
1. Angry (initial complaint)
2. Peak anger (demanding supervisor)
3. De-escalated (appreciates being heard)

**Talk Track:**
> "This is our escalation scenario. Watch the sentiment gauge drop, the escalation alert trigger, and quick actions appear for supervisor transfer. This is critical for agent empowerment."

### Scenario 5: Billing Dispute (NEW)
**Customer:** Jennifer Martinez (Enterprise tier)
**Issue:** Unexpected charges on invoice

**Emotional Journey:**
1. Frustrated (recurring billing issue)
2. Peak frustration (CFO asking questions, trust eroding)
3. Satisfied (credit applied, appreciates resolution)

**Talk Track:**
> "Jennifer is upset about a billing discrepancy. Watch how the AI detects the billing intent, surfaces account information, and suggests resolution steps including credit processing."

### Scenario 6: New Feature Inquiry (NEW)
**Customer:** David Thompson (Gold tier)
**Issue:** Learning about new AI features

**Emotional Journey:**
1. Curious (initial inquiry)
2. Excited (features exceed expectations)
3. Very enthusiastic (wants to expand implementation)

**Talk Track:**
> "David is a positive customer exploring new capabilities. Notice how the AI maintains positive sentiment, surfaces feature documentation, and the agent can focus on relationship building rather than information lookup."

---

## Combined Demo Flow (15 minutes)

### Opening (1 min)
> "Bounteous has built two complementary AI solutions for Genesys Cloud. The first helps customers self-serve with protected, intelligent conversations. The second empowers your agents with real-time AI assistance."

### POC-1: AI Layer (6 min)

1. **Home Page** (30s)
   - Point to featured "Intelligent Chat" card
   - Highlight "Production Ready" badge

2. **Intelligent Chat** (90s) - START HERE
   - Navigate to `/smart-chat`
   - Point out the Analysis Panel showing 8 routing factors
   - Try 2-3 example queries, watch the factors light up and score
   - Emphasize: "This is a weighted scoring engine, not a simple decision tree"

3. **SLM Chat** (60s)
   - Ask about wire transfer fees
   - Point out latency and citations
   - "This is what happens when router chooses SLM"

4. **PII Detection** (60s)
   - Show PII being detected and redacted
   - "This is what happens when router chooses LLM for complex query with PII"

5. **Agent Handoff** (60s)
   - Show context packaging
   - Emphasize "zero repetition"

### POC-2: Agent Assist (7 min)

1. **Layout Overview** (30s)
   - Explain three-panel design
   - Point out AI Assist panel

2. **Run Scenario 1** (2 min)
   - Start Agent Copilot Troubleshooting
   - Highlight sentiment gauge changes
   - Show knowledge cards appearing
   - Use a suggestion

3. **Run Scenario 4** (2 min)
   - Start Escalation scenario
   - Let it reach peak anger
   - Show escalation alert
   - Demonstrate quick actions

4. **Message Injection** (1 min)
   - Inject a custom frustrated message
   - Show real-time AI response

5. **Analytics** (30s)
   - Open analytics modal
   - Show session metrics

6. **Comparison View** (1 min) - OPTIONAL
   - Navigate to `/compare`
   - Play the timeline
   - Highlight "30% faster resolution"

### Closing (2 min)

> "What we've shown today:
> - Customer self-service with 87ms response times and PII protection
> - Agent empowerment with real-time sentiment, suggestions, and knowledge
> - All powered by our RAG system with 75 indexed articles
> - Production-ready, enterprise-grade AI
>
> This reduces handle time, improves first-contact resolution, and ensures consistent customer experience across channels."

---

## Value Propositions

### For Contact Center Leaders
- **20-30% AHT reduction** with instant suggestions
- **Improved FCR** with accurate knowledge retrieval
- **Lower training costs** with AI-assisted onboarding
- **Compliance assurance** with PII protection

### For Agents
- **Less typing** - click to use AI suggestions
- **Instant knowledge** - no searching for answers
- **Escalation support** - AI alerts when to act
- **Confidence boost** - always have the right answer

### For Customers
- **Faster resolution** - agents have answers immediately
- **Consistent experience** - same quality every interaction
- **Privacy protected** - PII never exposed to AI
- **Zero repetition** - context carries through handoffs

---

## Technical Architecture

```
                     CUSTOMER                           AGENT
                        │                                 │
                        ▼                                 ▼
┌─────────────────────────────┐   ┌─────────────────────────────────────┐
│    POC-1: AI Layer Demo     │   │    POC-2: Agent Assist Demo         │
│    http://localhost:3334    │   │    http://localhost:3335            │
│                             │   │                                     │
│  ┌─────────┐ ┌───────────┐  │   │  ┌──────────┐ ┌─────────┐ ┌──────┐ │
│  │   SLM   │ │    PII    │  │   │  │ Customer │ │  Agent  │ │  AI  │ │
│  │  Chat   │ │ Detection │  │   │  │   Chat   │ │  Panel  │ │Assist│ │
│  └─────────┘ └───────────┘  │   │  └──────────┘ └─────────┘ └──────┘ │
│  ┌─────────┐ ┌───────────┐  │   │                                     │
│  │ Handoff │ │  Metrics  │  │   │  Features:                          │
│  └─────────┘ └───────────┘  │   │  - Sentiment Analysis (Dual Provider)│
└─────────────────────────────┘   │  - Sentiment History Timeline        │
              │                   │  - Knowledge Cards                   │
              │                   │  - Quick Actions & Escalation        │
              ▼                   └─────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────────┐
│                    Shared Backend: http://localhost:3336                 │
│                                                                         │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────┐ │
│  │    FastAPI      │    │    ChromaDB     │    │ sentence-transformers│ │
│  │    Server       │◄──►│   Vector DB     │◄──►│  (all-MiniLM-L6-v2) │ │
│  └─────────────────┘    └─────────────────┘    └─────────────────────┘ │
│          │                     │                                        │
│          ▼                     │                                        │
│  ┌─────────────────────────────┴───────────────────────────────────┐   │
│  │              Sentiment Analysis Module                           │   │
│  │  ┌──────────────────┐         ┌──────────────────────────────┐  │   │
│  │  │  VADER (~3ms)    │         │  Transformer (~50-100ms)     │  │   │
│  │  │  Rule-based      │         │  distilbert-sst-2-english    │  │   │
│  │  │  Fast, reliable  │         │  Accurate, nuanced           │  │   │
│  │  └──────────────────┘         └──────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│                    75 Knowledge Articles + Mock History Data            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Pre-Demo Checklist

- [ ] Backend running on port 3336 (`curl http://localhost:3336/health`)
- [ ] POC-1 running on port 3334
- [ ] POC-2 running on port 3335
- [ ] Knowledge base has 75 documents
- [ ] Test both demos briefly before presenting
- [ ] Try keyboard shortcuts (Space, Arrows, E)

## Starting the Demos

### Option 1: One-Click Start (Recommended)
```bash
cd /Users/premkalyan/code/Genesys
./start-demo.sh
```
This script:
- Kills any processes on ports 3334, 3335, 3336
- Starts the Backend API
- Loads knowledge base (75 documents)
- Starts POC-1 and POC-2
- Shows status summary with all URLs

To stop all services:
```bash
./stop-demo.sh
```

### Option 2: Manual Start (3 terminals)
```bash
# Terminal 1: Backend (from knowledge-backend directory)
cd /Users/premkalyan/code/Genesys/knowledge-backend
./venv/bin/python3 api.py

# Terminal 2: POC-1 (from demo-app directory)
cd /Users/premkalyan/code/Genesys/demo-app
npm run dev -- -p 3334

# Terminal 3: POC-2 (from agent-assist-demo directory)
cd /Users/premkalyan/code/Genesys/agent-assist-demo
npm run dev -- -p 3335
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "RAG: Fallback" showing | Backend not running - start `python api.py` |
| Knowledge cards empty | Run `curl -X POST http://localhost:3336/api/knowledge/load-samples` |
| Slow responses | Check ChromaDB index, verify 75 documents loaded |
| Port in use | `lsof -ti:PORT | xargs kill -9` |
| Keyboard shortcuts not working | Click inside the demo window first to focus |

---

## What's New (Latest Updates)

| Feature | Description |
|---------|-------------|
| **Bounteous AI Journey Infographic** | `bounteous-ai-journey.html` - "Enterprise AI, Engineered" single-slide overview |
| **Sentiment History Timeline** | Historical customer sentiment visualization with channel-colored dots |
| **Dual-Provider Sentiment** | VADER (fast ~3ms) vs Transformer (accurate ~50ms) with toggle |
| **Clickable Interaction Details** | Click any dot to see full interaction info + "why this sentiment" |
| **Fullscreen Chart Mode** | Expand button for larger sentiment timeline view |
| **Improving Trend Demo** | Demo customer shows upward trajectory (negative→positive) |
| **Intelligent Chat** | 8-factor weighted routing engine with real-time analysis visualization |
| **Genesys Cloud UI Skin** | POC-2 styled to match actual Genesys Cloud CX agent desktop |
| **2 New Scenarios** | Billing Dispute & New Feature Inquiry added (now 6 total) |
| **One-Click Start** | `./start-demo.sh` launches all services automatically |
| **Live ROI Calculator** | Interactive calculator in POC-1 Metrics page |
| **75 KB Articles** | Expanded knowledge base covering all Genesys CX topics |
| **Export Session** | Download transcript + analytics as JSON for follow-up |
| **Keyboard Shortcuts** | Space (pause), ←/→ (scenarios), E (export) |
| **Comparison View** | `/compare` page showing Without AI vs With AI metrics |

---

## New: Bounteous AI Journey Infographic

**File:** `bounteous-ai-journey.html`

**Purpose:** Single-slide overview of Bounteous AI capabilities for executive presentations.

**Title:** "Enterprise AI, Engineered"
**Subtitle:** "From Enablement to Customer Delight"

**4 Stages:**
| Stage | Platform | Focus |
|-------|----------|-------|
| **ENABLE + ADOPT** | Prism | AI awareness, adoption tracking, training |
| **BUILD** | NEXUS | 4-agent architecture, 95% automation |
| **ASSURE** | QIP | Continuous compliance, multi-framework |
| **DELIGHT** | Genesys Demos | Fine-tuned SLM, sentiment, handoff |

**Demo Steps:**
1. Open `bounteous-ai-journey.html` in browser
2. Walk through the 4 stages left to right
3. Key message: "Bounteous doesn't just use AI — we've built the full stack"

---

## New: Sentiment History Timeline (POC-2)

**Location:** Agent Assist panel → Sentiment History section

**Features:**
| Feature | Description |
|---------|-------------|
| **Channel-Colored Dots** | Blue=Call, Purple=Chat, Amber=Email, Green=Survey, Pink=Social |
| **Clickable Details** | Click any dot to see interaction summary, agent, resolution |
| **Fullscreen Mode** | Expand button for larger chart view |
| **Provider Toggle** | Switch between VADER (fast) and Transformer (accurate) |
| **Date Range** | 30/60/90 day selector |
| **"Why This Sentiment"** | Explanation of sentiment classification in detail panel |

**Demo Data (Sarah Johnson - CUST-12345):**
- ~3-4 interactions over 90 days (realistic frequency)
- **Improving trend** - starts negative, ends positive
- Mix of channels and sentiments

**Talk Track:**
> "We don't just analyze the current conversation - we show the agent the customer's full sentiment history across all channels. Watch how Sarah started frustrated 3 months ago but her sentiment has been improving. The agent can click any dot to see exactly what happened in that interaction."

**Demo Steps:**
1. Run any scenario in POC-2
2. Scroll to Sentiment History section in AI Assist panel
3. Point out the improving trend line (green, upward)
4. Click a dot to show interaction details
5. Toggle provider (VADER vs Transformer) to show speed difference
6. Click expand button to show fullscreen view

---

## New: Dual-Provider Sentiment Analysis

**Providers:**
| Provider | Speed | Best For |
|----------|-------|----------|
| **VADER** | ~3ms | Real-time UI updates, high throughput |
| **Transformer** | ~50-100ms | Accuracy-critical decisions, nuanced text |

**API Endpoints:**
```bash
# Analyze sentiment
POST /api/sentiment/analyze
{"text": "I'm frustrated", "provider": "vader"}

# Get customer history
GET /api/sentiment/history/CUST-12345?days=90

# Reset history cache (for demo refresh)
POST /api/sentiment/reset-history
```

**Talk Track:**
> "We offer two sentiment engines. VADER is rule-based and incredibly fast - 3 milliseconds. The transformer model is more accurate but takes 50-100ms. For real-time UI, we use VADER. For critical decisions like escalation triggers, we can use the transformer."

---

## New: Comparison View (POC-2)

**Path:** `/compare`

**Talk Track:**
> "Want to see the real impact? Our comparison view shows side-by-side timelines of agent workflows - with and without AI. Watch how the AI-assisted agent resolves issues in half the time."

**Features:**
- Key metrics comparison grid (AHT, FCR, Onboarding Time, etc.)
- Interactive timeline with auto-play
- Bottom-line ROI impact summary

**Demo Steps:**
1. Navigate to `/compare` from the main demo
2. Click "Play Timeline" to see side-by-side progression
3. Point out the improvement percentages
4. Highlight the bottom line impact section

---

## Keyboard Shortcuts Reference (POC-2)

| Key | Action |
|-----|--------|
| `Space` | Pause/Resume scenario |
| `→` | Next scenario |
| `←` | Previous scenario |
| `E` | Export session data |

---

## Creating Demo GIFs (For Presentations)

To create animated GIFs for presentations, use these recommended tools:

### Tools
- **macOS:** Use built-in screen recording (Cmd+Shift+5) then convert with [gifski](https://gif.ski/)
- **Cross-platform:** [LICEcap](https://www.cockos.com/licecap/) - simple GIF recording
- **Online:** [ezgif.com](https://ezgif.com/video-to-gif) - convert video to GIF

### Recommended GIF Captures

| Feature | Duration | Focus Area |
|---------|----------|------------|
| Sentiment Gauge | 5-8 sec | AI Assist panel during escalation scenario |
| Voice Indicator | 3-5 sec | Header area during active call |
| Confetti | 4 sec | Full screen at scenario completion |
| Timeline Comparison | 10 sec | Compare page with auto-play |
| Knowledge Cards | 5 sec | AI Assist panel showing KB results |

### GIF Settings
- **Width:** 800px (for slides) or 400px (for docs)
- **Frame rate:** 15 FPS
- **Duration:** Keep under 10 seconds for file size

---

*Last Updated: December 2024*
*Version: Consolidated Demo Guide v2.3*
