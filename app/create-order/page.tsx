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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TokenSelector } from "@/components/token-selector"
import { YieldDisplay } from "@/components/yield-display"
import { OrderPreview } from "@/components/order-preview"
import { useAccount } from "wagmi";
import { useChainId } from "wagmi";
import { parseUnits, BrowserProvider } from "ethers";
import { AlertCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getChainlinkPriceFeedAddress } from "@/lib/1inch-integration";
import { createLimitOrder, signLimitOrder, submitOrderOnChain } from "@/lib/1inch-sdk-integration";
import { createWeatherAwareLimitOrder, signLimitOrder as signWeatherOrder } from "@/lib/limit-order-builder";

interface OrderForm {
  makerAsset: string
  takerAsset: string
  makerAmount: string
  takerAmount: string
  // Yield conditions
  yieldThreshold: string
  aaveAsset: string
  // Weather conditions
  location: string
  temperatureThreshold: string
  temperatureComparison: "below" | "above"
  conditionType: "yield" | "weather"
}

export default function CreateOrderPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [orderSigned, setOrderSigned] = useState(false)
  const [signedOrderData, setSignedOrderData] = useState<any>(null)
  const [priceFeed, setPriceFeed] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"yield" | "weather">("yield");

  const [form, setForm] = useState<OrderForm>({
    makerAsset: "",
    takerAsset: "",
    makerAmount: "",
    takerAmount: "",
    yieldThreshold: "",
    aaveAsset: "",
    location: "",
    temperatureThreshold: "32",
    temperatureComparison: "below",
    conditionType: "yield",
  })

  const updateForm = (field: keyof OrderForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
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

    // Update form based on active tab
    form.conditionType = activeTab;
    
    // Validate form based on condition type
    const baseFields = ["makerAsset", "takerAsset", "makerAmount", "takerAmount"];
    const yieldFields = form.conditionType === "yield" ? ["yieldThreshold", "aaveAsset"] : [];
    const weatherFields = form.conditionType === "weather" ? ["location"] : [];
    const requiredFields = [...baseFields, ...yieldFields, ...weatherFields];
    
    const missingFields = requiredFields.filter((field) => !form[field as keyof OrderForm]);

    if (missingFields.length > 0) {
      toast({
        title: "Missing required fields",
        description: `Please fill in: ${missingFields.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      let orderStruct;
      let signature;

      if (form.conditionType === "weather") {
        // Convert Fahrenheit to Celsius * 10 for the contract
        const fahrenheit = parseFloat(form.temperatureThreshold);
        const celsius = (fahrenheit - 32) * 5 / 9;
        const celsiusTimes10 = Math.round(celsius * 10);
        
        const { order, extension } = await createWeatherAwareLimitOrder(
          form.makerAsset,
          form.takerAsset,
          form.makerAmount,
          form.takerAmount,
          form.location,
          celsiusTimes10,
          form.temperatureComparison === "below",
          address,
          address,
          chainId || 1
        );
        
        orderStruct = order;
        
        // Get the signer from wagmi/ethers
        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        // Sign the weather order
        signature = await signWeatherOrder(orderStruct, signer, chainId || 1);
      } else {
        // Yield order (existing code)
        const orderConfig = {
          asset: form.makerAsset,
          threshold: parseUnits(form.yieldThreshold, 27).toString(),
          isBelowThreshold: true, 
          isVariableBorrow: true,
          withdrawAmount: form.makerAmount,
          targetToken: form.takerAsset,
          minOutputAmount: form.takerAmount,
        };
      // Replace with your actual deployed contract addresses
      const ratePredicateAddress = "0x...";
      const withdrawInteractionAddress = "0x...";
        const makerAddress = address as string;
        const receiverAddress = address as string;
        orderStruct = createLimitOrder(
          orderConfig,
          ratePredicateAddress,
          withdrawInteractionAddress,
          makerAddress,
          receiverAddress
        );

        // Get the signer from wagmi/ethers
        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        // Sign the order
        signature = await signLimitOrder(orderStruct, signer, chainId || 1);
      }

      setSignedOrderData({ ...orderStruct, signature, priceFeed });
      setOrderSigned(true);

      toast({
        title: "Order signed successfully!",
        description: "Your yield-aware limit order has been created and signed.",
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
        yieldThreshold: "",
        aaveAsset: "",
        location: "",
        temperatureThreshold: "32",
        temperatureComparison: "below",
        conditionType: activeTab,
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
          <AlertDescription>Please connect your wallet to create yield-aware limit orders.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Create Intelligent Order</h1>
        <p className="text-muted-foreground">Set up limit orders triggered by real-world conditions</p>
      </div>

      <Tabs 
        defaultValue="yield" 
        className="space-y-6"
        value={activeTab}
        onValueChange={(value: string) => {
          setActiveTab(value as "yield" | "weather");
          updateForm("conditionType", value);
        }}
      >
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] mx-auto">
          <TabsTrigger value="yield">Yield Conditions</TabsTrigger>
          <TabsTrigger value="weather">Weather Conditions</TabsTrigger>
        </TabsList>

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

            {/* Condition-specific fields */}
            <TabsContent value="yield" className="space-y-4 mt-0">
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
            </TabsContent>

            <TabsContent value="weather" className="space-y-4 mt-0">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Weather Conditions</Badge>
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <Select value={form.location} onValueChange={(value) => updateForm("location", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Des Moines,IA">Des Moines, Iowa (Farming)</SelectItem>
                    <SelectItem value="Miami,FL">Miami, Florida (Hurricanes)</SelectItem>
                    <SelectItem value="Phoenix,AZ">Phoenix, Arizona (Drought)</SelectItem>
                    <SelectItem value="Chicago,IL">Chicago, Illinois (Winter)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Temperature Condition</Label>
                <div className="flex gap-2">
                  <Select value={form.temperatureComparison} onValueChange={(value: "below" | "above") => updateForm("temperatureComparison", value)}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="below">Below</SelectItem>
                      <SelectItem value="above">Above</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input 
                    type="number" 
                    placeholder="32" 
                    className="flex-1"
                    value={form.temperatureThreshold}
                    onChange={(e) => updateForm("temperatureThreshold", e.target.value)}
                  />
                  <span className="flex items-center text-sm text-muted-foreground">°F</span>
                </div>
                <p className="text-xs text-muted-foreground">Example: Below 32°F triggers frost protection</p>
              </div>
            </TabsContent>

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
          <YieldDisplay asset={form.aaveAsset || "USDC"} />

          {signedOrderData && <OrderPreview orderData={signedOrderData} />}
        </div>
      </div>
      </Tabs>
    </div>
  )
}
