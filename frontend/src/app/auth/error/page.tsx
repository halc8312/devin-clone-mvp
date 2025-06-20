"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  const errorMessages: Record<string, string> = {
    Configuration: "サーバー設定に問題があります。",
    AccessDenied: "アクセスが拒否されました。",
    Verification: "認証トークンの有効期限が切れています。",
    Default: "認証中にエラーが発生しました。",
  }

  const errorMessage = errorMessages[error || "Default"] || errorMessages.Default

  return (
    <div className="flex h-screen w-full items-center justify-center px-4">
      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle>認証エラー</CardTitle>
          </div>
          <CardDescription>{errorMessage}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            問題が解決しない場合は、サポートにお問い合わせください。
          </p>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/">ホームへ戻る</Link>
          </Button>
          <Button asChild>
            <Link href="/auth/signin">サインインへ</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}