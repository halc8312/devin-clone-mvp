# 🚀 MVP クイックデプロイガイド

**たった3ステップで本番環境にデプロイ！**

## 📋 事前準備（5分）

### 1. Anthropic API Key取得
1. [Anthropic Console](https://console.anthropic.com/) でアカウント作成
2. API Keyを生成（`sk-ant-xxxxx`形式）
3. メモしておく

## 🔧 デプロイ手順

### Step 1: Render.com でバックエンドデプロイ（3分）

1. **Render.com アカウント作成**
   - [render.com](https://render.com) でサインアップ

2. **リポジトリ接続**
   - Dashboard > "New" > "Web Service"
   - GitHub リポジトリを接続
   - このリポジトリを選択

3. **自動設定確認**
   - Name: `devin-clone-api`
   - Root Directory: `backend/core`
   - Runtime: `Python 3`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   
   ※ `render.yaml`により自動設定されます

4. **環境変数設定（1つだけ！）**
   - Environment Variables セクションで追加:
   ```
   ANTHROPIC_API_KEY = sk-ant-xxxxx（あなたのAPIキー）
   ```

5. **デプロイ実行**
   - "Create Web Service" をクリック
   - 自動でPostgreSQLデータベースも作成されます

### Step 2: Vercel でフロントエンドデプロイ（2分）

1. **Vercel アカウント作成**
   - [vercel.com](https://vercel.com) でサインアップ

2. **プロジェクトインポート**
   - "New Project" > GitHub リポジトリを選択
   - Root Directory: `frontend`

3. **環境変数設定（3つだけ！）**
   ```
   NEXT_PUBLIC_API_URL = https://your-api-name.onrender.com
   NEXTAUTH_URL = https://your-app.vercel.app
   NEXTAUTH_SECRET = （32文字のランダム文字列）
   ```
   
   ※ NEXTAUTH_SECRETは以下で生成:
   ```bash
   openssl rand -base64 32
   ```

4. **デプロイ実行**
   - "Deploy" をクリック

### Step 3: URL更新（1分）

1. **Render.com で環境変数更新**
   - デプロイ完了後、VercelのURLを確認
   - Render.com dashboard で以下を更新:
   ```
   FRONTEND_URL = https://your-app.vercel.app
   BACKEND_CORS_ORIGINS = https://your-app.vercel.app
   ```

2. **完了！**
   - フロントエンドURLにアクセス
   - アカウント作成してテスト

## ✅ 動作確認

- [ ] フロントエンドが表示される
- [ ] ユーザー登録ができる
- [ ] ログインができる
- [ ] プロジェクト作成ができる
- [ ] AIチャットが応答する

## 💰 コスト

- **Render.com**: $0/月（無料プラン）
- **Vercel**: $0/月（Hobbyプラン）
- **Anthropic**: 使用量次第（月$3-20程度）

**合計: 月額 $3-20**

## 🔧 トラブルシューティング

### よくある問題

1. **CORS エラー**
   - `BACKEND_CORS_ORIGINS`にフロントエンドURLが正しく設定されているか確認

2. **API接続エラー**
   - `NEXT_PUBLIC_API_URL`がRender.comのURLと一致しているか確認

3. **認証エラー**
   - `NEXTAUTH_SECRET`が設定されているか確認

### サポート

問題が発生した場合:
- [GitHub Issues](https://github.com/yourusername/devin-clone-mvp/issues)
- Render.com: [support@render.com](mailto:support@render.com)
- Vercel: [support@vercel.com](mailto:support@vercel.com)

## 🎯 次のステップ

MVPが動作したら、以下の機能を段階的に追加:

1. **決済機能** - Stripe統合
2. **OAuth認証** - Google/GitHub ログイン
3. **パフォーマンス最適化** - Redis追加
4. **メール通知** - SendGrid統合
5. **ファイルストレージ** - AWS S3統合

---

**🎉 おめでとうございます！あなたのAI開発アシスタントが本番稼働中です！**