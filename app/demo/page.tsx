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
import { TokenSelectorDemo, getTokenByAddress } from "@/components/token-selector-demo"
import { useAccount, useChainId } from "wagmi"
import { AlertCircle, Loader2, Plus, X, Check, Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface APICondition {
  endpoint: string
  authType: "apiKey" | "bearer" | "none"
  authValue: string
  jsonPath: string
  operator: ">" | "<" | "="
  threshold: string
}

// Demo API configurations
const DEMO_APIS = {
  tariffs: {
    name: "US Tariffs on Japanese Cars",
    endpoint: "https://api.trade.gov/tariffs/v2/japan/automotive",
    authType: "bearer" as const,
    authValue: "sk_trade_demo_xxxxxxxxxxxx",
    jsonPath: "data.current_rate",
    operator: ">" as const,
    threshold: "15",
    currentValue: "15.5"
  },
  inflation: {
    name: "Japan Inflation Rate",
    endpoint: "https://api.boj.or.jp/statistics/inflation/cpi",
    authType: "apiKey" as const,
    authValue: "boj_demo_xxxxxxxxxxxx",
    jsonPath: "inflation.annual_rate",
    operator: ">" as const,
    threshold: "5",
    currentValue: "5.2"
  }
};

export default function DemoPage() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<"configure" | "review" | "complete">("configure")
  
  const [form, setForm] = useState({
    makerAsset: "",
    takerAsset: "",
    makerAmount: "100000", // 100k JPYC
    takerAmount: "666", // ~666 USDC
    apiConditions: [
      { ...DEMO_APIS.tariffs, authValue: "" },
      { ...DEMO_APIS.inflation, authValue: "" }
    ] as APICondition[],
    logicOperator: "AND" as "AND" | "OR"
  })

  const handleConditionChange = (index: number, field: keyof APICondition, value: string) => {
    const newConditions = [...form.apiConditions]
    newConditions[index] = { ...newConditions[index], [field]: value }
    setForm({ ...form, apiConditions: newConditions })
  }

  const handleCreateOrder = async () => {
    setIsLoading(true)
    
    // Simulate order creation
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    toast({
      title: "Demo Order Created!",
      description: "Your JPY hedging order is now active (simulation)",
    })
    
    setStep("complete")
    setIsLoading(false)
  }

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Please connect your wallet to Base Sepolia to use the demo.</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (chainId !== 84532) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Please switch to Base Sepolia network for the demo.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">TriggerFi Demo - JPY Hedging</h1>
        <p className="text-muted-foreground">Experience how smart capital responds to real-world events</p>
      </div>

      {step === "configure" && (
        <>
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Demo Scenario:</strong> You're a Japanese corporation with ¥1,000,000 in treasury. 
              Protect against JPY devaluation when US tariffs exceed 15% AND inflation exceeds 5%.
            </AlertDescription>
          </Alert>

          {/* Token Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Hedging Configuration</CardTitle>
              <CardDescription>Set up your automatic JPY to USDC conversion</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From Token</Label>
                  <TokenSelectorDemo
                    value={form.makerAsset}
                    onValueChange={(value) => setForm({ ...form, makerAsset: value })}
                    placeholder="Select JPYC"
                  />
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={form.makerAmount}
                    onChange={(e) => setForm({ ...form, makerAmount: e.target.value })}
                  />
                  <p className="text-sm text-muted-foreground">10% of treasury (¥100,000)</p>
                </div>
                <div className="space-y-2">
                  <Label>To Token</Label>
                  <TokenSelectorDemo
                    value={form.takerAsset}
                    onValueChange={(value) => setForm({ ...form, takerAsset: value })}
                    placeholder="Select USDC"
                  />
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={form.takerAmount}
                    onChange={(e) => setForm({ ...form, takerAmount: e.target.value })}
                  />
                  <p className="text-sm text-muted-foreground">~$666 at 150 JPY/USD</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Conditions */}
          <Card>
            <CardHeader>
              <CardTitle>Real-World Triggers</CardTitle>
              <CardDescription>APIs that monitor market conditions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Badge variant="secondary">Both conditions must be true (AND)</Badge>
              </div>

              {/* Tariff API */}
              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">🏛️ US Trade Department API</h4>
                  <Badge variant="destructive">Current: 15.5% ⚠️</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Endpoint</Label>
                    <Input value={DEMO_APIS.tariffs.endpoint} readOnly className="font-mono text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Response Path</Label>
                    <Input value={DEMO_APIS.tariffs.jsonPath} readOnly className="font-mono text-xs" />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Input value="Tariff Rate" readOnly className="flex-1" />
                  <Select value=">" disabled>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                  </Select>
                  <Input value="15%" readOnly className="w-20" />
                  <Badge variant="outline" className="text-green-600">✓ Met</Badge>
                </div>
              </div>

              {/* Inflation API */}
              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">🏦 Bank of Japan API</h4>
                  <Badge variant="destructive">Current: 5.2% ⚠️</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Endpoint</Label>
                    <Input value={DEMO_APIS.inflation.endpoint} readOnly className="font-mono text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Response Path</Label>
                    <Input value={DEMO_APIS.inflation.jsonPath} readOnly className="font-mono text-xs" />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Input value="Inflation Rate" readOnly className="flex-1" />
                  <Select value=">" disabled>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                  </Select>
                  <Input value="5%" readOnly className="w-20" />
                  <Badge variant="outline" className="text-green-600">✓ Met</Badge>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Both conditions are met!</strong> Your order will execute automatically to protect against further JPY devaluation.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Button onClick={() => setStep("review")} className="w-full" size="lg">
            Review Order
          </Button>
        </>
      )}

      {step === "review" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Review Your Smart Capital Order</CardTitle>
              <CardDescription>Confirm the hedging strategy details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Strategy</span>
                  <span className="font-medium">JPY Devaluation Hedge</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">100,000 mJPYC → 666 USDC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rate</span>
                  <span className="font-medium">150 JPY/USD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Triggers</span>
                  <span className="font-medium">Tariffs > 15% AND Inflation > 5%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="destructive">Conditions Met - Will Execute</Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium">How it works:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Chainlink Functions monitors the APIs every 5 minutes</li>
                  <li>When both conditions are true, your order becomes executable</li>
                  <li>Keeper bots automatically execute the swap via 1inch</li>
                  <li>You receive USDC directly in your wallet</li>
                </ul>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  This demo uses mock API responses. In production, real APIs would be monitored 24/7.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <div className="flex space-x-4">
            <Button variant="outline" onClick={() => setStep("configure")} className="flex-1">
              Back
            </Button>
            <Button onClick={handleCreateOrder} disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Order...
                </>
              ) : (
                "Create Smart Order"
              )}
            </Button>
          </div>
        </>
      )}

      {step === "complete" && (
        <Card>
          <CardHeader>
            <CardTitle>Order Created Successfully! 🎉</CardTitle>
            <CardDescription>Your smart capital is now protecting against JPY devaluation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center py-8">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-10 w-10 text-green-600" />
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Your capital is now "smart"!</strong> It will automatically convert 100,000 JPYC to USDC 
                when market conditions trigger, protecting you from further JPY devaluation.
              </AlertDescription>
            </Alert>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="font-medium mb-2">Order Summary:</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Protection Level</span>
                  <span>10% of treasury</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trigger Conditions</span>
                  <span>Tariffs > 15% AND Inflation > 5%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Status</span>
                  <Badge variant="destructive">Active - Conditions Met</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monitoring</span>
                  <span>Every 5 minutes via Chainlink</span>
                </div>
              </div>
            </div>

            <div className="text-center space-y-2 pt-4">
              <p className="text-lg font-medium">This is how TriggerFi converts</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Classic Capital → Smart Capital
              </p>
              <p className="text-muted-foreground">Capital that responds to the world automatically</p>
            </div>

            <Button onClick={() => window.location.reload()} className="w-full">
              Create Another Order
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}