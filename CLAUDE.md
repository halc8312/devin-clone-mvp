# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a full-stack AI-powered software engineering assistant with:
- **Frontend**: Next.js 14 (TypeScript) deployed on Vercel
- **Backend**: FastAPI (Python 3.11) deployed on Render.com
- **Database**: PostgreSQL + Redis
- **AI**: Anthropic Claude 3.5 Sonnet API
- **Auth**: JWT-based with NextAuth.js
- **Payments**: Stripe subscriptions (optional)

## Critical Commands

### Local Development
```bash
# Initial setup (one-time)
./scripts/setup-dev.sh

# Start all services
docker-compose up -d  # PostgreSQL, Redis, Mailhog

# Backend (in backend/core/)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head      # Run database migrations
uvicorn app.main:app --reload --port 8000

# Frontend (in frontend/)
npm install  # or pnpm install
npm run dev  # Starts on http://localhost:3000
```

### Testing
```bash
# Backend tests
cd backend/core
pytest                    # All tests
pytest tests/unit/test_auth.py::TestSecurity::test_password_hashing  # Single test
pytest -k "auth"          # Tests matching pattern

# Frontend tests  
cd frontend
npm test                  # Unit tests
npm run test:e2e          # E2E tests (requires running app)
```

### Database Operations
```bash
# Create new migration
alembic revision -m "description" --autogenerate

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Deployment
```bash
# Frontend to Vercel
cd frontend
./deploy.sh --prod

# Backend to Render.com
git push origin main  # Auto-deploys via render.yaml
```

## Key Architecture Patterns

### API Structure
The backend follows a layered architecture:
```
app/
├── api/v1/endpoints/  # FastAPI route handlers
├── core/              # Config, security, external clients
├── models/            # SQLAlchemy ORM models
├── schemas/           # Pydantic validation schemas
└── db/                # Database session management
```

### Frontend Structure
```
src/
├── app/               # Next.js 14 app router pages
├── components/        # Reusable UI components
├── lib/               # API client, utilities
└── hooks/             # Custom React hooks
```

### Authentication Flow
1. User signs in → Backend validates → Returns JWT tokens
2. Frontend stores tokens → Includes in API requests
3. Backend validates JWT → Returns user data
4. Refresh token used when access token expires

### Database Relationships
- User → has many Projects
- Project → has many Files (hierarchical tree)
- Project → has many ChatSessions
- ChatSession → has many Messages
- User → has one Subscription → has many Payments

### AI Integration
The Claude API is integrated in `backend/core/app/core/claude.py`:
- Supports streaming responses via Server-Sent Events
- Context-aware with file references
- Code generation, explanation, fixing, and improvement endpoints

### File Management
Files are stored in PostgreSQL with:
- Hierarchical structure (parent_id references)
- Binary file detection
- Language detection
- Size limits based on subscription tier

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql+asyncpg://...
REDIS_URL=redis://...
SECRET_KEY=<32+ char secret>
ANTHROPIC_API_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_test_... (optional)
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<32+ char secret>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... (optional)
```

## Common Tasks

### Adding a New API Endpoint
1. Create route handler in `backend/core/app/api/v1/endpoints/`
2. Add Pydantic schemas in `app/schemas/`
3. Update `app/api/v1/api.py` to include router
4. Add frontend API client method in `frontend/src/lib/api.ts`

### Adding a New Database Model
1. Create model in `backend/core/app/models/`
2. Import in `app/models/__init__.py`
3. Create Alembic migration
4. Add CRUD operations if needed

### Modifying AI Behavior
Edit `backend/core/app/core/claude.py` for:
- System prompts
- Model parameters
- Response formatting
- Token limits

## Performance Considerations

- Redis caching is implemented for frequently accessed data
- Database queries use eager loading to prevent N+1 problems
- Frontend uses React Query for client-side caching
- File uploads have size limits based on subscription tier
- AI responses stream to improve perceived performance

## Security Notes

- All user inputs are validated with Pydantic
- SQL injection prevented via SQLAlchemy ORM
- XSS prevention through React's default escaping
- File uploads are validated for type and size
- Rate limiting on sensitive endpoints
- CORS configured for production domains