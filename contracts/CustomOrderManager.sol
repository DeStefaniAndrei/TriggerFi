// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./AaveRatePredicate.sol";

//Creates, stores and manages orders on-chain

interface I1inchLimitOrderProtocol {
    function fillOrder(
        //order is the 1inch order struct
        bytes calldata order,
        bytes calldata signature,
        uint256 makingAmount,
        uint256 takingAmount,
        //thresholdAmount is the minimum return of the token. I can set this to be dynamic.
        uint256 thresholdAmount,
        address target,
        bytes calldata interaction
    ) external payable returns (uint256, uint256);
}

contract CustomOrderManager is Ownable, ReentrancyGuard {
    struct Order {
        address user;
        address asset;
        uint256 threshold;
        bool isBelowThreshold;
        bool isVariableBorrow;
        address ratePredicate;
        address oneInchProtocol;
        bytes orderData; // Encoded 1inch order struct
        bytes signature; // EIP-712 signature
        bool filled;
    }

    mapping(bytes32 => Order) public orders;
    event OrderCreated(bytes32 indexed orderHash, address indexed user, Order order);
    event OrderFilled(bytes32 indexed orderHash, address indexed filler);

    function createOrder(
        address asset,
        uint256 threshold,
        bool isBelowThreshold,
        bool isVariableBorrow,
        address ratePredicate,
        address oneInchProtocol,
        bytes calldata orderData,
        bytes calldata signature
    ) external returns (bytes32) {
        bytes32 orderHash = keccak256(abi.encodePacked(
            msg.sender,
            asset,
            threshold,
            isBelowThreshold,
            isVariableBorrow,
            ratePredicate,
            oneInchProtocol,
            orderData,
            signature,
            block.timestamp
        ));
        require(orders[orderHash].user == address(0), "Order already exists");
        orders[orderHash] = Order({
            user: msg.sender,
            asset: asset,
            threshold: threshold,
            isBelowThreshold: isBelowThreshold,
            isVariableBorrow: isVariableBorrow,
            ratePredicate: ratePredicate,
            oneInchProtocol: oneInchProtocol,
            orderData: orderData,
            signature: signature,
            filled: false
        });
        emit OrderCreated(orderHash, msg.sender, orders[orderHash]);
        return orderHash;
    }

    function fillOrder(bytes32 orderHash, uint256 makingAmount, uint256 takingAmount, uint256 thresholdAmount, address target, bytes calldata interaction) external nonReentrant {
        Order storage order = orders[orderHash];
        require(order.user != address(0), "Order does not exist");
        require(!order.filled, "Order already filled");
        // Check predicate (Aave rate)
        bool predicateOk;
        if (order.isVariableBorrow) {
            predicateOk = AaveRatePredicate(order.ratePredicate).checkVariableBorrowRate(
                order.asset,
                order.threshold,
                order.isBelowThreshold
            );
        } else {
            predicateOk = AaveRatePredicate(order.ratePredicate).checkSupplyRate(
                order.asset,
                order.threshold,
                order.isBelowThreshold
            );
        }
        require(predicateOk, "Predicate not satisfied");
        // Call 1inch Limit Order Protocol contract
        (uint256 actualMaking, uint256 actualTaking) = I1inchLimitOrderProtocol(order.oneInchProtocol).fillOrder(
            order.orderData,
            order.signature,
            //makingAmount and takingAmount are the actual amounts of the tokens that are being swapped
            makingAmount,
            takingAmount,
            thresholdAmount,
            target,
            interaction
        );
        order.filled = true;
        emit OrderFilled(orderHash, msg.sender);
    }

    function getOrder(bytes32 orderHash) external view returns (Order memory) {
        return orders[orderHash];
    }
} 