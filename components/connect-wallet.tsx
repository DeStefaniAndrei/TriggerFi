"use client"

import { useState } from "react"
import { useAccount, useConnect, useDisconnect } from "wagmi"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Wallet, ChevronDown, LogOut, Copy } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function ConnectWallet() {
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)

  const copyAddress = async () => {
    if (address) {
      try {
        await navigator.clipboard.writeText(address)
        toast({
          title: "Address copied",
          description: "Wallet address copied to clipboard",
        })
      } catch (error) {
        toast({
          title: "Failed to copy",
          description: "Could not copy address to clipboard",
          variant: "destructive",
        })
      }
    }
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const handleConnect = () => {
    const injectedConnector = connectors.find((connector) => connector.id === "injected")
    if (injectedConnector) {
      connect({ connector: injectedConnector })
    } else {
      toast({
        title: "No wallet found",
        description: "Please install MetaMask or another Web3 wallet",
        variant: "destructive",
      })
    }
  }

  if (isConnected && address) {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2 bg-transparent">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="font-mono text-sm">{formatAddress(address)}</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Connected
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1 font-mono">{formatAddress(address)}</p>
          </div>
          <DropdownMenuItem onClick={copyAddress} className="cursor-pointer">
            <Copy className="mr-2 h-4 w-4" />
            Copy Address
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => disconnect()} className="cursor-pointer text-red-600">
            <LogOut className="mr-2 h-4 w-4" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <Button onClick={handleConnect} disabled={isPending} className="flex items-center gap-2">
      <Wallet className="h-4 w-4" />
      {isPending ? "Connecting..." : "Connect Wallet"}
    </Button>
  )
}
