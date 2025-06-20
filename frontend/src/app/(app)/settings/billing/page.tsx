"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { subscriptionApi, type SubscriptionInfo, type PriceProduct } from "@/lib/api"
import {
  Loader2,
  Check,
  CreditCard,
  AlertCircle,
  Zap,
  Package,
  Code2,
  Users,
  HelpCircle,
  ExternalLink,
} from "lucide-react"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const FEATURES = {
  free: [
    { icon: Package, text: "1プロジェクト", included: true },
    { icon: Code2, text: "20ファイル/プロジェクト", included: true },
    { icon: Zap, text: "10MB ストレージ", included: true },
    { icon: Users, text: "基本的なAIアシスタント", included: true },
    { icon: HelpCircle, text: "コミュニティサポート", included: true },
  ],
  pro: [
    { icon: Package, text: "無制限プロジェクト", included: true },
    { icon: Code2, text: "500ファイル/プロジェクト", included: true },
    { icon: Zap, text: "1GB ストレージ/プロジェクト", included: true },
    { icon: Users, text: "高度なAI機能", included: true },
    { icon: HelpCircle, text: "優先サポート", included: true },
  ],
}

export default function BillingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null)
  const [prices, setPrices] = useState<PriceProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  useEffect(() => {
    loadBillingInfo()
    
    // Check for success parameter
    if (searchParams.get("success") === "true") {
      toast({
        title: "成功",
        description: "サブスクリプションが正常に開始されました",
      })
      // Remove success parameter from URL
      const newSearchParams = new URLSearchParams(searchParams)
      newSearchParams.delete("success")
      router.replace(`/settings/billing${newSearchParams.toString() ? `?${newSearchParams.toString()}` : ''}`)
    }
  }, [searchParams])

  async function loadBillingInfo() {
    try {
      const [subInfo, availablePrices] = await Promise.all([
        subscriptionApi.getSubscriptionInfo(),
        subscriptionApi.listPrices(),
      ])
      
      setSubscriptionInfo(subInfo)
      setPrices(availablePrices)
    } catch (error) {
      toast({
        title: "エラー",
        description: "請求情報の読み込みに失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSubscribe(priceId: string) {
    setIsProcessing(true)
    try {
      const session = await subscriptionApi.createCheckout({
        price_id: priceId,
        success_url: `${window.location.origin}/settings/billing?success=true`,
        cancel_url: window.location.href,
      })
      
      // Redirect to Stripe Checkout
      window.location.href = session.checkout_url
    } catch (error) {
      toast({
        title: "エラー",
        description: "チェックアウトセッションの作成に失敗しました",
        variant: "destructive",
      })
      setIsProcessing(false)
    }
  }

  async function handleManageSubscription() {
    setIsProcessing(true)
    try {
      const session = await subscriptionApi.createPortalSession({
        return_url: window.location.href,
      })
      
      // Redirect to Stripe Customer Portal
      window.location.href = session.portal_url
    } catch (error) {
      toast({
        title: "エラー",
        description: "カスタマーポータルの作成に失敗しました",
        variant: "destructive",
      })
      setIsProcessing(false)
    }
  }

  async function handleCancelSubscription() {
    setIsProcessing(true)
    try {
      await subscriptionApi.cancelSubscription()
      toast({
        title: "成功",
        description: "サブスクリプションは請求期間の終了時にキャンセルされます",
      })
      setShowCancelDialog(false)
      await loadBillingInfo()
    } catch (error) {
      toast({
        title: "エラー",
        description: "サブスクリプションのキャンセルに失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleReactivateSubscription() {
    setIsProcessing(true)
    try {
      await subscriptionApi.reactivateSubscription()
      toast({
        title: "成功",
        description: "サブスクリプションが再有効化されました",
      })
      await loadBillingInfo()
    } catch (error) {
      toast({
        title: "エラー",
        description: "サブスクリプションの再有効化に失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const monthlyPrice = prices.find(p => p.interval === "month")
  const yearlyPrice = prices.find(p => p.interval === "year")
  const currentPlan = subscriptionInfo?.current_plan || "free"
  const hasActiveSubscription = subscriptionInfo?.has_subscription && subscriptionInfo.subscription?.status === "active"
  const isCanceled = hasActiveSubscription && subscriptionInfo?.subscription?.cancel_at

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">料金プラン</h1>
        <p className="text-muted-foreground mt-2">
          あなたに最適なプランを選択してください
        </p>
      </div>

      {/* Current Plan Alert */}
      {hasActiveSubscription && (
        <Alert>
          <CreditCard className="h-4 w-4" />
          <AlertTitle>現在のプラン: Pro</AlertTitle>
          <AlertDescription>
            {isCanceled ? (
              <span>
                サブスクリプションは{" "}
                {new Date(subscriptionInfo!.subscription!.cancel_at!).toLocaleDateString("ja-JP")}
                {" "}にキャンセルされます
              </span>
            ) : (
              <span>
                次回請求日:{" "}
                {new Date(subscriptionInfo!.subscription!.current_period_end).toLocaleDateString("ja-JP")}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Usage Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">プロジェクト数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscriptionInfo?.usage.projects || 0}
              {subscriptionInfo?.usage.max_projects === -1 ? (
                <span className="text-sm text-muted-foreground"> / 無制限</span>
              ) : (
                <span className="text-sm text-muted-foreground"> / {subscriptionInfo?.usage.max_projects}</span>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">ストレージ使用量</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscriptionInfo?.usage.storage_used_mb.toFixed(1)} MB
              <span className="text-sm text-muted-foreground"> / {subscriptionInfo?.usage.storage_limit_mb} MB</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">トークン使用量</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscriptionInfo?.usage.tokens_used.toLocaleString()}
              <span className="text-sm text-muted-foreground"> / {subscriptionInfo?.usage.tokens_limit.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">現在のプラン</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={currentPlan === "pro" ? "default" : "secondary"} className="text-lg px-3 py-1">
              {currentPlan === "pro" ? "Pro" : "Free"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Cards */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Free Plan */}
        <Card className={currentPlan === "free" ? "border-primary" : ""}>
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <CardDescription>個人プロジェクトに最適</CardDescription>
            <div className="mt-4">
              <span className="text-4xl font-bold">¥0</span>
              <span className="text-muted-foreground">/月</span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {FEATURES.free.map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  <feature.icon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm">{feature.text}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            {currentPlan === "free" ? (
              <Button className="w-full" disabled variant="outline">
                現在のプラン
              </Button>
            ) : (
              <Button className="w-full" variant="outline" disabled>
                ダウングレード不可
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Pro Monthly */}
        <Card className="border-primary relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="px-3 py-1">おすすめ</Badge>
          </div>
          <CardHeader>
            <CardTitle>Pro（月額）</CardTitle>
            <CardDescription>プロフェッショナル向け</CardDescription>
            <div className="mt-4">
              <span className="text-4xl font-bold">
                ¥{monthlyPrice ? (monthlyPrice.amount / 100).toLocaleString() : "1,980"}
              </span>
              <span className="text-muted-foreground">/月</span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {FEATURES.pro.map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary" />
                  <span className="text-sm">{feature.text}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            {hasActiveSubscription ? (
              <Button className="w-full" onClick={handleManageSubscription} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    処理中...
                  </>
                ) : (
                  <>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    サブスクリプション管理
                  </>
                )}
              </Button>
            ) : (
              <Button 
                className="w-full" 
                onClick={() => monthlyPrice && handleSubscribe(monthlyPrice.stripe_price_id)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    処理中...
                  </>
                ) : (
                  "アップグレード"
                )}
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Pro Yearly */}
        <Card>
          <CardHeader>
            <CardTitle>Pro（年額）</CardTitle>
            <CardDescription>2ヶ月分お得！</CardDescription>
            <div className="mt-4">
              <span className="text-4xl font-bold">
                ¥{yearlyPrice ? (yearlyPrice.amount / 100).toLocaleString() : "19,800"}
              </span>
              <span className="text-muted-foreground">/年</span>
            </div>
            <Badge variant="secondary" className="mt-2">
              ¥{yearlyPrice ? ((yearlyPrice.amount / 12) / 100).toFixed(0) : "1,650"}/月
            </Badge>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {FEATURES.pro.map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary" />
                  <span className="text-sm">{feature.text}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            {hasActiveSubscription ? (
              <Button className="w-full" variant="outline" onClick={handleManageSubscription} disabled={isProcessing}>
                プラン変更
              </Button>
            ) : (
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => yearlyPrice && handleSubscribe(yearlyPrice.stripe_price_id)}
                disabled={isProcessing}
              >
                年額プランで始める
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* Subscription Actions */}
      {hasActiveSubscription && (
        <Card>
          <CardHeader>
            <CardTitle>サブスクリプション管理</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={handleManageSubscription} disabled={isProcessing}>
                <ExternalLink className="mr-2 h-4 w-4" />
                支払い方法を管理
              </Button>
              {isCanceled ? (
                <Button variant="outline" onClick={handleReactivateSubscription} disabled={isProcessing}>
                  サブスクリプションを再開
                </Button>
              ) : (
                <Button 
                  variant="destructive" 
                  onClick={() => setShowCancelDialog(true)}
                  disabled={isProcessing}
                >
                  サブスクリプションをキャンセル
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>サブスクリプションをキャンセルしますか？</DialogTitle>
            <DialogDescription>
              キャンセルしても、現在の請求期間の終了までProプランの機能を使用できます。
              期間終了後、自動的にFreeプランにダウングレードされます。
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              現在の請求期間は{" "}
              {subscriptionInfo?.subscription && 
                new Date(subscriptionInfo.subscription.current_period_end).toLocaleDateString("ja-JP")
              }{" "}
              に終了します。
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              disabled={isProcessing}
            >
              戻る
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubscription}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  処理中...
                </>
              ) : (
                "キャンセルする"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}