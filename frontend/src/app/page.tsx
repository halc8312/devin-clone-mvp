import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Code2, Zap, Shield } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="h-6 w-6" />
            <span className="text-xl font-bold">Devin Clone</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/auth/signin">
              <Button variant="ghost">ログイン</Button>
            </Link>
            <Link href="/auth/signup">
              <Button>無料で始める</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1">
        <div className="container flex flex-col items-center justify-center space-y-8 py-24 text-center">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
            AIと一緒にコーディング
          </h1>
          <p className="max-w-[700px] text-lg text-muted-foreground sm:text-xl">
            Claude 3.5 Sonnetを搭載したAIソフトウェアエンジニア。
            コード生成、デバッグ、実行を自動化します。
          </p>
          <div className="flex gap-4">
            <Link href="/auth/signup">
              <Button size="lg" className="gap-2">
                無料で始める <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline">
                機能を見る
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-t py-24">
        <div className="container">
          <h2 className="mb-12 text-center text-3xl font-bold">主な機能</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Code2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">AIコード生成</h3>
              <p className="text-muted-foreground">
                自然言語でリクエストするだけで、高品質なコードを自動生成
              </p>
            </div>
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">リアルタイム実行</h3>
              <p className="text-muted-foreground">
                Python、JavaScriptのコードをブラウザ上で即座に実行
              </p>
            </div>
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">セキュアな環境</h3>
              <p className="text-muted-foreground">
                隔離されたサンドボックス環境で安全にコードを実行
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="border-t py-24">
        <div className="container">
          <h2 className="mb-12 text-center text-3xl font-bold">料金プラン</h2>
          <div className="grid gap-8 md:grid-cols-2 lg:max-w-4xl lg:mx-auto">
            <div className="rounded-lg border p-8">
              <h3 className="mb-4 text-2xl font-semibold">Free</h3>
              <p className="mb-6 text-4xl font-bold">¥0<span className="text-lg font-normal">/月</span></p>
              <ul className="mb-8 space-y-2 text-muted-foreground">
                <li>✓ 月間10,000 AIトークン</li>
                <li>✓ 1プロジェクト</li>
                <li>✓ 基本的なコード実行</li>
                <li>✓ コミュニティサポート</li>
              </ul>
              <Link href="/auth/signup" className="w-full">
                <Button variant="outline" className="w-full">無料で始める</Button>
              </Link>
            </div>
            <div className="rounded-lg border border-primary p-8">
              <h3 className="mb-4 text-2xl font-semibold">Pro</h3>
              <p className="mb-6 text-4xl font-bold">¥2,000<span className="text-lg font-normal">/月</span></p>
              <ul className="mb-8 space-y-2 text-muted-foreground">
                <li>✓ 月間100,000 AIトークン</li>
                <li>✓ 無制限プロジェクト</li>
                <li>✓ 優先実行キュー</li>
                <li>✓ メールサポート</li>
              </ul>
              <Link href="/auth/signup?plan=pro" className="w-full">
                <Button className="w-full">Proを始める</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>&copy; 2025 Devin Clone. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}