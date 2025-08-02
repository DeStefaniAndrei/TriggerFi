import { AbiCoder, concat, getBytes, id, JsonRpcProvider, zeroPadValue, Signer, hexlify } from "ethers";
import { 
  LimitOrder,
  MakerTraits,
  Address,
  Sdk,
  randBigInt,
  FetchProviderConnector
} from "@1inch/limit-order-sdk";

// Your contract addresses (replace with actual deployed addresses)
const AAVE_RATE_PREDICATE = "0x..."; // Your deployed AaveRatePredicate address
const AAVE_WITHDRAW_INTERACTION = "0x..."; // Your deployed AaveWithdrawInteraction address
const WEATHER_PREDICATE = "0x..."; // Your deployed WeatherPredicate address

// 1inch Limit Order Protocol addresses
const LIMIT_ORDER_PROTOCOL_MAINNET = "0x111111125421ca6dc452d289314280a0f8842a65"; // Mainnet v4
// NOTE: 1inch doesn't deploy to testnets. For Sepolia, you'll need to:
// 1. Deploy your own SimpleLimitOrderProtocol, or
// 2. Use a mainnet fork, or  
// 3. Deploy the CustomOrderManager from your contracts
const LIMIT_ORDER_PROTOCOL_SEPOLIA = "0x..."; // Deploy your own order manager

/**
 * Encode greater than comparison
 * @param threshold The threshold value to compare against
 * @param staticBlob The static call data to compare
 */
function encodeGt(threshold: string, staticBlob: string): string {
  const selector = id("gt(uint256,bytes)").slice(0, 10);
  const params = AbiCoder.defaultAbiCoder().encode(
    ["uint256", "bytes"],
    [threshold, staticBlob]
  );
  return concat([selector, params]);
}

/**
 * Encode less than comparison
 * @param threshold The threshold value to compare against
 * @param staticBlob The static call data to compare
 */
function encodeLt(threshold: string, staticBlob: string): string {
  const selector = id("lt(uint256,bytes)").slice(0, 10);
  const params = AbiCoder.defaultAbiCoder().encode(
    ["uint256", "bytes"],
    [threshold, staticBlob]
  );
  return concat([selector, params]);
}

/**
 * Encode arbitrary static call
 * @param target The target contract address
 * @param calldata The calldata to execute
 */
function encodeArbitraryStaticCall(target: string, calldata: string): string {
  const selector = id("arbitraryStaticCall(address,bytes)").slice(0, 10);
  const params = AbiCoder.defaultAbiCoder().encode(
    ["address", "bytes"],
    [target, calldata]
  );
  return concat([selector, params]);
}

/**
 * Encode equality check
 * @param value The value to compare against
 * @param data The static call data to compare
 */
function encodeEq(value: string, data: string): string {
  const selector = id("eq(uint256,bytes)").slice(0, 10);
  const params = AbiCoder.defaultAbiCoder().encode(
    ["uint256", "bytes"],
    [value, data]
  );
  return concat([selector, params]);
}

/**
 * Build extension for 1inch v4 order
 */
function buildExtension(predicate: string, preInteraction: string = "0x"): {
  offsets: string;
  data: string;
} {
  // Calculate offsets for each field (predicate at position 16-19)
  const predicateLength = (predicate.length - 2) / 2; // Remove 0x and convert to bytes
  const preInteractionLength = (preInteraction.length - 2) / 2;
  
  // Pack offsets as uint32 values (each offset is 4 bytes)
  const offsets = new Uint8Array(32);
  
  // Only set predicate offset if we have a predicate
  if (predicateLength > 0) {
    const predicateOffset = predicateLength;
    offsets[19] = predicateOffset & 0xff;
    offsets[18] = (predicateOffset >> 8) & 0xff;
    offsets[17] = (predicateOffset >> 16) & 0xff;
    offsets[16] = (predicateOffset >> 24) & 0xff;
  }
  
  // Only set preInteraction offset if we have one
  if (preInteractionLength > 0) {
    const preInteractionOffset = predicateLength + preInteractionLength;
    offsets[27] = preInteractionOffset & 0xff;
    offsets[26] = (preInteractionOffset >> 8) & 0xff;
    offsets[25] = (preInteractionOffset >> 16) & 0xff;
    offsets[24] = (preInteractionOffset >> 24) & 0xff;
  }
  
  const offsetsHex = "0x" + Array.from(offsets).map(b => b.toString(16).padStart(2, '0')).join('');
  const data = concat([predicate, preInteraction]);
  
  return { offsets: offsetsHex, data };
}

/**
 * Encode the predicate for Aave rate checking
 */
function encodeAaveRatePredicate(
  asset: string,
  threshold: string,
  isBelowThreshold: boolean,
  isVariableBorrow: boolean = false // For now, always use checkSupplyRate
): string {
  // Encode the checkSupplyRate function call
  const checkSupplyRateCall = concat([
    id("checkSupplyRate(address,uint256,bool)").slice(0, 10),
    AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "bool"],
      [asset, threshold, isBelowThreshold]
    )
  ]);
  
  // Wrap in arbitraryStaticCall
  const staticCall = encodeArbitraryStaticCall(AAVE_RATE_PREDICATE, checkSupplyRateCall);
  
  // Use lt or gt operator based on isBelowThreshold
  // Note: The predicate returns true/false, but we need to extract the rate value
  // For now, we'll use the static call directly since the contract returns bool
  return staticCall;
}

/**
 * Encode the pre-interaction for Aave withdrawal
 */
function encodeAaveWithdrawInteraction(
  asset: string,
  amount: string,
  recipient: string,
  user: string
): string {
  // Encode withdrawAndTransfer call
  const withdrawCall = concat([
    id("withdrawAndTransfer(address,uint256,address,address,address,int256)").slice(0, 10),
    AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "address", "address", "address", "int256"],
      [asset, amount, recipient, user, "0x0000000000000000000000000000000000000000", 0] // No price feed for now
    )
  ]);
  
  // Pre-interaction format: 20 bytes address + calldata
  return concat([
    zeroPadValue(AAVE_WITHDRAW_INTERACTION, 20),
    withdrawCall
  ]);
}

/**
 * Create a yield-aware limit order
 */
export async function createYieldAwareLimitOrder(
  makerAsset: string,
  takerAsset: string,
  makerAmount: string,
  takerAmount: string,
  yieldThreshold: string, // Rate threshold in ray format (27 decimals)
  isBelowThreshold: boolean = true,
  isVariableBorrow: boolean = false,
  makerAddress: string,
  receiverAddress: string,
  chainId: number = 1
): Promise<{ 
  order: any, 
  extension: any
}> {
  
  // Create predicate for rate checking
  const predicate = encodeAaveRatePredicate(
    makerAsset,
    yieldThreshold,
    isBelowThreshold,
    isVariableBorrow
  );
  
  // Create pre-interaction for withdrawal
  const preInteraction = encodeAaveWithdrawInteraction(
    makerAsset,
    makerAmount,
    receiverAddress,
    makerAddress
  );
  
  // Build extension with predicate and preInteraction
  const extension = buildExtension(predicate, preInteraction);
  
  // Create the order structure for 1inch v4
  const salt = randBigInt(32);
  const order = {
    salt: "0x" + salt.toString(16).padStart(64, '0'),
    makerAsset,
    takerAsset,
    maker: makerAddress,
    receiver: receiverAddress,
    allowedSender: "0x0000000000000000000000000000000000000000",
    makingAmount: makerAmount,
    takingAmount: takerAmount,
    offsets: extension.offsets,
    interactions: extension.data
  };
  
  return { order, extension };
}

/**
 * Sign a limit order using EIP-712
 */
export async function signLimitOrder(
  order: any,
  signer: Signer,
  chainId: number
): Promise<string> {
  const verifyingContract = chainId === 1 ? LIMIT_ORDER_PROTOCOL_MAINNET : LIMIT_ORDER_PROTOCOL_SEPOLIA;
  
  const domain = {
    name: "1inch Limit Order Protocol",
    version: "4",
    chainId,
    verifyingContract
  };

  const types = {
    Order: [
      { name: "salt", type: "bytes32" },
      { name: "makerAsset", type: "address" },
      { name: "takerAsset", type: "address" },
      { name: "maker", type: "address" },
      { name: "receiver", type: "address" },
      { name: "allowedSender", type: "address" },
      { name: "makingAmount", type: "uint256" },
      { name: "takingAmount", type: "uint256" },
      { name: "offsets", type: "bytes32" },
      { name: "interactions", type: "bytes" }
    ]
  };
  
  const signature = await signer.signTypedData(domain, types, order);
  return signature;
}

/**
 * Get order hash for tracking
 */
export function getOrderHash(order: any, chainId: number = 1): string {
  const orderStruct = [
    order.salt,
    order.makerAsset,
    order.takerAsset,
    order.maker,
    order.receiver,
    order.allowedSender,
    order.makingAmount,
    order.takingAmount,
    order.offsets,
    order.interactions
  ];

  // For v4, the order struct is simpler
  return id(AbiCoder.defaultAbiCoder().encode(
    ["tuple(bytes32,address,address,address,address,address,uint256,uint256,bytes32,bytes)"],
    [orderStruct]
  ));
}

/**
 * Encode the predicate for weather checking
 */
function encodeWeatherPredicate(
  location: string,
  temperatureThreshold: number, // Temperature in Celsius * 10
  isBelow: boolean
): string {
  // Encode the checkTemperature function call
  const checkTemperatureCall = concat([
    id("checkTemperature(string,int256,bool)").slice(0, 10),
    AbiCoder.defaultAbiCoder().encode(
      ["string", "int256", "bool"],
      [location, temperatureThreshold, isBelow]
    )
  ]);
  
  // Wrap in arbitraryStaticCall - this returns bool (0 or 1)
  // The protocol's checkPredicate will verify result == 1
  return encodeArbitraryStaticCall(WEATHER_PREDICATE, checkTemperatureCall);
}

/**
 * Create a weather-aware limit order
 */
export async function createWeatherAwareLimitOrder(
  makerAsset: string,
  takerAsset: string,
  makerAmount: string,
  takerAmount: string,
  location: string, // e.g., "Miami,FL"
  temperatureThreshold: number, // e.g., 0 for 0°C (32°F)
  isBelow: boolean, // true = trigger when temp drops below
  makerAddress: string,
  receiverAddress: string,
  chainId: number = 1
): Promise<{ 
  order: any, 
  extension: any
}> {
  
  // Create predicate for weather checking
  const predicate = encodeWeatherPredicate(
    location,
    temperatureThreshold,
    isBelow
  );
  
  // Build extension with just the predicate
  const extension = buildExtension(predicate);
  
  // Create the order structure for 1inch v4
  const salt = randBigInt(32);
  const order = {
    salt: "0x" + salt.toString(16).padStart(64, '0'),
    makerAsset,
    takerAsset,
    maker: makerAddress,
    receiver: receiverAddress,
    allowedSender: "0x0000000000000000000000000000000000000000", // Anyone can fill
    makingAmount: makerAmount,
    takingAmount: takerAmount,
    offsets: extension.offsets,
    interactions: extension.data
  };
  
  return { order, extension };
}

/**
 * Example usage function
 */
export async function createExampleYieldOrder() {
  const provider = new JsonRpcProvider('https://eth.llamarpc.com');
  
  // Example parameters
  const makerAsset = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // USDC
  const takerAsset = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; // WETH
  const makerAmount = "1000000000"; // 1000 USDC (6 decimals)
  const takerAmount = "500000000000000000"; // 0.5 WETH (18 decimals)
  const yieldThreshold = "50000000000000000000000000"; // 5% in ray format (27 decimals)
  const makerAddress = "0xYourAddress";
  const receiverAddress = "0xYourAddress";
  
  // Create the order
  const { order, extension } = await createYieldAwareLimitOrder(
    makerAsset,
    takerAsset,
    makerAmount,
    takerAmount,
    yieldThreshold,
    true, // isBelowThreshold
    false, // isVariableBorrow (use supply rate)
    makerAddress,
    receiverAddress,
    1 // mainnet
  );
  
  console.log("Created yield-aware limit order:", order);
  console.log("Extension:", extension);
  
  return order;
}

/**
 * Example weather-based order
 */
export async function createWeatherHedgeOrder() {
  // Agricultural hedge: When frost hits, buy insurance tokens
  const makerAsset = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // USDC
  const takerAsset = "0x..."; // FARM or insurance token
  const makerAmount = "10000000000"; // 10,000 USDC
  const takerAmount = "5000000000000000000000"; // Amount of hedge tokens
  
  const { order, extension } = await createWeatherAwareLimitOrder(
    makerAsset,
    takerAsset,
    makerAmount,
    takerAmount,
    "Des Moines,IA", // Iowa farming region
    0, // 0°C = 32°F (frost)
    true, // Trigger when below freezing
    "0xFarmerAddress",
    "0xFarmerAddress",
    11155111 // Sepolia testnet
  );
  
  console.log("Created weather hedge order:", order);
  console.log("Extension:", extension);
  return order;
}

/**
 * Submit order to 1inch API or contract
 */
export async function submitLimitOrder(
  order: any,
  signature: string,
  chainId: number = 1
): Promise<void> {
  // For MVP, you can either:
  // 1. Submit to 1inch API (requires API key)
  // 2. Call fillOrder directly on the contract
  // 3. Store in Firebase for taker bot to execute
  
  console.log("Order ready for submission:", {
    order,
    signature,
    chainId
  });
}