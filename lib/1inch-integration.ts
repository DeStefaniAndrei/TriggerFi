import { ethers } from "ethers";


//For andrei: This file connects the smart contracts I have with the 1inch limit order protocol
//These functions are not called automatically, they are called by the user when they want to create an order. In another file


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

//For andrei: This interface is a blueprint for order objects
export interface OrderConfig {
  asset: string;
  threshold: string;
  isBelowThreshold: boolean;
  isVariableBorrow: boolean;
  withdrawAmount: string;
  targetToken: string;
  minOutputAmount: string;
}

/**
 * Encode predicate data for Aave rate checking
 * For andrei: The function returns a tuple in ABI format, which can be used for the 1inch predicate
 */
export function encodePredicateData(
  ratePredicateAddress: string,
  asset: string,
  threshold: string,
  isBelowThreshold: boolean,
  isVariableBorrow: boolean
): string {
  const functionName = isVariableBorrow ? "checkVariableBorrowRate" : "checkSupplyRate";
  const abiCoder = new ethers.AbiCoder();
  
  return abiCoder.encode(
    ["address", "address", "uint256", "bool"],
    [ratePredicateAddress, asset, threshold, isBelowThreshold]
  );
}

/**
 * Encode pre-interaction data for Aave withdrawal
 * For andrei: The function returns a tuple in ABI format, which can be used for the 1inch pre-interaction
 */
export function encodePreInteractionData(
  withdrawInteractionAddress: string,
  asset: string,
  amount: string,
  recipient: string,
  user: string
): string {
  const abiCoder = new ethers.AbiCoder();
  
  return abiCoder.encode(
    ["address", "address", "uint256", "address", "address"],
    [withdrawInteractionAddress, asset, amount, recipient, user]
  );
}

/**
 * Create a 1inch limit order with predicate and pre-interaction
 */
export function createLimitOrder(
  orderConfig: OrderConfig,
  ratePredicateAddress: string,
  withdrawInteractionAddress: string,
  makerAddress: string,
  receiverAddress: string
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
    makerAddress
  );
  
//For andrei: Still have to add functionality for the permit, dynamic pricing(getMakingAmount and getTakingAmount), and postInteraction

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
  //For andrei: domain is a namespace which includes data for the signature. It shows the name of the contract(1inch limit order protocol), the version of the contract, the chain id, and the verifying contract(also the 1inch limit order protocol).
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  }
): Promise<string> {
  //types defines the structure and variable types of the data getting signed. Matches the 1inch Order struct, so it allows the wallet to create a digest(hash) with EIP-712 rules.
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
 * Submit order to 1inch orderbook
 */
export async function submitOrderTo1inch(
  order: LimitOrder,
  signature: string,
  apiUrl: string = "https://limit-orders.1inch.io"
): Promise<Response> {
  const orderData = {
    order: order,
    signature: signature,
    signatureType: 2 // EIP-712
  };
  
  return fetch(`${apiUrl}/v4.0/1/limit-order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(orderData),
  });
}

/**
 * Convert rate from percentage to ray format (27 decimals)
 */
export function rateToRay(ratePercentage: string): string {
  const rate = parseFloat(ratePercentage) / 100; // Convert percentage to decimal
  const rayRate = rate * Math.pow(10, 27); // Convert to ray format
  return ethers.parseUnits(rayRate.toString(), 0).toString();
}

/**
 * Convert rate from ray format to percentage
 */
export function rayToRate(rayRate: string): string {
  const rate = parseFloat(ethers.formatUnits(rayRate, 27));
  return (rate * 100).toFixed(4);
}

/**
 * Get 1inch domain for EIP-712 signing
 * For andrei: In a typescript function, the return type is defined after the function name(first set of curly braces), the second set of curly braces is the actual function body.
 */
export function get1inchDomain(chainId: number): {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
} {
  // Replace with actual 1inch limit order contract addresses
  const contractAddresses: { [key: number]: string } = {
    1: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Mainnet
    137: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Polygon
    10: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Optimism
  };
  
  return {
    name: "1inch Limit Order Protocol",
    version: "4",
    chainId: chainId,
    verifyingContract: contractAddresses[chainId] || contractAddresses[1]
  };
} 