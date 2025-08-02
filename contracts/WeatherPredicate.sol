// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title WeatherPredicate
 * @dev Predicate contract for checking weather conditions via Chainlink oracles
 * This contract enables weather-based triggers for agricultural hedging and insurance use cases
 * 
 * Example use case: When temperature drops below 32°F (frost), automatically buy crop insurance tokens
 */
contract WeatherPredicate {
    
    // Chainlink Functions consumer address (to be set after deployment)
    address public chainlinkFunctionsConsumer;
    
    // Owner who can update the Chainlink consumer
    address public owner;
    
    // Mapping to store cached weather data
    mapping(bytes32 => int256) public weatherCache;
    mapping(bytes32 => uint256) public lastUpdateTime;
    
    // Cache duration (1 hour)
    uint256 public constant CACHE_DURATION = 3600;
    
    constructor() {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    /**
     * @dev Set the Chainlink Functions consumer address
     * @param _consumer The address of the deployed Chainlink Functions consumer
     */
    function setChainlinkConsumer(address _consumer) external onlyOwner {
        chainlinkFunctionsConsumer = _consumer;
    }
    
    /**
     * @dev Check if temperature meets the specified condition
     * @param location The location to check (e.g., "Miami,FL" or "40.7128,-74.0060")
     * @param temperatureThreshold The temperature threshold in Celsius * 10 (e.g., 0°C = 0, 32°F = 0°C)
     * @param isBelow If true, check if temperature is below threshold; if false, check if above
     * @return bool True if the condition is met
     */
    function checkTemperature(
        string calldata location,
        int256 temperatureThreshold,
        bool isBelow
    ) external view returns (bool) {
        // Create a unique key for this location
        bytes32 locationKey = keccak256(abi.encodePacked(location));
        
        // Check if we have cached data that's still fresh
        if (lastUpdateTime[locationKey] + CACHE_DURATION > block.timestamp) {
            int256 currentTemp = weatherCache[locationKey];
            
            if (isBelow) {
                return currentTemp < temperatureThreshold;
            } else {
                return currentTemp > temperatureThreshold;
            }
        }
        
        // If no fresh cache, return false (requires update via Chainlink Functions)
        // In production, this would trigger a Chainlink Functions request
        return false;
    }
    
    /**
     * @dev Update weather data (called by Chainlink Functions consumer)
     * @param location The location string
     * @param temperature The current temperature
     */
    function updateWeatherData(
        string calldata location,
        int256 temperature
    ) external {
        require(msg.sender == chainlinkFunctionsConsumer, "Only Chainlink consumer");
        
        bytes32 locationKey = keccak256(abi.encodePacked(location));
        weatherCache[locationKey] = temperature;
        lastUpdateTime[locationKey] = block.timestamp;
    }
    
    /**
     * @dev Check multiple weather conditions (for complex strategies)
     * @param locations Array of locations
     * @param thresholds Array of temperature thresholds
     * @param comparisons Array of comparison types (true = below, false = above)
     * @return bool True if ALL conditions are met
     */
    function checkMultipleConditions(
        string[] calldata locations,
        int256[] calldata thresholds,
        bool[] calldata comparisons
    ) external view returns (bool) {
        require(
            locations.length == thresholds.length && 
            locations.length == comparisons.length,
            "Array length mismatch"
        );
        
        for (uint256 i = 0; i < locations.length; i++) {
            if (!this.checkTemperature(locations[i], thresholds[i], comparisons[i])) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * @dev Encode parameters for 1inch predicate
     * This creates the calldata that 1inch will use to check conditions
     */
    function encodeTemperatureCheck(
        string calldata location,
        int256 threshold,
        bool isBelow
    ) external pure returns (bytes memory) {
        return abi.encodeWithSelector(
            this.checkTemperature.selector,
            location,
            threshold,
            isBelow
        );
    }
}