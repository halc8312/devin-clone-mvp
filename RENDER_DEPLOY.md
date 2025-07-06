# Render.com デプロイガイド

このプロジェクトは、Render.comを使用してフロントエンドとバックエンドの両方をデプロイできます。

## 🚀 ワンクリックデプロイ

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/halc8312/devin-clone-mvp)

## 📋 デプロイ手順

### 1. リポジトリの準備
```bash
# このリポジトリをフォーク
git clone https://github.com/your-username/devin-clone-mvp.git
cd devin-clone-mvp
```

### 2. Render.comでのデプロイ
1. [Render.com](https://render.com)にアカウント作成・ログイン
2. "New +" → "Blueprint" を選択
3. GitHubリポジトリを接続
4. `render.yaml` ファイルが自動検出される
5. "Apply" をクリックしてデプロイ開始

### 3. 環境変数の設定
デプロイ後、Renderダッシュボードで以下の環境変数を設定：

#### 必須設定
- `ANTHROPIC_API_KEY`: Claude APIキー（[Anthropic Console](https://console.anthropic.com/)で取得）

#### オプション設定（MVP では不要）
- `STRIPE_SECRET_KEY`: Stripe秘密キー（支払い機能用）
- `STRIPE_WEBHOOK_SECRET`: Stripeウェブフック秘密（支払い機能用）

## 🏗️ デプロイされるサービス

### バックエンド API
- **サービス名**: `devin-clone-api`
- **URL**: `https://devin-clone-api.onrender.com`
- **技術**: FastAPI + Python
- **データベース**: PostgreSQL（自動作成）

### フロントエンド
- **サービス名**: `devin-clone-frontend`
- **URL**: `https://devin-clone-frontend.onrender.com`
- **技術**: Next.js + React

### データベース
- **名前**: `devin-clone-db`
- **タイプ**: PostgreSQL
- **プラン**: Starter（無料）

## 🔧 設定済み機能

### ✅ 自動設定済み
- データベース接続
- CORS設定
- セキュリティキー生成
- Claude モデル選択機能
- ユーザー認証
- プロジェクト管理
- チャット機能

### ⏳ 手動設定が必要
- Anthropic API キー（Claude AI用）

### 🚫 無効化済み（MVP用）
- Stripe支払い機能
- OAuth認証（GitHub/Google）

## 📊 リソース使用量

### 無料プランで利用可能
- **Web Services**: 2つ（フロントエンド + バックエンド）
- **Database**: PostgreSQL 1つ
- **月間利用時間**: 750時間/月（各サービス）
- **ストレージ**: 1GB

## 🔄 自動デプロイ

GitHubリポジトリにプッシュすると自動的にデプロイされます：
- `main` ブランチ → 本番環境
- 他のブランチ → プレビュー環境（オプション）

## 🐛 トラブルシューティング

### デプロイエラー
```bash
# ログを確認
# Renderダッシュボード → サービス → Logs
```

### データベース接続エラー
- PostgreSQLデータベースが作成されているか確認
- `DATABASE_URL` 環境変数が正しく設定されているか確認

### API接続エラー
- フロントエンドの `NEXT_PUBLIC_API_URL` が正しいか確認
- バックエンドの `BACKEND_CORS_ORIGINS` にフロントエンドURLが含まれているか確認

## 📝 環境変数一覧

### バックエンド
```env
ENVIRONMENT=production
DEBUG=false
SECRET_KEY=<自動生成>
DATABASE_URL=<自動設定>
ANTHROPIC_API_KEY=<手動設定>
FRONTEND_URL=https://devin-clone-frontend.onrender.com
BACKEND_CORS_ORIGINS=["https://devin-clone-frontend.onrender.com"]
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
```

### フロントエンド
```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://devin-clone-api.onrender.com
NEXTAUTH_URL=https://devin-clone-frontend.onrender.com
NEXTAUTH_SECRET=<自動生成>
NEXT_PUBLIC_ENABLE_PAYMENTS=false
NEXT_PUBLIC_ENABLE_OAUTH=false
```

## 🎯 デプロイ後の確認

1. **バックエンド**: `https://devin-clone-api.onrender.com/health`
2. **フロントエンド**: `https://devin-clone-frontend.onrender.com`
3. **API**: `https://devin-clone-api.onrender.com/docs`

## 💡 次のステップ

1. Anthropic API キーを設定
2. ユーザー登録・ログインをテスト
3. Claude モデル選択機能をテスト
4. プロジェクト作成・チャット機能をテスト

## 📞 サポート

問題が発生した場合：
1. Renderダッシュボードでログを確認
2. GitHubリポジトリのIssuesで報告
3. [Render.com ドキュメント](https://render.com/docs)を参照