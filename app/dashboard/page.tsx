"use client"

import { Label } from "@/components/ui/label"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useAccount } from "wagmi"
import { AlertCircle, ExternalLink, Eye, Trash2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"

interface Order {
  id: string
  status: "open" | "filled" | "cancelled" | "expired"
  makerAsset: string
  takerAsset: string
  makerAmount: string
  takerAmount: string
  yieldThreshold: string
  aaveAsset: string
  timestamp: string
  txHash?: string
}

export default function DashboardPage() {
  const { address, isConnected } = useAccount()
  const { toast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isConnected && address) {
      loadOrders()
    }
  }, [isConnected, address])

  const loadOrders = async () => {
    setIsLoading(true)
    try {
      // TODO: Replace with actual API call to fetch user orders
      // This is mock data for demonstration
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const mockOrders: Order[] = [
        {
          id: "1",
          status: "open",
          makerAsset: "USDC",
          takerAsset: "ETH",
          makerAmount: "1000",
          takerAmount: "0.5",
          yieldThreshold: "5.5",
          aaveAsset: "USDC",
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "2",
          status: "filled",
          makerAsset: "DAI",
          takerAsset: "WBTC",
          makerAmount: "5000",
          takerAmount: "0.1",
          yieldThreshold: "4.2",
          aaveAsset: "DAI",
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          txHash: "0x1234567890abcdef1234567890abcdef12345678",
        },
        {
          id: "3",
          status: "cancelled",
          makerAsset: "USDT",
          takerAsset: "UNI",
          makerAmount: "2000",
          takerAmount: "100",
          yieldThreshold: "6.0",
          aaveAsset: "USDT",
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ]

      setOrders(mockOrders)
    } catch (error) {
      toast({
        title: "Error loading orders",
        description: "Failed to fetch your orders. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelOrder = async (orderId: string) => {
    try {
      // TODO: Implement actual order cancellation
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setOrders((prev) =>
        prev.map((order) => (order.id === orderId ? { ...order, status: "cancelled" as const } : order)),
      )

      toast({
        title: "Order cancelled",
        description: "Your order has been successfully cancelled.",
      })
    } catch (error) {
      toast({
        title: "Error cancelling order",
        description: "Failed to cancel the order. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: Order["status"]) => {
    const variants = {
      open: "default",
      filled: "default",
      cancelled: "secondary",
      expired: "destructive",
    } as const

    const colors = {
      open: "bg-blue-100 text-blue-800",
      filled: "bg-green-100 text-green-800",
      cancelled: "bg-gray-100 text-gray-800",
      expired: "bg-red-100 text-red-800",
    }

    return (
      <Badge variant={variants[status]} className={colors[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Please connect your wallet to view your orders.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Order Dashboard</h1>
          <p className="text-muted-foreground">Monitor and manage your yield-aware limit orders</p>
        </div>
        <Button onClick={loadOrders} variant="outline">
          Refresh Orders
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Open Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{orders.filter((o) => o.status === "open").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Filled Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {orders.filter((o) => o.status === "filled").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders.length > 0
                ? Math.round((orders.filter((o) => o.status === "filled").length / orders.length) * 100)
                : 0}
              %
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>My Orders</CardTitle>
          <CardDescription>All your yield-aware limit orders and their current status</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No orders found. Create your first yield-aware order!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Trade</TableHead>
                  <TableHead>Yield Condition</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">
                          {order.makerAmount} {order.makerAsset} → {order.takerAmount} {order.takerAsset}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Rate:{" "}
                          {(Number.parseFloat(order.takerAmount) / Number.parseFloat(order.makerAmount)).toFixed(6)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">
                          {order.aaveAsset} ≥ {order.yieldThreshold}%
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatTimestamp(order.timestamp)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Order Details</DialogTitle>
                              <DialogDescription>
                                Complete information about your yield-aware limit order
                              </DialogDescription>
                            </DialogHeader>
                            {selectedOrder && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium">Order ID</Label>
                                    <p className="text-sm text-muted-foreground">{selectedOrder.id}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Status</Label>
                                    <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium">Selling</Label>
                                    <p className="text-sm text-muted-foreground">
                                      {selectedOrder.makerAmount} {selectedOrder.makerAsset}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Buying</Label>
                                    <p className="text-sm text-muted-foreground">
                                      {selectedOrder.takerAmount} {selectedOrder.takerAsset}
                                    </p>
                                  </div>
                                </div>

                                <div>
                                  <Label className="text-sm font-medium">Yield Condition</Label>
                                  <p className="text-sm text-muted-foreground">
                                    Execute when {selectedOrder.aaveAsset} yield ≥ {selectedOrder.yieldThreshold}%
                                  </p>
                                </div>

                                <div>
                                  <Label className="text-sm font-medium">Predicate Logic</Label>
                                  <code className="block text-xs bg-muted p-2 rounded mt-1">
                                    yieldThreshold({selectedOrder.aaveAsset}, {selectedOrder.yieldThreshold})
                                  </code>
                                </div>

                                {selectedOrder.txHash && (
                                  <div>
                                    <Label className="text-sm font-medium">Transaction Hash</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                      <code className="text-xs bg-muted p-1 rounded">{selectedOrder.txHash}</code>
                                      <Button variant="ghost" size="sm">
                                        <ExternalLink className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>

                        {order.status === "open" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelOrder(order.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}

                        {order.txHash && (
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
