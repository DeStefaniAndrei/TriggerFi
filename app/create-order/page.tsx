"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { TokenSelector } from "@/components/token-selector"
import { YieldDisplay } from "@/components/yield-display"
import { OrderPreview } from "@/components/order-preview"
import { useAccount } from "wagmi"
import { AlertCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface OrderForm {
  makerAsset: string
  takerAsset: string
  makerAmount: string
  takerAmount: string
  yieldThreshold: string
  aaveAsset: string
}

export default function CreateOrderPage() {
  const { address, isConnected } = useAccount()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [orderSigned, setOrderSigned] = useState(false)
  const [signedOrderData, setSignedOrderData] = useState<any>(null)

  const [form, setForm] = useState<OrderForm>({
    makerAsset: "",
    takerAsset: "",
    makerAmount: "",
    takerAmount: "",
    yieldThreshold: "",
    aaveAsset: "",
  })

  const updateForm = (field: keyof OrderForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleBuildAndSign = async () => {
    if (!isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to create an order",
        variant: "destructive",
      })
      return
    }

    // Validate form
    const requiredFields = ["makerAsset", "takerAsset", "makerAmount", "takerAmount", "yieldThreshold", "aaveAsset"]
    const missingFields = requiredFields.filter((field) => !form[field as keyof OrderForm])

    if (missingFields.length > 0) {
      toast({
        title: "Missing required fields",
        description: `Please fill in: ${missingFields.join(", ")}`,
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // TODO: Implement actual EIP-712 signing with 1inch Limit Order Protocol
      // This is a mock implementation for demonstration
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const mockOrderData = {
        salt: "0x" + Math.random().toString(16).substr(2, 64),
        makerAsset: form.makerAsset,
        takerAsset: form.takerAsset,
        maker: address,
        receiver: "0x0000000000000000000000000000000000000000",
        allowedSender: "0x0000000000000000000000000000000000000000",
        makingAmount: form.makerAmount,
        takingAmount: form.takerAmount,
        offsets: "0x",
        interactions: "0x",
        predicate: `yieldThreshold(${form.aaveAsset}, ${form.yieldThreshold})`, // Mock predicate
        permit: "0x",
        signature: "0x" + Math.random().toString(16).substr(2, 130), // Mock signature
      }

      setSignedOrderData(mockOrderData)
      setOrderSigned(true)

      toast({
        title: "Order signed successfully!",
        description: "Your yield-aware limit order has been created and signed.",
      })
    } catch (error) {
      toast({
        title: "Error signing order",
        description: "Failed to sign the order. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitOrder = async () => {
    if (!signedOrderData) return

    setIsLoading(true)

    try {
      // TODO: Implement actual API call to 1inch orderbook
      // This is a mock implementation
      await new Promise((resolve) => setTimeout(resolve, 1500))

      toast({
        title: "Order submitted!",
        description: "Your order has been posted to the 1inch orderbook.",
      })

      // Reset form
      setForm({
        makerAsset: "",
        takerAsset: "",
        makerAmount: "",
        takerAmount: "",
        yieldThreshold: "",
        aaveAsset: "",
      })
      setOrderSigned(false)
      setSignedOrderData(null)
    } catch (error) {
      toast({
        title: "Error submitting order",
        description: "Failed to submit order to 1inch. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Please connect your wallet to create yield-aware limit orders.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Create Yield-Aware Order</h1>
        <p className="text-muted-foreground">Set up a limit order that executes based on Aave yield conditions</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Order Form */}
        <Card>
          <CardHeader>
            <CardTitle>Order Parameters</CardTitle>
            <CardDescription>Configure your yield-aware limit order</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Token Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Maker Asset (Sell)</Label>
                <TokenSelector
                  value={form.makerAsset}
                  onValueChange={(value) => updateForm("makerAsset", value)}
                  placeholder="Select token to sell"
                />
              </div>
              <div className="space-y-2">
                <Label>Taker Asset (Buy)</Label>
                <TokenSelector
                  value={form.takerAsset}
                  onValueChange={(value) => updateForm("takerAsset", value)}
                  placeholder="Select token to buy"
                />
              </div>
            </div>

            {/* Amounts */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount to Sell</Label>
                <Input
                  type="number"
                  placeholder="0.0"
                  value={form.makerAmount}
                  onChange={(e) => updateForm("makerAmount", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Amount to Receive</Label>
                <Input
                  type="number"
                  placeholder="0.0"
                  value={form.takerAmount}
                  onChange={(e) => updateForm("takerAmount", e.target.value)}
                />
              </div>
            </div>

            <Separator />

            {/* Yield Conditions */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Yield Conditions</Badge>
              </div>

              <div className="space-y-2">
                <Label>Aave Asset Market</Label>
                <Select value={form.aaveAsset} onValueChange={(value) => updateForm("aaveAsset", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Aave asset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USDC">USDC</SelectItem>
                    <SelectItem value="DAI">DAI</SelectItem>
                    <SelectItem value="USDT">USDT</SelectItem>
                    <SelectItem value="WETH">WETH</SelectItem>
                    <SelectItem value="WBTC">WBTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Minimum Yield Threshold (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g., 5.5"
                  value={form.yieldThreshold}
                  onChange={(e) => updateForm("yieldThreshold", e.target.value)}
                />
              </div>

              {form.aaveAsset && <YieldDisplay asset={form.aaveAsset} />}
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button onClick={handleBuildAndSign} disabled={isLoading || orderSigned} className="w-full" size="lg">
                {isLoading && !orderSigned ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Building & Signing...
                  </>
                ) : orderSigned ? (
                  "Order Signed ✓"
                ) : (
                  "Build & Sign Order"
                )}
              </Button>

              {orderSigned && (
                <Button
                  onClick={handleSubmitOrder}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full bg-transparent"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting to 1inch...
                    </>
                  ) : (
                    "Submit Order to 1inch"
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Order Preview */}
        <div className="space-y-6">
          <YieldDisplay asset={form.aaveAsset || "USDC"} />

          {signedOrderData && <OrderPreview orderData={signedOrderData} />}
        </div>
      </div>
    </div>
  )
}
