import { ethers } from "ethers";

/**
 * Token indices for price feed mapping (must match contract)
 */
export enum TokenIndex {
  ETH = 0,
  BTC = 1,
  JPY = 2,
  USDC = 3
}

/**
 * Token configuration
 */
export interface TokenConfig {
  symbol: string;
  address: string;
  decimals: number;
  index: TokenIndex;
}

/**
 * Supported tokens on Sepolia
 */
export const SUPPORTED_TOKENS: Record<string, TokenConfig> = {
  WETH: {
    symbol: "WETH",
    address: "0xfff9976782d46cc05630d1f6ebab18b2324d6b14", // Sepolia WETH
    decimals: 18,
    index: TokenIndex.ETH
  },
  USDC: {
    symbol: "USDC", 
    address: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8", // Sepolia USDC
    decimals: 6,
    index: TokenIndex.USDC
  },
  DAI: {
    symbol: "DAI",
    address: "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357", // Sepolia DAI
    decimals: 18,
    index: TokenIndex.ETH // Use ETH price feed as proxy for DAI
  },
  JPYC: {
    symbol: "JPYC",
    address: "0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB", // Sepolia JPYC
    decimals: 18,
    index: TokenIndex.JPY
  }
};

/**
 * Encode amount getter data for DynamicAmountGetter
 * @param dynamicAmountGetterAddress Address of the DynamicAmountGetter contract
 * @param predicateId The predicate ID for fee tracking
 * @param makerToken Symbol of the maker token
 * @param takerToken Symbol of the taker token
 * @returns Encoded data for makingAmountData and takingAmountData
 */
export function encodeDynamicAmountGetter(
  dynamicAmountGetterAddress: string,
  predicateId: string,
  makerToken: string,
  takerToken: string
): { makingAmountData: string; takingAmountData: string } {
  const makerConfig = SUPPORTED_TOKENS[makerToken];
  const takerConfig = SUPPORTED_TOKENS[takerToken];
  
  if (!makerConfig || !takerConfig) {
    throw new Error(`Unsupported token pair: ${makerToken}/${takerToken}`);
  }
  
  // Encode the extra data: [predicateId][makerTokenIndex][takerTokenIndex]
  const extraData = ethers.AbiCoder.defaultAbiCoder().encode(
    ["bytes32", "uint256", "uint256"],
    [predicateId, makerConfig.index, takerConfig.index]
  );
  
  // Remove 0x prefix from extra data
  const extraDataWithout0x = extraData.slice(2);
  
  // The amount getter data format is: [address][extraData]
  const amountGetterData = dynamicAmountGetterAddress + extraDataWithout0x;
  
  // Both making and taking amount use the same data
  return {
    makingAmountData: amountGetterData,
    takingAmountData: amountGetterData
  };
}

/**
 * Calculate expected spread for display purposes
 * @param updateCount Current number of predicate updates
 * @param makerToken Symbol of the maker token
 * @param takerToken Symbol of the taker token
 * @returns Estimated spread percentage
 */
export async function calculateExpectedSpread(
  updateCount: number,
  makerToken: string,
  takerToken: string,
  provider: ethers.Provider
): Promise<number> {
  // Constants from contract
  const GAS_FILL_ORDER = 300000;
  const GAS_PREDICATE_FILL = 100000;
  const GAS_PREDICATE_CHECK = 100000;
  const GAS_PRICE_GWEI = 30;
  const KEEPER_FEE_USD = 2;
  const SAFETY_BUFFER = 0.2; // 20%
  
  // Calculate gas costs
  const totalGasUnits = GAS_FILL_ORDER + GAS_PREDICATE_FILL + (updateCount * GAS_PREDICATE_CHECK);
  const gasCostETH = totalGasUnits * GAS_PRICE_GWEI * 1e-9; // Convert gwei to ETH
  
  // For estimation, assume ETH = $3000 (in production, fetch from oracle)
  const ethPriceUSD = 3000;
  const gasCostUSD = gasCostETH * ethPriceUSD;
  
  // Keeper costs
  const keeperCostUSD = updateCount * KEEPER_FEE_USD;
  
  // Total costs with buffer
  const totalCostUSD = (gasCostUSD + keeperCostUSD) * (1 + SAFETY_BUFFER);
  
  // For spread calculation, we need the order value
  // This is just an estimate - actual spread depends on order size
  // Assume a $1000 order for percentage calculation
  const orderValueUSD = 1000;
  const spreadPercentage = (totalCostUSD / orderValueUSD) * 100;
  
  return spreadPercentage;
}

/**
 * Get token configuration by address
 */
export function getTokenByAddress(address: string): TokenConfig | undefined {
  return Object.values(SUPPORTED_TOKENS).find(
    token => token.address.toLowerCase() === address.toLowerCase()
  );
}

/**
 * Get token pair display name
 */
export function getTokenPairName(makerToken: string, takerToken: string): string {
  return `${makerToken}/${takerToken}`;
}