"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, Check } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

interface OrderPreviewProps {
  orderData: any
}

export function OrderPreview({ orderData }: OrderPreviewProps) {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(orderData, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({
        title: "Copied to clipboard",
        description: "Order data has been copied to your clipboard.",
      })
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy order data to clipboard.",
        variant: "destructive",
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Signed Order Data</CardTitle>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            EIP-712 Signed
          </Badge>
        </div>
        <CardDescription>Your order has been signed and is ready for submission</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Order Salt</span>
            <code className="text-xs bg-muted px-2 py-1 rounded">{orderData.salt.slice(0, 10)}...</code>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Maker</span>
            <code className="text-xs bg-muted px-2 py-1 rounded">
              {orderData.maker.slice(0, 6)}...{orderData.maker.slice(-4)}
            </code>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Making Amount</span>
            <span className="font-medium">{orderData.makingAmount}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Taking Amount</span>
            <span className="font-medium">{orderData.takingAmount}</span>
          </div>

          <div className="flex justify-between items-start">
            <span className="text-sm text-muted-foreground">Predicate</span>
            <code className="text-xs bg-muted px-2 py-1 rounded max-w-[200px] break-all">{orderData.predicate}</code>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Full Order JSON</span>
            <Button variant="ghost" size="sm" onClick={copyToClipboard} className="h-8 w-8 p-0">
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <div className="bg-muted rounded-lg p-3 max-h-64 overflow-auto">
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
              {JSON.stringify(orderData, null, 2)}
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
