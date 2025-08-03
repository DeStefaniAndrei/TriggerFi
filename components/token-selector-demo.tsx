"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useChainId } from "wagmi"

interface TokenSelectorProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
}

export interface Token {
  symbol: string
  name: string
  logo: string
  address: string
  decimals: number
}

// Tokens for different networks
const TOKENS_BY_NETWORK: Record<number, Token[]> = {
  // Sepolia
  11155111: [
    { symbol: "WETH", name: "Wrapped Ethereum", logo: "🔷", address: "0xfff9976782d46cc05630d1f6ebab18b2324d6b14", decimals: 18 },
    { symbol: "USDC", name: "USD Coin", logo: "💵", address: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8", decimals: 6 },
    { symbol: "DAI", name: "Dai Stablecoin", logo: "🟡", address: "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357", decimals: 18 },
    { symbol: "JPYC", name: "JPY Coin", logo: "🇯🇵", address: "0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB", decimals: 18 },
  ],
  // Base Sepolia
  84532: [
    { symbol: "WETH", name: "Wrapped Ethereum", logo: "🔷", address: "0x4200000000000000000000000000000000000006", decimals: 18 },
    { symbol: "USDC", name: "USD Coin", logo: "💵", address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", decimals: 6 },
    { symbol: "mJPYC", name: "Mock JPY Coin", logo: "🇯🇵", address: "0xd378Fbce97cD181Cd7A7EcCe32571f1a37E226ed", decimals: 18 },
  ],
}

export function getTokenByAddress(address: string, chainId: number): Token | undefined {
  const tokens = TOKENS_BY_NETWORK[chainId] || TOKENS_BY_NETWORK[11155111];
  return tokens.find(token => token.address.toLowerCase() === address.toLowerCase());
}

export function TokenSelectorDemo({ value, onValueChange, placeholder = "Select token" }: TokenSelectorProps) {
  const chainId = useChainId();
  const tokens = TOKENS_BY_NETWORK[chainId] || TOKENS_BY_NETWORK[11155111];
  
  // Find the selected token to show address in value
  const selectedToken = tokens.find(t => t.address === value);
  
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder}>
          {selectedToken && (
            <div className="flex items-center gap-2">
              <span>{selectedToken.logo}</span>
              <span>{selectedToken.symbol}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {tokens.map((token) => (
          <SelectItem key={token.address} value={token.address}>
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