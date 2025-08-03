import { ethers } from "ethers";

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

export interface OrderConfig {
  asset: string;
  threshold: string;
  isBelowThreshold: boolean;
  isVariableBorrow: boolean;
  withdrawAmount: string;
  targetToken: string;
  minOutputAmount: string;
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
 * Encode predicate data for Aave rate checking
 * This will be called by the 1inch protocol during order execution
 */
export function encodePredicateData(
  ratePredicateAddress: string,
  asset: string,
  threshold: string,
  isBelowThreshold: boolean,
  isVariableBorrow: boolean
): string {
  const abiCoder = new ethers.AbiCoder();
  
  return abiCoder.encode(
    ["address", "address", "uint256", "bool"],
    [ratePredicateAddress, asset, threshold, isBelowThreshold]
  );
}

/**
 * Encode pre-interaction data for Aave withdrawal
 * This will be called by the 1inch protocol before the swap
 */
export function encodePreInteractionData(
  withdrawInteractionAddress: string,
  asset: string,
  amount: string,
  recipient: string,
  user: string,
  priceFeed?: string,
  minPrice?: string
): string {
  const abiCoder = new ethers.AbiCoder();
  
  if (priceFeed && minPrice) {
    return abiCoder.encode(
      ["address", "address", "uint256", "address", "address", "address", "int256"],
      [withdrawInteractionAddress, asset, amount, recipient, user, priceFeed, minPrice]
    );
  } else {
    return abiCoder.encode(
      ["address", "address", "uint256", "address", "address"],
      [withdrawInteractionAddress, asset, amount, recipient, user]
    );
  }
}

/**
 * Create a 1inch limit order
 */
export function createLimitOrder(
  orderConfig: OrderConfig,
  ratePredicateAddress: string,
  withdrawInteractionAddress: string,
  makerAddress: string,
  receiverAddress: string,
  priceFeed?: string,
  minPrice?: string
): LimitOrder {
  const salt = ethers.randomBytes(32);
  
  // Encode predicate for rate checking
  const predicateData = encodePredicateData(
    ratePredicateAddress,
    orderConfig.asset,
    orderConfig.threshold,
    orderConfig.isBelowThreshold,
    orderConfig.isVariableBorrow
  );
  
  // Encode pre-interaction for Aave withdrawal
  const preInteractionData = encodePreInteractionData(
    withdrawInteractionAddress,
    orderConfig.asset,
    orderConfig.withdrawAmount || "0",
    receiverAddress,
    makerAddress,
    priceFeed,
    minPrice
  );

  return {
    salt: ethers.hexlify(salt),
    makerAsset: orderConfig.asset,
    takerAsset: orderConfig.targetToken,
    maker: makerAddress,
    receiver: receiverAddress,
    allowedSender: ethers.ZeroAddress,
    makingAmount: orderConfig.withdrawAmount || "0",
    takingAmount: orderConfig.minOutputAmount || "0",
    offsets: "0x",
    interactions: "0x",
    predicate: predicateData,
    permit: "0x",
    getMakingAmount: "0x",
    getTakingAmount: "0x",
    preInteraction: preInteractionData,
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
 * Submit order directly to the 1inch Limit Order Protocol on-chain
 */
export async function submitOrderOnChain(
  order: LimitOrder,
  signature: string,
  signer: ethers.Signer,
  chainId: number
): Promise<ethers.ContractTransactionResponse> {
  const protocolAddress = getLimitOrderProtocolAddress(chainId);
  const limitOrderProtocol = new ethers.Contract(
    protocolAddress,
    LIMIT_ORDER_PROTOCOL_ABI,
    signer
  );

  // Convert order to the format expected by the contract
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

  // Submit the order to the protocol
  const tx = await limitOrderProtocol.fillOrder(orderStruct, signature, "0x");
  return tx;
}

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
 */
export async function fillOrder(
  order: LimitOrder,
  signature: string,
  signer: ethers.Signer,
  chainId: number,
  value?: string
): Promise<ethers.ContractTransactionResponse> {
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

  const tx = await limitOrderProtocol.fillOrder(orderStruct, signature, "0x", {
    value: value || "0"
  });
  return tx;
} 