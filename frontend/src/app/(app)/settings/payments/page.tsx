"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { subscriptionApi, type Payment, type PaymentList } from "@/lib/api"
import {
  Loader2,
  Download,
  ExternalLink,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const STATUS_ICONS = {
  succeeded: CheckCircle,
  failed: XCircle,
  pending: Clock,
  processing: RefreshCw,
  canceled: XCircle,
  refunded: RefreshCw,
}

const STATUS_LABELS = {
  succeeded: "成功",
  failed: "失敗",
  pending: "保留中",
  processing: "処理中",
  canceled: "キャンセル",
  refunded: "返金済み",
}

const STATUS_VARIANTS = {
  succeeded: "default",
  failed: "destructive",
  pending: "secondary",
  processing: "secondary",
  canceled: "outline",
  refunded: "outline",
} as const

export default function PaymentsPage() {
  const { toast } = useToast()
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize] = useState(20)

  useEffect(() => {
    loadPayments()
  }, [currentPage])

  async function loadPayments() {
    try {
      const data: PaymentList = await subscriptionApi.listPayments(currentPage, pageSize)
      setPayments(data.payments)
      setTotalPages(Math.ceil(data.total / pageSize))
    } catch (error) {
      toast({
        title: "エラー",
        description: "支払い履歴の読み込みに失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  function formatCurrency(amount: number, currency: string = "jpy") {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">支払い履歴</h1>
        <p className="text-muted-foreground mt-2">
          過去の支払いと請求書を確認できます
        </p>
      </div>

      {payments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">支払い履歴がありません</h3>
            <p className="text-sm text-muted-foreground">
              サブスクリプションの支払いが発生すると、ここに表示されます
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>支払い一覧</CardTitle>
              <CardDescription>
                {payments.length} 件の支払い履歴
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>日付</TableHead>
                      <TableHead>説明</TableHead>
                      <TableHead>金額</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead className="text-right">アクション</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => {
                      const StatusIcon = STATUS_ICONS[payment.status as keyof typeof STATUS_ICONS] || CheckCircle
                      return (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">
                            {formatDate(payment.paid_at || payment.created_at)}
                          </TableCell>
                          <TableCell>
                            {payment.description || "サブスクリプション"}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(payment.amount, payment.currency)}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={STATUS_VARIANTS[payment.status as keyof typeof STATUS_VARIANTS] || "default"}
                              className="gap-1"
                            >
                              <StatusIcon className="h-3 w-3" />
                              {STATUS_LABELS[payment.status as keyof typeof STATUS_LABELS] || payment.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {payment.receipt_url && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  asChild
                                >
                                  <a
                                    href={payment.receipt_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                              {payment.invoice_pdf && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  asChild
                                >
                                  <a
                                    href={payment.invoice_pdf}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Download className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                前へ
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                次へ
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}