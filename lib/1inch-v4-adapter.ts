import { ethers } from "ethers";
import { LimitOrder } from "@1inch/limit-order-sdk";

// v4 Order structure with uint256 addresses
export interface V4Order {
  salt: string;
  maker: string;
  receiver: string;
  makerAsset: string;
  takerAsset: string;
  makingAmount: string;
  takingAmount: string;
  makerTraits: string;
}

// v4 typed data types
export const V4_ORDER_TYPES = {
  Order: [
    { name: "salt", type: "uint256" },
    { name: "maker", type: "uint256" },
    { name: "receiver", type: "uint256" },
    { name: "makerAsset", type: "uint256" },
    { name: "takerAsset", type: "uint256" },
    { name: "makingAmount", type: "uint256" },
    { name: "takingAmount", type: "uint256" },
    { name: "makerTraits", type: "uint256" }
  ]
};

/**
 * Convert SDK order to v4 format with uint256 addresses
 */
export function convertToV4Order(sdkOrder: LimitOrder): V4Order {
  const orderData = sdkOrder.build();
  
  return {
    salt: orderData.salt,
    maker: ethers.toBigInt(orderData.maker).toString(),
    receiver: ethers.toBigInt(orderData.receiver).toString(),
    makerAsset: ethers.toBigInt(orderData.makerAsset).toString(),
    takerAsset: ethers.toBigInt(orderData.takerAsset).toString(),
    makingAmount: orderData.makingAmount,
    takingAmount: orderData.takingAmount,
    makerTraits: orderData.makerTraits
  };
}

/**
 * Get v4 typed data for signing
 */
export function getV4TypedData(
  sdkOrder: LimitOrder,
  chainId: number,
  verifyingContract: string
) {
  const v4Order = convertToV4Order(sdkOrder);
  
  return {
    domain: {
      name: "1inch Aggregation Router",
      version: "6",
      chainId,
      verifyingContract
    },
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" }
      ],
      ...V4_ORDER_TYPES
    },
    message: v4Order,
    primaryType: "Order" as const
  };
}

/**
 * Sign v4 order
 */
export async function signV4Order(
  sdkOrder: LimitOrder,
  signer: ethers.Signer,
  chainId: number,
  verifyingContract: string
): Promise<string> {
  const typedData = getV4TypedData(sdkOrder, chainId, verifyingContract);
  
  return await signer.signTypedData(
    typedData.domain,
    { Order: typedData.types.Order },
    typedData.message
  );
}

/**
 * Prepare order for fillOrder call
 */
export function prepareV4OrderTuple(sdkOrder: LimitOrder): any[] {
  const v4Order = convertToV4Order(sdkOrder);
  
  return [
    v4Order.salt,
    v4Order.maker,
    v4Order.receiver,
    v4Order.makerAsset,
    v4Order.takerAsset,
    v4Order.makingAmount,
    v4Order.takingAmount,
    v4Order.makerTraits
  ];
}

/**
 * Split signature for fillOrder
 */
export function splitSignature(signature: string): { r: string; vs: string } {
  const sigBytes = signature.startsWith('0x') ? signature.slice(2) : signature;
  return {
    r: '0x' + sigBytes.slice(0, 64),
    vs: '0x' + sigBytes.slice(64, 128)
  };
}