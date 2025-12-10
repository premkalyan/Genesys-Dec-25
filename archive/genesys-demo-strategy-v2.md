# Genesys Demo Strategy v2: SLM-First Approach

**Date:** November 30, 2024
**Status:** Approved for Implementation

---

## Executive Summary

Instead of building a fictional vertical demo (airline, banking, etc.), we lead with Bounteous's actual production asset: the internal fine-tuned SLM. This proves capability rather than just showing concepts.

**The Pitch:**
> "Genesys provides world-class CX orchestration. Bounteous provides the enterprise AI layer that makes it domain-specific, PII-safe, and cost-efficient. Here's proof - we built it for ourselves first."

---

## Why This Approach Beats a Vertical Demo

| Vertical Demo (Old) | SLM-First Demo (New) |
|---------------------|----------------------|
| Hypothetical scenario | Real production system |
| Made-up policies | Actual Bounteous data |
| "We could do this" | "We already did this" |
| Competes with Genesys messaging | Complements Genesys |
| Vertical-specific | Methodology works anywhere |

---

## Three Hero Moments

### Hero 1: Speed & Cost
**The Demo:** Live query to Bounteous SLM answering HR policy questions

**What to Show:**
- 87ms response time (displayed prominently)
- $0.0001 per query cost
- Source citation ("Employee Handbook Section 4.2")
- Compare: GPT-4 at 300ms, $0.02/query (200x more expensive)

**Talking Point:**
> "This is in production. 500 employees use it daily. 96% accuracy. $1.25/month to run."

### Hero 2: PII-Safe RAG
**The Demo:** Query containing PII, showing detection and redaction

**What to Show:**
- Original query with PII highlighted
- Redacted version sent to model
- Response with PII reconstructed
- Audit log (timestamp, PII type, action)

**Talking Point:**
> "In a contact center, every conversation has PII. We intercept it before it hits any model, then reconstruct for the response. Full audit trail for compliance."

### Hero 3: Agent Handoff Context
**The Demo:** Customer chat escalating to human agent

**What to Show:**
- 3-turn customer conversation with AI
- "Transfer to Agent" button
- Agent view with:
  - Customer profile
  - Conversation summary
  - Intent detected
  - Resolution attempts
  - Recommended action

**Talking Point:**
> "The customer never repeats themselves. The agent has everything."

---

## Demo Flow (15 Minutes)

### Act 1: The Proof Point (5 min)
1. "Let me show you what we built for ourselves."
2. Open Bounteous SLM interface
3. Query: "What is Bounteous's remote work policy?"
4. Point out: latency, citation, cost
5. Query: "How do I submit expenses over $500?"
6. Show complexity handled

### Act 2: The PII Protection (5 min)
1. "Now let me show you how we handle sensitive data."
2. Show architecture diagram
3. Demo query with PII
4. Show audit log

### Act 3: The Genesys Integration Story (5 min)
1. "Here's how this enhances Genesys Cloud."
2. Architecture slide:
   ```
   Genesys Cloud CX (routing, orchestration, agent desktop)
              |
   Bounteous AI Layer (SLM, RAG, PII protection)
              |
   Enterprise Data (CRM, CDP, policy docs)
   ```
3. Integration points:
   - Genesys Conversation API -> real-time assist
   - Agent Workspace API -> handoff context
   - Predictive Engagement -> AI triggers
4. Show handoff example

---

## What We're Building

### Component 1: SLM Chat UI
- Modern chat interface
- Real-time latency display
- Source citation panel
- Cost ticker
- Tech: Next.js/React

### Component 2: PII Detection Layer
- Real-time PII highlighting
- Before/after visualization
- Audit log panel
- Tech: Presidio or regex patterns

### Component 3: Agent Handoff Mockup
- Split screen (customer | agent)
- Conversation summary generator
- Customer profile panel
- Transfer flow

### Component 4: Metrics Dashboard
- SLM performance (queries, latency, accuracy, cost)
- Cost comparison (SLM vs GPT-4)
- Usage patterns

### Component 5: Architecture Slides
- Current state: Genesys alone
- Enhanced state: Genesys + Bounteous
- Integration points
- Data flow
- Security architecture

---

## Objection Handling

**"But you're not showing Genesys integration..."**
> "Correct - we're showing the AI layer that integrates with Genesys. The integration itself is standard APIs. What's hard is building a domain-tuned, PII-safe, cost-efficient AI system. That's what we're proving works."

**"How do we know this works for our customers' domains?"**
> "The methodology is domain-agnostic. We collected our policies, created Q&A pairs, fine-tuned Phi-3, deployed on-prem. Same process works for banking, healthcare, or insurance. We'd do a 2-week sprint to prove it on your domain."

**"What about Genesys's own AI?"**
> "Genesys AI Studio is excellent for building flows. We add three things: (1) domain-specific fine-tuning, (2) PII protection that keeps data on-prem, (3) cost efficiency at scale - 200x cheaper."

---

## Honest Positioning

**What we're showing:**
- Real, production AI system
- Proven methodology
- Clear integration path with Genesys

**What we're NOT claiming:**
- Full Genesys integration built
- Production deployment for specific vertical
- Replacement for Genesys AI

**The Ask:**
> "Give us a pilot customer and 4 weeks. We'll deploy this methodology on their domain, integrated with their Genesys Cloud instance, with measurable results."

---

## Build Priority

1. **Phase 1:** Core SLM UI polish
2. **Phase 2:** PII detection layer
3. **Phase 3:** Agent handoff mockup
4. **Phase 4:** Metrics dashboard
5. **Phase 5:** Architecture slides & talking points

---

## References

- [Genesys Agent Copilot](https://www.genesys.com/capabilities/agent-copilot)
- [Genesys AI Studio](https://www.genesys.com/capabilities/ai-studio)
- [Genesys Customer Stories](https://www.genesys.com/customer-stories)
- [Genesys Developer Center](https://developer.genesys.cloud/)
