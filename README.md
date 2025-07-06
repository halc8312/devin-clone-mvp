# Devin Clone MVP

AI-powered software engineering assistant built with Next.js, FastAPI, and Claude 3.5 Sonnet.

## 🚀 Features

- 🤖 AI-powered code generation using Claude 3.5 Sonnet
- 📝 Interactive code editor with Monaco Editor
- 🏃 Code execution environment (Python/JavaScript)
- 💳 Stripe subscription integration
- 🔐 Authentication with NextAuth.js (Email/Password + Google OAuth)
- 📊 Project management system
- 🎨 Modern UI with Tailwind CSS

## 📁 Project Structure

```
devin-clone-mvp/
├── frontend/          # Next.js frontend application
│   ├── src/
│   │   ├── app/      # App router pages
│   │   ├── components/# UI components
│   │   ├── lib/      # Utilities and API client
│   │   └── hooks/    # Custom React hooks
│   └── package.json
├── backend/
│   └── core/         # FastAPI main service
│       ├── app/
│       │   ├── api/  # API endpoints
│       │   ├── core/ # Core functionality
│       │   ├── models/# Database models
│       │   └── schemas/# Pydantic schemas
│       └── requirements.txt
├── docker-compose.yml
└── docs/             # Documentation
```

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Shadcn/ui
- **Backend**: FastAPI (Python 3.11), PostgreSQL, Redis
- **AI**: Anthropic Claude 3.5 Sonnet
- **Authentication**: NextAuth.js with JWT
- **Deployment**: Vercel (Frontend), Render.com (Backend)
- **Payment**: Stripe Subscriptions

## 🚀 MVP Quick Deploy

### Option 1: Render.com (フロントエンド + バックエンド)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/halc8312/devin-clone-mvp)

**ワンクリックデプロイ - 設定は ANTHROPIC_API_KEY のみ！**

1. 上のボタンをクリック
2. Render.comでリポジトリを接続
3. `ANTHROPIC_API_KEY` を設定
4. デプロイ完了！

詳細: [RENDER_DEPLOY.md](./RENDER_DEPLOY.md)

### Option 2: Vercel + Render (従来の方法)

**Deploy to production in under 10 minutes with minimal setup:**

### 📋 What You Need
- [Anthropic API Key](https://console.anthropic.com/) (for AI features)
- GitHub account
- Render.com account (free)
- Vercel account (free)

### 🎯 One-Click Deploy
1. **Fork this repo** to your GitHub
2. **Render.com**: Connect repo → Add `ANTHROPIC_API_KEY` → Deploy
3. **Vercel**: Import project → Add 3 env vars → Deploy

**Total manual settings: 4 environment variables**

👉 **[Complete MVP Deploy Guide](./QUICK_DEPLOY.md)**

---

## 🛠️ Local Development

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL 14+
- Anthropic API Key

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/devin-clone-mvp.git
   cd devin-clone-mvp
   ```

2. **Set up the backend**
   ```bash
   cd backend/core
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   cp .env.example .env
   # Edit .env with your configuration
   alembic upgrade head
   uvicorn app.main:app --reload
   ```

3. **Set up the frontend**
   ```bash
   cd frontend
   npm install
   cp .env.example .env.local
   # Edit .env.local with your configuration
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## 🚀 Deployment

### Quick Deploy

1. **Backend on Render.com**
   - Fork this repository
   - Connect to Render.com
   - Use the `render.yaml` blueprint
   - Set environment variables
   - Deploy

2. **Frontend on Vercel**
   ```bash
   cd frontend
   ./deploy.sh --prod
   ```

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

## 📖 Documentation

- [Deployment Guide](./DEPLOYMENT.md)
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
- [Security Policy](./SECURITY.md)
- [API Documentation](http://localhost:8000/docs)

## 🔒 Security

- JWT-based authentication
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- Rate limiting
- Secure file upload handling

See [SECURITY.md](./SECURITY.md) for details.

## 💳 Subscription Tiers

| Feature | Free | Pro |
|---------|------|-----|
| Projects | 1 | Unlimited |
| Files per Project | 20 | 500 |
| Storage per Project | 10MB | 1GB |
| AI Features | Basic | Advanced |
| Support | Community | Priority |

## 🧪 Testing

```bash
# Backend tests
cd backend/core
pytest

# Frontend tests
cd frontend
npm test
npm run test:e2e
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Anthropic](https://www.anthropic.com/) for Claude API
- [Vercel](https://vercel.com/) for hosting
- [Render.com](https://render.com/) for backend hosting
- [Stripe](https://stripe.com/) for payment processing

- Node.js 18+
- Python 3.11+
- PostgreSQL
- Redis
- Docker & Docker Compose (optional)

### Development Setup

1. Clone the repository
```bash
git clone https://github.com/your-org/devin-clone-mvp.git
cd devin-clone-mvp
```

2. **Backend Setup**
```bash
cd backend/core

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials and API keys

# Run database migrations
alembic upgrade head

# Start the backend server
uvicorn app.main:app --reload --port 8000
```

3. **Frontend Setup**
```bash
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your API credentials

# Start the frontend server
npm run dev
```

4. **Database Setup** (if not using Docker)
```bash
# Create PostgreSQL database
createdb devin_clone

# Ensure Redis is running
redis-server
```

### Docker Setup (Alternative)

```bash
# From the root directory
docker-compose up
```

This will start:
- Frontend on http://localhost:3000
- Backend API on http://localhost:8000
- PostgreSQL on port 5432
- Redis on port 6379

## 🔧 Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/devin_clone
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ANTHROPIC_API_KEY=your-anthropic-api-key
STRIPE_SECRET_KEY=sk_test_xxx
```

### Frontend (.env.local)
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
NEXT_PUBLIC_API_URL=http://localhost:8000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

## 📚 API Documentation

Once the backend is running:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🧪 Development Commands

### Frontend
```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run lint       # Run ESLint
npm run type-check # Run TypeScript checks
```

### Backend
```bash
uvicorn app.main:app --reload  # Start dev server
pytest                         # Run tests
black .                        # Format code
flake8                        # Lint code
alembic upgrade head          # Run migrations
```

## 🚀 Deployment

### Frontend (Vercel)
```bash
vercel --prod
```

### Backend (Render)
- Connect your GitHub repository
- Set environment variables
- Deploy as Web Service

## 📄 License

MIT License

## 👥 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.