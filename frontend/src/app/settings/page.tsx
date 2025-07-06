"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Loader2, User, CreditCard, Bell, Shield, Brain } from "lucide-react"
import { ClaudeModelSelector } from "@/components/claude-model-selector"

export default function SettingsPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("profile")

  async function handleUpdateProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)

    try {
      // TODO: Implement profile update
      toast({
        title: "成功",
        description: "プロフィールが更新されました",
      })
    } catch (error) {
      toast({
        title: "エラー",
        description: "プロフィールの更新に失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">設定</h1>
        <p className="text-muted-foreground mt-2">
          アカウントと環境設定を管理
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 max-w-3xl">
          <TabsTrigger value="profile">
            <User className="mr-2 h-4 w-4" />
            プロフィール
          </TabsTrigger>
          <TabsTrigger value="ai-models">
            <Brain className="mr-2 h-4 w-4" />
            AIモデル
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="mr-2 h-4 w-4" />
            請求
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            通知
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="mr-2 h-4 w-4" />
            セキュリティ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>プロフィール情報</CardTitle>
              <CardDescription>
                アカウントの基本情報を更新
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">名前</Label>
                  <Input
                    id="name"
                    defaultValue={session?.user?.name || ""}
                    placeholder="山田 太郎"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">メールアドレス</Label>
                  <Input
                    id="email"
                    type="email"
                    defaultValue={session?.user?.email || ""}
                    disabled
                  />
                </div>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      更新中...
                    </>
                  ) : (
                    "プロフィールを更新"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Claude AIモデル設定</CardTitle>
              <CardDescription>
                使用するClaude AIモデルを選択・管理できます
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-base font-medium">現在のモデル</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  チャットで使用するデフォルトのClaude AIモデルを選択
                </p>
                <ClaudeModelSelector />
              </div>
              
              <div className="border-t pt-6">
                <h3 className="text-base font-medium mb-2">モデル情報</h3>
                <div className="grid gap-4 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium text-muted-foreground">最新モデル</p>
                      <p>Claude 4 Opus・Sonnet (2025年5月リリース)</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">新機能</p>
                      <p>拡張思考・コンピューター操作・高度なコーディング</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium text-muted-foreground">コンテキスト</p>
                      <p>200,000トークン (約150,000語)</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">対応機能</p>
                      <p>テキスト・画像・ツール使用・ファイル分析</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-6">
                <h3 className="text-base font-medium mb-2">カスタムモデル追加</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Anthropicが新しいモデルをリリースした際は、モデル選択画面から手動で追加できます。
                </p>
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">💡 ヒント</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• 新しいモデルは通常、より高性能で効率的です</li>
                    <li>• 用途に応じてOpus（高性能）、Sonnet（バランス）、Haiku（高速）を選択</li>
                    <li>• 価格は入力・出力トークン数に基づいて計算されます</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>現在のプラン</CardTitle>
              <CardDescription>
                サブスクリプションと支払い情報を管理
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold">無料プラン</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    月額 ¥0
                  </p>
                  <ul className="mt-4 space-y-2 text-sm">
                    <li>✓ 月10時間の利用</li>
                    <li>✓ 基本的なコード補完</li>
                    <li>✓ 1プロジェクトまで</li>
                  </ul>
                </div>
                <Button className="w-full">
                  プロプランにアップグレード
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>通知設定</CardTitle>
              <CardDescription>
                通知の受信方法を設定
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">メール通知</p>
                    <p className="text-sm text-muted-foreground">
                      重要な更新をメールで受信
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    有効
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">プロジェクト更新</p>
                    <p className="text-sm text-muted-foreground">
                      プロジェクトの変更を通知
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    有効
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>セキュリティ設定</CardTitle>
              <CardDescription>
                アカウントのセキュリティを管理
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">パスワード変更</h3>
                <Button variant="outline">
                  パスワードを変更
                </Button>
              </div>
              <div>
                <h3 className="font-medium mb-2">二要素認証</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  アカウントのセキュリティを強化
                </p>
                <Button variant="outline">
                  二要素認証を設定
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}