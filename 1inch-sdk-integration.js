"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fillOrder = exports.createDynamicOrder = exports.getOrderStatus = exports.cancelOrder = exports.checkOrderFillability = exports.getOrderHash = exports.signLimitOrder = exports.createLimitOrder = exports.getLimitOrderProtocolAddress = void 0;
var ethers_1 = require("ethers");
var predicate_encoder_1 = require("./predicate-encoder");
// 1inch Limit Order Protocol contract addresses (v4.3.2)
//For andrei: I'm probably just gonna use the sepolia and mainnet addresses for my project. But I could say in the presentation that my extension is available on all networks.
var LIMIT_ORDER_PROTOCOL_ADDRESSES = {
    1: "0x111111125421ca6dc452d289314280a0f8842a65",
    137: "0x111111125421ca6dc452d289314280a0f8842a65",
    10: "0x111111125421ca6dc452d289314280a0f8842a65",
    42161: "0x111111125421ca6dc452d289314280a0f8842a65",
    56: "0x111111125421ca6dc452d289314280a0f8842a65",
    43114: "0x111111125421ca6dc452d289314280a0f8842a65",
    250: "0x111111125421ca6dc452d289314280a0f8842a65",
    1313161554: "0x111111125421ca6dc452d289314280a0f8842a65",
    8453: "0x111111125421ca6dc452d289314280a0f8842a65",
    324: "0x6fd4383cb451173d5f9304f041c7bcbf27d561ff",
    11155111: "0x111111125421ca6dc452d289314280a0f8842a65", // Sepolia (testnet)
};
// Basic ABI for the 1inch Limit Order Protocol
var LIMIT_ORDER_PROTOCOL_ABI = [
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
function getLimitOrderProtocolAddress(chainId) {
    return LIMIT_ORDER_PROTOCOL_ADDRESSES[chainId] ||
        LIMIT_ORDER_PROTOCOL_ADDRESSES[1];
}
exports.getLimitOrderProtocolAddress = getLimitOrderProtocolAddress;
/**
 * Create a 1inch limit order with dynamic API predicate
 */
function createLimitOrder(orderConfig, makerAddress, receiverAddress, predicateData // Already encoded predicate from predicate-encoder.ts
) {
    var salt = ethers_1.ethers.randomBytes(32);
    return {
        salt: ethers_1.ethers.hexlify(salt),
        makerAsset: orderConfig.makerAsset,
        takerAsset: orderConfig.takerAsset,
        maker: makerAddress,
        receiver: receiverAddress,
        allowedSender: ethers_1.ethers.ZeroAddress,
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
exports.createLimitOrder = createLimitOrder;
/**
 * Sign a limit order using EIP-712
 */
function signLimitOrder(order, signer, chainId) {
    return __awaiter(this, void 0, void 0, function () {
        var domain, types, signature;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    domain = {
                        name: "1inch Limit Order Protocol",
                        version: "4",
                        chainId: chainId,
                        verifyingContract: getLimitOrderProtocolAddress(chainId)
                    };
                    types = {
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
                    return [4 /*yield*/, signer.signTypedData(domain, types, order)];
                case 1:
                    signature = _a.sent();
                    return [2 /*return*/, signature];
            }
        });
    });
}
exports.signLimitOrder = signLimitOrder;
/**
 * NOTE: Orders are submitted to Firebase, not on-chain
 * Use Firebase SDK to store signed orders off-chain
 * Takers will discover orders via Firebase API
 */
/**
 * Get order hash for tracking
 */
function getOrderHash(order) {
    var orderStruct = [
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
    return ethers_1.ethers.keccak256(ethers_1.ethers.AbiCoder.defaultAbiCoder().encode(["tuple(bytes32,address,address,address,address,address,uint256,uint256,bytes,bytes,bytes,bytes,bytes,bytes,bytes,bytes)"], [orderStruct]));
}
exports.getOrderHash = getOrderHash;
/**
 * Check if an order can be filled (predicate returns true)
 */
function checkOrderFillability(order, provider, chainId) {
    return __awaiter(this, void 0, void 0, function () {
        var protocolAddress, limitOrderProtocol, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    protocolAddress = getLimitOrderProtocolAddress(chainId);
                    limitOrderProtocol = new ethers_1.ethers.Contract(protocolAddress, LIMIT_ORDER_PROTOCOL_ABI, provider);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    // Try to simulate the fill order call
                    return [4 /*yield*/, limitOrderProtocol.fillOrder.staticCall([
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
                        ], "0x", "0x")];
                case 2:
                    // Try to simulate the fill order call
                    _a.sent();
                    return [2 /*return*/, true];
                case 3:
                    error_1 = _a.sent();
                    // If the call reverts, the order is not fillable
                    return [2 /*return*/, false];
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.checkOrderFillability = checkOrderFillability;
/**
 * Cancel an order
 */
function cancelOrder(order, signer, chainId) {
    return __awaiter(this, void 0, void 0, function () {
        var protocolAddress, limitOrderProtocol, orderHash, tx;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    protocolAddress = getLimitOrderProtocolAddress(chainId);
                    limitOrderProtocol = new ethers_1.ethers.Contract(protocolAddress, LIMIT_ORDER_PROTOCOL_ABI, signer);
                    orderHash = getOrderHash(order);
                    return [4 /*yield*/, limitOrderProtocol.cancelOrder(orderHash)];
                case 1:
                    tx = _a.sent();
                    return [2 /*return*/, tx];
            }
        });
    });
}
exports.cancelOrder = cancelOrder;
/**
 * Get order status
 */
function getOrderStatus(order, provider, chainId) {
    return __awaiter(this, void 0, void 0, function () {
        var protocolAddress, limitOrderProtocol, orderHash, remainingAmount, isFilled, isCancelled, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    protocolAddress = getLimitOrderProtocolAddress(chainId);
                    limitOrderProtocol = new ethers_1.ethers.Contract(protocolAddress, LIMIT_ORDER_PROTOCOL_ABI, provider);
                    orderHash = getOrderHash(order);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, limitOrderProtocol.remaining(orderHash)];
                case 2:
                    remainingAmount = _a.sent();
                    isFilled = remainingAmount === BigInt(0);
                    isCancelled = false;
                    return [2 /*return*/, {
                            isFilled: isFilled,
                            isCancelled: isCancelled,
                            remainingAmount: remainingAmount.toString()
                        }];
                case 3:
                    error_2 = _a.sent();
                    return [2 /*return*/, {
                            isFilled: false,
                            isCancelled: true,
                            remainingAmount: "0"
                        }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.getOrderStatus = getOrderStatus;
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
function createDynamicOrder(config) {
    return __awaiter(this, void 0, void 0, function () {
        var makerAsset, takerAsset, makingAmount, takingAmount, predicateContract, predicateId, predicateCalldata, predicate, order;
        return __generator(this, function (_a) {
            makerAsset = config.makerAsset, takerAsset = config.takerAsset, makingAmount = config.makingAmount, takingAmount = config.takingAmount, predicateContract = config.predicateContract, predicateId = config.predicateId;
            predicateCalldata = ethers_1.ethers.concat([
                "0x489a775a",
                predicateId
            ]);
            predicate = (0, predicate_encoder_1.createArbitraryStaticCallPredicate)(predicateContract, predicateCalldata).predicate;
            order = {
                salt: ethers_1.ethers.hexlify(ethers_1.ethers.randomBytes(32)),
                makerAsset: makerAsset,
                takerAsset: takerAsset,
                maker: "0x0000000000000000000000000000000000000000",
                receiver: "0x0000000000000000000000000000000000000000",
                allowedSender: "0x0000000000000000000000000000000000000000",
                makingAmount: makingAmount,
                takingAmount: takingAmount,
                offsets: "0x",
                interactions: "0x",
                predicate: predicate,
                permit: "0x",
                getMakingAmount: "0x",
                getTakingAmount: "0x",
                preInteraction: "0x",
                postInteraction: "0x"
            };
            // Return order data for signing
            return [2 /*return*/, {
                    order: order,
                    domain: {
                        name: "1inch Limit Order Protocol",
                        version: "4",
                        chainId: 1,
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
                }];
        });
    });
}
exports.createDynamicOrder = createDynamicOrder;
function fillOrder(order, signature, signer, chainId, predicateContract, predicateId, value) {
    return __awaiter(this, void 0, void 0, function () {
        var predicateAbi, predicateContractInstance, feesOwed, feeTx, protocolAddress, limitOrderProtocol, orderStruct, fillTx;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    predicateAbi = [
                        "function getUpdateFees(bytes32 predicateId) view returns (uint256)",
                        "function collectFees(bytes32 predicateId) payable"
                    ];
                    predicateContractInstance = new ethers_1.ethers.Contract(predicateContract, predicateAbi, signer);
                    return [4 /*yield*/, predicateContractInstance.getUpdateFees(predicateId)];
                case 1:
                    feesOwed = _a.sent();
                    return [4 /*yield*/, predicateContractInstance.collectFees(predicateId, {
                            value: feesOwed
                        })];
                case 2:
                    feeTx = _a.sent();
                    // Wait for fee payment to confirm
                    return [4 /*yield*/, feeTx.wait()];
                case 3:
                    // Wait for fee payment to confirm
                    _a.sent();
                    protocolAddress = getLimitOrderProtocolAddress(chainId);
                    limitOrderProtocol = new ethers_1.ethers.Contract(protocolAddress, LIMIT_ORDER_PROTOCOL_ABI, signer);
                    orderStruct = [
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
                    return [4 /*yield*/, limitOrderProtocol.fillOrder(orderStruct, signature, "0x", {
                            value: value || "0"
                        })];
                case 4:
                    fillTx = _a.sent();
                    return [2 /*return*/, { feeTx: feeTx, fillTx: fillTx }];
            }
        });
    });
}
exports.fillOrder = fillOrder;
