const { ethers } = require("hardhat");
const { splitSignature } = require("../lib/1inch-v4-adapter");

// Load deployment info
const deployment = require("../deployments/base-sepolia.json");

// Keeper configuration
const CHECK_INTERVAL = 30000; // 30 seconds
const MIN_PROFIT_USD = 1; // Minimum profit to execute

async function checkAndFillOrder(orderData, keeper) {
  const { order, signature, predicateId, orderHash } = orderData;
  
  try {
    // Connect to contracts
    const mockPredicate = await ethers.getContractAt(
      "MockDynamicAPIPredicate",
      deployment.contracts.mockPredicate
    );
    
    const orderManager = await ethers.getContractAt(
      "CustomOrderManager",
      deployment.contracts.customOrderManager
    );
    
    // Check if order is still active
    const orderInfo = await orderManager.getOrder(orderHash);
    if (!orderInfo.active) {
      console.log(`⏸️  Order ${orderHash.slice(0, 10)}... is no longer active`);
      return false;
    }
    
    // Check predicate
    const checkConditionData = mockPredicate.interface.encodeFunctionData("checkCondition", [predicateId]);
    const protocolABI = ["function arbitraryStaticCall(address target, bytes calldata data) view returns (uint256)"];
    const protocol = new ethers.Contract(deployment.contracts.limitOrderProtocol, protocolABI, ethers.provider);
    
    const predicateResult = await protocol.arbitraryStaticCall(
      deployment.contracts.mockPredicate,
      checkConditionData
    );
    
    if (predicateResult !== 1n) {
      console.log(`⏳ Predicate not met for order ${orderHash.slice(0, 10)}...`);
      return false;
    }
    
    console.log(`✅ Predicate met for order ${orderHash.slice(0, 10)}...`);
    
    // Calculate profitability
    const makingAmount = BigInt(order[5]);
    const takingAmount = BigInt(order[6]);
    const wethPrice = 3500n; // Mock price $3500/ETH
    const usdcDecimals = 6n;
    const wethDecimals = 18n;
    
    const orderValueUSD = (makingAmount * wethPrice) / (10n ** wethDecimals);
    const takingValueUSD = takingAmount / (10n ** usdcDecimals);
    const profitUSD = takingValueUSD - orderValueUSD;
    
    console.log(`   Order value: $${orderValueUSD}`);
    console.log(`   Taking value: $${takingValueUSD}`);
    console.log(`   Potential profit: $${profitUSD}`);
    
    if (profitUSD < MIN_PROFIT_USD) {
      console.log(`   ❌ Profit too low, skipping`);
      return false;
    }
    
    // Check keeper has enough USDC
    const USDC_ABI = ["function balanceOf(address) view returns (uint256)", "function approve(address, uint256) returns (bool)"];
    const usdc = new ethers.Contract(deployment.tokens.USDC, USDC_ABI, keeper);
    const usdcBalance = await usdc.balanceOf(keeper.address);
    
    if (usdcBalance < takingAmount) {
      console.log(`   ❌ Insufficient USDC balance: ${ethers.formatUnits(usdcBalance, 6)} < ${ethers.formatUnits(takingAmount, 6)}`);
      return false;
    }
    
    // Approve USDC
    console.log(`   💳 Approving USDC...`);
    await usdc.approve(deployment.contracts.limitOrderProtocol, takingAmount);
    
    // Execute order
    console.log(`   🔄 Executing order...`);
    const fillOrderABI = [{
      "inputs": [
        {
          "components": [
            {"internalType": "uint256", "name": "salt", "type": "uint256"},
            {"internalType": "uint256", "name": "maker", "type": "uint256"},
            {"internalType": "uint256", "name": "receiver", "type": "uint256"},
            {"internalType": "uint256", "name": "makerAsset", "type": "uint256"},
            {"internalType": "uint256", "name": "takerAsset", "type": "uint256"},
            {"internalType": "uint256", "name": "makingAmount", "type": "uint256"},
            {"internalType": "uint256", "name": "takingAmount", "type": "uint256"},
            {"internalType": "uint256", "name": "makerTraits", "type": "uint256"}
          ],
          "internalType": "struct IOrderMixin.Order",
          "name": "order",
          "type": "tuple"
        },
        {"internalType": "bytes32", "name": "r", "type": "bytes32"},
        {"internalType": "bytes32", "name": "vs", "type": "bytes32"},
        {"internalType": "uint256", "name": "amount", "type": "uint256"},
        {"internalType": "uint256", "name": "takerTraits", "type": "uint256"}
      ],
      "name": "fillOrder",
      "outputs": [
        {"internalType": "uint256", "name": "makingAmount", "type": "uint256"},
        {"internalType": "uint256", "name": "takingAmount", "type": "uint256"},
        {"internalType": "bytes32", "name": "orderHash", "type": "bytes32"}
      ],
      "stateMutability": "payable",
      "type": "function"
    }];
    
    const limitOrderProtocol = new ethers.Contract(deployment.contracts.limitOrderProtocol, fillOrderABI, keeper);
    const { r, vs } = splitSignature(signature);
    
    const fillTx = await limitOrderProtocol.fillOrder(
      order,
      r,
      vs,
      0, // fill entire order
      0  // no special taker traits
    );
    
    const receipt = await fillTx.wait();
    console.log(`   ✅ Order filled! Tx: ${receipt.hash}`);
    
    // Mark order as filled
    await orderManager.markOrderFilled(orderHash, keeper.address);
    
    return true;
    
  } catch (error) {
    console.error(`❌ Error processing order ${orderHash.slice(0, 10)}...:`, error.message);
    return false;
  }
}

async function main() {
  console.log("🤖 TriggerFi Keeper Bot Starting...\n");
  
  const [keeper] = await ethers.getSigners();
  console.log("👤 Keeper:", keeper.address);
  
  const balance = await ethers.provider.getBalance(keeper.address);
  console.log("💰 ETH Balance:", ethers.formatEther(balance), "ETH");
  
  // Check USDC balance
  const USDC_ABI = ["function balanceOf(address) view returns (uint256)"];
  const usdc = new ethers.Contract(deployment.tokens.USDC, USDC_ABI, keeper);
  const usdcBalance = await usdc.balanceOf(keeper.address);
  console.log("💵 USDC Balance:", ethers.formatUnits(usdcBalance, 6), "USDC");
  
  if (usdcBalance === 0n) {
    console.log("\n⚠️  Warning: Keeper has no USDC to fill orders!");
    console.log("   Get Base Sepolia USDC to start filling orders");
  }
  
  console.log("\n📊 Configuration:");
  console.log(`   Check interval: ${CHECK_INTERVAL / 1000} seconds`);
  console.log(`   Min profit: $${MIN_PROFIT_USD}`);
  console.log(`   Order Manager: ${deployment.contracts.customOrderManager}`);
  
  // Main loop
  console.log("\n🔄 Starting monitoring loop...\n");
  
  const monitorOrders = async () => {
    try {
      const orderManager = await ethers.getContractAt(
        "CustomOrderManager",
        deployment.contracts.customOrderManager
      );
      
      // Get active orders
      const activeOrders = await orderManager.getActiveOrders();
      
      if (activeOrders.length === 0) {
        console.log(`[${new Date().toLocaleTimeString()}] No active orders`);
        return;
      }
      
      console.log(`[${new Date().toLocaleTimeString()}] Found ${activeOrders.length} active orders`);
      
      // Process each order
      for (const orderHash of activeOrders) {
        const orderInfo = await orderManager.getOrder(orderHash);
        console.log(`\n📋 Checking order: ${orderHash.slice(0, 10)}...`);
        console.log(`   Maker: ${orderInfo.maker}`);
        console.log(`   Description: ${orderInfo.description}`);
        
        // For demo, we'll use mock order data
        // In production, this would be retrieved from events or storage
        const mockOrderData = {
          order: [
            "22803601596475452729232373579",
            ethers.toBigInt(orderInfo.maker).toString(),
            "0",
            ethers.toBigInt(deployment.tokens.WETH).toString(),
            ethers.toBigInt(deployment.tokens.USDC).toString(),
            "1000000000000000", // 0.001 WETH
            "3500000", // 3.5 USDC
            "0"
          ],
          signature: "0x0000000000000000000000000000000000000000000000000000000000000000", // Mock signature
          predicateId: orderInfo.predicateId,
          orderHash: orderHash
        };
        
        await checkAndFillOrder(mockOrderData, keeper);
      }
      
    } catch (error) {
      console.error(`[${new Date().toLocaleTimeString()}] Monitor error:`, error.message);
    }
  };
  
  // Initial check
  await monitorOrders();
  
  // Set up interval
  setInterval(monitorOrders, CHECK_INTERVAL);
  
  console.log("\n✅ Keeper bot is running. Press Ctrl+C to stop.");
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Keeper bot shutting down...');
  process.exit(0);
});

main().catch((error) => {
  console.error(error);
  process.exit(1);
});