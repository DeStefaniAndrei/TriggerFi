"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface TokenSelectorProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
}

const TOKENS = [
  { symbol: "USDC", name: "USD Coin", logo: "💵" },
  { symbol: "DAI", name: "Dai Stablecoin", logo: "🟡" },
  { symbol: "USDT", name: "Tether USD", logo: "💚" },
  { symbol: "ETH", name: "Ethereum", logo: "⟠" },
  { symbol: "WETH", name: "Wrapped Ethereum", logo: "🔷" },
  { symbol: "WBTC", name: "Wrapped Bitcoin", logo: "₿" },
  { symbol: "UNI", name: "Uniswap", logo: "🦄" },
  { symbol: "LINK", name: "Chainlink", logo: "🔗" },
]

export function TokenSelector({ value, onValueChange, placeholder = "Select token" }: TokenSelectorProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {TOKENS.map((token) => (
          <SelectItem key={token.symbol} value={token.symbol}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{token.logo}</span>
              <div>
                <div className="font-medium">{token.symbol}</div>
                <div className="text-xs text-muted-foreground">{token.name}</div>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
