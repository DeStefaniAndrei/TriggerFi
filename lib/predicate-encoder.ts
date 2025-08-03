import { AbiCoder, concat, getBytes, id, zeroPadValue, dataSlice } from "ethers";

/**
 * IMPORTANT ARCHITECTURE NOTE:
 * 1inch predicates are executed as view functions (staticcall), which means:
 * - They cannot make external API calls or modify state
 * - They can only read on-chain data
 * 
 * Current implementation creates predicates that check on-chain contract state.
 * For real-world API data, we need:
 * - Off-chain monitoring service to fetch API data
 * - Regular updates to on-chain state via Chainlink Functions
 * - Predicates that read the last updated values from the contract
 * 
 * Based on mentor's example:
 * - Use arbitraryStaticCall to call view functions
 * - Strip 0x prefix from encoded params using dataSlice(params, 2)
 * - Predicates return uint256 (not bool)
 */

/**
 * Encodes a greater than comparison predicate
 * @param threshold The value to compare against
 * @param staticCall The encoded static call to get the value
 */
export function encodeGt(threshold: string, staticCall: string): string {
    const selector = id("gt(uint256,bytes)").slice(0, 10); // 4-byte selector
    const params = AbiCoder.defaultAbiCoder().encode(
        ["uint256", "bytes"],
        [threshold, staticCall]
    );
    // NOTE: Following mentor's example - strip 0x prefix from params
    return concat([selector, dataSlice(params, 2)]);
}

/**
 * Encodes a less than comparison predicate
 * @param threshold The value to compare against
 * @param staticCall The encoded static call to get the value
 */
export function encodeLt(threshold: string, staticCall: string): string {
    const selector = id("lt(uint256,bytes)").slice(0, 10);
    const params = AbiCoder.defaultAbiCoder().encode(
        ["uint256", "bytes"],
        [threshold, staticCall]
    );
    // NOTE: Following mentor's example - strip 0x prefix from params
    return concat([selector, dataSlice(params, 2)]);
}

/**
 * Encodes an equality comparison predicate
 * @param value The value to compare against
 * @param staticCall The encoded static call to get the value
 */
export function encodeEq(value: string, staticCall: string): string {
    const selector = id("eq(uint256,bytes)").slice(0, 10);
    const params = AbiCoder.defaultAbiCoder().encode(
        ["uint256", "bytes"],
        [value, staticCall]
    );
    // NOTE: Following mentor's example - strip 0x prefix from params
    return concat([selector, dataSlice(params, 2)]);
}

/**
 * Encodes an OR predicate that returns true if any condition is true
 * @param conditions Array of encoded predicate conditions
 */
export function encodeOr(conditions: string[]): string {
    let currentOffset = 0n;
    let packedOffsets = 0n;
    
    for (let i = 0; i < conditions.length; i++) {
        currentOffset += BigInt(getBytes(conditions[i]).length);
        packedOffsets |= (currentOffset << BigInt(32 * i));
    }
    
    const dataBlob = concat(conditions);
    const selector = id("or(uint256,bytes)").slice(0, 10);
    const params = AbiCoder.defaultAbiCoder().encode(
        ["uint256", "bytes"],
        [packedOffsets, dataBlob]
    );
    // NOTE: Following mentor's example - strip 0x prefix from params
    return concat([selector, dataSlice(params, 2)]);
}

/**
 * Encodes an AND predicate that returns true only if all conditions are true
 * @param conditions Array of encoded predicate conditions
 */
export function encodeAnd(conditions: string[]): string {
    let currentOffset = 0n;
    let packedOffsets = 0n;
    
    for (let i = 0; i < conditions.length; i++) {
        currentOffset += BigInt(getBytes(conditions[i]).length);
        packedOffsets |= (currentOffset << BigInt(32 * i));
    }
    
    const dataBlob = concat(conditions);
    const selector = id("and(uint256,bytes)").slice(0, 10);
    const params = AbiCoder.defaultAbiCoder().encode(
        ["uint256", "bytes"],
        [packedOffsets, dataBlob]
    );
    // NOTE: Following mentor's example - strip 0x prefix from params
    return concat([selector, dataSlice(params, 2)]);
}

/**
 * Encodes an arbitrary static call to any contract
 * @param target The contract address to call
 * @param calldata The calldata for the call
 */
export function encodeArbitraryStaticCall(target: string, calldata: string): string {
    const selector = id("arbitraryStaticCall(address,bytes)").slice(0, 10);
    const params = AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes"],
        [target, calldata]
    );
    // NOTE: Following mentor's example - strip 0x prefix from params
    return concat([selector, dataSlice(params, 2)]);
}

/**
 * Encodes a call to check API conditions on our DynamicAPIPredicate contract
 * @param predicateContract Address of the DynamicAPIPredicate contract
 * @param predicateId The ID of the predicate configuration
 */
export function encodeAPIConditionCheck(
    predicateContract: string,
    predicateId: string
): string {
    // Encode the function selector for checkCondition(bytes32)
    const functionSelector = id("checkCondition(bytes32)").slice(0, 10);
    const params = AbiCoder.defaultAbiCoder().encode(
        ["bytes32"],
        [predicateId]
    );
    const calldata = concat([functionSelector, params]);
    
    // Wrap in arbitraryStaticCall
    return encodeArbitraryStaticCall(predicateContract, calldata);
}

/**
 * Creates an arbitrary static call predicate
 * @param target The contract address to call
 * @param calldata The calldata for the call
 * @returns Object with predicate bytes
 */
export function createArbitraryStaticCallPredicate(
    target: string,
    calldata: string
): { predicate: string } {
    return {
        predicate: encodeArbitraryStaticCall(target, calldata)
    };
}

/**
 * Creates a complete predicate for checking multiple API conditions
 * @param predicateContract Address of the DynamicAPIPredicate contract
 * @param predicateId The ID of the predicate configuration
 * @param conditions Array of API conditions with operators and thresholds
 * @param useAND Whether to use AND logic (true) or OR logic (false)
 */
export function createAPIConditionsPredicate(
    predicateContract: string,
    predicateId: string,
    conditions: Array<{
        operator: ">" | "<" | "=";
        threshold: string;
    }>,
    useAND: boolean
): string {
    // For MVP, we'll use a simplified approach
    // In production, each condition would have its own static call
    
    // Create a static call to check the predicate
    const staticCall = encodeAPIConditionCheck(predicateContract, predicateId);
    
    // For now, return a simple GT check that the contract returns 1 (true)
    // The contract will handle the actual API checking logic
    return encodeGt("0", staticCall); // Greater than 0 means true
}

/**
 * Example: Create a predicate for JPY hedging strategy
 * This would check:
 * 1. US Tariffs on Japanese cars > 15%
 * 2. JPY Inflation > 5%
 */
export function createJPYHedgingPredicate(
    predicateContract: string,
    predicateId: string
): string {
    // The actual API checking happens in the contract
    // This predicate just calls the contract to get the result
    const staticCall = encodeAPIConditionCheck(predicateContract, predicateId);
    return encodeGt("0", staticCall);
}