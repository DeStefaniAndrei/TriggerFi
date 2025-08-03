"use client";

import { useState } from "react";
import { useAccount, useSignTypedData } from "wagmi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Thermometer, CloudRain, Wind, AlertCircle } from "lucide-react";
import { createWeatherAwareLimitOrder, signLimitOrder } from "@/lib/limit-order-builder";
import { createWeatherOrder } from "@/lib/firebase-service";
import { parseUnits } from "ethers";

/**
 * Create Weather Order Component
 * 
 * Allows users to create orders that execute based on weather conditions
 * Perfect for agricultural hedging, insurance, and weather derivatives
 */

// Common weather locations for demo
const WEATHER_LOCATIONS = [
  { value: "Des Moines,IA", label: "Des Moines, Iowa (Farming)" },
  { value: "Miami,FL", label: "Miami, Florida (Hurricanes)" },
  { value: "Phoenix,AZ", label: "Phoenix, Arizona (Drought)" },
  { value: "Chicago,IL", label: "Chicago, Illinois (Winter)" },
  { value: "custom", label: "Custom Location..." }
];

// Token addresses (mainnet)
const TOKENS = {
  USDC: {
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
    symbol: "USDC"
  },
  WETH: {
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    decimals: 18,
    symbol: "WETH"
  },
  // Add more tokens as needed
};

export function CreateWeatherOrder() {
  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  
  // Form state
  const [conditionType, setConditionType] = useState<"temperature" | "precipitation" | "wind">("temperature");
  const [location, setLocation] = useState("Des Moines,IA");
  const [customLocation, setCustomLocation] = useState("");
  const [threshold, setThreshold] = useState("0"); // 0°C = 32°F
  const [comparison, setComparison] = useState<"below" | "above">("below");
  const [sellAmount, setSellAmount] = useState("1000");
  const [buyToken, setBuyToken] = useState("WETH");
  const [isCreating, setIsCreating] = useState(false);
  
  // Calculate rough buy amount (in real app, use price oracle)
  const calculateBuyAmount = () => {
    // Simple calculation for demo
    if (buyToken === "WETH") {
      return (parseFloat(sellAmount) / 2000).toFixed(4); // Assume 1 ETH = $2000
    }
    return "100"; // Default
  };
  
  const handleCreateOrder = async () => {
    if (!address || !isConnected) {
      alert("Please connect your wallet");
      return;
    }
    
    setIsCreating(true);
    
    try {
      // Get the actual location
      const actualLocation = location === "custom" ? customLocation : location;
      
      // Convert temperature to Celsius * 10 for contract
      const tempThreshold = parseInt(threshold) * 10;
      
      // Create the 1inch order
      const { order, predicate } = await createWeatherAwareLimitOrder(
        TOKENS.USDC.address,
        TOKENS[buyToken as keyof typeof TOKENS].address,
        parseUnits(sellAmount, TOKENS.USDC.decimals).toString(),
        parseUnits(calculateBuyAmount(), TOKENS[buyToken as keyof typeof TOKENS].decimals).toString(),
        actualLocation,
        tempThreshold,
        comparison === "below",
        address,
        address
      );
      
      // Sign the order
      const signature = await signLimitOrder(order, signTypedDataAsync as any, 1); // chainId 1 for mainnet
      
      // Save to Firebase
      await createWeatherOrder(
        address,
        actualLocation,
        parseInt(threshold),
        comparison === "below",
        TOKENS.USDC.address,
        sellAmount,
        TOKENS[buyToken as keyof typeof TOKENS].address,
        calculateBuyAmount(),
        order,
        signature
      );
      
      alert("Order created successfully! 🎉");
      
      // Reset form
      setSellAmount("1000");
      setThreshold("0");
      
    } catch (error) {
      console.error("Error creating order:", error);
      alert("Failed to create order. Check console for details.");
    } finally {
      setIsCreating(false);
    }
  };
  
  const getConditionIcon = () => {
    switch (conditionType) {
      case "temperature": return <Thermometer className="h-5 w-5" />;
      case "precipitation": return <CloudRain className="h-5 w-5" />;
      case "wind": return <Wind className="h-5 w-5" />;
    }
  };
  
  const getConditionDescription = () => {
    const unit = conditionType === "temperature" ? "°C" : conditionType === "precipitation" ? "mm" : "km/h";
    const actualLocation = location === "custom" ? customLocation || "your location" : location.split(",")[0];
    
    return `When ${conditionType} in ${actualLocation} goes ${comparison} ${threshold}${unit}, swap ${sellAmount} USDC for ${calculateBuyAmount()} ${buyToken}`;
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getConditionIcon()}
          Create Weather-Based Order
        </CardTitle>
        <CardDescription>
          Set up automated trades triggered by real-world weather conditions
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Condition Type */}
        <div className="space-y-2">
          <Label>Condition Type</Label>
          <Select value={conditionType} onValueChange={(v: any) => setConditionType(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="temperature">
                <div className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4" />
                  Temperature
                </div>
              </SelectItem>
              <SelectItem value="precipitation">
                <div className="flex items-center gap-2">
                  <CloudRain className="h-4 w-4" />
                  Precipitation (Coming Soon)
                </div>
              </SelectItem>
              <SelectItem value="wind">
                <div className="flex items-center gap-2">
                  <Wind className="h-4 w-4" />
                  Wind Speed (Coming Soon)
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Location */}
        <div className="space-y-2">
          <Label>Location</Label>
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEATHER_LOCATIONS.map(loc => (
                <SelectItem key={loc.value} value={loc.value}>
                  {loc.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {location === "custom" && (
            <Input
              placeholder="Enter city, state (e.g., Austin,TX)"
              value={customLocation}
              onChange={(e) => setCustomLocation(e.target.value)}
              className="mt-2"
            />
          )}
        </div>
        
        {/* Threshold */}
        <div className="space-y-2">
          <Label>
            Temperature Threshold (°C)
            <span className="text-sm text-muted-foreground ml-2">
              0°C = 32°F (freezing)
            </span>
          </Label>
          <div className="flex gap-2">
            <Select value={comparison} onValueChange={(v: any) => setComparison(v)}>
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
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="0"
              className="flex-1"
            />
          </div>
        </div>
        
        {/* Trade Details */}
        <div className="space-y-2">
          <Label>Trade Details</Label>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                type="number"
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
                placeholder="1000"
              />
              <span className="text-sm text-muted-foreground">USDC</span>
            </div>
            <span>→</span>
            <div className="flex-1">
              <Input
                value={calculateBuyAmount()}
                disabled
                className="bg-muted"
              />
              <Select value={buyToken} onValueChange={setBuyToken}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WETH">WETH</SelectItem>
                  {/* Add more tokens */}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        {/* Summary */}
        <div className="bg-muted p-4 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm">
              <p className="font-medium mb-1">Order Summary:</p>
              <p className="text-muted-foreground">{getConditionDescription()}</p>
            </div>
          </div>
        </div>
        
        {/* Create Button */}
        <Button 
          onClick={handleCreateOrder}
          disabled={!isConnected || isCreating}
          className="w-full"
          size="lg"
        >
          {isCreating ? "Creating Order..." : "Create Weather Order"}
        </Button>
        
        {!isConnected && (
          <p className="text-sm text-center text-muted-foreground">
            Please connect your wallet to create orders
          </p>
        )}
      </CardContent>
    </Card>
  );
}