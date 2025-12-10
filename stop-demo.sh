#!/bin/bash

# ============================================================
# Genesys AI Demo - Stop Script
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
ORANGE='\033[0;33m'
NC='\033[0m'

echo ""
echo -e "${ORANGE}Stopping Genesys AI Demo Services...${NC}"
echo ""

# Kill processes by port
for port in 3334 3335 3336; do
    PID=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$PID" ]; then
        echo -e "${YELLOW}Stopping process on port $port (PID: $PID)${NC}"
        kill -9 $PID 2>/dev/null
    fi
done

# Clean up PID file
rm -f /tmp/genesys-demo-pids.txt

echo ""
echo -e "${GREEN}✓ All demo services stopped${NC}"
echo ""
