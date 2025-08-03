// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockJPYC
 * @notice Mock Japanese Yen Coin for demonstration purposes
 * @dev Simulates JPYC stablecoin with 1:1 JPY peg
 */
contract MockJPYC is ERC20, Ownable {
    uint8 private constant DECIMALS = 18;
    
    // Events
    event Minted(address indexed to, uint256 amount);
    event Burned(address indexed from, uint256 amount);
    
    constructor() ERC20("Mock JPY Coin", "mJPYC") Ownable(msg.sender) {
        // Mint initial supply to deployer for demo
        _mint(msg.sender, 1_000_000 * 10**DECIMALS); // 1M JPYC
        emit Minted(msg.sender, 1_000_000 * 10**DECIMALS);
    }
    
    /**
     * @notice Returns the number of decimals (18, same as ETH)
     */
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }
    
    /**
     * @notice Mint new tokens (only owner for demo)
     * @param to Address to mint to
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
        emit Minted(to, amount);
    }
    
    /**
     * @notice Burn tokens
     * @param amount Amount to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
        emit Burned(msg.sender, amount);
    }
    
    /**
     * @notice Get exchange rate (mock: 1 JPYC = 1 JPY)
     * @dev In production, this would connect to price oracles
     * @return rate The exchange rate with 6 decimals (e.g., 1000000 = 1.0)
     */
    function getExchangeRate() external pure returns (uint256 rate) {
        return 1_000_000; // 1 JPYC = 1 JPY
    }
    
    /**
     * @notice Demo function to simulate market conditions
     * @dev Returns mock data for JPY devaluation scenario
     * @return inflationRate Current inflation rate (mock: 5.2%)
     * @return tariffRate Current tariff rate (mock: 15.5%)
     */
    function getMarketConditions() external pure returns (
        uint256 inflationRate,
        uint256 tariffRate
    ) {
        // Mock data showing conditions that would trigger hedging
        inflationRate = 520; // 5.2% (basis points)
        tariffRate = 1550; // 15.5% (basis points)
    }
}