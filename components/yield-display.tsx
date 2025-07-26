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

  useEffect(() => {
    if (asset) {
      fetchYieldData(asset)
    }
  }, [asset])

  const fetchYieldData = async (assetSymbol: string) => {
    setIsLoading(true)
    try {
      // TODO: Replace with actual Aave API call
      // This is mock data for demonstration
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const mockData: Record<string, YieldData> = {
        USDC: {
          asset: "USDC",
          supplyAPY: 4.25,
          borrowAPY: 5.75,
          utilization: 78.5,
          totalSupply: "1.2B",
          totalBorrow: "942M",
          trend: "up",
        },
        DAI: {
          asset: "DAI",
          supplyAPY: 3.95,
          borrowAPY: 5.45,
          utilization: 72.3,
          totalSupply: "890M",
          totalBorrow: "644M",
          trend: "stable",
        },
        USDT: {
          asset: "USDT",
          supplyAPY: 4.15,
          borrowAPY: 5.65,
          utilization: 81.2,
          totalSupply: "2.1B",
          totalBorrow: "1.7B",
          trend: "down",
        },
        WETH: {
          asset: "WETH",
          supplyAPY: 2.85,
          borrowAPY: 3.95,
          utilization: 65.4,
          totalSupply: "456K",
          totalBorrow: "298K",
          trend: "up",
        },
        WBTC: {
          asset: "WBTC",
          supplyAPY: 1.95,
          borrowAPY: 2.75,
          utilization: 58.7,
          totalSupply: "12.5K",
          totalBorrow: "7.3K",
          trend: "stable",
        },
      }

      setYieldData(mockData[assetSymbol] || mockData.USDC)
    } catch (error) {
      console.error("Error fetching yield data:", error)
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
        return <Minus className="h-4 w-4 text-gray-600" />
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "up":
        return "text-green-600"
      case "down":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  if (!asset) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Aave Yield Data</CardTitle>
          <CardDescription>Select an Aave asset to view current yield rates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">No asset selected</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Aave {asset} Market</CardTitle>
          <Badge variant="outline">Live Data</Badge>
        </div>
        <CardDescription>Current lending rates and market conditions</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
          </div>
        ) : yieldData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Supply APY</div>
                <div className={`text-2xl font-bold flex items-center gap-2 ${getTrendColor(yieldData.trend)}`}>
                  {yieldData.supplyAPY.toFixed(2)}%{getTrendIcon(yieldData.trend)}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Borrow APY</div>
                <div className="text-2xl font-bold text-red-600">{yieldData.borrowAPY.toFixed(2)}%</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Utilization Rate</span>
                <span className="font-medium">{yieldData.utilization.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${yieldData.utilization}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div>
                <div className="text-sm text-muted-foreground">Total Supply</div>
                <div className="font-medium">{yieldData.totalSupply}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Borrow</div>
                <div className="font-medium">{yieldData.totalBorrow}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-4">Failed to load yield data</div>
        )}
      </CardContent>
    </Card>
  )
}
