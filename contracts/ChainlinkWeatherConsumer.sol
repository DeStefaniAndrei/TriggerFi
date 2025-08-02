// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/dev/v1_0_0/FunctionsClient.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/dev/v1_0_0/libraries/FunctionsRequest.sol";

/**
 * @title ChainlinkWeatherConsumer
 * @dev Fetches real-world weather data using Chainlink Functions
 * This contract can call any weather API and return verified data on-chain
 */

 //For andrei: This contract inherits from the FunctionsClient contract, which is a contract that allows you to make requests to the Chainlink Functions.
contract ChainlinkWeatherConsumer is FunctionsClient {

    //For andrei: FunctionsRequest is a library that allows you to build requests to the Chainlink Functions. "using" it "for" FunctionsRequest.Request means that we can call the library functions as if they were built into the Request object.
    using FunctionsRequest for FunctionsRequest.Request;
    
//for Andrei: a donID is the ide of the DON. A DON is a decentralized oracle network, Chainlink has many of these.

    // Chainlink Functions configuration
    bytes32 public donId; // Decentralized Oracle Network ID
    uint64 public subscriptionId;
    uint32 public gasLimit = 300_000;
    
    // Weather predicate contract
    address public weatherPredicate;
    
    // Owner
    address public owner;
    
    // Mapping of request IDs to locations
    mapping(bytes32 => string) public pendingRequests;
    
    // JavaScript source code for fetching weather data
    // This code runs off-chain in Chainlink's decentralized compute network
    string public source = 
        "const location = args[0];"
        "const apiKey = secrets.weatherApiKey;"
        ""
        "// Fetch weather data from OpenWeatherMap"
        "const response = await Functions.makeHttpRequest({"
        "  url: `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=metric`,"
        "  method: 'GET'"
        "});"
        ""
        "if (response.error) {"
        "  throw new Error('Weather API request failed');"
        "}"
        ""
        "// Extract temperature and multiply by 10 for precision"
        "const temp = Math.round(response.data.main.temp * 10);"
        ""
        "// Return temperature as bytes for on-chain processing"
        "return Functions.encodeInt256(temp);";
    
    constructor(
        address router,
        bytes32 _donId,
        uint64 _subscriptionId
    ) FunctionsClient(router) {
        owner = msg.sender;
        donId = _donId;
        subscriptionId = _subscriptionId;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    /**
     * @dev Set the weather predicate contract address
     */
     //For Andrei: this function sets the weather predicate contract address. Which means I can change the contract that is used to check the weather data with this function.
    function setWeatherPredicate(address _predicate) external onlyOwner {
        weatherPredicate = _predicate;
    }
    
    /**
     * @dev Request weather data for a specific location
     * @param location The location to check (e.g., "Miami,FL")
     */
    function requestWeatherData(string calldata location) external {
        // Build the Chainlink Functions request
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(source);
        
        // Set the location as an argument
        string[] memory args = new string[](1);
        args[0] = location;
        req.setArgs(args);
        
        // Send the request. RequestId is a unique identifier for the request. Like a package receipt.
        bytes32 requestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            gasLimit,
            donId
        );
        
        // Store the pending request
        pendingRequests[requestId] = location;
    }
    
    /**
     * @dev Chainlink Functions callback - receives the weather data
     * @param requestId The request ID
     * @param response The weather data (temperature * 10)
     * @param err Any error message
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        // Check if request exists
        string memory location = pendingRequests[requestId];
        require(bytes(location).length > 0, "Request not found");
        
        // Check for errors
        if (err.length > 0) {
            // In production, handle errors appropriately
            delete pendingRequests[requestId];
            return;
        }
        
        // Decode the temperature
        int256 temperature = abi.decode(response, (int256));
        
        // Update the weather predicate contract
        IWeatherPredicate(weatherPredicate).updateWeatherData(location, temperature);
        
        // Clean up
        delete pendingRequests[requestId];
    }
    
    /**
     * @dev Update configuration
     */
    function updateConfig(
        uint64 _subscriptionId,
        uint32 _gasLimit,
        bytes32 _donId
    ) external onlyOwner {
        subscriptionId = _subscriptionId;
        gasLimit = _gasLimit;
        donId = _donId;
    }
}

// Interface for the weather predicate
interface IWeatherPredicate {
    function updateWeatherData(string calldata location, int256 temperature) external;
}