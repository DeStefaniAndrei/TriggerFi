// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@aave/core-v3/contracts/interfaces/IPoolDataProvider.sol";


// Andrei note: This contract has functions to fetch borrower or lender interest rates on chain,
// through the Aave IPoolDataProvider, and returns a boolean which compares it to the threshold


/**
 * @title AaveRatePredicate
 * @dev Predicate contract for checking Aave interest rate conditions
 * This contract is designed to be called via staticcall during 1inch limit order execution
 */
contract AaveRatePredicate {
    IPoolDataProvider public immutable poolDataProvider;
    
    constructor(address _poolDataProvider) {
        poolDataProvider = IPoolDataProvider(_poolDataProvider);
    }
    
    /**
     * @dev Check if Aave variable borrow rate meets the specified condition
     * @param asset The asset address to check the rate for
     * @param threshold The rate threshold to compare against (in ray format - 27 decimals)
     * @param isBelowThreshold If true, check if rate is below threshold; if false, check if above, so it's a flag, not the result of the calculation
     * @return bool True if the condition is met
     */
    function checkVariableBorrowRate(
        address asset,
        uint256 threshold,
        bool isBelowThreshold
    ) external view returns (bool) {
        // Get current variable borrow rate from Aave
        uint256 currentRate = getVariableBorrowRate(asset);
        
        if (isBelowThreshold) {
            return currentRate < threshold;
        } else {
            return currentRate > threshold;
        }
    }
    
    /**
     * @dev Check if Aave supply rate meets the specified condition
     * @param asset The asset address to check the rate for
     * @param threshold The rate threshold to compare against (in ray format - 27 decimals)
     * @param isBelowThreshold If true, check if rate is below threshold; if false, check if above
     * @return bool True if the condition is met
     */
    function checkSupplyRate(
        address asset,
        uint256 threshold,
        bool isBelowThreshold
    ) external view returns (bool) {
        // Get current supply rate from Aave
        uint256 currentRate = getSupplyRate(asset);
        
        if (isBelowThreshold) {
            return currentRate < threshold;
        } else {
            return currentRate > threshold;
        }
    }
    
    /**
     * @dev Get the current variable borrow rate for an asset
     * @param asset The asset address
     * @return uint256 The current variable borrow rate in ray format (27 decimals)
     */
    function getVariableBorrowRate(address asset) public view returns (uint256) {
        (
            uint256 configuration,
            uint256 liquidityIndex,
            uint256 variableBorrowIndex,
            uint256 currentLiquidityRate,
            uint256 currentVariableBorrowRate,
            uint256 currentStableBorrowRate,
            uint40 lastUpdateTimestamp
        ) = poolDataProvider.getReserveData(asset);
        
        return currentVariableBorrowRate;
    }
    
    /**
     * The supply rate is the interest rate given to the lenders, whilst the variable borrow rate is the rate paid by the borrowers
     * @dev Get the current supply rate for an asset
     * @param asset The asset address
     * @return uint256 The current supply rate in ray format (27 decimals)
     */
    function getSupplyRate(address asset) public view returns (uint256) {
        (
            uint256 configuration,
            uint256 liquidityIndex,
            uint256 variableBorrowIndex,
            uint256 currentLiquidityRate,
            uint256 currentVariableBorrowRate,
            uint256 currentStableBorrowRate,
            uint40 lastUpdateTimestamp
        ) = poolDataProvider.getReserveData(asset);
        
        return currentLiquidityRate;
    }
} 