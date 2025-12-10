# Developer Guide - Genesys AI Demo

This guide covers how to set up, run, and maintain the Genesys AI Demo environment.

---

## Quick Start

```bash
# One-command start (recommended)
./start-demo.sh

# One-command stop
./stop-demo.sh
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        DEMO ENVIRONMENT                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│   │  POC-1      │    │  POC-2      │    │  Backend    │        │
│   │  AI Layer   │    │  Agent      │    │  API        │        │
│   │  Demo       │    │  Assist     │    │  (FastAPI)  │        │
│   │             │    │  Demo       │    │             │        │
│   │  Port 3334  │    │  Port 3335  │    │  Port 3336  │        │
│   │  Next.js    │    │  Next.js    │    │  Python     │        │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘        │
│          │                  │                  │                │
│          └──────────────────┼──────────────────┘                │
│                             │                                    │
│                    ┌────────▼────────┐                          │
│                    │    ChromaDB     │                          │
│                    │   Vector Store  │                          │
│                    │  (75 Documents) │                          │
│                    └─────────────────┘                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
/Users/premkalyan/code/Genesys/
├── demo-app/                    # POC-1: AI Layer Demo
│   ├── src/app/                 # Next.js pages
│   │   ├── chat/               # SLM Chat demo
│   │   ├── pii/                # PII Detection demo
│   │   ├── handoff/            # Agent Handoff demo
│   │   └── metrics/            # Metrics + ROI Calculator
│   └── package.json
│
├── agent-assist-demo/           # POC-2: Agent Assist Demo
│   ├── src/
│   │   ├── app/                # Next.js pages
│   │   │   ├── page.tsx        # Main agent desktop
│   │   │   ├── compare/        # Comparison view
│   │   │   └── admin/          # Admin/search page
│   │   ├── components/         # React components
│   │   └── lib/                # Utilities, scenarios, types
│   └── package.json
│
├── knowledge-backend/           # Backend API
│   ├── api.py                  # FastAPI server
│   ├── scraper.py              # Knowledge base loader
│   ├── venv/                   # Python virtual environment
│   └── requirements.txt
│
├── start-demo.sh               # One-click start script
├── stop-demo.sh                # Stop all services
├── DEV_GUIDE.md                # This file
├── TALK_TRACK.md               # Presentation talk track
└── MASTER_DEMO_PRESENTATION.md # Complete demo guide
```

---

## Manual Setup (First Time)

### 1. Backend Setup

```bash
cd knowledge-backend

# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
python api.py
```

### 2. POC-1 Setup (AI Layer Demo)

```bash
cd demo-app

# Install dependencies
npm install

# Start on port 3334
npm run dev -- -p 3334
```

### 3. POC-2 Setup (Agent Assist Demo)

```bash
cd agent-assist-demo

# Install dependencies
npm install

# Start on port 3335
npm run dev -- -p 3335
```

---

## Running the Demo

### Option 1: Auto-Start Script (Recommended)

```bash
./start-demo.sh
```

This script:
- Clears any existing processes on ports 3334, 3335, 3336
- Starts the backend API
- Loads 75 knowledge base documents
- Starts both frontend demos
- Shows status summary
- Handles Ctrl+C for clean shutdown

### Option 2: Manual Start (3 Terminals)

**Terminal 1 - Backend:**
```bash
cd knowledge-backend
source venv/bin/activate
python api.py
```

**Terminal 2 - POC-1:**
```bash
cd demo-app
npm run dev -- -p 3334
```

**Terminal 3 - POC-2:**
```bash
cd agent-assist-demo
npm run dev -- -p 3335
```

---

## Loading Knowledge Base

The knowledge base loads automatically with `start-demo.sh`. To manually reload:

```bash
# Load all 75 sample documents
curl -X POST http://localhost:3336/api/knowledge/load-samples

# Check document count
curl http://localhost:3336/health
```

---

## URLs Reference

| Service | URL | Purpose |
|---------|-----|---------|
| POC-1 Home | http://localhost:3334 | AI Layer Demo landing |
| POC-1 Chat | http://localhost:3334/chat | SLM Chat demo |
| POC-1 PII | http://localhost:3334/pii | PII Detection demo |
| POC-1 Handoff | http://localhost:3334/handoff | Agent handoff demo |
| POC-1 Metrics | http://localhost:3334/metrics | Metrics + ROI Calculator |
| POC-2 Main | http://localhost:3335 | Agent Assist demo |
| POC-2 Compare | http://localhost:3335/compare | Side-by-side comparison |
| POC-2 Admin | http://localhost:3335/admin | KB search/admin |
| Backend Health | http://localhost:3336/health | API health check |
| Backend Docs | http://localhost:3336/docs | Swagger API docs |

---

## Keyboard Shortcuts (POC-2)

| Key | Action |
|-----|--------|
| `Space` | Pause/Resume scenario |
| `→` | Next scenario |
| `←` | Previous scenario |
| `E` | Export session data |

---

## Running Auto-Play Demo

1. Open POC-2: http://localhost:3335
2. Select a scenario from dropdown
3. Click **"Auto-Play"** button (not just "Start Demo")
4. The demo will automatically:
   - Send customer messages
   - Wait for AI suggestions
   - Send agent responses
   - Progress through the scenario
5. Use speed control (0.5x - 2x) to adjust pacing
6. Press **Space** to pause/resume

---

## Troubleshooting

### Port Already in Use

```bash
# Kill process on specific port
lsof -ti:3336 | xargs kill -9

# Or use the stop script
./stop-demo.sh
```

### Backend Won't Start

```bash
# Check the log
cat /tmp/backend-3336.log

# Common fixes:
cd knowledge-backend
source venv/bin/activate
pip install -r requirements.txt
```

### Knowledge Base Empty

```bash
# Manually load documents
curl -X POST http://localhost:3336/api/knowledge/load-samples

# Verify
curl http://localhost:3336/health | jq .documents
```

### Frontend Build Errors

```bash
# Clear cache and reinstall
cd demo-app  # or agent-assist-demo
rm -rf node_modules .next
npm install
npm run dev -- -p 3334  # or 3335
```

---

## Log Files

| Log | Location |
|-----|----------|
| Backend | `/tmp/backend-3336.log` |
| POC-1 | `/tmp/poc1-3334.log` |
| POC-2 | `/tmp/poc2-3335.log` |
| PIDs | `/tmp/genesys-demo-pids.txt` |

---

## Development Tips

### Adding New Scenarios

Edit `agent-assist-demo/src/lib/scenarios.ts`:

```typescript
{
  id: 'my-scenario',
  name: 'My New Scenario',
  customer: {
    name: 'Customer Name',
    tier: 'Gold',
    accountAge: '1 year',
  },
  messages: [
    { role: 'customer', content: 'First message', delay: 1000 },
    { role: 'agent', content: 'Response', delay: 2000 },
  ],
  emotionalArc: {
    startSentiment: 'neutral',
    peakMoment: 2,
    resolution: 'positive',
  },
}
```

### Adding Knowledge Articles

Edit `knowledge-backend/scraper.py` and add to `SAMPLE_DOCUMENTS`:

```python
{
    "id": "sample_076",
    "title": "Article Title",
    "content": "Article content...",
    "category": "Category Name",
    "metadata": {"type": "guide", "difficulty": "intermediate"}
}
```

Then reload: `curl -X POST http://localhost:3336/api/knowledge/load-samples`

---

## Pre-Demo Checklist

- [ ] Run `./start-demo.sh`
- [ ] Verify all 3 services are running
- [ ] Check KB has 75 documents
- [ ] Test POC-1 chat feature
- [ ] Test POC-2 auto-play
- [ ] Test keyboard shortcuts
- [ ] Verify RAG status shows "Connected"

---

*Last Updated: December 2024*
