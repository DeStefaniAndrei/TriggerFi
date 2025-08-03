// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MockDynamicAPIPredicate
 * @notice Minimal mock contract for testing order execution on Tenderly fork
 * @dev Simulates predicate functionality without Chainlink Functions
 */
contract MockDynamicAPIPredicate {
    
    struct PredicateConfig {
        address maker;
        bool lastResult;
        uint256 updateCount;
    }
    
    // Mapping from predicate ID to configuration
    mapping(bytes32 => PredicateConfig) public predicates;
    
    // Fee tracking
    mapping(bytes32 => uint256) public collectedFees;
    uint256 public constant UPDATE_FEE = 2 * 10**6; // $2 in USDC (6 decimals)
    address public keeper;
    address public treasury;
    
    // Events
    event PredicateCreated(bytes32 indexed predicateId, address indexed maker, uint256 conditionCount);
    event PredicateChecked(bytes32 indexed predicateId, bool result);
    event FeesCollected(bytes32 indexed predicateId, uint256 amount, address payer);
    
    constructor(address _keeper, address _treasury) {
        keeper = _keeper;
        treasury = _treasury;
    }
    
    /**
     * @notice Create a new predicate (simplified for testing)
     * @return predicateId Unique identifier for this predicate
     */
    function createPredicate() external returns (bytes32 predicateId) {
        // Generate simple predicate ID for testing
        predicateId = keccak256(abi.encodePacked(
            msg.sender,
            block.timestamp,
            block.number
        ));
        
        // Store predicate configuration
        predicates[predicateId].maker = msg.sender;
        predicates[predicateId].lastResult = false;
        predicates[predicateId].updateCount = 0;
        
        emit PredicateCreated(predicateId, msg.sender, 1);
    }
    
    /**
     * @notice Check if predicate conditions are met
     * @dev Called by 1inch router via arbitraryStaticCall
     * @param predicateId The predicate to check
     * @return result 1 if conditions are met, 0 otherwise
     */
    function checkCondition(bytes32 predicateId) external view returns (uint256) {
        PredicateConfig storage config = predicates[predicateId];
        require(config.maker != address(0), "Predicate not found");
        
        // Return the manually set result
        return config.lastResult ? 1 : 0;
    }
    
    /**
     * @notice Manually set predicate result for testing
     * @param predicateId The predicate to update
     * @param result The result to set
     */
    function setTestResult(bytes32 predicateId, bool result) external {
        require(msg.sender == keeper, "Only keeper can set results");
        PredicateConfig storage config = predicates[predicateId];
        require(config.maker != address(0), "Predicate not found");
        
        config.lastResult = result;
        emit PredicateChecked(predicateId, result);
    }
    
    /**
     * @notice Manually set update count for testing
     * @param predicateId The predicate to update
     * @param count The update count to set
     */
    function setUpdateCount(bytes32 predicateId, uint256 count) external {
        require(msg.sender == keeper, "Only keeper can set count");
        PredicateConfig storage config = predicates[predicateId];
        require(config.maker != address(0), "Predicate not found");
        
        config.updateCount = count;
    }
    
    /**
     * @notice Get update count for a predicate
     * @param predicateId The predicate to check
     * @return count The number of updates
     */
    function updateCount(bytes32 predicateId) external view returns (uint256) {
        return predicates[predicateId].updateCount;
    }
    
    /**
     * @notice Get accumulated fees for a predicate
     * @param predicateId The predicate to check fees for
     * @return fees The total fees owed
     */
    function getUpdateFees(bytes32 predicateId) public view returns (uint256) {
        return (predicates[predicateId].updateCount - collectedFees[predicateId]) * UPDATE_FEE;
    }
    
    /**
     * @notice Collect accumulated fees when filling an order
     * @param predicateId The predicate that was used
     * @dev MVP: Accepts ETH payment instead of USDC
     */
    function collectFees(bytes32 predicateId) external payable {
        uint256 feesOwed = getUpdateFees(predicateId);
        require(msg.value >= feesOwed, "Insufficient fee payment");
        
        // Mark fees as collected
        collectedFees[predicateId] = predicates[predicateId].updateCount;
        
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
}