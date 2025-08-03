// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./DynamicAPIPredicate.sol";

/**
 * @title DynamicAPIPredicateTest
 * @notice Test version of DynamicAPIPredicate for Sepolia testing
 * @dev Removes fee payment requirements for easier testing
 */
contract DynamicAPIPredicateTest is DynamicAPIPredicate {
    
    constructor(
        address _chainlinkFunctions,
        uint64 _subscriptionId,
        bytes32 _donId,
        address _keeper,
        address _treasury
    ) DynamicAPIPredicate(
        _chainlinkFunctions,
        _subscriptionId,
        _donId,
        _keeper,
        _treasury
    ) {}
    
    /**
     * @notice Test version - no fees required
     * @dev Overrides the parent function to skip fee collection
     */
    function collectFees(bytes32 predicateId) external payable override {
        // For testing: Just mark fees as collected without requiring payment
        // This lets us test the full flow without needing test tokens
        collectedFees[predicateId] = updateCount[predicateId];
        
        emit FeesCollected(predicateId, 0, msg.sender);
    }
    
    /**
     * @notice Helper function for testing - manually set predicate result
     * @dev Only for testing purposes to simulate API responses
     */
    function setTestResult(bytes32 predicateId, bool result) external {
        require(msg.sender == keeper, "Only keeper can set test results");
        PredicateConfig storage config = predicates[predicateId];
        require(config.maker != address(0), "Predicate not found");
        
        config.lastResult = result;
        emit PredicateChecked(predicateId, result);
    }
}