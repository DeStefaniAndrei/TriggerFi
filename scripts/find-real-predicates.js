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
  console.log("🔍 Finding Orders with Real Predicates");
  console.log("======================================\n");

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);

  try {
    // Fetch all orders
    const ordersRef = ref(db, "orders");
    const snapshot = await get(ordersRef);
    
    if (!snapshot.exists()) {
      console.log("No orders found");
      return;
    }

    const orders = snapshot.val();
    console.log(`Found ${Object.keys(orders).length} total orders\n`);

    // Check each order
    for (const [orderId, order] of Object.entries(orders)) {
      console.log(`📄 Order: ${orderId}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Predicate ID: ${order.predicateId}`);
      
      // Check if it's a real predicate (not all 'a's)
      const isRealPredicate = order.predicateId && 
        !order.predicateId.match(/^0xa+$/);
      
      if (isRealPredicate) {
        console.log(`   ✅ This looks like a REAL predicate!`);
        console.log(`   Maker: ${order.maker}`);
        console.log(`   ${order.makerAsset} → ${order.takerAsset}`);
        
        // Check if it has valid token addresses
        const hasValidTokens = 
          order.makerAsset.startsWith("0x") && 
          order.makerAsset.length === 42 &&
          order.takerAsset.startsWith("0x") && 
          order.takerAsset.length === 42 &&
          !order.makerAsset.includes("WETH") &&
          !order.takerAsset.includes("USDC");
          
        if (hasValidTokens) {
          console.log(`   ✅ Has valid token addresses`);
        } else {
          console.log(`   ❌ Has mock token addresses`);
        }
        
        // Check predicate encoding
        if (order.order && order.order.predicate) {
          console.log(`   Predicate encoding: ${order.order.predicate.slice(0, 50)}...`);
        }
      } else {
        console.log(`   ❌ Mock predicate ID`);
      }
      
      console.log("");
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });