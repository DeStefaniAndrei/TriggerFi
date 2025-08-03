"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface YieldDisplayProps {
  asset: string
}

interface YieldData {
  asset: string
  supplyAPY: number
  borrowAPY: number
  utilization: number
  totalSupply: string
  totalBorrow: string
  trend: "up" | "down" | "stable"
}

export function YieldDisplay({ asset }: YieldDisplayProps) {
  const [yieldData, setYieldData] = useState<YieldData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (asset) {
      fetchYieldData(asset)
    }
  }, [asset])

  // Fetch real Aave data from the Aave v3 API
  const fetchYieldData = async (assetSymbol: string) => {
    setIsLoading(true)
    setError(null)
    try {
      // Fetch all market data from Aave v3 API
      const res = await fetch("https://api.aave.com/data/v3/markets-data")
      if (!res.ok) throw new Error("Failed to fetch Aave data")
      const data = await res.json()
      // Find the reserve for the selected asset
      const reserve = data.reserves.find((r: any) => r.symbol === assetSymbol)
      if (!reserve) throw new Error("Asset not found in Aave reserves")
      // Parse the relevant fields
      const supplyAPY = Number(reserve.supplyAPY) * 100
      const borrowAPY = Number(reserve.variableBorrowAPY) * 100
      const utilization = Number(reserve.utilizationRate) * 100
      const totalSupply = reserve.totalLiquidityUSD
      const totalBorrow = reserve.totalVariableDebtUSD
      // Determine trend (mock logic: up if supplyAPY > 4, down if < 2, else stable)
      let trend: "up" | "down" | "stable" = "stable"
      if (supplyAPY > 4) trend = "up"
      else if (supplyAPY < 2) trend = "down"
      setYieldData({
        asset: assetSymbol,
        supplyAPY,
        borrowAPY,
        utilization,
        totalSupply,
        totalBorrow,
        trend,
      })
    } catch (err: any) {
      setError(err.message || "Unknown error")
      setYieldData(null)
    } finally {
      setIsLoading(false)
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "up":
        return "bg-green-100 text-green-700"
      case "down":
        return "bg-red-100 text-red-700"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Loading Aave yield data...</div>
  }
  if (error) {
    return <div className="text-center text-red-500">{error}</div>
  }
  if (!yieldData) {
    return <div className="text-center text-muted-foreground">No data available</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {yieldData.asset} Yield Data
          <Badge className={getTrendColor(yieldData.trend)}>
            {getTrendIcon(yieldData.trend)}
            {yieldData.trend.charAt(0).toUpperCase() + yieldData.trend.slice(1)}
          </Badge>
        </CardTitle>
        <CardDescription>Live Aave v3 market data</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <div className="text-xs text-muted-foreground">Supply APY</div>
          <div className="text-lg font-bold">{yieldData.supplyAPY.toFixed(2)}%</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Borrow APY</div>
          <div className="text-lg font-bold">{yieldData.borrowAPY.toFixed(2)}%</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Utilization</div>
          <div className="text-lg font-bold">{yieldData.utilization.toFixed(2)}%</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Total Supply (USD)</div>
          <div className="text-lg font-bold">${Number(yieldData.totalSupply).toLocaleString()}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Total Borrow (USD)</div>
          <div className="text-lg font-bold">${Number(yieldData.totalBorrow).toLocaleString()}</div>
        </div>
      </CardContent>
    </Card>
  )
}
