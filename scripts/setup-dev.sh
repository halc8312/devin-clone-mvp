#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Setting up Devin Clone development environment...${NC}"

# Check if required tools are installed
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 is not installed. Please install it first.${NC}"
        exit 1
    fi
}

echo -e "${YELLOW}Checking prerequisites...${NC}"
check_command node
check_command pnpm
check_command python
check_command docker
check_command docker-compose

# Install frontend dependencies
echo -e "${GREEN}📦 Installing frontend dependencies...${NC}"
cd frontend
pnpm install

# Copy environment files if they don't exist
if [ ! -f .env.local ]; then
    cp .env.local.example .env.local
    echo -e "${YELLOW}📝 Created frontend/.env.local - Please update with your API keys${NC}"
fi

cd ..

# Setup Python virtual environment
echo -e "${GREEN}🐍 Setting up Python environment...${NC}"
cd backend/core

if [ ! -d "venv" ]; then
    python -m venv venv
fi

# Activate virtual environment
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Copy environment files if they don't exist
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${YELLOW}📝 Created backend/core/.env - Please update with your API keys${NC}"
fi

cd ../..

# Start Docker services
echo -e "${GREEN}🐳 Starting Docker services...${NC}"
docker-compose up -d

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 10

# Check if services are running
if docker-compose ps | grep -q "postgres.*Up"; then
    echo -e "${GREEN}✅ PostgreSQL is running${NC}"
else
    echo -e "${RED}❌ PostgreSQL failed to start${NC}"
fi

if docker-compose ps | grep -q "redis.*Up"; then
    echo -e "${GREEN}✅ Redis is running${NC}"
else
    echo -e "${RED}❌ Redis failed to start${NC}"
fi

if docker-compose ps | grep -q "mailhog.*Up"; then
    echo -e "${GREEN}✅ Mailhog is running${NC}"
else
    echo -e "${RED}❌ Mailhog failed to start${NC}"
fi

echo -e "${GREEN}✨ Setup complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update environment variables in:"
echo "   - frontend/.env.local"
echo "   - backend/core/.env"
echo ""
echo "2. Start development servers:"
echo "   - Frontend: cd frontend && pnpm dev"
echo "   - Backend: cd backend/core && source venv/bin/activate && python -m app.main"
echo ""
echo "3. Access the application:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend API: http://localhost:8000"
echo "   - API Docs: http://localhost:8000/docs"
echo "   - Mailhog: http://localhost:8025"