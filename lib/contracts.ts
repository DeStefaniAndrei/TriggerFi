/**
 * Contract addresses and configuration
 */

export const CONTRACTS = {
  sepolia: {
    dynamicAPIPredicate: "0xd378Fbce97cD181Cd7A7EcCe32571f1a37E226ed", // V1 - doesn't work with Chainlink
    dynamicAPIPredicateV2: "0x462C4Be5274e8C616C49B659b1cC3Fbdf7A26b6b", // V2 - properly inherits FunctionsClient
    dynamicAmountGetter: "0x5b02226E1820E80F6212f31Fe51Cf01A7B3D10b2",
    chainlinkFunctions: "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0",
    usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    limitOrderProtocol: "0x111111125421ca6dc452d289314280a0f8842a65", // 1inch v4.3.2
    // Other token addresses
    weth: "0xfff9976782d46cc05630d1f6ebab18b2324d6b14",
    jpyc: "0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB",
    // Note: USDC address above is different from the one in token-selector
    // Using 0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8 for consistency
  },
  baseSepolia: {
    dynamicAPIPredicate: "0xb1b20C1BA8dfa44B16917A9221E48D0E85685f6A", // MockDynamicAPIPredicate for demo
    dynamicAPIPredicateV2: "0xb1b20C1BA8dfa44B16917A9221E48D0E85685f6A", // Using mock for demo
    dynamicAmountGetter: "0x3072586fE27A2bE611513A8cCB4378978f9eADAD",
    chainlinkFunctions: "0x0000000000000000000000000000000000000000", // Not needed for demo
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    limitOrderProtocol: "0xE53136D9De56672e8D2665C98653AC7b8A60Dc44", // Hackathon deployment
    customOrderManager: "0x6E194fdeba7431937C14bfcD95470A9Ca6084CC1",
    weth: "0x4200000000000000000000000000000000000006",
    jpyc: "0xd378Fbce97cD181Cd7A7EcCe32571f1a37E226ed", // Our mock JPYC
  },
  mainnet: {
    dynamicAPIPredicate: "0x0000000000000000000000000000000000000000", // Not deployed yet
    dynamicAmountGetter: "0x0000000000000000000000000000000000000000", // Not deployed yet
    chainlinkFunctions: "0x65Dcc24F8ff9e51F10DCc7Ed1e4e2A61e6E14bd6",
    usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    limitOrderProtocol: "0x111111125421ca6dc452d289314280a0f8842a65", // 1inch v4.3.2
    oneInchRouter: "0x1111111254eeb25477b68fb85ed929f73a960582",
    weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    jpyc: "0x2370f9d504c7a6E775bf6E14B3F12846b594cD53",
  }
};

export const CHAINLINK_CONFIG = {
  subscriptionId: 5385,
  donId: {
    sepolia: "0x66756e2d657468657265756d2d7365706f6c69612d3100000000000000000000",
    mainnet: "0x66756e2d657468657265756d2d6d61696e6e65742d3100000000000000000000"
  },
  gasLimit: 300000,
  updateFee: 2 * 10**6, // $2 in USDC (6 decimals)
};

export const KEEPER_CONFIG = {
  updateInterval: 5 * 60 * 1000, // 5 minutes
  keeperAddress: "0x93d43c27746D76e7606C55493A757127b33D7763",
  treasuryAddress: "0x93d43c27746D76e7606C55493A757127b33D7763",
};

// ABI for DynamicAPIPredicate contract
export const DYNAMIC_API_PREDICATE_ABI = [
  "function createPredicate(tuple(string endpoint, string authType, string jsonPath, uint8 operator, int256 threshold)[] conditions, bool useAND, bytes chainlinkFunctionCode) external returns (bytes32 predicateId)",
  "function checkCondition(bytes32 predicateId) external view returns (uint256)",
  "function checkConditions(bytes32 predicateId) external",
  "function getUpdateFees(bytes32 predicateId) external view returns (uint256)",
  "function collectFees(bytes32 predicateId) external payable",
  "function updateCount(bytes32 predicateId) external view returns (uint256)",
  "function keeper() external view returns (address)",
  "function treasury() external view returns (address)",
  "event PredicateCreated(bytes32 indexed predicateId, address indexed maker, uint256 conditionCount)",
  "event PredicateChecked(bytes32 indexed predicateId, bool result)",
  "event FeesCollected(bytes32 indexed predicateId, uint256 amount, address payer)",
];

export function getContractAddress(network: string, contract: string): string {
  const networkConfig = CONTRACTS[network as keyof typeof CONTRACTS];
  if (!networkConfig) {
    throw new Error(`Unknown network: ${network}`);
  }
  
  const address = networkConfig[contract as keyof typeof networkConfig];
  if (!address || address === "0x0000000000000000000000000000000000000000") {
    throw new Error(`Contract ${contract} not deployed on ${network}`);
  }
  
  return address;
}