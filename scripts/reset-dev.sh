#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}⚠️  This will reset your development environment!${NC}"
echo "This includes:"
echo "  - Stopping all Docker containers"
echo "  - Removing Docker volumes (database data)"
echo "  - Removing node_modules and Python venv"
echo ""
read -p "Are you sure you want to continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}Cancelled.${NC}"
    exit 0
fi

echo -e "${RED}🧹 Cleaning up development environment...${NC}"

# Stop Docker services
echo -e "${YELLOW}Stopping Docker services...${NC}"
docker-compose down -v

# Remove node_modules
echo -e "${YELLOW}Removing node_modules...${NC}"
rm -rf frontend/node_modules
rm -f frontend/pnpm-lock.yaml

# Remove Python virtual environment
echo -e "${YELLOW}Removing Python virtual environment...${NC}"
rm -rf backend/core/venv
rm -rf backend/core/__pycache__
find backend -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true

# Remove .next build directory
echo -e "${YELLOW}Removing build artifacts...${NC}"
rm -rf frontend/.next
rm -rf frontend/out

echo -e "${GREEN}✨ Environment reset complete!${NC}"
echo ""
echo "To set up again, run: ./scripts/setup-dev.sh"