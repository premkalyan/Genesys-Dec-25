#!/bin/bash

# ============================================================
# Genesys AI Demo - One-Click Start Script
# ============================================================
# This script starts all demo services:
#   - Backend API (port 3336)
#   - POC-1: AI Layer Demo (port 3334)
#   - POC-2: Agent Assist Demo (port 3335)
# ============================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
ORANGE='\033[0;33m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo ""
echo -e "${ORANGE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${ORANGE}║         ${NC}GENESYS AI DEMO - STARTING SERVICES${ORANGE}              ║${NC}"
echo -e "${ORANGE}║         ${NC}Powered by Bounteous AI${ORANGE}                          ║${NC}"
echo -e "${ORANGE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to check if a port is in use
check_port() {
    lsof -i:$1 > /dev/null 2>&1
    return $?
}

# Function to kill process on port
kill_port() {
    if check_port $1; then
        echo -e "${YELLOW}⚠ Port $1 in use. Stopping existing process...${NC}"
        lsof -ti:$1 | xargs kill -9 2>/dev/null
        sleep 1
    fi
}

# Kill any existing processes on our ports
echo -e "${BLUE}[1/5]${NC} Cleaning up existing processes..."
kill_port 3334
kill_port 3335
kill_port 3336
echo -e "${GREEN}✓${NC} Ports cleared"
echo ""

# Start Backend API
echo -e "${BLUE}[2/5]${NC} Starting Backend API on port 3336..."
cd "$SCRIPT_DIR/knowledge-backend"
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}⚠ Virtual environment not found. Creating...${NC}"
    python3 -m venv venv
    ./venv/bin/pip install -r requirements.txt 2>/dev/null
else
    # Check if new dependencies need installing (sentiment analysis)
    if ! ./venv/bin/pip show vaderSentiment > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠ Installing sentiment analysis dependencies...${NC}"
        ./venv/bin/pip install -r requirements.txt 2>/dev/null
    fi
fi
./venv/bin/python3 api.py > /tmp/backend-3336.log 2>&1 &
BACKEND_PID=$!

# Wait for backend to start (up to 10 seconds)
echo -n "   Waiting for backend"
for i in {1..10}; do
    if check_port 3336; then
        echo ""
        echo -e "${GREEN}✓${NC} Backend API started (PID: $BACKEND_PID)"
        break
    fi
    echo -n "."
    sleep 1
done

# Final check if backend started
if ! check_port 3336; then
    echo ""
    echo -e "${RED}✗${NC} Failed to start Backend API. Check /tmp/backend-3336.log"
    exit 1
fi

# Load knowledge base if empty
echo -e "${BLUE}[3/5]${NC} Checking knowledge base..."
HEALTH=$(curl -s http://localhost:3336/health 2>/dev/null)
DOC_COUNT=$(echo $HEALTH | python3 -c "import sys, json; print(json.load(sys.stdin).get('documents', 0))" 2>/dev/null)

if [ "$DOC_COUNT" -lt "10" ] 2>/dev/null; then
    echo -e "${YELLOW}⚠ Loading sample documents into knowledge base...${NC}"
    curl -s -X POST http://localhost:3336/api/knowledge/load-samples > /dev/null
    sleep 2
    HEALTH=$(curl -s http://localhost:3336/health 2>/dev/null)
    DOC_COUNT=$(echo $HEALTH | python3 -c "import sys, json; print(json.load(sys.stdin).get('documents', 0))" 2>/dev/null)
fi
echo -e "${GREEN}✓${NC} Knowledge base ready ($DOC_COUNT documents)"
echo ""

# Start POC-1 (demo-app)
echo -e "${BLUE}[4/5]${NC} Starting POC-1 (AI Layer Demo) on port 3334..."
cd "$SCRIPT_DIR/demo-app"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠ Dependencies not found. Installing...${NC}"
    npm install > /dev/null 2>&1
fi
npm run dev -- -p 3334 > /tmp/poc1-3334.log 2>&1 &
POC1_PID=$!
sleep 5

if check_port 3334; then
    echo -e "${GREEN}✓${NC} POC-1 started (PID: $POC1_PID)"
else
    echo -e "${RED}✗${NC} Failed to start POC-1. Check /tmp/poc1-3334.log"
fi
echo ""

# Start POC-2 (agent-assist-demo)
echo -e "${BLUE}[5/5]${NC} Starting POC-2 (Agent Assist Demo) on port 3335..."
cd "$SCRIPT_DIR/agent-assist-demo"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠ Dependencies not found. Installing...${NC}"
    npm install > /dev/null 2>&1
fi
npm run dev -- -p 3335 > /tmp/poc2-3335.log 2>&1 &
POC2_PID=$!
sleep 5

if check_port 3335; then
    echo -e "${GREEN}✓${NC} POC-2 started (PID: $POC2_PID)"
else
    echo -e "${RED}✗${NC} Failed to start POC-2. Check /tmp/poc2-3335.log"
fi
echo ""

# Summary
echo -e "${ORANGE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${ORANGE}║${NC}                   ${GREEN}ALL SERVICES RUNNING${NC}                   ${ORANGE}║${NC}"
echo -e "${ORANGE}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${ORANGE}║${NC}                                                          ${ORANGE}║${NC}"
echo -e "${ORANGE}║${NC}  ${BLUE}Backend API:${NC}     http://localhost:3336                ${ORANGE}║${NC}"
echo -e "${ORANGE}║${NC}  ${BLUE}POC-1 Demo:${NC}      http://localhost:3334                ${ORANGE}║${NC}"
echo -e "${ORANGE}║${NC}  ${BLUE}POC-2 Demo:${NC}      http://localhost:3335                ${ORANGE}║${NC}"
echo -e "${ORANGE}║${NC}                                                          ${ORANGE}║${NC}"
echo -e "${ORANGE}║${NC}  ${YELLOW}Knowledge Base:${NC}  $DOC_COUNT documents indexed             ${ORANGE}║${NC}"
echo -e "${ORANGE}║${NC}  ${YELLOW}Sentiment:${NC}       VADER + Transformer (ML)             ${ORANGE}║${NC}"
echo -e "${ORANGE}║${NC}                                                          ${ORANGE}║${NC}"
echo -e "${ORANGE}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${ORANGE}║${NC}  ${GREEN}Demo Pages:${NC}                                            ${ORANGE}║${NC}"
echo -e "${ORANGE}║${NC}    - Smart Chat:  http://localhost:3334/smart-chat       ${ORANGE}║${NC}"
echo -e "${ORANGE}║${NC}    - Handoff:     http://localhost:3334/handoff          ${ORANGE}║${NC}"
echo -e "${ORANGE}║${NC}    - Agent Assist: http://localhost:3335                 ${ORANGE}║${NC}"
echo -e "${ORANGE}║${NC}                                                          ${ORANGE}║${NC}"
echo -e "${ORANGE}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${ORANGE}║${NC}  ${YELLOW}Press Ctrl+C to stop all services${NC}                      ${ORANGE}║${NC}"
echo -e "${ORANGE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Save PIDs for cleanup
echo "$BACKEND_PID $POC1_PID $POC2_PID" > /tmp/genesys-demo-pids.txt

# Wait for interrupt
cleanup() {
    echo ""
    echo -e "${YELLOW}Stopping all services...${NC}"
    kill $BACKEND_PID $POC1_PID $POC2_PID 2>/dev/null
    rm -f /tmp/genesys-demo-pids.txt
    echo -e "${GREEN}✓${NC} All services stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Keep script running
while true; do
    sleep 1
done
