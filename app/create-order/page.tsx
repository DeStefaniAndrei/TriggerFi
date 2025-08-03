"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { TokenSelector } from "@/components/token-selector"
import { OrderPreview } from "@/components/order-preview"
import { useAccount } from "wagmi";
import { useChainId } from "wagmi";
import { BrowserProvider, ethers } from "ethers";
import { AlertCircle, Loader2, Plus, X } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getChainlinkPriceFeedAddress } from "@/lib/1inch-integration";
import { createLimitOrder, signLimitOrder, submitOrderOnChain } from "@/lib/1inch-sdk-integration";
import { generateChainlinkFunction, validateAPIConditions, generatePredicateId } from "@/lib/chainlink-function-generator";
import { createAPIConditionsPredicate } from "@/lib/predicate-encoder";

interface APICondition {
  endpoint: string
  authType: "apiKey" | "bearer" | "none"
  authValue: string
  jsonPath: string
  operator: ">" | "<" | "="
  threshold: string
}

interface OrderForm {
  makerAsset: string
  takerAsset: string
  makerAmount: string
  takerAmount: string
  apiConditions: APICondition[]
  logicOperator: "AND" | "OR"
}

export default function CreateOrderPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [orderSigned, setOrderSigned] = useState(false)
  const [signedOrderData, setSignedOrderData] = useState<any>(null)
  const [priceFeed, setPriceFeed] = useState<string | null>(null);

  const [form, setForm] = useState<OrderForm>({
    makerAsset: "",
    takerAsset: "",
    makerAmount: "",
    takerAmount: "",
    apiConditions: [
      {
        endpoint: "",
        authType: "apiKey",
        authValue: "",
        jsonPath: "",
        operator: ">",
        threshold: ""
      }
    ],
    logicOperator: "AND"
  })

  const updateForm = (field: keyof OrderForm, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const addAPICondition = () => {
    setForm(prev => ({
      ...prev,
      apiConditions: [...prev.apiConditions, {
        endpoint: "",
        authType: "apiKey",
        authValue: "",
        jsonPath: "",
        operator: ">",
        threshold: ""
      }]
    }))
  }

  const removeAPICondition = (index: number) => {
    setForm(prev => ({
      ...prev,
      apiConditions: prev.apiConditions.filter((_, i) => i !== index)
    }))
  }

  const updateAPICondition = (index: number, field: keyof APICondition, value: string) => {
    setForm(prev => ({
      ...prev,
      apiConditions: prev.apiConditions.map((condition, i) => 
        i === index ? { ...condition, [field]: value } : condition
      )
    }))
  }

  // Update price feed when maker asset or network changes
  useEffect(() => {
    if (form.makerAsset && chainId) {
      const feed = getChainlinkPriceFeedAddress(form.makerAsset, "USD", chainId);
      setPriceFeed(feed);
    } else {
      setPriceFeed(null);
    }
  }, [form.makerAsset, chainId]);

  const handleBuildAndSign = async () => {
    if (!isConnected || !address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to create an order",
        variant: "destructive",
      });
      return;
    }
    
    // Validate form
    const baseFields = ["makerAsset", "takerAsset", "makerAmount", "takerAmount"];
    const missingBaseFields = baseFields.filter((field) => !form[field as keyof OrderForm]);

    if (missingBaseFields.length > 0) {
      toast({
        title: "Missing required fields",
        description: `Please fill in: ${missingBaseFields.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    // Validate API conditions
    const validationErrors = validateAPIConditions(form.apiConditions);
    if (validationErrors.length > 0) {
      toast({
        title: "Invalid API conditions",
        description: validationErrors[0], // Show first error
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Generate Chainlink Function from API conditions
      const chainlinkFunctionCode = generateChainlinkFunction(
        form.apiConditions,
        form.logicOperator === "AND"
      );
      
      // In production: Deploy predicate contract and get address
      // For MVP demo, use a placeholder address
      const predicateContractAddress = "0x1234567890123456789012345678901234567890"; // TODO: Deploy contract
      
      // Generate unique predicate ID for this configuration
      const predicateId = generatePredicateId(
        form.apiConditions,
        form.logicOperator === "AND",
        address
      );
      
      // Create the predicate using the new encoding format
      // This follows the pattern from your mentor's example
      const encodedPredicate = createAPIConditionsPredicate(
        predicateContractAddress,
        predicateId,
        form.apiConditions.map(c => ({
          operator: c.operator,
          threshold: c.threshold
        })),
        form.logicOperator === "AND"
      );
      
      // Create order structure with dynamic predicate
      const orderStruct = {
        salt: ethers.hexlify(ethers.randomBytes(32)),
        makerAsset: form.makerAsset,
        takerAsset: form.takerAsset,
        maker: address,
        receiver: address,
        allowedSender: ethers.ZeroAddress,
        makingAmount: form.makerAmount,
        takingAmount: form.takerAmount,
        offsets: "0x",
        interactions: "0x",
        predicate: encodedPredicate, // Encoded predicate data
        permit: "0x",
        getMakingAmount: "0x",
        getTakingAmount: "0x",
        preInteraction: "0x",
        postInteraction: "0x"
      };

      // Get the signer from wagmi/ethers
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Sign the order
      const signature = await signLimitOrder(orderStruct, signer, chainId || 1);

      setSignedOrderData({ 
        ...orderStruct, 
        signature, 
        priceFeed, 
        apiConditions: form.apiConditions,
        chainlinkFunctionCode,
        logicOperator: form.logicOperator
      });
      setOrderSigned(true);

      toast({
        title: "Order signed successfully!",
        description: "Your smart capital order has been created and signed.",
      });
    } catch (error) {
      toast({
        title: "Error signing order",
        description: "Failed to sign the order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitOrder = async () => {
    if (!signedOrderData || !isConnected || !address) return

    setIsLoading(true)

    try {
      // Get the signer
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Submit order directly to the 1inch protocol on-chain
      const tx = await submitOrderOnChain(
        signedOrderData,
        signedOrderData.signature,
        signer,
        chainId || 1
      );

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      toast({
        title: "Order submitted on-chain!",
        description: `Transaction hash: ${receipt?.hash}`,
      })

      // Reset form
      setForm({
        makerAsset: "",
        takerAsset: "",
        makerAmount: "",
        takerAmount: "",
        apiConditions: [{
          endpoint: "",
          authType: "apiKey",
          authValue: "",
          jsonPath: "",
          operator: ">",
          threshold: ""
        }],
        logicOperator: "AND"
      })

      setOrderSigned(false)
      setSignedOrderData(null)
    } catch (error) {
      console.error("Error submitting order:", error);
      toast({
        title: "Error submitting order",
        description: "Failed to submit the order on-chain. Please try again.",
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
          <AlertDescription>Please connect your wallet to create smart capital orders.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Create Smart Capital Order</h1>
        <p className="text-muted-foreground">Define real-world triggers for automatic capital allocation</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Order Form */}
        <Card>
          <CardHeader>
            <CardTitle>Order Parameters</CardTitle>
            <CardDescription>Configure your intelligent limit order</CardDescription>
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

            {/* API Conditions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="secondary">API Conditions</Badge>
                {form.apiConditions.length > 1 && (
                  <Select value={form.logicOperator} onValueChange={(value: "AND" | "OR") => updateForm("logicOperator", value)}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AND">AND</SelectItem>
                      <SelectItem value="OR">OR</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              {form.apiConditions.map((condition, index) => (
                <Card key={index} className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>API Condition {index + 1}</Label>
                    {form.apiConditions.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAPICondition(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs">API Endpoint</Label>
                      <Input
                        placeholder="https://api.example.com/data"
                        value={condition.endpoint}
                        onChange={(e) => updateAPICondition(index, "endpoint", e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label className="text-xs">Auth Type</Label>
                        <Select 
                          value={condition.authType} 
                          onValueChange={(value: "apiKey" | "bearer" | "none") => updateAPICondition(index, "authType", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="apiKey">API Key</SelectItem>
                            <SelectItem value="bearer">Bearer Token</SelectItem>
                            <SelectItem value="none">None</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {condition.authType !== "none" && (
                        <div className="space-y-2">
                          <Label className="text-xs">Auth Value</Label>
                          <Input
                            type="password"
                            placeholder="Your API key"
                            value={condition.authValue}
                            onChange={(e) => updateAPICondition(index, "authValue", e.target.value)}
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">JSON Path</Label>
                      <Input
                        placeholder="data.value or data['rates']['inflation']"
                        value={condition.jsonPath}
                        onChange={(e) => updateAPICondition(index, "jsonPath", e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label className="text-xs">Operator</Label>
                        <Select 
                          value={condition.operator} 
                          onValueChange={(value: ">" | "<" | "=") => updateAPICondition(index, "operator", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value=">">Greater than</SelectItem>
                            <SelectItem value="<">Less than</SelectItem>
                            <SelectItem value="=">Equal to</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Threshold Value</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={condition.threshold}
                          onChange={(e) => updateAPICondition(index, "threshold", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              <Button
                variant="outline"
                onClick={addAPICondition}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add API Condition
              </Button>
            </div>

            <Separator />

            {/* Chainlink Price Feed Address */}
            <div className="space-y-2">
              <Label>Chainlink Price Feed Address</Label>
              <Input value={priceFeed || "Not found for this pair/network"} readOnly />
            </div>

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
                      Submitting On-Chain...
                    </>
                  ) : (
                    "Submit Order On-Chain"
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Order Preview */}
        <div className="space-y-6">
          {/* Example Use Cases */}
          <Card>
            <CardHeader>
              <CardTitle>Example: JPY Hedging Strategy</CardTitle>
              <CardDescription>Protect against currency devaluation</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p><strong>Condition 1:</strong> US Tariffs on Japanese cars &gt; 15%</p>
              <p><strong>Condition 2:</strong> JPY Inflation &gt; 5%</p>
              <p><strong>Logic:</strong> AND (both conditions must be true)</p>
              <p><strong>Action:</strong> Convert 1M JPYC → USDC</p>
              <p className="text-muted-foreground mt-2">
                This protects companies trading with Japan from currency devaluation when economic indicators signal JPY weakness.
              </p>
            </CardContent>
          </Card>

          {signedOrderData && <OrderPreview orderData={signedOrderData} />}
        </div>
      </div>
    </div>
  )
}