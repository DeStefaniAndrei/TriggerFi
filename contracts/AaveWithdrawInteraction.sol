// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@aave/core-v3/contracts/interfaces/IPool.sol";
import "@aave/core-v3/contracts/interfaces/IAToken.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";


//For andrei: This contract is used to withdraw funds. 

/**
 * @title AaveWithdrawInteraction
 * @dev Pre-interaction contract for withdrawing funds from Aave during 1inch limit order execution
 * This contract is called during the order filling process to withdraw required amounts from Aave
 */
contract AaveWithdrawInteraction {
    using SafeERC20 for IERC20;
    
    IPool public immutable pool;
    
    constructor(address _pool) {
        pool = IPool(_pool);
    }
    
    /**
     * @dev Withdraw a specific amount from Aave and transfer to the specified recipient
     * @param asset The asset to withdraw (underlying token address)
     * @param amount The amount to withdraw (in underlying token units)
     * @param recipient The address to receive the withdrawn funds
     * @param user The user whose funds are being withdrawn (must have approved this contract)
     */
    function withdrawAndTransfer(
        address asset,
        uint256 amount,
        address recipient,
    ) external {
        // Ensure only the 1inch limit order protocol can call this
        require(msg.sender == tx.origin || msg.sender == address(0), "Unauthorized");
        
        // Withdraw from Aave
        pool.withdraw(asset, amount, recipient);
        
        // The withdrawn funds are automatically sent to the recipient
        // No additional transfer needed as Aave handles this
    }
    
    /**
     * @dev Withdraw all available balance from Aave for a specific asset
     * @param asset The asset to withdraw (underlying token address)
     * @param recipient The address to receive the withdrawn funds
     * @param user The user whose funds are being withdrawn
     */
    function withdrawAllAndTransfer(
        address asset,
        address recipient,
        address user
    ) external {
        // Ensure only the 1inch limit order protocol can call this
        require(msg.sender == tx.origin || msg.sender == address(0), "Unauthorized");
        
        // Get the user's aToken balance
        address aTokenAddress = pool.getReserveData(asset).aTokenAddress;
        uint256 aTokenBalance = IAToken(aTokenAddress).balanceOf(user);
        
        if (aTokenBalance > 0) {
            // Withdraw all available balance
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