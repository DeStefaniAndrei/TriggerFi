// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IAmountGetter
 * @notice Interface for dynamic amount calculation in 1inch limit orders
 */
interface IAmountGetter {
    /**
     * @notice Calculate making amount based on taking amount
     * @param order The limit order
     * @param extension Order extension data
     * @param orderHash Hash of the order
     * @param taker Address taking the order
     * @param takingAmount Amount being taken
     * @param remainingMakingAmount Remaining amount to be made
     * @param extraData Additional data for calculation
     * @return makingAmount Amount to make
     */
    function getMakingAmount(
        IOrderMixin.Order calldata order,
        bytes calldata extension,
        bytes32 orderHash,
        address taker,
        uint256 takingAmount,
        uint256 remainingMakingAmount,
        bytes calldata extraData
    ) external view returns (uint256 makingAmount);

    /**
     * @notice Calculate taking amount based on making amount
     * @param order The limit order
     * @param extension Order extension data
     * @param orderHash Hash of the order
     * @param taker Address taking the order
     * @param makingAmount Amount being made
     * @param remainingTakingAmount Remaining amount to be taken
     * @param extraData Additional data for calculation
     * @return takingAmount Amount to take
     */
    function getTakingAmount(
        IOrderMixin.Order calldata order,
        bytes calldata extension,
        bytes32 orderHash,
        address taker,
        uint256 makingAmount,
        uint256 remainingTakingAmount,
        bytes calldata extraData
    ) external view returns (uint256 takingAmount);
}

/**
 * @dev Minimal interface for 1inch order structure
 */
interface IOrderMixin {
    struct Order {
        uint256 salt;
        address maker;
        address receiver;
        address makerAsset;
        address takerAsset;
        uint256 makingAmount;
        uint256 takingAmount;
        uint256 makerTraits;
    }
}