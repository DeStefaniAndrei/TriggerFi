// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// No need for 1inch order imports since we're not implementing isValidSignature

interface IChainlinkFunctions {
    function executeRequest(
        string memory source,
        bytes memory encryptedSecretsUrls,
        uint8 donHostedSecretsSlotID,
        uint64 donHostedSecretsVersion,
        string[] memory args,
        bytes[] memory bytesArgs,
        uint64 subscriptionId,
        uint32 gasLimit,
        bytes32 donId
    ) external returns (bytes32 requestId);
    
    function lastResponse() external view returns (bytes memory);
    function lastError() external view returns (bytes memory);
}

/**
 * @title DynamicAPIPredicate
 * @notice Allows users to create limit orders with custom API conditions
 * @dev Uses Chainlink Functions to check real-world data from any API
 */
contract DynamicAPIPredicate {
    
    struct APICondition {
        string endpoint;      // API URL
        string authType;      // "apiKey", "bearer", or "none"
        string jsonPath;      // Path to value in JSON response
        uint8 operator;       // 0: >, 1: <, 2: =
        int256 threshold;     // Value to compare against
    }
    
    struct PredicateConfig {
        address maker;              // Order maker address
        APICondition[] conditions;  // Array of API conditions
        bool useAND;               // true for AND logic, false for OR
        bytes chainlinkFunction;   // Generated Chainlink Function code
        uint256 lastCheckTime;     // Last time conditions were checked
        bool lastResult;           // Last check result
    }
    
    // Chainlink Functions configuration
    IChainlinkFunctions public chainlinkFunctions;
    uint64 public subscriptionId;
    uint32 public gasLimit = 300000;
    bytes32 public donId;
    
    // Mapping from predicate ID to configuration
    mapping(bytes32 => PredicateConfig) public predicates;
    
    // Fee tracking
    mapping(bytes32 => uint256) public updateCount;     // Track updates per predicate
    mapping(bytes32 => uint256) public collectedFees;   // Track collected fees
    uint256 public constant UPDATE_FEE = 2 * 10**6;     // $2 in USDC (6 decimals)
    address public keeper;                              // Authorized keeper address
    address public treasury;                            // TriggerFi treasury for fees
    
    // Request tracking
    mapping(bytes32 => bytes32) public requestToPredicate; // Map Chainlink requestId to predicateId
    
    // Events
    event PredicateCreated(bytes32 indexed predicateId, address indexed maker, uint256 conditionCount);
    event PredicateChecked(bytes32 indexed predicateId, bool result);
    event FeesCollected(bytes32 indexed predicateId, uint256 amount, address payer);
    
    constructor(
        address _chainlinkFunctions,
        uint64 _subscriptionId,
        bytes32 _donId,
        address _keeper,
        address _treasury
    ) {
        chainlinkFunctions = IChainlinkFunctions(_chainlinkFunctions);
        subscriptionId = _subscriptionId;
        donId = _donId;
        keeper = _keeper;
        treasury = _treasury;
    }
    
    /**
     * @notice Create a new predicate with custom API conditions
     * @param conditions Array of API conditions to check
     * @param useAND Whether to use AND logic (true) or OR logic (false)
     * @param chainlinkFunctionCode Generated Chainlink Function JavaScript code
     * @return predicateId Unique identifier for this predicate
     */
    function createPredicate(
        APICondition[] memory conditions,
        bool useAND,
        bytes memory chainlinkFunctionCode
    ) external returns (bytes32 predicateId) {
        require(conditions.length > 0, "At least one condition required");
        require(conditions.length <= 10, "Maximum 10 conditions allowed");
        
        // Generate unique predicate ID
        predicateId = keccak256(abi.encodePacked(
            msg.sender,
            block.timestamp,
            conditions.length
        ));
        
        // Store predicate configuration
        PredicateConfig storage config = predicates[predicateId];
        config.maker = msg.sender;
        config.useAND = useAND;
        config.chainlinkFunction = chainlinkFunctionCode;
        
        // Store conditions
        for (uint i = 0; i < conditions.length; i++) {
            config.conditions.push(conditions[i]);
        }
        
        emit PredicateCreated(predicateId, msg.sender, conditions.length);
    }
    
    /**
     * @notice Check if API conditions are met for a predicate
     * @dev This is called by the 1inch router via arbitraryStaticCall
     * @param predicateId The predicate to check
     * @return result 1 if conditions are met, 0 otherwise
     * 
     * ARCHITECTURE NOTE:
     * Since this is a view function (staticcall), it cannot:
     * - Make external API calls
     * - Call Chainlink Functions
     * - Modify state
     * 
     * Solution: Off-chain monitoring updates the state, this function reads it
     */
    function checkCondition(bytes32 predicateId) external view returns (uint256) {
        PredicateConfig storage config = predicates[predicateId];
        require(config.maker != address(0), "Predicate not found");
        
        // Return the last known result from off-chain checks
        // The checkConditions() function must be called periodically to update this
        return config.lastResult ? 1 : 0;
    }
    
    /**
     * @notice Get accumulated fees for a predicate
     * @param predicateId The predicate to check fees for
     * @return fees The total fees owed
     */
    function getUpdateFees(bytes32 predicateId) public view returns (uint256) {
        return (updateCount[predicateId] - collectedFees[predicateId]) * UPDATE_FEE;
    }
    
    /**
     * @notice Manually trigger condition check for a predicate
     * @param predicateId The predicate to check
     * @dev Only keeper can call this function
     */
    function checkConditions(bytes32 predicateId) external {
        require(msg.sender == keeper, "Only keeper can check conditions");
        PredicateConfig storage config = predicates[predicateId];
        require(config.maker != address(0), "Predicate not found");
        
        // Build arguments for Chainlink Function
        string[] memory args = new string[](config.conditions.length * 5 + 1);
        
        // Add logic operator
        args[0] = config.useAND ? "AND" : "OR";
        
        // Add conditions
        for (uint i = 0; i < config.conditions.length; i++) {
            uint baseIndex = i * 5 + 1;
            args[baseIndex] = config.conditions[i].endpoint;
            args[baseIndex + 1] = config.conditions[i].authType;
            args[baseIndex + 2] = config.conditions[i].jsonPath;
            args[baseIndex + 3] = _operatorToString(config.conditions[i].operator);
            args[baseIndex + 4] = _int256ToString(config.conditions[i].threshold);
        }
        
        // Execute Chainlink Function
        bytes32 requestId = chainlinkFunctions.executeRequest(
            string(config.chainlinkFunction),
            "", // No encrypted secrets for MVP
            0,  // No hosted secrets
            0,  // No version
            args,
            new bytes[](0), // No bytes args
            subscriptionId,
            gasLimit,
            donId
        );
        
        // Map request ID to predicate ID
        requestToPredicate[requestId] = predicateId;
        
        // Increment update count
        updateCount[predicateId]++;
        
        // Update last check time
        config.lastCheckTime = block.timestamp;
    }
    
    /**
     * @notice Callback function for Chainlink Functions
     * @dev This is called by Chainlink when API check completes
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) external {
        // TODO: In production, verify caller is Chainlink router
        // require(msg.sender == address(chainlinkFunctions), "Only Chainlink can fulfill");
        
        // Get predicate ID from request mapping
        bytes32 predicateId = requestToPredicate[requestId];
        require(predicateId != bytes32(0), "Unknown request ID");
        
        PredicateConfig storage config = predicates[predicateId];
        
        // Handle errors
        if (err.length > 0) {
            // Keep last result on error
            emit PredicateChecked(predicateId, config.lastResult);
            return;
        }
        
        // Decode response - Chainlink Functions returns uint256 (1 for true, 0 for false)
        uint256 resultValue = abi.decode(response, (uint256));
        bool result = resultValue == 1;
        
        // Update predicate result
        config.lastResult = result;
        
        emit PredicateChecked(predicateId, result);
    }
    
    /**
     * @notice Collect accumulated fees when filling an order
     * @param predicateId The predicate that was used
     * @dev Called by taker bot when filling order
     */
    function collectFees(bytes32 predicateId) external payable virtual {
        uint256 feesOwed = getUpdateFees(predicateId);
        require(msg.value >= feesOwed, "Insufficient fee payment");
        
        // Mark fees as collected
        collectedFees[predicateId] = updateCount[predicateId];
        
        // Transfer fees to treasury
        (bool success, ) = treasury.call{value: feesOwed}("");
        require(success, "Fee transfer failed");
        
        // Refund excess payment
        if (msg.value > feesOwed) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - feesOwed}("");
            require(refundSuccess, "Refund failed");
        }
        
        emit FeesCollected(predicateId, feesOwed, msg.sender);
    }
    
    // Helper functions
    function _operatorToString(uint8 operator) private pure returns (string memory) {
        if (operator == 0) return ">";
        if (operator == 1) return "<";
        return "=";
    }
    
    function _int256ToString(int256 value) private pure returns (string memory) {
        // Simplified int to string conversion
        if (value == 0) return "0";
        
        bool negative = value < 0;
        uint256 absValue = negative ? uint256(-value) : uint256(value);
        
        uint256 temp = absValue;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        
        bytes memory buffer = new bytes(negative ? digits + 1 : digits);
        if (negative) {
            buffer[0] = "-";
        }
        
        while (absValue != 0) {
            digits -= 1;
            buffer[negative ? digits + 1 : digits] = bytes1(uint8(48 + absValue % 10));
            absValue /= 10;
        }
        
        return string(buffer);
    }
}