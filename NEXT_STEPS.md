# Devin Clone MVP - 次のステップ

## 🎯 現在の状況
Phase 1 (基盤構築とセットアップ) が完了しました。以下の成果物が作成されています：

### ✅ 完了したもの
1. **プロジェクト構造**: Frontend/Backend/Infrastructureの基本構造
2. **環境設定**: `.env`ファイルの設定
3. **CI/CDパイプライン**: GitHub Actionsの設定
4. **開発計画書**: 詳細な作業計画とスプリント計画
5. **技術仕様書**: アーキテクチャとデータモデル設計

## 🚀 Phase 2: 認証・認可システム (Day 4-7)

### Day 4-5: バックエンド認証
1. **データベースセットアップ**
   ```bash
   # PostgreSQLが起動していることを確認
   docker compose up -d postgres redis
   
   # マイグレーション実行
   cd backend/core
   alembic upgrade head
   ```

2. **認証エンドポイント実装**
   - `/api/v1/auth/signup` - ユーザー登録
   - `/api/v1/auth/signin` - ログイン
   - `/api/v1/auth/refresh` - トークンリフレッシュ
   - `/api/v1/auth/me` - 現在のユーザー情報

### Day 6-7: フロントエンド認証
1. **NextAuth.js設定**
   - Credentialsプロバイダー実装
   - Google OAuth設定
   - セッション管理

2. **認証UI実装**
   - ログイン画面 (`/auth/signin`)
   - サインアップ画面 (`/auth/signup`)
   - ダッシュボード (`/dashboard`)

## 📋 必要なアクション

### 1. 環境の準備
```bash
# Dockerサービスの起動
docker compose up -d

# Backend仮想環境の有効化
cd backend/core
source venv/bin/activate  # Windows: venv\Scripts\activate

# Frontend依存関係のインストール
cd ../../frontend
npm install  # または pnpm install
```

### 2. 環境変数の更新
以下のAPIキーを取得して`.env`ファイルを更新：
- **Anthropic API Key**: https://console.anthropic.com/
- **Google OAuth**: https://console.cloud.google.com/
- **Stripe Keys**: https://dashboard.stripe.com/test/apikeys

### 3. 開発サーバーの起動
```bash
# Terminal 1 - Backend
cd backend/core
python -m app.main

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## 🔍 テスト方法

### Backend API テスト
```bash
# Health check
curl http://localhost:8000/health

# API docs
open http://localhost:8000/docs
```

### Frontend テスト
```bash
# 開発サーバー
open http://localhost:3000

# 型チェック
npm run type-check

# リント
npm run lint
```

## 📝 重要な注意点

1. **セキュリティ**
   - 本番環境では必ずSECRET_KEYを変更
   - HTTPSを使用
   - CORSの設定を適切に行う

2. **データベース**
   - 初回起動時はマイグレーションが必要
   - テストデータの作成スクリプトを準備

3. **AI統合**
   - Claude APIのレート制限に注意
   - 開発中はモックレスポンスの使用を検討

## 🎯 Week 1の目標
- [ ] 認証システムの完全動作
- [ ] 基本的なユーザー管理機能
- [ ] プロジェクト作成・一覧表示
- [ ] CI/CDパイプラインの動作確認

## 📚 参考資料
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Next.js Docs](https://nextjs.org/docs)
- [NextAuth.js Docs](https://next-auth.js.org/)
- [Anthropic API Docs](https://docs.anthropic.com/)

---

準備ができたら、Phase 2の実装を開始してください！