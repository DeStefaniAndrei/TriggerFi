import { ethers } from "ethers";
import { createArbitraryStaticCallPredicate } from "./predicate-encoder";

// 1inch Limit Order Protocol interfaces
export interface LimitOrder {
  salt: string;
  makerAsset: string;
  takerAsset: string;
  maker: string;
  receiver: string;
  allowedSender: string;
  makingAmount: string;
  takingAmount: string;
  offsets: string;
  interactions: string;
  predicate: string;
  permit: string;
  getMakingAmount: string;
  getTakingAmount: string;
  preInteraction: string;
  postInteraction: string;
}


// 1inch Limit Order Protocol contract addresses (v4.3.2)
//For andrei: I'm probably just gonna use the sepolia and mainnet addresses for my project. But I could say in the presentation that my extension is available on all networks.
const LIMIT_ORDER_PROTOCOL_ADDRESSES = {
  1: "0x111111125421ca6dc452d289314280a0f8842a65", // Ethereum mainnet
  137: "0x111111125421ca6dc452d289314280a0f8842a65", // Polygon mainnet
  10: "0x111111125421ca6dc452d289314280a0f8842a65", // Optimism Mainnet
  42161: "0x111111125421ca6dc452d289314280a0f8842a65", // Arbitrum One
  56: "0x111111125421ca6dc452d289314280a0f8842a65", // BSC mainnet
  43114: "0x111111125421ca6dc452d289314280a0f8842a65", // Avalanche
  250: "0x111111125421ca6dc452d289314280a0f8842a65", // Fantom
  1313161554: "0x111111125421ca6dc452d289314280a0f8842a65", // Aurora
  8453: "0x111111125421ca6dc452d289314280a0f8842a65", // Base
  324: "0x6fd4383cb451173d5f9304f041c7bcbf27d561ff", // zkSync Era
  11155111: "0x111111125421ca6dc452d289314280a0f8842a65", // Sepolia (testnet)
};

// Basic ABI for the 1inch Limit Order Protocol
const LIMIT_ORDER_PROTOCOL_ABI = [
  "function fillOrder(tuple(bytes32,address,address,address,address,address,uint256,uint256,bytes,bytes,bytes,bytes,bytes,bytes,bytes,bytes) order, bytes signature, bytes interaction) external payable returns (uint256 makingAmount, uint256 takingAmount, bytes32 orderHash)",
  "function cancelOrder(bytes32 orderHash) external",
  "function remaining(bytes32 orderHash) external view returns (uint256)",
  "function invalidatorForOrderRFQ(bytes orderHash, address maker, uint256 slot) external view returns (uint256)",
  "event OrderFilled(bytes32 indexed orderHash, address indexed maker, address indexed taker, uint256 makingAmount, uint256 takingAmount, uint256 remainingAmount)",
  "event OrderCanceled(bytes32 indexed orderHash, address indexed maker)"
];

/**
 * Get the 1inch Limit Order Protocol contract address for a given chain
 */
export function getLimitOrderProtocolAddress(chainId: number): string {
  return LIMIT_ORDER_PROTOCOL_ADDRESSES[chainId as keyof typeof LIMIT_ORDER_PROTOCOL_ADDRESSES] || 
         LIMIT_ORDER_PROTOCOL_ADDRESSES[1];
}

/**
 * Order configuration for dynamic API predicates
 */
export interface DynamicOrderConfig {
  makerAsset: string;
  takerAsset: string;
  makingAmount: string;
  takingAmount: string;
  predicateContract: string;
  predicateId: string;
  useDynamicPricing?: boolean;
  dynamicAmountGetterAddress?: string;
}

/**
 * Create a 1inch limit order with dynamic API predicate
 */
export function createLimitOrder(
  orderConfig: DynamicOrderConfig,
  makerAddress: string,
  receiverAddress: string,
  predicateData: string  // Already encoded predicate from predicate-encoder.ts
): LimitOrder {
  const salt = ethers.randomBytes(32);

  return {
    salt: ethers.hexlify(salt),
    makerAsset: orderConfig.makerAsset,
    takerAsset: orderConfig.takerAsset,
    maker: makerAddress,
    receiver: receiverAddress,
    allowedSender: ethers.ZeroAddress,
    makingAmount: orderConfig.makingAmount,
    takingAmount: orderConfig.takingAmount,
    offsets: "0x",
    interactions: "0x",
    predicate: predicateData,
    permit: "0x",
    getMakingAmount: "0x",
    getTakingAmount: "0x",
    preInteraction: "0x",
    postInteraction: "0x"
  };
}

/**
 * Sign a limit order using EIP-712
 */
export async function signLimitOrder(
  order: LimitOrder,
  signer: ethers.Signer,
  chainId: number
): Promise<string> {
  const domain = {
    name: "1inch Limit Order Protocol",
    version: "4",
    chainId: chainId,
    verifyingContract: getLimitOrderProtocolAddress(chainId)
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
      { name: "offsets", type: "bytes" },
      { name: "interactions", type: "bytes" },
      { name: "predicate", type: "bytes" },
      { name: "permit", type: "bytes" },
      { name: "getMakingAmount", type: "bytes" },
      { name: "getTakingAmount", type: "bytes" },
      { name: "preInteraction", type: "bytes" },
      { name: "postInteraction", type: "bytes" }
    ]
  };
  
  const signature = await signer.signTypedData(domain, types, order);
  return signature;
}

/**
 * NOTE: Orders are submitted to Firebase, not on-chain
 * Use Firebase SDK to store signed orders off-chain
 * Takers will discover orders via Firebase API
 */

/**
 * Get order hash for tracking
 */
export function getOrderHash(order: LimitOrder): string {
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
    order.interactions,
    order.predicate,
    order.permit,
    order.getMakingAmount,
    order.getTakingAmount,
    order.preInteraction,
    order.postInteraction
  ];

  return ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
    ["tuple(bytes32,address,address,address,address,address,uint256,uint256,bytes,bytes,bytes,bytes,bytes,bytes,bytes,bytes)"],
    [orderStruct]
  ));
}

/**
 * Check if an order can be filled (predicate returns true)
 */
export async function checkOrderFillability(
  order: LimitOrder,
  provider: ethers.Provider,
  chainId: number
): Promise<boolean> {
  const protocolAddress = getLimitOrderProtocolAddress(chainId);
  const limitOrderProtocol = new ethers.Contract(
    protocolAddress,
    LIMIT_ORDER_PROTOCOL_ABI,
    provider
  );

  try {
    // Try to simulate the fill order call
    await limitOrderProtocol.fillOrder.staticCall(
      [
        order.salt,
        order.makerAsset,
        order.takerAsset,
        order.maker,
        order.receiver,
        order.allowedSender,
        order.makingAmount,
        order.takingAmount,
        order.offsets,
        order.interactions,
        order.predicate,
        order.permit,
        order.getMakingAmount,
        order.getTakingAmount,
        order.preInteraction,
        order.postInteraction
      ],
      "0x",
      "0x"
    );
    return true;
  } catch (error) {
    // If the call reverts, the order is not fillable
    return false;
  }
}

/**
 * Cancel an order
 */
export async function cancelOrder(
  order: LimitOrder,
  signer: ethers.Signer,
  chainId: number
): Promise<ethers.ContractTransactionResponse> {
  const protocolAddress = getLimitOrderProtocolAddress(chainId);
  const limitOrderProtocol = new ethers.Contract(
    protocolAddress,
    LIMIT_ORDER_PROTOCOL_ABI,
    signer
  );

  const orderHash = getOrderHash(order);
  const tx = await limitOrderProtocol.cancelOrder(orderHash);
  return tx;
}

/**
 * Get order status
 */
export async function getOrderStatus(
  order: LimitOrder,
  provider: ethers.Provider,
  chainId: number
): Promise<{
  isFilled: boolean;
  isCancelled: boolean;
  remainingAmount: string;
}> {
  const protocolAddress = getLimitOrderProtocolAddress(chainId);
  const limitOrderProtocol = new ethers.Contract(
    protocolAddress,
    LIMIT_ORDER_PROTOCOL_ABI,
    provider
  );

  const orderHash = getOrderHash(order);
  
  try {
    const remainingAmount = await limitOrderProtocol.remaining(orderHash);
    const isFilled = remainingAmount === BigInt(0);
    const isCancelled = false; // Would need to check cancellation events
    
    return {
      isFilled,
      isCancelled,
      remainingAmount: remainingAmount.toString()
    };
  } catch (error) {
    return {
      isFilled: false,
      isCancelled: true,
      remainingAmount: "0"
    };
  }
}

/**
 * Fill an order (for takers)
 * @param order The order to fill
 * @param signature The maker's signature
 * @param signer The taker's signer
 * @param chainId Chain ID
 * @param predicateContract Address of DynamicAPIPredicate contract
 * @param predicateId The predicate ID for fee collection
 * @param value ETH value to send (if needed for the swap)
 */
/**
 * Create a dynamic order with API-based predicate
 */
export async function createDynamicOrder(config: DynamicOrderConfig) {
  const {
    makerAsset,
    takerAsset,
    makingAmount,
    takingAmount,
    predicateContract,
    predicateId,
    useDynamicPricing,
    dynamicAmountGetterAddress
  } = config;

  // Encode the predicate call
  const predicateCalldata = ethers.concat([
    "0x489a775a", // checkCondition(bytes32) selector
    predicateId
  ]);

  // Create the predicate using arbitraryStaticCall
  const { predicate } = createArbitraryStaticCallPredicate(
    predicateContract,
    predicateCalldata
  );

  // Prepare amount getter data if dynamic pricing is enabled
  let makingAmountData = "0x";
  let takingAmountData = "0x";
  
  if (useDynamicPricing && dynamicAmountGetterAddress) {
    // Import the encoder
    const { encodeDynamicAmountGetter, getTokenByAddress } = await import('./amount-getter-encoder');
    
    // Get token symbols from addresses
    const makerToken = getTokenByAddress(makerAsset);
    const takerToken = getTokenByAddress(takerAsset);
    
    if (!makerToken || !takerToken) {
      throw new Error("Unsupported tokens for dynamic pricing");
    }
    
    const amountGetterData = encodeDynamicAmountGetter(
      dynamicAmountGetterAddress,
      predicateId,
      makerToken.symbol,
      takerToken.symbol
    );
    
    makingAmountData = amountGetterData.makingAmountData;
    takingAmountData = amountGetterData.takingAmountData;
  }

  // Create the order structure
  const order = {
    salt: ethers.hexlify(ethers.randomBytes(32)),
    makerAsset,
    takerAsset,
    maker: "0x0000000000000000000000000000000000000000", // Will be filled by caller
    receiver: "0x0000000000000000000000000000000000000000", // Maker receives
    allowedSender: "0x0000000000000000000000000000000000000000", // Anyone can fill
    makingAmount,
    takingAmount,
    offsets: "0x",
    interactions: "0x",
    predicate: predicate,
    permit: "0x",
    getMakingAmount: makingAmountData,
    getTakingAmount: takingAmountData,
    preInteraction: "0x",
    postInteraction: "0x"
  };

  // Return order data for signing
  return {
    order,
    domain: {
      name: "1inch Limit Order Protocol",
      version: "4",
      chainId: 1, // Will be replaced with actual chainId
      verifyingContract: getLimitOrderProtocolAddress(1)
    },
    types: {
      Order: [
        { name: "salt", type: "bytes32" },
        { name: "makerAsset", type: "address" },
        { name: "takerAsset", type: "address" },
        { name: "maker", type: "address" },
        { name: "receiver", type: "address" },
        { name: "allowedSender", type: "address" },
        { name: "makingAmount", type: "uint256" },
        { name: "takingAmount", type: "uint256" },
        { name: "offsets", type: "bytes" },
        { name: "interactions", type: "bytes" },
        { name: "predicate", type: "bytes" },
        { name: "permit", type: "bytes" },
        { name: "getMakingAmount", type: "bytes" },
        { name: "getTakingAmount", type: "bytes" },
        { name: "preInteraction", type: "bytes" },
        { name: "postInteraction", type: "bytes" }
      ]
    }
  };
}

export async function fillOrder(
  order: LimitOrder,
  signature: string,
  signer: ethers.Signer,
  chainId: number,
  predicateContract: string,
  predicateId: string,
  value?: string
): Promise<{feeTx: ethers.ContractTransactionResponse, fillTx: ethers.ContractTransactionResponse}> {
  // First, pay accumulated fees to DynamicAPIPredicate
  const predicateAbi = [
    "function getUpdateFees(bytes32 predicateId) view returns (uint256)",
    "function collectFees(bytes32 predicateId) payable"
  ];
  
  const predicateContractInstance = new ethers.Contract(
    predicateContract,
    predicateAbi,
    signer
  );
  
  // Get fees owed
  const feesOwed = await predicateContractInstance.getUpdateFees(predicateId);
  
  // Pay fees (assuming fees are in ETH for simplicity, should be USDC in production)
  const feeTx = await predicateContractInstance.collectFees(predicateId, {
    value: feesOwed
  });
  
  // Wait for fee payment to confirm
  await feeTx.wait();
  
  // Now fill the order on 1inch
  const protocolAddress = getLimitOrderProtocolAddress(chainId);
  const limitOrderProtocol = new ethers.Contract(
    protocolAddress,
    LIMIT_ORDER_PROTOCOL_ABI,
    signer
  );

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
    order.interactions,
    order.predicate,
    order.permit,
    order.getMakingAmount,
    order.getTakingAmount,
    order.preInteraction,
    order.postInteraction
  ];

  const fillTx = await limitOrderProtocol.fillOrder(orderStruct, signature, "0x", {
    value: value || "0"
  });
  
  return { feeTx, fillTx };
} 