"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createJPYHedgingPredicate = exports.createAPIConditionsPredicate = exports.createArbitraryStaticCallPredicate = exports.encodeAPIConditionCheck = exports.encodeArbitraryStaticCall = exports.encodeAnd = exports.encodeOr = exports.encodeEq = exports.encodeLt = exports.encodeGt = void 0;
var ethers_1 = require("ethers");
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
function encodeGt(threshold, staticCall) {
    var selector = (0, ethers_1.id)("gt(uint256,bytes)").slice(0, 10); // 4-byte selector
    var params = ethers_1.AbiCoder.defaultAbiCoder().encode(["uint256", "bytes"], [threshold, staticCall]);
    // NOTE: Following mentor's example - strip 0x prefix from params
    return (0, ethers_1.concat)([selector, (0, ethers_1.dataSlice)(params, 2)]);
}
exports.encodeGt = encodeGt;
/**
 * Encodes a less than comparison predicate
 * @param threshold The value to compare against
 * @param staticCall The encoded static call to get the value
 */
function encodeLt(threshold, staticCall) {
    var selector = (0, ethers_1.id)("lt(uint256,bytes)").slice(0, 10);
    var params = ethers_1.AbiCoder.defaultAbiCoder().encode(["uint256", "bytes"], [threshold, staticCall]);
    // NOTE: Following mentor's example - strip 0x prefix from params
    return (0, ethers_1.concat)([selector, (0, ethers_1.dataSlice)(params, 2)]);
}
exports.encodeLt = encodeLt;
/**
 * Encodes an equality comparison predicate
 * @param value The value to compare against
 * @param staticCall The encoded static call to get the value
 */
function encodeEq(value, staticCall) {
    var selector = (0, ethers_1.id)("eq(uint256,bytes)").slice(0, 10);
    var params = ethers_1.AbiCoder.defaultAbiCoder().encode(["uint256", "bytes"], [value, staticCall]);
    // NOTE: Following mentor's example - strip 0x prefix from params
    return (0, ethers_1.concat)([selector, (0, ethers_1.dataSlice)(params, 2)]);
}
exports.encodeEq = encodeEq;
/**
 * Encodes an OR predicate that returns true if any condition is true
 * @param conditions Array of encoded predicate conditions
 */
function encodeOr(conditions) {
    var currentOffset = 0n;
    var packedOffsets = 0n;
    for (var i = 0; i < conditions.length; i++) {
        currentOffset += BigInt((0, ethers_1.getBytes)(conditions[i]).length);
        packedOffsets |= (currentOffset << BigInt(32 * i));
    }
    var dataBlob = (0, ethers_1.concat)(conditions);
    var selector = (0, ethers_1.id)("or(uint256,bytes)").slice(0, 10);
    var params = ethers_1.AbiCoder.defaultAbiCoder().encode(["uint256", "bytes"], [packedOffsets, dataBlob]);
    // NOTE: Following mentor's example - strip 0x prefix from params
    return (0, ethers_1.concat)([selector, (0, ethers_1.dataSlice)(params, 2)]);
}
exports.encodeOr = encodeOr;
/**
 * Encodes an AND predicate that returns true only if all conditions are true
 * @param conditions Array of encoded predicate conditions
 */
function encodeAnd(conditions) {
    var currentOffset = 0n;
    var packedOffsets = 0n;
    for (var i = 0; i < conditions.length; i++) {
        currentOffset += BigInt((0, ethers_1.getBytes)(conditions[i]).length);
        packedOffsets |= (currentOffset << BigInt(32 * i));
    }
    var dataBlob = (0, ethers_1.concat)(conditions);
    var selector = (0, ethers_1.id)("and(uint256,bytes)").slice(0, 10);
    var params = ethers_1.AbiCoder.defaultAbiCoder().encode(["uint256", "bytes"], [packedOffsets, dataBlob]);
    // NOTE: Following mentor's example - strip 0x prefix from params
    return (0, ethers_1.concat)([selector, (0, ethers_1.dataSlice)(params, 2)]);
}
exports.encodeAnd = encodeAnd;
/**
 * Encodes an arbitrary static call to any contract
 * @param target The contract address to call
 * @param calldata The calldata for the call
 */
function encodeArbitraryStaticCall(target, calldata) {
    var selector = (0, ethers_1.id)("arbitraryStaticCall(address,bytes)").slice(0, 10);
    var params = ethers_1.AbiCoder.defaultAbiCoder().encode(["address", "bytes"], [target, calldata]);
    // NOTE: Following mentor's example - strip 0x prefix from params
    return (0, ethers_1.concat)([selector, (0, ethers_1.dataSlice)(params, 2)]);
}
exports.encodeArbitraryStaticCall = encodeArbitraryStaticCall;
/**
 * Encodes a call to check API conditions on our DynamicAPIPredicate contract
 * @param predicateContract Address of the DynamicAPIPredicate contract
 * @param predicateId The ID of the predicate configuration
 */
function encodeAPIConditionCheck(predicateContract, predicateId) {
    // Encode the function selector for checkCondition(bytes32)
    var functionSelector = (0, ethers_1.id)("checkCondition(bytes32)").slice(0, 10);
    var params = ethers_1.AbiCoder.defaultAbiCoder().encode(["bytes32"], [predicateId]);
    var calldata = (0, ethers_1.concat)([functionSelector, params]);
    // Wrap in arbitraryStaticCall
    return encodeArbitraryStaticCall(predicateContract, calldata);
}
exports.encodeAPIConditionCheck = encodeAPIConditionCheck;
/**
 * Creates an arbitrary static call predicate
 * @param target The contract address to call
 * @param calldata The calldata for the call
 * @returns Object with predicate bytes
 */
function createArbitraryStaticCallPredicate(target, calldata) {
    return {
        predicate: encodeArbitraryStaticCall(target, calldata)
    };
}
exports.createArbitraryStaticCallPredicate = createArbitraryStaticCallPredicate;
/**
 * Creates a complete predicate for checking multiple API conditions
 * @param predicateContract Address of the DynamicAPIPredicate contract
 * @param predicateId The ID of the predicate configuration
 * @param conditions Array of API conditions with operators and thresholds
 * @param useAND Whether to use AND logic (true) or OR logic (false)
 */
function createAPIConditionsPredicate(predicateContract, predicateId, conditions, useAND) {
    // For MVP, we'll use a simplified approach
    // In production, each condition would have its own static call
    // Create a static call to check the predicate
    var staticCall = encodeAPIConditionCheck(predicateContract, predicateId);
    // For now, return a simple GT check that the contract returns 1 (true)
    // The contract will handle the actual API checking logic
    return encodeGt("0", staticCall); // Greater than 0 means true
}
exports.createAPIConditionsPredicate = createAPIConditionsPredicate;
/**
 * Example: Create a predicate for JPY hedging strategy
 * This would check:
 * 1. US Tariffs on Japanese cars > 15%
 * 2. JPY Inflation > 5%
 */
function createJPYHedgingPredicate(predicateContract, predicateId) {
    // The actual API checking happens in the contract
    // This predicate just calls the contract to get the result
    var staticCall = encodeAPIConditionCheck(predicateContract, predicateId);
    return encodeGt("0", staticCall);
}
exports.createJPYHedgingPredicate = createJPYHedgingPredicate;
