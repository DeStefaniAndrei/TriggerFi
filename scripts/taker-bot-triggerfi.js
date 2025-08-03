/**
 * TriggerFi Taker Bot
 * 
 * This bot monitors Firebase for orders that are ready to be executed.
 * When it finds an order with conditions met, it:
 * 1. Checks if the API conditions are true
 * 2. Calculates fees owed ($2 per predicate update)
 * 3. Pays fees to the protocol
 * 4. Executes the order on 1inch
 */

// Import required libraries
const { ethers } = require("hardhat");
const { initializeApp } = require("firebase/app");
const { getDatabase, ref, get, query, orderByChild, equalTo, onValue, update } = require("firebase/database");

// Import our project files
const { CONTRACTS, DYNAMIC_API_PREDICATE_ABI } = require("../lib/contracts");

// Firebase configuration (same as your app uses)
const firebaseConfig = {
  apiKey: "AIzaSyBfB4-oobyrnq1RX4J4HEujkBPUweSGZ8Y",
  authDomain: "triggerfi.firebaseapp.com",
  databaseURL: "https://triggerfi-default-rtdb.firebaseio.com",
  projectId: "triggerfi",
  storageBucket: "triggerfi.firebasestorage.app",
  messagingSenderId: "69321969889",
  appId: "1:69321969889:web:0316a93174587f095da7a0"
};

// For MVP: Using ETH for fee payments instead of USDC
// Future enhancement: Update contract to accept USDC

class TriggerFiTakerBot {
  constructor() {
    // Initialize Firebase connection
    console.log("🔥 Initializing Firebase connection...");
    this.app = initializeApp(firebaseConfig);
    this.db = getDatabase(this.app);
    
    // These will be set when we initialize the bot
    this.provider = null;
    this.signer = null;
    this.predicateContract = null;
    this.network = null;
  }

  /**
   * Initialize the bot with blockchain connections
   */
  async initialize() {
    console.log("\n📡 Setting up blockchain connections...");
    
    // Get provider and signer from Hardhat
    const [signer] = await ethers.getSigners();
    this.signer = signer;
    this.provider = signer.provider;
    
    // Get network info
    const network = await this.provider.getNetwork();
    this.network = network.chainId === 11155111n ? "sepolia" : "mainnet";
    
    console.log(`   Network: ${this.network} (chainId: ${network.chainId})`);
    console.log(`   Taker address: ${this.signer.address}`);
    
    // Connect to contracts
    const contracts = CONTRACTS[this.network];
    
    // Connect to DynamicAPIPredicate contract
    this.predicateContract = new ethers.Contract(
      contracts.dynamicAPIPredicate,
      DYNAMIC_API_PREDICATE_ABI,
      this.signer
    );
    console.log(`   Predicate contract: ${contracts.dynamicAPIPredicate}`);
    
    // Check ETH balance for fee payments
    const ethBalance = await this.provider.getBalance(this.signer.address);
    const formattedBalance = ethers.formatEther(ethBalance);
    console.log(`   ETH balance: ${formattedBalance} ETH`);
    
    if (ethBalance === 0n) {
      console.log("\n⚠️  WARNING: You have no ETH to pay fees!");
      console.log("   The bot will run but won't be able to execute orders.");
    }
    
    // Calculate approximate ETH needed for $2 (assuming ETH = $3500)
    const ethPriceUSD = 3500; // Hardcoded for MVP
    const dollarPerUpdate = 2;
    const ethPerUpdate = dollarPerUpdate / ethPriceUSD;
    console.log(`   Approximate cost: ${ethPerUpdate.toFixed(6)} ETH per predicate update ($${dollarPerUpdate})`);
    console.log(`   Note: Actual ETH price may vary`);
  }

  /**
   * Main bot loop - this runs continuously
   */
  async run() {
    console.log("\n🤖 TriggerFi Taker Bot starting...");
    console.log("   Monitoring for executable orders...\n");
    
    // Set up real-time listener for active orders
    const ordersRef = ref(this.db, 'orders');
    const activeOrdersQuery = query(ordersRef, orderByChild('status'), equalTo('active'));
    
    // This function runs whenever data changes
    onValue(activeOrdersQuery, async (snapshot) => {
      if (!snapshot.exists()) {
        console.log("   No active orders found");
        return;
      }
      
      const orders = snapshot.val();
      console.log(`\n📋 Found ${Object.keys(orders).length} active orders`);
      
      // Check each order
      for (const [orderId, orderData] of Object.entries(orders)) {
        await this.processOrder(orderId, orderData);
      }
    });
    
    // Keep the bot running
    console.log("✅ Bot is now monitoring for orders. Press Ctrl+C to stop.\n");
    
    // Prevent the script from exiting
    await new Promise(() => {}); // This creates a promise that never resolves
  }

  /**
   * Process a single order
   */
  async processOrder(orderId, orderData) {
    try {
      console.log(`\n🔍 Processing order: ${orderId}`);
      console.log(`   Predicate ID: ${orderData.predicateId}`);
      console.log(`   Maker: ${orderData.maker}`);
      console.log(`   Swap: ${orderData.makerAsset} → ${orderData.takerAsset}`);
      
      // Step 1: Check if predicate conditions are met
      console.log("\n   1️⃣ Checking predicate conditions...");
      const conditionMet = await this.checkPredicate(orderData.predicateId);
      
      if (!conditionMet) {
        console.log("   ❌ Conditions not met yet, skipping order");
        return;
      }
      
      console.log("   ✅ Conditions are met!");
      
      // Step 2: Calculate fees owed
      console.log("\n   2️⃣ Calculating fees...");
      const fees = await this.calculateFees(orderData.predicateId);
      console.log(`   Total fees owed: ${fees.formatted} USDC`);
      console.log(`   Update count: ${fees.updateCount}`);
      
      // Step 3: Execute the order (includes fee payment)
      console.log("\n   3️⃣ Executing order...");
      await this.executeOrder(orderId, orderData, fees.amount);
      
    } catch (error) {
      console.error(`\n❌ Error processing order ${orderId}:`, error.message);
    }
  }

  /**
   * Check if predicate conditions are met
   */
  async checkPredicate(predicateId) {
    try {
      // Call checkCondition on the predicate contract
      // This is a view function so it doesn't cost gas
      const result = await this.predicateContract.checkCondition(predicateId);
      
      // The function returns 1 for true, 0 for false
      return result === 1n;
    } catch (error) {
      console.error("Error checking predicate:", error);
      return false;
    }
  }

  /**
   * Calculate total fees owed for predicate updates
   */
  async calculateFees(predicateId) {
    try {
      // Get update count from the contract
      const updateCount = await this.predicateContract.updateCount(predicateId);
      
      // Get fee amount ($2 per update, but paid in ETH)
      const feeAmount = await this.predicateContract.getUpdateFees(predicateId);
      
      // The contract returns USDC amount (6 decimals) but expects ETH payment
      // Convert USDC amount to approximate ETH amount
      const usdcAmount = Number(ethers.formatUnits(feeAmount, 6)); // Convert to USD value
      
      // For MVP, use hardcoded ETH price
      // In production, fetch from Chainlink ETH/USD oracle
      const ethPriceUSD = 3500; // Hardcoded for MVP
      const ethAmount = usdcAmount / ethPriceUSD;
      const ethAmountWei = ethers.parseEther(ethAmount.toFixed(18));
      
      console.log(`   Update count: ${updateCount}`)
      console.log(`   Fee per update: $2 USD`)
      console.log(`   Total USD value: $${usdcAmount}`)
      console.log(`   ETH price (hardcoded): $${ethPriceUSD}`)
      console.log(`   ETH amount: ${ethAmount.toFixed(6)} ETH`)
      
      return {
        amount: ethAmountWei, // ETH amount in wei
        usdcAmount: usdcAmount, // Original USD value
        formatted: `${usdcAmount} USD (≈ ${ethAmount.toFixed(6)} ETH)`,
        updateCount: updateCount.toString()
      };
    } catch (error) {
      console.error("Error calculating fees:", error);
      throw error;
    }
  }

  /**
   * Execute the order on 1inch
   */
  async executeOrder(orderId, orderData, feeAmount) {
    try {
      // Step 1: Pay fees to the predicate contract in ETH
      console.log("   💰 Paying fees to predicate contract...");
      console.log(`   Sending ${ethers.formatEther(feeAmount)} ETH`);
      
      // Call collectFees with ETH payment
      const feeTx = await this.predicateContract.collectFees(
        orderData.predicateId,
        { value: feeAmount } // Send ETH with the transaction
      );
      await feeTx.wait();
      console.log("   ✅ Fees paid successfully");
      console.log(`   Fee tx: ${feeTx.hash}`);
      
      // Step 2: Now execute the 1inch order
      console.log("\n   🔄 Executing order on 1inch...");
      
      // Import the 1inch SDK fill function
      const { fillLimitOrder } = require("@1inch/limit-order-sdk");
      
      // Prepare the fill parameters
      const fillParams = {
        order: orderData.order,
        signature: orderData.signature,
        takerTraits: "0x", // No special traits for MVP
        makingAmount: "0", // Fill entire order
        takingAmount: "0"  // Fill entire order
      };
      
      // Execute the fill on 1inch
      // We need to construct the fillOrder transaction manually
      // since we already paid fees separately
      const limitOrderProtocolAddress = CONTRACTS[this.network].limitOrderProtocol;
      const LIMIT_ORDER_PROTOCOL_ABI = [
        "function fillOrder(tuple(uint256 salt, address makerAsset, address takerAsset, address maker, address receiver, address allowedSender, uint256 makingAmount, uint256 takingAmount, uint256 offsets, bytes interactions, bytes predicate, bytes permit, bytes preInteraction, bytes postInteraction, bytes getMakingAmount, bytes getTakingAmount) order, bytes signature, bytes interaction, uint256 makingAmount, uint256 takingAmount, uint256 skipPermitAndThresholdAmount) payable returns (uint256, uint256, bytes32)"
      ];
      
      const limitOrderProtocol = new ethers.Contract(
        limitOrderProtocolAddress,
        LIMIT_ORDER_PROTOCOL_ABI,
        this.signer
      );
      
      // Fill the entire order (makingAmount = 0, takingAmount = 0 means fill all)
      const fillTx = await limitOrderProtocol.fillOrder(
        orderData.order,
        orderData.signature,
        "0x", // No interaction data
        0,    // makingAmount = 0 (fill all)
        0,    // takingAmount = 0 (fill all)  
        0     // skipPermitAndThresholdAmount = 0
      );
      
      // Wait for confirmation
      console.log("   ⏳ Waiting for order fill confirmation...");
      const fillReceipt = await fillTx.wait();
      
      console.log("   ✅ Order executed successfully!");
      console.log(`   Fill tx: ${fillReceipt.hash}`);
      
      // Step 3: Update order status in Firebase
      console.log("\n   📝 Updating order status...");
      const orderRef = ref(this.db, `orders/${orderId}`);
      await update(orderRef, {
        status: 'filled',
        filledAt: Date.now(),
        fillTxHash: fillReceipt.hash,
        feeTxHash: feeTx.hash,
        filledBy: this.signer.address,
        feesPaid: ethers.formatEther(feeAmount) + " ETH"
      });
      
      console.log("   ✅ Order marked as filled in Firebase");
      
    } catch (error) {
      console.error("   ❌ Failed to execute order:", error);
      
      // Update order with error info
      const orderRef = ref(this.db, `orders/${orderId}`);
      await update(orderRef, {
        lastError: error.message,
        lastErrorAt: Date.now()
      });
      
      throw error;
    }
  }
}

// Main function to start the bot
async function main() {
  console.log("🚀 Starting TriggerFi Taker Bot");
  console.log("================================\n");
  
  try {
    // Create and initialize the bot
    const bot = new TriggerFiTakerBot();
    await bot.initialize();
    
    // Start monitoring for orders
    await bot.run();
    
  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  }
}

// Run the bot
main().catch(console.error);