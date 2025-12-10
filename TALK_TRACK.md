# Demo Talk Track - Genesys AI Demo

A structured presentation framework for delivering the Bounteous x Genesys AI Demo.

---

## Demo Duration Guide

| Format | Duration | Focus |
|--------|----------|-------|
| **Quick Demo** | 10 min | POC-2 only, 2 scenarios |
| **Standard Demo** | 20 min | Both POCs, key features |
| **Deep Dive** | 45 min | Full demo with Q&A |

---

## Opening (2-3 minutes)

### Hook Statement

> "Contact centers are drowning in information while their agents starve for the right answer at the right time. Today, I'm going to show you how Bounteous solves this with AI that actually works in production."

### Context Setting

> "We've built two complementary AI solutions for Genesys Cloud:
> 1. **Customer-facing AI** - For self-service with enterprise-grade security
> 2. **Agent-facing AI** - Real-time assistance that makes every agent your best agent
>
> Both are powered by our RAG system with 75 indexed knowledge articles, and they work together to create a seamless experience."

### What They'll See

> "In the next [X] minutes, I'll show you:
> - Our 8-factor routing engine that decides optimal AI model for each query
> - How AI can answer questions in under 100ms
> - How we protect sensitive customer data automatically
> - How real-time sentiment analysis prevents escalations
> - And the ROI impact on your contact center"

---

## Part 1: Customer-Facing AI (POC-1)

**URL:** http://localhost:3334

### A. Intelligent Chat (3-4 min) - START HERE

**Navigate to:** `/smart-chat`

**Setup Talk:**
> "Before diving into individual features, let me show you the brain of our system. This isn't a simple if-then router - it's a sophisticated scoring engine that analyzes 8 different factors with different weights to make optimal routing decisions."

**Demo Actions:**
1. Point out the Analysis Panel on the right - "This shows you exactly how the decision is made"
2. Type: "What are the wire transfer fees?"
   - Watch factors activate: Domain Match (banking keywords), Query Clarity, low Complexity
   - "See how multiple factors light up? The weighted scores determine the route."
3. Type: "My SSN is 123-45-6789, what's my balance?"
   - "Data Privacy factor spikes - it has 1.5x weight, the highest"
   - "Routes to SLM because PII stays local"
4. Type: "Compare trade-offs between authentication methods for mobile banking considering our customer demographics"
   - "Now watch Complexity and Reasoning Depth activate"
   - "Routes to LLM because this needs advanced reasoning"
5. Type: "My account #12345678 - analyze spending patterns and suggest optimizations"
   - "This is the interesting case - PII detected AND complex query"
   - "Routes to LLM but with PII scrubbing - see the yellow alert"

**Key Points:**
> "Notice there are 8 factors, each with different weights:
> - Data Privacy: 1.5x (highest - PII protection is paramount)
> - Query Complexity: 1.3x
> - Domain Match: 1.2x (our SLM is fine-tuned for banking)
> - Reasoning Depth: 1.2x
> - Response Time: 1.1x
> - Cost Efficiency: 1.0x (baseline)
> - Query Clarity: 0.9x
> - Context Window: 0.8x
>
> The system calculates weighted scores for SLM and LLM, then routes based on which wins."

**Value Statement:**
> "This isn't something you can replicate with a simple lookup table. The weighted scoring adapts to your specific queries, balancing speed, cost, privacy, and capability in real-time."

---

### B. SLM Chat Demo (2-3 min)

**Navigate to:** `/chat`

**Setup Talk:**
> "Let's start with our fine-tuned Small Language Model. This isn't a generic LLM - it's been trained specifically for contact center use cases."

**Demo Actions:**
1. Ask: "What are the wire transfer fees?"
2. Point to response time
3. Point to source citation

**Key Points:**
> "Notice three things:
> 1. **Response time**: 87ms average - that's faster than a human can type
> 2. **Source citation**: Every answer includes where it came from
> 3. **Accuracy**: 96% accuracy because it's domain-tuned, not generic"

**Value Statement:**
> "This means customers get accurate answers instantly, without waiting in queue. And because we cite sources, there's full auditability."

---

### C. PII Detection Demo (2-3 min)

**Navigate to:** `/pii`

**Setup Talk:**
> "Here's where our two-tier architecture really shines. Our SLM is locally hosted - PII never leaves your environment. But sometimes you need the power of external LLMs like GPT-4 or Claude. That's when PII protection kicks in."

**Demo Actions:**
1. Enter: "My name is John Smith, my SSN is 123-45-6789, and my email is john@example.com"
2. Show redaction happening
3. Show reconstruction

**Key Points:**
> "Our architecture has two paths:
>
> **Path 1 - SLM (90% of queries):**
> - Locally hosted, on your infrastructure
> - PII stays in your environment - no scrubbing needed
> - Fast, cheap, compliant by design
>
> **Path 2 - External LLM (complex queries):**
> - When SLM can't handle it, we escalate to cloud LLMs
> - But first: detect, redact, process, reconstruct
> - The external AI never sees real PII
>
> Best of both worlds: local speed for most queries, cloud intelligence when needed, privacy always protected."

**Value Statement:**
> "SLMs give you privacy by default. PII scrubbing is your safety net for when you need external AI power. GDPR, HIPAA, PCI-DSS - covered either way."

---

### D. Agent Handoff Demo (2 min)

**Navigate to:** `/handoff`

**Setup Talk:**
> "The number one customer complaint? 'I already explained this!' When AI hands off to a human, context usually gets lost."

**Demo Actions:**
1. Show context package structure
2. Highlight summary, intent, sentiment

**Key Points:**
> "When our AI reaches its limits and needs to escalate:
> - **Full conversation summary** - not a transcript, a summary
> - **Intent classification** - we know why they're calling
> - **Sentiment score** - the agent knows their emotional state
>
> Zero repetition. The agent picks up exactly where AI left off."

**Value Statement:**
> "This turns your AI from a frustration generator into a productivity multiplier."

---

### E. ROI Calculator (2 min)

**Navigate to:** `/metrics`

**Setup Talk:**
> "Let's talk numbers. What does this mean for your business?"

**Demo Actions:**
1. Scroll to ROI Calculator
2. Adjust sliders to their contact center size
3. Show projected savings

**Key Points:**
> "Let me configure this for a typical enterprise contact center:
> - 50,000 monthly interactions
> - 7-minute average handle time
> - $35/hour agent cost
>
> Based on our 25% AHT reduction and 15% FCR improvement, you're looking at [$X] monthly savings. That's a [Y]-month payback period."

**Value Statement:**
> "This isn't theoretical - these are conservative estimates based on real deployments."

---

## Part 2: Agent-Facing AI (POC-2)

**URL:** http://localhost:3335

### A. Layout Overview (1 min)

**Setup Talk:**
> "Now let's flip to the agent's view. This is what your agents see - designed to match Genesys Cloud CX."

**Demo Actions:**
1. Point to three panels
2. Highlight the "Agent Copilot" badge

**Key Points:**
> "Three panels:
> - **Left**: Customer conversation
> - **Center**: Agent's response area
> - **Right**: AI Assist with real-time intelligence
>
> The AI Assist panel is the magic - it's constantly analyzing and helping."

---

### B. Scenario Demo: Troubleshooting (4-5 min)

**Select:** "Agent Copilot Troubleshooting"

**Setup Talk:**
> "Let me show you a realistic support scenario. Sarah is a Platinum customer having issues with Agent Copilot. She's already frustrated."

**Demo Actions:**
1. Click "Auto-Play" to start
2. As messages appear, call out:
   - Sentiment gauge changes
   - Knowledge cards appearing
   - Suggested responses

**Key Points at Each Stage:**

**First Customer Message:**
> "Watch the AI Assist panel. It immediately:
> - Detected her frustration (sentiment gauge drops)
> - Surfaced relevant troubleshooting docs
> - Prepared response suggestions"

**Mid Conversation:**
> "Notice the knowledge cards update based on the conversation. The agent doesn't have to search - the right information appears automatically."

**Resolution:**
> "And there's the confetti - we resolved this positively. The sentiment recovered because the agent had the right answers."

**Value Statement:**
> "This agent didn't need 6 weeks of training on Agent Copilot. The AI made them an expert instantly."

---

### C. Scenario Demo: Escalation (3-4 min)

**Select:** "Escalation - Angry Customer"

**Setup Talk:**
> "Now let's see how the system handles a more challenging situation. Robert is angry about an outage that cost him business."

**Demo Actions:**
1. Click "Auto-Play"
2. Watch for escalation alert
3. Point out quick actions

**Key Points:**

**Escalation Alert:**
> "See that red alert? The AI detected this is heading toward escalation. It's telling the agent: 'This needs extra attention.'"

**Quick Actions:**
> "Quick actions appeared - 'Transfer to Supervisor', 'Apply Service Credit'. One click to take action, no menu diving."

**De-escalation:**
> "Notice how the agent used empathetic language suggested by the AI. The sentiment is recovering."

**Value Statement:**
> "Without AI, this might have become a lost customer and a bad review. The AI prevented escalation by empowering the agent at the critical moment."

---

### D. Comparison View (2 min)

**Navigate to:** `/compare`

**Setup Talk:**
> "Let me show you the before and after. What does an interaction look like with and without AI?"

**Demo Actions:**
1. Click "Play Timeline"
2. Watch side-by-side progression

**Key Points:**
> "At each stage:
> - **0:15** - Without AI, agent is reading history. With AI, context is instant.
> - **0:45** - Without AI, still searching KB. With AI, articles appeared automatically.
> - **2:00** - Without AI, customer repeats issue. With AI, full context tracked.
> - **4:30** - Without AI, considering escalation. With AI, confident resolution.
>
> Same agent, same customer, same issue. Completely different outcome."

**Value Statement:**
> "This is a 30% reduction in handle time. At scale, that's millions in savings."

---

## Closing (2-3 minutes)

### Summary

> "What we've shown today:
> - **Customer AI** with sub-100ms responses and enterprise security
> - **Agent AI** with real-time sentiment, suggestions, and knowledge
> - **Measurable ROI** - 30% faster, 56% fewer escalations
>
> This isn't a proof of concept - this is production-ready AI."

### Differentiators

> "Why Bounteous?
> 1. **Domain-tuned** - Not generic AI, built for contact centers
> 2. **Privacy-first** - PII protection built in, not bolted on
> 3. **Seamless integration** - Works with Genesys Cloud, not against it
> 4. **Proven results** - Based on real enterprise deployments"

### Call to Action

> "What I'd like to do next:
> 1. Share this demo environment for your team to explore
> 2. Schedule a deep-dive on your specific use cases
> 3. Build a custom POC with your actual knowledge base
>
> Which of these would be most valuable for you?"

---

## Objection Handling

### "We're already using Genesys AI"

> "Great - this complements it. Genesys AI handles the platform. We enhance it with:
> - Domain-specific fine-tuning for your industry
> - Advanced PII protection
> - Custom RAG with your internal knowledge
>
> Think of us as the AI enhancement layer."

### "What about hallucinations?"

> "Three safeguards:
> 1. RAG grounds every response in your actual documents
> 2. Source citations let agents verify instantly
> 3. Confidence scores tell agents when to double-check
>
> We don't eliminate hallucinations - we make them detectable and manageable."

### "How long to implement?"

> "Typical timeline:
> - POC with your data: 4-6 weeks
> - Production pilot: 8-12 weeks
> - Full rollout: Depends on scale
>
> We can start showing value in the first month."

### "What about security/compliance?"

> "Our architecture is designed for enterprise:
> - On-premises PII processing (data never leaves)
> - SOC2 compliant infrastructure
> - Full audit trails
> - Role-based access controls
>
> Happy to do a security review with your team."

---

## Demo Environment Details

| Component | URL |
|-----------|-----|
| POC-1 (Customer AI) | http://localhost:3334 |
| POC-2 (Agent AI) | http://localhost:3335 |
| Backend API | http://localhost:3336 |

### Quick Commands

```bash
# Start all services
./start-demo.sh

# Stop all services
./stop-demo.sh
```

---

## Presentation Tips

1. **Test before presenting** - Run through once to warm up the backend
2. **Use Auto-Play** - Lets you talk while the demo runs
3. **Watch the gauge** - The sentiment gauge is a great visual anchor
4. **Pause strategically** - Space bar pauses; use it for emphasis
5. **Export session** - Press 'E' to give them the transcript afterwards

---

*Last Updated: December 2024*
