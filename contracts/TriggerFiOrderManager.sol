// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./AaveRatePredicate.sol";
import "./AaveWithdrawInteraction.sol";

//For andrei: This contract is used to create, check, and execute orders.
//For now it has a minimum output amount for the swap, which I can then change to be dynamic
//uses the predicate contract to check the interest rate
//Can also check amount of tokens in aave
//Can also pause and unpause the contract

/**
 * @title TriggerFiOrderManager
 * @dev Main contract for managing yield-optimized limit orders
 * Handles order creation, validation, and execution coordination
 */
contract TriggerFiOrderManager is Ownable, ReentrancyGuard {
    AaveRatePredicate public immutable ratePredicate;
    AaveWithdrawInteraction public immutable withdrawInteraction;
    
    struct OrderConfig {
        address asset;           // Asset to monitor (e.g., USDC, WETH)
        uint256 threshold;       // Rate threshold in ray format (27 decimals)
        bool isBelowThreshold;   // Whether to trigger when rate is below/above threshold
        bool isVariableBorrow;   // Whether to monitor variable borrow rate (true) or supply rate (false)
        uint256 withdrawAmount;  // Amount to withdraw from Aave (0 = withdraw all)
        address targetToken;     // Token to swap to
        uint256 minOutputAmount; // Minimum output amount for the swap
    }
    
    event OrderCreated(
        address indexed user,
        bytes32 indexed orderHash,
        OrderConfig config
    );
    
    event OrderExecuted(
        bytes32 indexed orderHash,
        address indexed user,
        uint256 amountWithdrawn,
        uint256 amountSwapped
    );
    
    constructor(
        address _ratePredicate,
        address _withdrawInteraction
    ) {
        ratePredicate = AaveRatePredicate(_ratePredicate);
        withdrawInteraction = AaveWithdrawInteraction(_withdrawInteraction);
    }
    
    /**
     * @dev Create a new yield-optimized limit order
     * @param config The order configuration
     * @return bytes32 The order hash for tracking
     */
    function createOrder(OrderConfig calldata config) external returns (bytes32) {
        require(config.asset != address(0), "Invalid asset");
        require(config.targetToken != address(0), "Invalid target token");
        require(config.threshold > 0, "Invalid threshold");
        
        bytes32 orderHash = keccak256(abi.encodePacked(
            msg.sender,
            config.asset,
            config.threshold,
            config.isBelowThreshold,
            config.isVariableBorrow,
            config.withdrawAmount,
            config.targetToken,
            config.minOutputAmount,
            block.timestamp
        ));
        
        emit OrderCreated(msg.sender, orderHash, config);
        
        return orderHash;
    }
    
    /**
     * @dev Check if an order's conditions are met
     * @param config The order configuration
     * @return bool True if conditions are met
     */
    function checkOrderConditions(OrderConfig calldata config) external view returns (bool) {
        if (config.isVariableBorrow) {
            return ratePredicate.checkVariableBorrowRate(
                config.asset,
                config.threshold,
                config.isBelowThreshold
            );
        } else {
            return ratePredicate.checkSupplyRate(
                config.asset,
                config.threshold,
                config.isBelowThreshold
            );
        }
    }
    
    /**
     * @dev Get the current rate for an asset
     * @param asset The asset address
     * @param isVariableBorrow Whether to get variable borrow rate (true) or supply rate (false)
     * @return uint256 The current rate in ray format (27 decimals)
     */
    function getCurrentRate(address asset, bool isVariableBorrow) external view returns (uint256) {
        if (isVariableBorrow) {
            return ratePredicate.getVariableBorrowRate(asset);
        } else {
            return ratePredicate.getSupplyRate(asset);
        }
    }
    
    /**
     * @dev Get user's Aave balance for a specific asset
     * @param asset The asset address
     * @param user The user address
     * @return uint256 The current balance
     */
    function getAaveBalance(address asset, address user) external view returns (uint256) {
        return withdrawInteraction.getAaveBalance(asset, user);
    }
    
    /**
     * @dev Emergency function to pause contract (owner only)
     */
    function pause() external onlyOwner {
        // Implementation for pausing functionality
    }
    
    /**
     * @dev Emergency function to unpause contract (owner only)
     */
    function unpause() external onlyOwner {
        // Implementation for unpausing functionality
    }
} 