"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { TokenSelector, getTokenByAddress } from "@/components/token-selector"
import { OrderPreview } from "@/components/order-preview"
import { useAccount } from "wagmi";
import { useChainId } from "wagmi";
import { BrowserProvider, ethers, Contract } from "ethers";
import { AlertCircle, Loader2, Plus, X, Check, Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { generateChainlinkFunction, validateAPIConditions } from "@/lib/chainlink-function-generator";
import { CONTRACTS, DYNAMIC_API_PREDICATE_ABI } from "@/lib/contracts";
import { createDynamicOrder, getOrderHash } from "@/lib/1inch-sdk-integration";
import { saveOrder, savePredicateConfig } from "@/lib/firebase-service-rtdb";

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
  useDynamicPricing: boolean
}

// Common API templates for quick setup
const API_TEMPLATES = {
  btcPrice: {
    name: "BTC Price",
    endpoint: "https://api.coinbase.com/v2/exchange-rates?currency=BTC",
    authType: "none" as const,
    jsonPath: "data.rates.USD",
    operator: ">" as const,
    exampleThreshold: "50000"
  },
  jpyInflation: {
    name: "Japan Inflation",
    endpoint: "https://api.stat.go.jp/inflation/current",
    authType: "bearer" as const,
    jsonPath: "data.inflation_rate",
    operator: ">" as const,
    exampleThreshold: "5"
  },
  usTariffs: {
    name: "US Tariffs",
    endpoint: "https://api.trade.gov/tariffs/japan/automotive",
    authType: "apiKey" as const,
    jsonPath: "data.tariff_rate",
    operator: ">" as const,
    exampleThreshold: "15"
  }
};

export default function CreateOrderPageV2() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [predicateId, setPredicateId] = useState<string | null>(null)
  const [step, setStep] = useState<"create" | "preview" | "complete">("create")
  const [updateCount, setUpdateCount] = useState(0)
  const [expectedSpread, setExpectedSpread] = useState(1.0)
  
  // Track update count for spread calculation
  useEffect(() => {
    if (predicateId && address) {
      // In a real implementation, query the contract for actual update count
      // For now, simulate with a default value
      setUpdateCount(0);
    }
  }, [predicateId, address]);
  
  // Calculate expected spread when tokens or dynamic pricing changes
  useEffect(() => {
    const calculateSpread = async () => {
      if (form.useDynamicPricing && form.makerAsset && form.takerAsset) {
        try {
          // For now, use a simple calculation
          // In production, this would call the actual calculateExpectedSpread function
          const gasEstimate = 0.5; // 0.5% for gas
          const keeperFees = updateCount * 0.2; // 0.2% per update
          const buffer = 0.4; // 0.4% safety buffer
          setExpectedSpread(gasEstimate + keeperFees + buffer);
        } catch (error) {
          console.error("Error calculating spread:", error);
          setExpectedSpread(1.0); // Default 1%
        }
      }
    };
    
    calculateSpread();
  }, [form.useDynamicPricing, form.makerAsset, form.takerAsset, updateCount]);
  
  const [form, setForm] = useState<OrderForm>({
    makerAsset: "",
    takerAsset: "",
    makerAmount: "",
    takerAmount: "",
    apiConditions: [{
      endpoint: "",
      authType: "none",
      authValue: "",
      jsonPath: "",
      operator: ">",
      threshold: ""
    }],
    logicOperator: "AND",
    useDynamicPricing: false
  })

  const handleAddCondition = () => {
    setForm({
      ...form,
      apiConditions: [...form.apiConditions, {
        endpoint: "",
        authType: "none",
        authValue: "",
        jsonPath: "",
        operator: ">",
        threshold: ""
      }]
    })
  }

  const handleRemoveCondition = (index: number) => {
    setForm({
      ...form,
      apiConditions: form.apiConditions.filter((_, i) => i !== index)
    })
  }

  const handleConditionChange = (index: number, field: keyof APICondition, value: string) => {
    const newConditions = [...form.apiConditions]
    newConditions[index] = { ...newConditions[index], [field]: value }
    setForm({ ...form, apiConditions: newConditions })
  }

  const useTemplate = (index: number, templateKey: keyof typeof API_TEMPLATES) => {
    const template = API_TEMPLATES[templateKey];
    const newConditions = [...form.apiConditions];
    newConditions[index] = {
      endpoint: template.endpoint,
      authType: template.authType,
      authValue: "",
      jsonPath: template.jsonPath,
      operator: template.operator,
      threshold: template.exampleThreshold
    };
    setForm({ ...form, apiConditions: newConditions });
  };

  const handleCreatePredicate = async () => {
    if (!address || !isConnected) return;

    // Validate form
    const errors = validateAPIConditions(form.apiConditions);
    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: errors[0],
        variant: "destructive",
      });
      return;
    }

    if (!form.makerAsset || !form.takerAsset || !form.makerAmount || !form.takerAmount) {
      toast({
        title: "Missing Information",
        description: "Please fill in all token and amount fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Get contract address based on network
      const network = chainId === 11155111 ? "sepolia" : "mainnet";
      const contractAddress = CONTRACTS[network].dynamicAPIPredicate;
      
      if (contractAddress === "0x0000000000000000000000000000000000000000") {
        throw new Error(`Contract not deployed on ${network}`);
      }

      // Create contract instance
      const predicateContract = new Contract(
        contractAddress,
        DYNAMIC_API_PREDICATE_ABI,
        signer
      );

      // Generate Chainlink function code
      const chainlinkFunction = generateChainlinkFunction(
        form.apiConditions,
        form.logicOperator === "AND"
      );

      // Convert conditions to contract format
      const contractConditions = form.apiConditions.map(cond => ({
        endpoint: cond.endpoint,
        authType: cond.authType,
        jsonPath: cond.jsonPath,
        operator: cond.operator === ">" ? 0 : cond.operator === "<" ? 1 : 2,
        threshold: ethers.parseUnits(cond.threshold, 0) // Convert to int256
      }));

      // Create predicate on-chain
      const tx = await predicateContract.createPredicate(
        contractConditions,
        form.logicOperator === "AND",
        ethers.toUtf8Bytes(chainlinkFunction)
      );

      toast({
        title: "Creating predicate...",
        description: "Transaction submitted to blockchain",
      });

      const receipt = await tx.wait();

      // Get predicate ID from event
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = predicateContract.interface.parseLog(log);
          return parsed?.name === "PredicateCreated";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = predicateContract.interface.parseLog(event);
        const newPredicateId = parsed?.args.predicateId;
        setPredicateId(newPredicateId);
        
        // Save predicate config to Firebase
        try {
          await savePredicateConfig(newPredicateId, {
            apiConditions: form.apiConditions,
            logicOperator: form.logicOperator,
            creator: address,
            chainlinkFunction: chainlinkFunction
          });
        } catch (firebaseError) {
          console.error('Failed to save predicate to Firebase:', firebaseError);
          // Continue anyway - Firebase is optional
        }
        
        setStep("preview");

        toast({
          title: "Predicate created successfully!",
          description: `Predicate ID: ${newPredicateId.substring(0, 10)}...`,
        });
      } else {
        throw new Error("Failed to get predicate ID from transaction");
      }

    } catch (error: any) {
      console.error("Error creating predicate:", error);
      toast({
        title: "Error creating predicate",
        description: error.message || "Failed to create predicate on-chain",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!predicateId || !address) return;

    setIsLoading(true);

    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Get token decimals
      const makerToken = getTokenByAddress(form.makerAsset);
      const takerToken = getTokenByAddress(form.takerAsset);
      
      if (!makerToken || !takerToken) {
        throw new Error("Invalid token selection");
      }

      // Create 1inch order with our predicate
      const orderResult = await createDynamicOrder({
        makerAsset: form.makerAsset,
        takerAsset: form.takerAsset,
        makingAmount: ethers.parseUnits(form.makerAmount, makerToken.decimals).toString(),
        takingAmount: ethers.parseUnits(form.takerAmount, takerToken.decimals).toString(),
        predicateContract: CONTRACTS[chainId === 11155111 ? "sepolia" : "mainnet"].dynamicAPIPredicate,
        predicateId: predicateId,
        useDynamicPricing: form.useDynamicPricing,
        dynamicAmountGetterAddress: form.useDynamicPricing ? CONTRACTS[chainId === 11155111 ? "sepolia" : "mainnet"].dynamicAmountGetter : undefined
      });

      // Update order with maker address
      const orderWithMaker = {
        ...orderResult.order,
        maker: address,
        receiver: address
      };

      // Update domain with correct chainId
      const domain = {
        ...orderResult.domain,
        chainId: chainId
      };

      // Sign the order
      const signature = await signer.signTypedData(
        domain,
        orderResult.types,
        orderWithMaker
      );

      // Get order hash
      const orderHash = getOrderHash(orderWithMaker);

      // Save order to Firebase
      try {
        const orderId = await saveOrder(
          orderWithMaker,
          signature,
          predicateId,
          form.apiConditions,
          form.logicOperator,
          orderHash
        );
        
        console.log("Order saved to Firebase:", orderId);
        
        toast({
          title: "Order saved!",
          description: "Your order has been stored and will be monitored",
        });
      } catch (firebaseError) {
        console.error('Failed to save order to Firebase:', firebaseError);
        // Still show success - order can work without Firebase
      }

      setStep("complete");

      toast({
        title: "Order created successfully!",
        description: "Your smart capital order is now active",
      });

    } catch (error: any) {
      console.error("Error creating order:", error);
      toast({
        title: "Error creating order",
        description: error.message || "Failed to create 1inch order",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        <div className={`flex items-center space-x-2 ${step === "create" ? "text-primary" : "text-muted-foreground"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === "create" ? "border-primary bg-primary text-white" : "border-muted-foreground"}`}>
            1
          </div>
          <span>Configure</span>
        </div>
        <div className="w-20 h-px bg-border" />
        <div className={`flex items-center space-x-2 ${step === "preview" ? "text-primary" : "text-muted-foreground"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === "preview" ? "border-primary bg-primary text-white" : "border-muted-foreground"}`}>
            2
          </div>
          <span>Review</span>
        </div>
        <div className="w-20 h-px bg-border" />
        <div className={`flex items-center space-x-2 ${step === "complete" ? "text-primary" : "text-muted-foreground"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === "complete" ? "border-primary bg-primary text-white" : "border-muted-foreground"}`}>
            3
          </div>
          <span>Complete</span>
        </div>
      </div>

      {step === "create" && (
        <>
          {/* Token Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Token Swap Configuration</CardTitle>
              <CardDescription>Choose the tokens and amounts for your smart capital order</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From Token</Label>
                  <TokenSelector
                    value={form.makerAsset}
                    onChange={(value) => setForm({ ...form, makerAsset: value })}
                    placeholder="Select token"
                  />
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={form.makerAmount}
                    onChange={(e) => setForm({ ...form, makerAmount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>To Token</Label>
                  <TokenSelector
                    value={form.takerAsset}
                    onChange={(value) => setForm({ ...form, takerAsset: value })}
                    placeholder="Select token"
                  />
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={form.takerAmount}
                    onChange={(e) => setForm({ ...form, takerAmount: e.target.value })}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="dynamic-pricing">Dynamic Pricing</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically adjust prices to cover gas costs and keeper fees
                    </p>
                  </div>
                  <Switch
                    id="dynamic-pricing"
                    checked={form.useDynamicPricing}
                    onCheckedChange={(checked) => setForm({ ...form, useDynamicPricing: checked })}
                  />
                </div>
                
                {form.useDynamicPricing && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Expected spread: ~{expectedSpread.toFixed(1)}% 
                      (based on {updateCount} updates × $2 + gas costs)
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* API Conditions */}
          <Card>
            <CardHeader>
              <CardTitle>Real-World Trigger Conditions</CardTitle>
              <CardDescription>Define API conditions that will trigger your order execution</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Logic Operator</Label>
                <Select value={form.logicOperator} onValueChange={(value: "AND" | "OR") => setForm({ ...form, logicOperator: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AND">ALL conditions must be true (AND)</SelectItem>
                    <SelectItem value="OR">ANY condition must be true (OR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {form.apiConditions.map((condition, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Condition {index + 1}</h4>
                      <div className="flex items-center space-x-2">
                        <Select onValueChange={(value) => useTemplate(index, value as keyof typeof API_TEMPLATES)}>
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Use template" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(API_TEMPLATES).map(([key, template]) => (
                              <SelectItem key={key} value={key}>{template.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {form.apiConditions.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveCondition(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>API Endpoint</Label>
                        <Input
                          placeholder="https://api.example.com/data"
                          value={condition.endpoint}
                          onChange={(e) => handleConditionChange(index, "endpoint", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Authentication</Label>
                        <Select
                          value={condition.authType}
                          onValueChange={(value) => handleConditionChange(index, "authType", value as any)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Auth</SelectItem>
                            <SelectItem value="apiKey">API Key</SelectItem>
                            <SelectItem value="bearer">Bearer Token</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {condition.authType !== "none" && (
                      <div className="space-y-2">
                        <Label>{condition.authType === "apiKey" ? "API Key" : "Bearer Token"}</Label>
                        <Input
                          type="password"
                          placeholder={condition.authType === "apiKey" ? "Your API key" : "Your bearer token"}
                          value={condition.authValue}
                          onChange={(e) => handleConditionChange(index, "authValue", e.target.value)}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>JSON Path</Label>
                        <Input
                          placeholder="data.value"
                          value={condition.jsonPath}
                          onChange={(e) => handleConditionChange(index, "jsonPath", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Operator</Label>
                        <Select
                          value={condition.operator}
                          onValueChange={(value) => handleConditionChange(index, "operator", value as any)}
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
                        <Label>Threshold</Label>
                        <Input
                          type="number"
                          placeholder="100"
                          value={condition.threshold}
                          onChange={(e) => handleConditionChange(index, "threshold", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              <Button
                variant="outline"
                onClick={handleAddCondition}
                className="w-full"
                disabled={form.apiConditions.length >= 10}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Condition
              </Button>

              {form.apiConditions.length >= 10 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Maximum 10 conditions allowed per predicate</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Button
            onClick={handleCreatePredicate}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Predicate...
              </>
            ) : (
              "Create Predicate & Continue"
            )}
          </Button>
        </>
      )}

      {step === "preview" && predicateId && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Review Your Smart Capital Order</CardTitle>
              <CardDescription>Confirm the details before creating your order</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Predicate ID</span>
                  <span className="font-mono text-sm">{predicateId.substring(0, 20)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Swap</span>
                  <span>{form.makerAmount} {form.makerAsset} → {form.takerAmount} {form.takerAsset}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Conditions</span>
                  <span>{form.apiConditions.length} conditions ({form.logicOperator})</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium">Trigger Conditions</h4>
                {form.apiConditions.map((cond, i) => (
                  <div key={i} className="text-sm bg-muted p-2 rounded">
                    <div className="font-mono">{cond.endpoint}</div>
                    <div className="text-muted-foreground">
                      {cond.jsonPath} {cond.operator} {cond.threshold}
                    </div>
                  </div>
                ))}
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Your order will execute automatically when the conditions are met. 
                  The keeper service checks conditions every 5 minutes.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <div className="flex space-x-4">
            <Button
              variant="outline"
              onClick={() => setStep("create")}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              onClick={handleCreateOrder}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Order...
                </>
              ) : (
                "Create 1inch Order"
              )}
            </Button>
          </div>
        </>
      )}

      {step === "complete" && (
        <Card>
          <CardHeader>
            <CardTitle>Order Created Successfully! 🎉</CardTitle>
            <CardDescription>Your smart capital order is now active</CardDescription>
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
                <strong>What happens next:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Our keeper service monitors your conditions every 5 minutes</li>
                  <li>When conditions are met, your order becomes executable</li>
                  <li>Taker bots will execute your swap automatically</li>
                  <li>You'll receive the swapped tokens directly in your wallet</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="space-y-2 bg-muted p-4 rounded">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Predicate ID</span>
                <span className="font-mono text-sm">{predicateId?.substring(0, 20)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className="bg-green-50">Active</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Update Fee</span>
                <span>$2 per update (paid by taker)</span>
              </div>
            </div>

            <Button
              onClick={() => {
                setStep("create");
                setPredicateId(null);
                setForm({
                  makerAsset: "",
                  takerAsset: "",
                  makerAmount: "",
                  takerAmount: "",
                  apiConditions: [{
                    endpoint: "",
                    authType: "none",
                    authValue: "",
                    jsonPath: "",
                    operator: ">",
                    threshold: ""
                  }],
                  logicOperator: "AND",
                  useDynamicPricing: false
                });
              }}
              className="w-full"
            >
              Create Another Order
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}