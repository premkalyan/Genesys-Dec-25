# Agent Assist Demo Guide

## Quick Start
- **Demo URL:** http://localhost:3335
- **Admin Panel:** http://localhost:3335/admin
- **Backend API:** http://localhost:3336

---

## Feature Overview

### Core Features (Depth 1-2)

| Feature | Description |
|---------|-------------|
| **Three-Panel Layout** | Customer chat (left), Agent desktop (center), AI Assist (right) |
| **Real-time Sentiment** | Keyword-based detection with confidence scores |
| **Intent Detection** | 8 patterns: troubleshoot, configure, escalate, billing, technical, integration, training, general |
| **Knowledge Cards** | Semantic search via ChromaDB RAG with relevance scoring |
| **Quick Actions** | Contextual buttons: Transfer, Create Ticket, Schedule Callback |
| **Escalation Alerts** | Warning/Critical alerts with visual indicators |
| **4 Demo Scenarios** | Agent Copilot, Skills Routing, Quality Management, Escalation |

### Intelligence Features (Depth 3-4)

| Feature | Description |
|---------|-------------|
| **Advanced Sentiment** | Nuance detection (sarcasm, passive aggression), intensity modifiers |
| **Multi-turn Context** | Topic tracking across 8 product areas, follow-up detection |
| **Realistic Pacing** | Variable typing delays based on message length |
| **Knowledge Caching** | 60s TTL cache, deduplication, enhanced relevance scoring |
| **Auto-Play Mode** | Hands-free demo with speed controls (0.5x - 2x) |
| **Error Recovery** | Retry with exponential backoff, health monitoring |
| **Accessibility** | Loading skeletons, ARIA labels, screen reader support |

### Demo Excellence Features (Depth 5)

| Feature | Description |
|---------|-------------|
| **Sentiment Gauge** | Animated SVG needle showing sentiment direction |
| **Smart Search** | Typeahead with highlighted matches (Admin page) |
| **Message Injection** | Custom message injection with 5 presets |
| **Session Analytics** | Real-time metrics: messages, response time, AI usage |
| **Theme Toggle** | Dark/Light mode switching |
| **Responsive Layout** | Mobile, tablet, and desktop support |

---

## Demo Scenarios

### Scenario 1: Agent Copilot Troubleshooting
**Customer:** Sarah Johnson (Platinum tier)
**Issue:** NLU confidence scores dropping, suggestions not appearing

**Emotional Arc:**
1. Frustrated (initial contact)
2. Peak frustration (already tried basic troubleshooting)
3. Relieved (finds NLU threshold setting)

**Key Moments:**
- Escalation alert may trigger at peak frustration
- Knowledge cards surface Agent Copilot documentation
- Resolution shows sentiment improving

---

### Scenario 2: Skills-Based Routing Setup
**Customer:** Michael Chen (Gold tier)
**Issue:** Setting up skills-based routing for multilingual support

**Emotional Arc:**
1. Neutral (asking how to configure)
2. Slight concern (worried about customers waiting)
3. Satisfied (understands bullseye routing)

**Key Moments:**
- Intent detected as "configure"
- Knowledge cards show routing best practices
- Quick action: "Schedule Training" appears

---

### Scenario 3: Quality Management Setup
**Customer:** Emily Rodriguez (Enterprise tier)
**Issue:** Implementing QA evaluation forms and coaching

**Emotional Arc:**
1. Positive (excited about new features)
2. Engaged (learning capabilities)
3. Peak enthusiasm (discovers additional features)

**Key Moments:**
- Positive sentiment throughout
- Multiple knowledge cards for QM features
- Quick action: "Create Documentation" appears

---

### Scenario 4: Escalation - Angry Customer
**Customer:** Robert Williams (Platinum tier)
**Issue:** System outage causing business disruption

**Emotional Arc:**
1. Angry (initial complaint)
2. Peak anger (demanding supervisor)
3. De-escalated (appreciates being heard)

**Key Moments:**
- **CRITICAL:** Escalation alert triggers immediately
- Sentiment gauge shows strong negative
- Quick actions: "Transfer to Supervisor", "Create Urgent Ticket"
- De-escalation shows sentiment recovery

---

## Demo Talk Track

### Opening (30 seconds)

> "Today I'm showing you Bounteous's Real-time Agent Assist solution, powered by our AI technology and integrated with Genesys Cloud's knowledge base."
>
> "This is a three-panel agent desktop: customer chat on the left, agent workspace in the center, and AI assistance on the right."

### Starting the Demo (1 minute)

> "Let me start a scenario. I'll select [Scenario Name] and click Start Demo."
>
> *Click Start Demo or Auto-Play*
>
> "Watch the right panel - as soon as the customer sends a message, our AI analyzes it in real-time."

### Sentiment Analysis (1 minute)

> "Notice the sentiment gauge at the top. The needle moves based on the customer's emotional state."
>
> "Below that, you see the sentiment label, confidence score, and urgency level."
>
> "The trend chart shows how sentiment has evolved throughout the conversation."
>
> *Point to urgency indicator*
>
> "When urgency rises, the system alerts the agent with suggested actions."

### AI Suggestions (1 minute)

> "These numbered cards are AI-generated response suggestions. They're context-aware - based on what the customer is asking and their emotional state."
>
> "The agent can click any suggestion to populate their response, then customize if needed."
>
> *Click a suggestion*
>
> "Watch how the suggestion flows into the agent's compose area."

### Knowledge Cards (1 minute)

> "Below the suggestions, you'll see Knowledge Cards pulled from Genesys documentation via our RAG system."
>
> "Each card shows the article title, a relevance percentage, and quick navigation to the full documentation."
>
> "This ensures agents always have accurate, up-to-date information at their fingertips."

### Quick Actions (30 seconds)

> "These quick action buttons adapt based on intent and urgency."
>
> *Point to buttons*
>
> "For a frustrated customer asking about technical issues, you might see 'Transfer to Specialist' or 'Create Support Ticket'."
>
> "One click initiates the workflow - reducing handle time significantly."

### Escalation Alert (30 seconds)

> "Now watch what happens when the customer becomes more frustrated..."
>
> *Wait for escalation scenario or inject a frustrated message*
>
> "See the escalation alert? It's triggered by critical urgency or explicit escalation requests."
>
> "The agent is immediately prompted to take action before the situation escalates further."

### Message Injection Demo (30 seconds)

> "Let me show you how we can test different scenarios on the fly."
>
> *Click Inject button*
>
> "I can inject any customer message. Here are presets for different emotional states."
>
> *Click "Frustrated" or "Escalation" preset*
>
> "Watch how the AI responds to this more challenging message."

### Analytics Dashboard (30 seconds)

> "Click Analytics to see session metrics."
>
> *Open Analytics panel*
>
> "We track total messages, average response time, and importantly - what percentage of AI suggestions the agent used."
>
> "This data helps measure AI effectiveness and identify training opportunities."

### Closing (30 seconds)

> "What you've seen today is:
> - Real-time sentiment analysis and tracking
> - Context-aware response suggestions
> - Instant knowledge retrieval
> - Intelligent escalation alerts
> - All integrated into the agent workflow"
>
> "This reduces average handle time, improves first-contact resolution, and ensures consistent customer experience."

---

## Demo Controls Reference

| Control | Location | Function |
|---------|----------|----------|
| **Scenario Dropdown** | Header | Switch between 4 demo scenarios |
| **Start Demo** | Header | Begin scenario with manual progression |
| **Auto-Play** | Header | Hands-free demo mode |
| **Speed (0.5x-2x)** | Header (during demo) | Adjust playback speed |
| **Pause/Resume** | Header (auto-play) | Pause auto-play progression |
| **Reset** | Header | Clear and restart |
| **Inject** | Header | Open message injection panel |
| **Analytics** | Header | Open session metrics dashboard |
| **Theme Toggle** | Header | Switch dark/light mode |
| **Admin** | Header | Open admin panel |

---

## Admin Panel Features

Access via http://localhost:3335/admin

| Feature | Description |
|---------|-------------|
| **Smart Search** | Typeahead search with highlighted results |
| **Document List** | All indexed knowledge articles |
| **Category Filter** | Filter by article category |
| **API Health** | Backend connection status |
| **Recent Searches** | Quick access to previous searches |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "RAG: Fallback" in header | Backend not running. Start with `python api.py` |
| Suggestions not appearing | Check browser console for errors |
| Slow response | Verify ChromaDB is indexed |
| Theme not applying | Refresh page after toggle |

---

## Value Propositions

### For Contact Center Leaders
- **Reduce AHT** by 20-30% with instant suggestions
- **Improve FCR** with accurate knowledge retrieval
- **Lower training costs** with AI-assisted onboarding
- **Ensure compliance** with consistent responses

### For Agents
- **Less typing** - click to use AI suggestions
- **Instant knowledge** - no searching for answers
- **Escalation support** - AI alerts when to act
- **Confidence boost** - always have the right answer

### For Customers
- **Faster resolution** - agents have answers immediately
- **Consistent experience** - same quality every interaction
- **Empathetic service** - agents see sentiment cues
- **Less repetition** - context carries through

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Frontend                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ CustomerChat │ │  AgentPanel  │ │    AIAssistPanel     │ │
│  │    (Left)    │ │   (Center)   │ │       (Right)        │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
│                           │                                  │
│                    rag-service.ts                           │
│            (Sentiment, Intent, Fallback)                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Backend                           │
│                        api.py                                │
│                           │                                  │
│                    ┌──────┴──────┐                          │
│                    │  ChromaDB   │                          │
│                    │ (Vector DB) │                          │
│                    └─────────────┘                          │
│                           │                                  │
│              sentence-transformers                          │
│              (all-MiniLM-L6-v2)                             │
└─────────────────────────────────────────────────────────────┘
```

---

*Last Updated: December 2024*
*Version: Depth 5 Complete*
