// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@aave/core-v3/contracts/interfaces/IPool.sol";
import "@aave/core-v3/contracts/interfaces/IAToken.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";


//For andrei: This contract is used to withdraw funds. 

/**
 * @title AaveWithdrawInteraction
 * @dev Pre-interaction contract for withdrawing funds from Aave during 1inch limit order execution
 * This contract is called during the order filling process to withdraw required amounts from Aave
 *
 * Note: You do NOT need a Chainlink subscription to use price feeds. Subscriptions are only needed for VRF/Functions.
 */
contract AaveWithdrawInteraction {
    using SafeERC20 for IERC20;
    
    IPool public immutable pool;
    
    constructor(address _pool) {
        pool = IPool(_pool);
    }

    /**
     * @dev Withdraw a specific amount from Aave and transfer to the specified recipient
     * Requires user to have approved their aTokens to this contract
     * @param asset The asset to withdraw (underlying token address)
     * @param amount The amount to withdraw (in underlying token units)
     * @param recipient The address to receive the withdrawn funds
     * @param user The user whose aTokens are being used (must have approved this contract)
     * @param priceFeed The Chainlink price feed address (e.g., ETH/USD)
     * @param minPrice The minimum price (in feed decimals) required to allow withdrawal (set to 0 to skip check)
     */
    function withdrawAndTransfer(
        address asset,
        uint256 amount,
        address recipient,
        address user,
        address priceFeed,
        int256 minPrice
    ) external {
        // Optionally check price condition
        if (priceFeed != address(0) && minPrice > 0) {
            int256 price = getLatestPrice(priceFeed);
            require(price >= minPrice, "Price below minimum");
        }
        
        // Get the aToken address
        address aTokenAddress = pool.getReserveData(asset).aTokenAddress;
        
        // Transfer aTokens from user to this contract
        // The user must have approved this contract to spend their aTokens
        IERC20(aTokenAddress).safeTransferFrom(user, address(this), amount);
        
        // Now withdraw the underlying asset from Aave to the recipient
        // This burns the aTokens we just received and sends underlying to recipient
        pool.withdraw(asset, amount, recipient);
    }

    /**
     * @dev Get the latest price from a Chainlink price feed
     * @param priceFeed The Chainlink price feed address
     * @return int256 The latest price (in feed decimals)
     */
    function getLatestPrice(address priceFeed) public view returns (int256) {
        AggregatorV3Interface feed = AggregatorV3Interface(priceFeed);
        (
            ,
            int256 price,
            ,
            ,
        ) = feed.latestRoundData();
        return price;
    }
    
    /**
     * @dev Withdraw all available balance from Aave for a specific asset
     * Requires user to have approved their aTokens to this contract
     * @param asset The asset to withdraw (underlying token address)
     * @param recipient The address to receive the withdrawn funds
     * @param user The user whose aTokens are being used
     */
    function withdrawAllAndTransfer(
        address asset,
        address recipient,
        address user
    ) external {
        // Get the user's aToken balance
        address aTokenAddress = pool.getReserveData(asset).aTokenAddress;
        uint256 aTokenBalance = IERC20(aTokenAddress).balanceOf(user);
        
        if (aTokenBalance > 0) {
            // Transfer all aTokens from user to this contract
            IERC20(aTokenAddress).safeTransferFrom(user, address(this), aTokenBalance);
            
            // Withdraw all available balance to recipient
            // Using type(uint256).max will withdraw all aTokens we hold
            pool.withdraw(asset, type(uint256).max, recipient);
        }
    }
    
    /**
     * @dev Get the current balance of a user for a specific asset in Aave
     * @param asset The asset address
     * @param user The user address
     * @return uint256 The current balance in underlying token units
     */
    function getAaveBalance(address asset, address user) external view returns (uint256) {
        address aTokenAddress = pool.getReserveData(asset).aTokenAddress;
        return IAToken(aTokenAddress).balanceOf(user);
    }
    
    /**
     * @dev Get the aToken address for a given asset
     * @param asset The underlying asset address
     * @return address The corresponding aToken address
     */
    function getATokenAddress(address asset) external view returns (address) {
        return pool.getReserveData(asset).aTokenAddress;
    }
} 