/**
 * Test script for the TriggerFi Taker Bot
 * 
 * This script tests the taker bot functionality without running the full bot.
 * It simulates finding an order and checking if it can be executed.
 */

const { ethers } = require("hardhat");
const { initializeApp } = require("firebase/app");
const { getDatabase, ref, get } = require("firebase/database");
const { CONTRACTS, DYNAMIC_API_PREDICATE_ABI } = require("../lib/contracts");

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBfB4-oobyrnq1RX4J4HEujkBPUweSGZ8Y",
  authDomain: "triggerfi.firebaseapp.com",
  databaseURL: "https://triggerfi-default-rtdb.firebaseio.com",
  projectId: "triggerfi",
  storageBucket: "triggerfi.firebasestorage.app",
  messagingSenderId: "69321969889",
  appId: "1:69321969889:web:0316a93174587f095da7a0"
};

async function main() {
  console.log("🧪 Testing Taker Bot Components");
  console.log("================================\n");

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);

  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("👤 Taker address:", signer.address);

  // Check ETH balance
  const ethBalance = await ethers.provider.getBalance(signer.address);
  console.log("💰 ETH balance:", ethers.formatEther(ethBalance), "ETH\n");

  // Connect to predicate contract
  const predicateContract = new ethers.Contract(
    CONTRACTS.sepolia.dynamicAPIPredicate,
    DYNAMIC_API_PREDICATE_ABI,
    signer
  );

  try {
    // Step 1: Fetch orders from Firebase
    console.log("📋 Fetching orders from Firebase...");
    const ordersRef = ref(db, "orders");
    const snapshot = await get(ordersRef);
    
    if (!snapshot.exists()) {
      console.log("❌ No orders found");
      return;
    }

    const orders = snapshot.val();
    const activeOrders = Object.entries(orders).filter(([_, order]) => order.status === "active");
    console.log(`✅ Found ${activeOrders.length} active orders\n`);

    if (activeOrders.length === 0) {
      console.log("No active orders to test");
      return;
    }

    // Find order with real predicate (not mock)
    const realOrder = activeOrders.find(([_, order]) => 
      order.predicateId && 
      !order.predicateId.match(/^0xa+$/) &&
      order.predicateId === "0xbc5941431f96e14d9afe0f2e885f3b7150f380862c6994c98f9a7847804b310f"
    );
    
    if (!realOrder) {
      console.log("❌ No order found with the test predicate ID");
      console.log("   Looking for: 0xbc5941431f96e14d9afe0f2e885f3b7150f380862c6994c98f9a7847804b310f");
      return;
    }
    
    const [orderId, orderData] = realOrder;
    console.log(`🔍 Testing with order: ${orderId}`);
    console.log(`   Predicate ID: ${orderData.predicateId}`);
    console.log(`   Maker: ${orderData.maker}`);
    console.log(`   ${orderData.makerAsset} → ${orderData.takerAsset}\n`);

    // Step 2: Check predicate condition
    console.log("🎯 Checking predicate condition...");
    try {
      const result = await predicateContract.checkCondition(orderData.predicateId);
      console.log(`   Result: ${result === 1n ? "✅ TRUE (conditions met)" : "❌ FALSE (conditions not met)"}\n`);
      
      if (result === 0n) {
        console.log("⚠️  Order cannot be filled yet - conditions not met");
        return;
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
      console.log("⚠️  This might mean the predicate hasn't been checked by the keeper yet");
      return;
    }

    // Step 3: Check update count and fees
    console.log("💵 Checking fees...");
    const updateCount = await predicateContract.updateCount(orderData.predicateId);
    const feesOwed = await predicateContract.getUpdateFees(orderData.predicateId);
    
    console.log(`   Update count: ${updateCount}`);
    console.log(`   Fees owed: ${ethers.formatUnits(feesOwed, 6)} USDC`);
    
    // Calculate ETH equivalent
    const usdcAmount = Number(ethers.formatUnits(feesOwed, 6));
    const ethPriceUSD = 3500; // Hardcoded for MVP
    const ethAmount = usdcAmount / ethPriceUSD;
    const ethAmountWei = ethers.parseEther(ethAmount.toFixed(18));
    
    console.log(`   ETH equivalent: ${ethers.formatEther(ethAmountWei)} ETH (at $${ethPriceUSD}/ETH)\n`);

    // Step 4: Check if we have enough ETH
    if (ethBalance < ethAmountWei) {
      console.log("❌ Insufficient ETH balance to pay fees!");
      console.log(`   Need: ${ethers.formatEther(ethAmountWei)} ETH`);
      console.log(`   Have: ${ethers.formatEther(ethBalance)} ETH`);
      return;
    }

    // Step 5: Test fee payment (without actually sending)
    console.log("✅ Ready to execute order!");
    console.log("   Would pay fees:", ethers.formatEther(ethAmountWei), "ETH");
    console.log("   Then fill order on 1inch");
    console.log("\n📝 To run the full bot, use: npx hardhat run scripts/taker-bot-triggerfi.js --network sepolia");

  } catch (error) {
    console.error("\n❌ Error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });