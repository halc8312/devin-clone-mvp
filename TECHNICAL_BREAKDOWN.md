# Devin Clone MVP 技術詳細仕様

## アーキテクチャ概要

### システム構成図
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend API    │────▶│   Claude API    │
│  (Next.js 14)   │     │   (FastAPI)      │     │ (Anthropic)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │
         │                       ▼
         │              ┌──────────────────┐
         │              │   PostgreSQL     │
         │              │   + Redis        │
         │              └──────────────────┘
         ▼
┌─────────────────┐
│   Stripe API    │
└─────────────────┘
```

## Phase 1: 基盤構築 - 技術詳細

### 1.1 開発環境要件
```yaml
# 必須ソフトウェア
- Node.js: 20.x LTS
- Python: 3.11.x
- PostgreSQL: 15.x
- Redis: 7.x
- Docker: 24.x
- pnpm: 8.x
```

### 1.2 プロジェクト構造最適化
```bash
devin-clone-mvp/
├── .github/workflows/    # CI/CD設定
│   ├── backend.yml
│   └── frontend.yml
├── backend/
│   ├── core/
│   │   ├── app/
│   │   │   ├── api/v1/
│   │   │   ├── core/
│   │   │   ├── db/
│   │   │   ├── models/
│   │   │   ├── schemas/
│   │   │   └── services/
│   │   └── tests/
│   └── shared/          # 共通ユーティリティ
├── frontend/
│   ├── src/
│   │   ├── app/        # App Router
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── store/      # Zustand stores
│   │   └── types/
│   └── public/
└── infrastructure/     # IaC設定
```

## Phase 2: 認証システム - 実装詳細

### 2.1 認証フロー
```typescript
// JWT Token Structure
interface TokenPayload {
  sub: string;          // user_id
  email: string;
  role: 'user' | 'admin';
  exp: number;
  iat: number;
}

// Session Management
interface UserSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}
```

### 2.2 データベーススキーマ
```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(512) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Phase 3: プロジェクト管理 - データモデル

### 3.1 プロジェクトスキーマ
```sql
-- Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    language VARCHAR(50),
    framework VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project files table
CREATE TABLE project_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    path VARCHAR(500) NOT NULL,
    content TEXT,
    language VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, path)
);
```

### 3.2 ファイル管理API
```python
# FastAPI endpoints
@router.post("/projects/{project_id}/files")
async def create_file(
    project_id: UUID,
    file: FileCreate,
    current_user: User = Depends(get_current_user)
):
    # ファイル作成ロジック
    pass

@router.put("/projects/{project_id}/files/{file_id}")
async def update_file(
    project_id: UUID,
    file_id: UUID,
    file_update: FileUpdate,
    current_user: User = Depends(get_current_user)
):
    # ファイル更新ロジック
    pass
```

## Phase 4: AI統合 - 実装戦略

### 4.1 Claude API統合
```python
# AI Service Implementation
class AIService:
    def __init__(self, api_key: str):
        self.client = anthropic.Anthropic(api_key=api_key)
        
    async def generate_code(
        self,
        prompt: str,
        context: List[Dict[str, str]],
        language: str
    ) -> CodeGenerationResponse:
        system_prompt = self._build_system_prompt(language)
        
        response = await self.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=4096,
            temperature=0.2,
            system=system_prompt,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        return self._parse_code_response(response)
```

### 4.2 コード実行環境
```python
# Sandboxed Execution
class CodeExecutor:
    def __init__(self):
        self.python_sandbox = PythonSandbox()
        self.js_sandbox = JavaScriptSandbox()
        
    async def execute_code(
        self,
        code: str,
        language: str,
        timeout: int = 30
    ) -> ExecutionResult:
        if language == "python":
            return await self.python_sandbox.execute(code, timeout)
        elif language == "javascript":
            return await self.js_sandbox.execute(code, timeout)
        else:
            raise UnsupportedLanguageError(language)
```

## Phase 5: UI/UX - コンポーネント設計

### 5.1 主要コンポーネント
```typescript
// Code Editor Component
interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  theme?: 'light' | 'dark';
  readOnly?: boolean;
}

// AI Chat Interface
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  codeBlocks?: CodeBlock[];
}

// Project Explorer
interface ProjectFile {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: ProjectFile[];
}
```

### 5.2 リアルタイム通信
```typescript
// WebSocket connection for real-time updates
class RealtimeService {
  private ws: WebSocket;
  
  connect(projectId: string) {
    this.ws = new WebSocket(`ws://localhost:8000/ws/${projectId}`);
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };
  }
  
  sendMessage(type: string, payload: any) {
    this.ws.send(JSON.stringify({ type, payload }));
  }
}
```

## Phase 6: 決済システム - Stripe統合

### 6.1 料金プラン設定
```typescript
// Pricing Configuration
const PRICING_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    features: {
      aiTokens: 10000,
      projects: 1,
      storage: '100MB',
      support: 'community'
    }
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceId: 'price_xxxxx', // Stripe Price ID
    price: 2000,
    features: {
      aiTokens: 100000,
      projects: -1, // unlimited
      storage: '10GB',
      support: 'email'
    }
  }
};
```

### 6.2 使用量追跡
```sql
-- Usage tracking
CREATE TABLE usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    resource_type VARCHAR(50), -- 'ai_tokens', 'storage', etc
    amount DECIMAL(10, 2),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscription management
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    stripe_subscription_id VARCHAR(255) UNIQUE,
    plan_id VARCHAR(50),
    status VARCHAR(50),
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Phase 7: テスト戦略

### 7.1 テストカバレッジ目標
- Unit Tests: 80%以上
- Integration Tests: 主要フロー100%
- E2E Tests: クリティカルパス100%

### 7.2 パフォーマンス基準
```yaml
# Performance Targets
api_response_time:
  p50: < 100ms
  p95: < 500ms
  p99: < 1000ms

frontend_metrics:
  first_contentful_paint: < 1.5s
  time_to_interactive: < 3s
  bundle_size: < 500KB

ai_processing:
  code_generation: < 5s
  execution_timeout: 30s
```

## セキュリティ実装

### API セキュリティ
```python
# Rate limiting
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)

@app.post("/api/v1/ai/generate")
@limiter.limit("10/minute")
async def generate_code(request: Request):
    pass

# Input validation
from pydantic import validator

class CodeGenerationRequest(BaseModel):
    prompt: str
    language: str
    
    @validator('prompt')
    def validate_prompt(cls, v):
        if len(v) > 10000:
            raise ValueError('Prompt too long')
        return v
```

### フロントエンドセキュリティ
```typescript
// Content Security Policy
const securityHeaders = {
  'Content-Security-Policy': `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    connect-src 'self' https://api.stripe.com;
  `
};
```

## モニタリング・ログ設計

### ログ収集
```python
# Structured logging
import structlog

logger = structlog.get_logger()

logger.info(
    "code_generation_requested",
    user_id=user.id,
    project_id=project_id,
    language=language,
    prompt_length=len(prompt)
)
```

### メトリクス収集
```python
# Prometheus metrics
from prometheus_client import Counter, Histogram

code_generation_counter = Counter(
    'code_generation_total',
    'Total code generations',
    ['language', 'status']
)

code_generation_duration = Histogram(
    'code_generation_duration_seconds',
    'Code generation duration'
)
```

## デプロイメントチェックリスト

### Production Readiness
- [ ] 環境変数の完全な設定
- [ ] SSL/TLS証明書の設定
- [ ] データベースバックアップ設定
- [ ] ログ収集・監視設定
- [ ] エラートラッキング（Sentry等）
- [ ] CDN設定（静的アセット）
- [ ] ロードバランサー設定
- [ ] 自動スケーリング設定
- [ ] セキュリティスキャン実施
- [ ] 負荷テスト完了