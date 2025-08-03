const { ethers } = require("hardhat");
const { initializeApp } = require("firebase/app");
const { getDatabase, ref, get } = require("firebase/database");

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
  console.log("🧪 Testing Order Creation with Correct Decimals");
  console.log("==============================================\n");

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);

  try {
    // Fetch orders from Firebase
    const ordersRef = ref(db, "orders");
    const snapshot = await get(ordersRef);
    
    if (!snapshot.exists()) {
      console.log("No orders found in Firebase");
      return;
    }

    const orders = snapshot.val();
    console.log(`Found ${Object.keys(orders).length} orders in Firebase\n`);

    // Analyze each order
    for (const [orderId, order] of Object.entries(orders)) {
      console.log(`📄 Order: ${orderId}`);
      console.log(`   Maker: ${order.maker}`);
      console.log(`   Status: ${order.status}`);
      
      // Check token addresses and amounts
      const makerAsset = order.makerAsset;
      const takerAsset = order.takerAsset;
      const makingAmount = order.order.makingAmount;
      const takingAmount = order.order.takingAmount;
      
      console.log(`\n   Tokens:`);
      console.log(`   Maker Asset: ${makerAsset}`);
      console.log(`   Taker Asset: ${takerAsset}`);
      
      // Determine token types and expected decimals
      let makerSymbol = "Unknown";
      let takerSymbol = "Unknown";
      let makerDecimals = 18;
      let takerDecimals = 18;
      
      // Map addresses to tokens
      if (makerAsset.toLowerCase() === "0xfff9976782d46cc05630d1f6ebab18b2324d6b14".toLowerCase()) {
        makerSymbol = "WETH";
        makerDecimals = 18;
      } else if (makerAsset.toLowerCase() === "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8".toLowerCase()) {
        makerSymbol = "USDC";
        makerDecimals = 6;
      } else if (makerAsset.toLowerCase() === "0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB".toLowerCase()) {
        makerSymbol = "JPYC";
        makerDecimals = 18;
      } else if (makerAsset === "0xWETH" || makerAsset === "0xUSDC") {
        console.log(`   ⚠️  Mock token address detected: ${makerAsset}`);
      }
      
      if (takerAsset.toLowerCase() === "0xfff9976782d46cc05630d1f6ebab18b2324d6b14".toLowerCase()) {
        takerSymbol = "WETH";
        takerDecimals = 18;
      } else if (takerAsset.toLowerCase() === "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8".toLowerCase()) {
        takerSymbol = "USDC";
        takerDecimals = 6;
      } else if (takerAsset.toLowerCase() === "0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB".toLowerCase()) {
        takerSymbol = "JPYC";
        takerDecimals = 18;
      } else if (takerAsset === "0xWETH" || takerAsset === "0xUSDC") {
        console.log(`   ⚠️  Mock token address detected: ${takerAsset}`);
      }
      
      // Calculate human-readable amounts
      console.log(`\n   Amounts:`);
      console.log(`   Making: ${makingAmount} (raw)`);
      
      if (makerSymbol !== "Unknown") {
        const makerHuman = ethers.formatUnits(makingAmount, makerDecimals);
        console.log(`   Making: ${makerHuman} ${makerSymbol}`);
      }
      
      console.log(`   Taking: ${takingAmount} (raw)`);
      
      if (takerSymbol !== "Unknown") {
        const takerHuman = ethers.formatUnits(takingAmount, takerDecimals);
        console.log(`   Taking: ${takerHuman} ${takerSymbol}`);
      }
      
      // Check dynamic pricing
      const getMakingAmount = order.order.getMakingAmount;
      const getTakingAmount = order.order.getTakingAmount;
      
      console.log(`\n   Dynamic Pricing:`);
      console.log(`   getMakingAmount: ${getMakingAmount === "0x" ? "Not enabled" : "Enabled"}`);
      console.log(`   getTakingAmount: ${getTakingAmount === "0x" ? "Not enabled" : "Enabled"}`);
      
      // Verify decimals are correct
      if (makerSymbol === "USDC" && makingAmount.length > 15) {
        console.log(`\n   ❌ WARNING: USDC amount seems too large for 6 decimals`);
      }
      if (takerSymbol === "USDC" && takingAmount.length > 15) {
        console.log(`\n   ❌ WARNING: USDC amount seems too large for 6 decimals`);
      }
      
      console.log("\n   " + "=".repeat(50) + "\n");
    }
    
    console.log("✅ Analysis complete!");
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });