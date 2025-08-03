// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title DynamicAmountGetter
 * @notice Calculates dynamic order amounts with spread based on gas costs and keeper fees
 * @dev Implements 1inch IAmountGetter interface for dynamic pricing
 */
contract DynamicAmountGetter {
    using Math for uint256;

    // Constants
    uint256 private constant SPREAD_DENOMINATOR = 10000; // Basis points
    uint256 private constant USD_DECIMALS = 8; // Chainlink USD feeds use 8 decimals
    uint256 private constant SAFETY_BUFFER_BPS = 2000; // 20% safety buffer
    
    // Gas estimates
    uint256 private constant GAS_FILL_ORDER = 300000;
    uint256 private constant GAS_PREDICATE_FILL = 100000;
    uint256 private constant GAS_PREDICATE_CHECK = 100000;
    uint256 private constant GAS_PRICE_GWEI = 30; // Hardcoded gas price
    
    // Keeper fee
    uint256 private constant KEEPER_FEE_USD = 2 * 10**USD_DECIMALS; // $2 in 8 decimals
    
    // Token indices for price feed mapping
    uint256 public constant TOKEN_ETH = 0;
    uint256 public constant TOKEN_BTC = 1;
    uint256 public constant TOKEN_JPY = 2;
    uint256 public constant TOKEN_USDC = 3;
    
    // Price feed addresses (Sepolia)
    mapping(uint256 => AggregatorV3Interface) public priceFeeds;
    
    // Reference to DynamicAPIPredicate contract
    address public immutable dynamicAPIPredicate;
    
    // Errors
    error StalePrice();
    error InvalidToken();
    error InvalidPredicate();
    
    constructor(address _dynamicAPIPredicate) {
        dynamicAPIPredicate = _dynamicAPIPredicate;
        
        // Initialize price feeds for Sepolia
        // ETH/USD
        priceFeeds[TOKEN_ETH] = AggregatorV3Interface(0x694AA1769357215DE4FAC081bf1f309aDC325306);
        // BTC/USD  
        priceFeeds[TOKEN_BTC] = AggregatorV3Interface(0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43);
        // JPY/USD
        priceFeeds[TOKEN_JPY] = AggregatorV3Interface(0x8A6af2B75F23831ADc973ce6288e5329F63D86c6);
        // USDC/USD - Assuming 1:1 peg, using a constant value
        // Note: In production, use actual USDC/USD feed if available
    }
    
    /**
     * @notice Get the latest price from Chainlink oracle
     * @param tokenIndex The token index to get price for
     * @return price The latest price in USD with 8 decimals
     */
    function getLatestPrice(uint256 tokenIndex) public view returns (uint256 price) {
        if (tokenIndex == TOKEN_USDC) {
            // USDC is pegged 1:1 with USD
            return 1 * 10**USD_DECIMALS;
        }
        
        AggregatorV3Interface priceFeed = priceFeeds[tokenIndex];
        if (address(priceFeed) == address(0)) revert InvalidToken();
        
        (
            /* uint80 roundId */,
            int256 answer,
            /* uint256 startedAt */,
            uint256 updatedAt,
            /* uint80 answeredInRound */
        ) = priceFeed.latestRoundData();
        
        // Check for stale price (older than 48 hours for hackathon)
        // Note: In production, use stricter staleness checks (e.g., 1 hour)
        // Sepolia feeds update less frequently, so we allow 48 hours
        if (block.timestamp - updatedAt > 172800) revert StalePrice();
        
        return uint256(answer);
    }
    
    /**
     * @notice Calculate total costs in USD
     * @param updateCount Number of times the predicate has been updated
     * @return totalCostUSD Total cost in USD with 8 decimals
     */
    function calculateTotalCostUSD(uint256 updateCount) public pure returns (uint256) {
        // Gas costs in ETH
        uint256 totalGasUnits = GAS_FILL_ORDER + GAS_PREDICATE_FILL + (updateCount * GAS_PREDICATE_CHECK);
        uint256 gasInWei = totalGasUnits * GAS_PRICE_GWEI * 1e9;
        
        // We'll convert ETH to USD in the calling function
        // For now, return gas cost in wei
        return gasInWei;
    }
    
    /**
     * @notice IAmountGetter implementation - calculates making amount
     * @dev Called by 1inch protocol to determine actual making amount
     */
    function getMakingAmount(
        /* Order calldata order */
        bytes calldata, /* order - not used, passed for interface compliance */
        bytes calldata, /* extension - not used */
        bytes32, /* orderHash - not used */
        address, /* taker - not used */
        uint256 takingAmount,
        uint256, /* remainingMakingAmount - not used */
        bytes calldata extraData
    ) external view returns (uint256) {
        // Decode extra data: [predicateId][makerTokenIndex][takerTokenIndex]
        (bytes32 predicateId, uint256 makerTokenIndex, uint256 takerTokenIndex) = 
            abi.decode(extraData, (bytes32, uint256, uint256));
        
        // Get update count from DynamicAPIPredicate
        uint256 updateCount = IDynamicAPIPredicate(dynamicAPIPredicate).updateCount(predicateId);
        
        // Calculate gas costs in wei
        uint256 gasCostWei = calculateTotalCostUSD(updateCount);
        
        // Get ETH price to convert gas costs to USD
        uint256 ethPriceUSD = getLatestPrice(TOKEN_ETH);
        uint256 gasCostUSD = (gasCostWei * ethPriceUSD) / 1e18; // Convert wei to ETH then to USD
        
        // Add keeper fees
        uint256 keeperCostUSD = updateCount * KEEPER_FEE_USD;
        uint256 totalCostUSD = gasCostUSD + keeperCostUSD;
        
        // Add safety buffer
        totalCostUSD = (totalCostUSD * (SPREAD_DENOMINATOR + SAFETY_BUFFER_BPS)) / SPREAD_DENOMINATOR;
        
        // Get maker token price
        uint256 makerPriceUSD = getLatestPrice(makerTokenIndex);
        
        // Calculate how much maker tokens needed to cover costs
        // totalCostUSD has 8 decimals, makerPriceUSD has 8 decimals
        // Result should be in maker token decimals (assuming 18)
        uint256 costInMakerTokens = (totalCostUSD * 1e18) / makerPriceUSD;
        
        // Calculate making amount after deducting costs
        // This assumes takingAmount can cover the costs
        uint256 takerPriceUSD = getLatestPrice(takerTokenIndex);
        uint256 takingAmountUSD = (takingAmount * takerPriceUSD) / 1e18;
        
        // Making amount in USD
        uint256 makingAmountUSD = takingAmountUSD - totalCostUSD;
        
        // Convert to maker tokens
        uint256 makingAmount = (makingAmountUSD * 1e18) / makerPriceUSD;
        
        return makingAmount;
    }
    
    /**
     * @notice IAmountGetter implementation - calculates taking amount
     * @dev Called by 1inch protocol to determine actual taking amount
     */
    function getTakingAmount(
        /* Order calldata order */
        bytes calldata, /* order - not used */
        bytes calldata, /* extension - not used */
        bytes32, /* orderHash - not used */
        address, /* taker - not used */
        uint256 makingAmount,
        uint256, /* remainingMakingAmount - not used */
        bytes calldata extraData
    ) external view returns (uint256) {
        // Decode extra data
        (bytes32 predicateId, uint256 makerTokenIndex, uint256 takerTokenIndex) = 
            abi.decode(extraData, (bytes32, uint256, uint256));
        
        // Get update count
        uint256 updateCount = IDynamicAPIPredicate(dynamicAPIPredicate).updateCount(predicateId);
        
        // Calculate costs
        uint256 gasCostWei = calculateTotalCostUSD(updateCount);
        uint256 ethPriceUSD = getLatestPrice(TOKEN_ETH);
        uint256 gasCostUSD = (gasCostWei * ethPriceUSD) / 1e18;
        uint256 keeperCostUSD = updateCount * KEEPER_FEE_USD;
        uint256 totalCostUSD = gasCostUSD + keeperCostUSD;
        
        // Add safety buffer
        totalCostUSD = (totalCostUSD * (SPREAD_DENOMINATOR + SAFETY_BUFFER_BPS)) / SPREAD_DENOMINATOR;
        
        // Get token prices
        uint256 makerPriceUSD = getLatestPrice(makerTokenIndex);
        uint256 takerPriceUSD = getLatestPrice(takerTokenIndex);
        
        // Calculate making amount in USD
        uint256 makingAmountUSD = (makingAmount * makerPriceUSD) / 1e18;
        
        // Taking amount needs to cover making amount + costs
        uint256 takingAmountUSD = makingAmountUSD + totalCostUSD;
        
        // Convert to taker tokens
        uint256 takingAmount = (takingAmountUSD * 1e18) / takerPriceUSD;
        
        return takingAmount;
    }
}

// Interface for DynamicAPIPredicate
interface IDynamicAPIPredicate {
    function updateCount(bytes32 predicateId) external view returns (uint256);
}