import { ethers } from "ethers";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";

// Import 1inch SDK - ASK FOR DOCUMENTATION IF NEEDED
// import { LimitOrderProtocolFacade } from "@1inch/limit-order-protocol";

/**
 * TriggerFi Taker Bot
 * 
 * This bot monitors Firebase for active orders and executes them via 1inch
 * when their weather conditions are met.
 * 
 * How it works:
 * 1. Fetches active orders from Firebase every 30 seconds
 * 2. Checks if weather conditions are met (via WeatherPredicate contract)
 * 3. Submits qualifying orders to 1inch Limit Order Protocol
 * 4. Updates order status in Firebase
 */

// Configuration
const config = {
  rpcUrl: process.env.RPC_URL || "https://eth.llamarpc.com",
  privateKey: process.env.PRIVATE_KEY || "", // Taker bot's private key
  weatherPredicateAddress: process.env.WEATHER_PREDICATE || "",
  limitOrderProtocolAddress: "0x111111125421ca6dc452d289314280a0f8842a65", // 1inch v4
  chainId: 1, // Mainnet
  
  // Firebase config
  firebase: {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
  }
};

// Weather Predicate ABI (just the functions we need)
const WEATHER_PREDICATE_ABI = [
  "function checkTemperature(string location, int256 threshold, bool isBelow) view returns (bool)",
  "function updateWeatherData(string location, int256 temperature) external"
];

// 1inch Limit Order Protocol ABI (simplified - ASK FOR FULL DOCUMENTATION)
const LIMIT_ORDER_PROTOCOL_ABI = [
  "function fillOrder(tuple(uint256 salt, address makerAsset, address takerAsset, address maker, address receiver, address allowedSender, uint256 makingAmount, uint256 takingAmount, uint256 offsets, bytes interactions) order, bytes signature, uint256 makingAmount, uint256 takingAmount, uint256 thresholdAmount) payable returns (uint256, uint256, bytes32)",
  "function checkPredicate(tuple(uint256 salt, address makerAsset, address takerAsset, address maker, address receiver, address allowedSender, uint256 makingAmount, uint256 takingAmount, uint256 offsets, bytes interactions) order) view returns (bool)"
];

class TriggerFiTakerBot {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private weatherPredicate: ethers.Contract;
  private limitOrderProtocol: ethers.Contract;
  private db: any;
  
  constructor() {
    // Initialize Ethereum provider and signer
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.signer = new ethers.Wallet(config.privateKey, this.provider);
    
    // Initialize contracts
    this.weatherPredicate = new ethers.Contract(
      config.weatherPredicateAddress,
      WEATHER_PREDICATE_ABI,
      this.provider
    );
    
    this.limitOrderProtocol = new ethers.Contract(
      config.limitOrderProtocolAddress,
      LIMIT_ORDER_PROTOCOL_ABI,
      this.signer
    );
    
    // Initialize Firebase
    const app = initializeApp(config.firebase);
    this.db = getFirestore(app);
  }
  
  /**
   * Main bot loop - runs continuously
   */
  async run() {
    console.log("🤖 TriggerFi Taker Bot starting...");
    console.log(`📍 Monitoring weather conditions for automated trading`);
    console.log(`💰 Taker address: ${this.signer.address}`);
    
    while (true) {
      try {
        await this.checkAndExecuteOrders();
      } catch (error) {
        console.error("❌ Error in bot loop:", error);
      }
      
      // Wait 30 seconds before next check
      await this.sleep(30000);
    }
  }
  
  /**
   * Check all active orders and execute if conditions are met
   */
  async checkAndExecuteOrders() {
    console.log(`\n🔍 Checking orders at ${new Date().toISOString()}`);
    
    // Fetch active orders from Firebase
    const ordersRef = collection(this.db, "orders");
    const q = query(ordersRef, where("status", "==", "active"));
    const querySnapshot = await getDocs(q);
    
    console.log(`📋 Found ${querySnapshot.size} active orders`);
    
    // Check each order
    for (const orderDoc of querySnapshot.docs) {
      const orderData = orderDoc.data();
      await this.processOrder(orderDoc.id, orderData);
    }
  }
  
  /**
   * Process a single order
   */
  async processOrder(orderId: string, orderData: any) {
    try {
      console.log(`\n📄 Processing order ${orderId}`);
      console.log(`   Location: ${orderData.condition.location}`);
      console.log(`   Threshold: ${orderData.condition.threshold}°C`);
      console.log(`   Type: ${orderData.condition.isBelow ? "Below" : "Above"}`);
      
      // Check if weather condition is met
      const conditionMet = await this.checkWeatherCondition(orderData.condition);
      
      if (!conditionMet) {
        console.log(`   ❄️  Condition not met yet`);
        return;
      }
      
      console.log(`   ✅ Condition met! Executing order...`);
      
      // Execute the order on 1inch
      await this.executeOrder(orderId, orderData);
      
    } catch (error) {
      console.error(`❌ Error processing order ${orderId}:`, error);
    }
  }
  
  /**
   * Check if weather condition is met
   */
  async checkWeatherCondition(condition: any): Promise<boolean> {
    try {
      // Call the WeatherPredicate contract
      const result = await this.weatherPredicate.checkTemperature(
        condition.location,
        condition.threshold * 10, // Convert to contract format (°C * 10)
        condition.isBelow
      );
      
      return result;
    } catch (error) {
      console.error("Error checking weather condition:", error);
      return false;
    }
  }
  
  /**
   * Execute order via 1inch Limit Order Protocol
   * 
   * NOTE: This is simplified - ASK FOR DOCUMENTATION on:
   * - Exact order format for v4
   * - How to handle partial fills
   * - Gas optimization strategies
   * - Error handling for failed orders
   */
  async executeOrder(orderId: string, orderData: any) {
    try {
      // Reconstruct the 1inch order from stored data
      const order = {
        salt: orderData.order.salt,
        makerAsset: orderData.order.makerAsset,
        takerAsset: orderData.order.takerAsset,
        maker: orderData.order.maker,
        receiver: orderData.order.receiver,
        allowedSender: orderData.order.allowedSender,
        makingAmount: orderData.order.makingAmount,
        takingAmount: orderData.order.takingAmount,
        offsets: orderData.order.offsets,
        interactions: orderData.order.interactions
      };
      
      // First check if predicate passes (should be true if weather condition met)
      const predicateCheck = await this.limitOrderProtocol.checkPredicate(order);
      if (!predicateCheck) {
        console.log("   ⚠️  Predicate check failed on-chain");
        return;
      }
      
      // Estimate gas
      const gasEstimate = await this.limitOrderProtocol.fillOrder.estimateGas(
        order,
        orderData.signature,
        orderData.order.makingAmount,
        orderData.order.takingAmount,
        0 // No threshold
      );
      
      console.log(`   ⛽ Estimated gas: ${gasEstimate.toString()}`);
      
      // Execute the order
      const tx = await this.limitOrderProtocol.fillOrder(
        order,
        orderData.signature,
        orderData.order.makingAmount,
        orderData.order.takingAmount,
        0, // No threshold
        {
          gasLimit: gasEstimate * 120n / 100n, // Add 20% buffer
          maxFeePerGas: ethers.parseGwei("50"), // Adjust based on network
          maxPriorityFeePerGas: ethers.parseGwei("2")
        }
      );
      
      console.log(`   📤 Transaction submitted: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log(`   ✅ Order executed! Gas used: ${receipt.gasUsed.toString()}`);
      
      // Update order status in Firebase
      await updateDoc(doc(this.db, "orders", orderId), {
        status: "executed",
        executedAt: new Date(),
        txHash: tx.hash,
        gasUsed: receipt.gasUsed.toString()
      });
      
    } catch (error: any) {
      console.error(`   ❌ Failed to execute order:`, error.message);
      
      // Update order with error
      await updateDoc(doc(this.db, "orders", orderId), {
        lastError: error.message,
        lastErrorAt: new Date()
      });
    }
  }
  
  /**
   * Helper function to sleep
   */
  async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Start the bot
async function main() {
  const bot = new TriggerFiTakerBot();
  await bot.run();
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { TriggerFiTakerBot };