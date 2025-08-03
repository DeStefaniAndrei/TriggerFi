// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CustomOrderManager
 * @notice Manages custom limit orders with dynamic predicates
 * @dev Stores and tracks orders for TriggerFi
 */
contract CustomOrderManager {
    struct OrderInfo {
        address maker;
        bytes32 orderHash;
        bytes32 predicateId;
        uint256 timestamp;
        bool active;
        string description;
    }
    
    // Events
    event OrderCreated(
        bytes32 indexed orderHash,
        address indexed maker,
        bytes32 indexed predicateId,
        uint256 timestamp
    );
    
    event OrderCancelled(
        bytes32 indexed orderHash,
        address indexed maker
    );
    
    event OrderFilled(
        bytes32 indexed orderHash,
        address indexed maker,
        address indexed taker
    );
    
    // State
    address public immutable limitOrderProtocol;
    address public immutable predicateContract;
    address public owner;
    
    mapping(bytes32 => OrderInfo) public orders;
    mapping(address => bytes32[]) public userOrders;
    bytes32[] public allOrderHashes;
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier onlyMaker(bytes32 orderHash) {
        require(orders[orderHash].maker == msg.sender, "Only maker");
        _;
    }
    
    constructor(
        address _limitOrderProtocol,
        address _predicateContract,
        address _owner
    ) {
        limitOrderProtocol = _limitOrderProtocol;
        predicateContract = _predicateContract;
        owner = _owner;
    }
    
    /**
     * @notice Register a new order
     * @param orderHash Hash of the limit order
     * @param predicateId ID of the predicate in the predicate contract
     * @param description Human-readable description of the order
     */
    function createOrder(
        bytes32 orderHash,
        bytes32 predicateId,
        string calldata description
    ) external {
        require(orders[orderHash].maker == address(0), "Order already exists");
        
        OrderInfo memory newOrder = OrderInfo({
            maker: msg.sender,
            orderHash: orderHash,
            predicateId: predicateId,
            timestamp: block.timestamp,
            active: true,
            description: description
        });
        
        orders[orderHash] = newOrder;
        userOrders[msg.sender].push(orderHash);
        allOrderHashes.push(orderHash);
        
        emit OrderCreated(orderHash, msg.sender, predicateId, block.timestamp);
    }
    
    /**
     * @notice Cancel an order
     * @param orderHash Hash of the order to cancel
     */
    function cancelOrder(bytes32 orderHash) external onlyMaker(orderHash) {
        require(orders[orderHash].active, "Order not active");
        
        orders[orderHash].active = false;
        
        emit OrderCancelled(orderHash, msg.sender);
    }
    
    /**
     * @notice Mark an order as filled
     * @param orderHash Hash of the filled order
     * @param taker Address that filled the order
     */
    function markOrderFilled(bytes32 orderHash, address taker) external {
        require(
            msg.sender == limitOrderProtocol || msg.sender == owner,
            "Only protocol or owner"
        );
        require(orders[orderHash].active, "Order not active");
        
        orders[orderHash].active = false;
        
        emit OrderFilled(orderHash, orders[orderHash].maker, taker);
    }
    
    /**
     * @notice Get all orders for a user
     * @param user Address of the user
     * @return Array of order hashes
     */
    function getUserOrders(address user) external view returns (bytes32[] memory) {
        return userOrders[user];
    }
    
    /**
     * @notice Get active orders
     * @return activeHashes Array of active order hashes
     */
    function getActiveOrders() external view returns (bytes32[] memory activeHashes) {
        uint256 count = 0;
        
        // Count active orders
        for (uint256 i = 0; i < allOrderHashes.length; i++) {
            if (orders[allOrderHashes[i]].active) {
                count++;
            }
        }
        
        // Collect active orders
        activeHashes = new bytes32[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allOrderHashes.length; i++) {
            if (orders[allOrderHashes[i]].active) {
                activeHashes[index] = allOrderHashes[i];
                index++;
            }
        }
    }
    
    /**
     * @notice Get order details
     * @param orderHash Hash of the order
     * @return Order information
     */
    function getOrder(bytes32 orderHash) external view returns (OrderInfo memory) {
        return orders[orderHash];
    }
    
    /**
     * @notice Transfer ownership
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}