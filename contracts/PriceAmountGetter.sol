// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IAmountGetter.sol";

/**
 * @title PriceAmountGetter
 * @notice Calculates dynamic amounts based on price feeds
 * @dev Used for creating limit orders with dynamic pricing
 */
contract PriceAmountGetter is IAmountGetter {
    /**
     * @notice Calculates making amount based on taking amount and price
     * @param takingAmount Amount of tokens to take
     * @param price Price with priceDecimals precision (e.g., 3500 * 10^6 for $3500 with 6 decimals)
     * @param priceDecimals Number of decimals in the price
     * @param makingDecimals Number of decimals in the making token
     * @return makingAmount Amount of tokens to make
     */
    function getMakingAmount(
        uint256 takingAmount,
        uint256 price,
        uint8 priceDecimals,
        uint8 makingDecimals
    ) external pure returns (uint256 makingAmount) {
        // makingAmount = takingAmount / price
        // Adjust for decimals
        makingAmount = (takingAmount * 10**makingDecimals) / (price * 10**(18 - priceDecimals));
    }

    /**
     * @notice Calculates taking amount based on making amount and price
     * @param makingAmount Amount of tokens to make
     * @param price Price with priceDecimals precision
     * @param priceDecimals Number of decimals in the price
     * @param makingDecimals Number of decimals in the making token
     * @param takingDecimals Number of decimals in the taking token
     * @return takingAmount Amount of tokens to take
     */
    function getTakingAmount(
        uint256 makingAmount,
        uint256 price,
        uint8 priceDecimals,
        uint8 makingDecimals,
        uint8 takingDecimals
    ) external pure returns (uint256 takingAmount) {
        // takingAmount = makingAmount * price
        // Adjust for decimals
        takingAmount = (makingAmount * price * 10**(takingDecimals - priceDecimals)) / 10**makingDecimals;
    }
    
    /**
     * @notice 1inch protocol compatible getter
     * @param order The limit order
     * @param extension Order extension data
     * @param orderHash Hash of the order
     * @param taker Address taking the order
     * @param takingAmount Amount being taken
     * @param remainingMakingAmount Remaining amount to be made
     * @param extraData Encoded price data
     * @return Amount to make based on dynamic price
     */
    function getMakingAmount(
        IOrderMixin.Order calldata order,
        bytes calldata extension,
        bytes32 orderHash,
        address taker,
        uint256 takingAmount,
        uint256 remainingMakingAmount,
        bytes calldata extraData
    ) external view override returns (uint256) {
        (uint256 price, uint8 priceDecimals, uint8 makingDecimals) = abi.decode(
            extraData,
            (uint256, uint8, uint8)
        );
        
        return this.getMakingAmount(takingAmount, price, priceDecimals, makingDecimals);
    }

    /**
     * @notice 1inch protocol compatible getter
     * @param order The limit order
     * @param extension Order extension data
     * @param orderHash Hash of the order
     * @param taker Address taking the order
     * @param makingAmount Amount being made
     * @param remainingTakingAmount Remaining amount to be taken
     * @param extraData Encoded price data
     * @return Amount to take based on dynamic price
     */
    function getTakingAmount(
        IOrderMixin.Order calldata order,
        bytes calldata extension,
        bytes32 orderHash,
        address taker,
        uint256 makingAmount,
        uint256 remainingTakingAmount,
        bytes calldata extraData
    ) external view override returns (uint256) {
        (uint256 price, uint8 priceDecimals, uint8 makingDecimals, uint8 takingDecimals) = abi.decode(
            extraData,
            (uint256, uint8, uint8, uint8)
        );
        
        return this.getTakingAmount(makingAmount, price, priceDecimals, makingDecimals, takingDecimals);
    }
}