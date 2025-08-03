const { ethers } = require("hardhat");
const { initializeApp } = require("firebase/app");
const { getDatabase, ref, get } = require("firebase/database");

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Mock predicate address on Tenderly
const MOCK_PREDICATE_ADDRESS = "0xa0890426D0AA348Ef978bB97Ad1120f320Dbf92B";

async function main() {
  console.log("🔍 Debugging Order Data\n");

  const [signer] = await ethers.getSigners();
  
  // Get order from Firebase
  const orderId = "0x93d43c27746D76e7606C55493A757127b33D7763-1754220046140-tenderly-weth";
  const orderRef = ref(db, `orders/${orderId}`);
  const snapshot = await get(orderRef);

  if (!snapshot.exists()) {
    console.error("❌ Order not found");
    return;
  }

  const orderData = snapshot.val();
  
  console.log("📋 Order Structure:");
  console.log(JSON.stringify(orderData.order, null, 2));
  
  console.log("\n🔐 Signature:");
  console.log(`   Full: ${orderData.signature}`);
  console.log(`   Length: ${orderData.signature.length} chars`);
  
  const sigBytes = orderData.signature.startsWith('0x') ? orderData.signature.slice(2) : orderData.signature;
  const r = '0x' + sigBytes.slice(0, 64);
  const vs = '0x' + sigBytes.slice(64, 128);
  
  console.log(`   r: ${r}`);
  console.log(`   vs: ${vs}`);
  
  console.log("\n🎯 Predicate:");
  console.log(`   Predicate bytes: ${orderData.order.predicate}`);
  console.log(`   Length: ${orderData.order.predicate.length} chars`);
  
  // Try to decode the predicate
  if (orderData.order.predicate.length > 10) {
    const selector = orderData.order.predicate.slice(0, 10);
    console.log(`   Selector: ${selector}`);
    
    if (selector === "0xbf15fcd8") {
      console.log("   ✅ arbitraryStaticCall selector detected");
      
      // Try to decode the parameters
      try {
        const params = '0x' + orderData.order.predicate.slice(10);
        const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
          ["address", "bytes"],
          params
        );
        console.log(`   Target: ${decoded[0]}`);
        console.log(`   Calldata: ${decoded[1]}`);
        
        // Decode the inner calldata
        if (decoded[1].startsWith("0x489a775a")) {
          console.log("   ✅ checkCondition selector detected");
          const predicateId = '0x' + decoded[1].slice(10);
          console.log(`   Predicate ID: ${predicateId}`);
        }
      } catch (e) {
        console.log("   ❌ Failed to decode predicate params:", e.message);
      }
    }
  }
  
  // Check the mock predicate
  console.log("\n🔮 Mock Predicate Status:");
  const mockPredicate = await ethers.getContractAt(
    "MockDynamicAPIPredicate",
    MOCK_PREDICATE_ADDRESS,
    signer
  );
  
  const predicateResult = await mockPredicate.checkCondition(orderData.predicateId);
  console.log(`   Result: ${predicateResult} (1 = true)`);
  
  // Try calling the predicate directly
  console.log("\n🧪 Testing Predicate Call:");
  try {
    const result = await ethers.provider.call({
      to: MOCK_PREDICATE_ADDRESS,
      data: ethers.concat([
        "0x489a775a", // checkCondition(bytes32)
        orderData.predicateId
      ])
    });
    console.log(`   Direct call result: ${result}`);
    console.log(`   Decoded: ${BigInt(result)}`);
  } catch (e) {
    console.log(`   ❌ Direct call failed: ${e.message}`);
  }
  
  // Test the arbitraryStaticCall
  console.log("\n🧪 Testing arbitraryStaticCall:");
  const LIMIT_ORDER_PROTOCOL = "0x111111125421ca6dc452d289314280a0f8842a65";
  
  try {
    const result = await ethers.provider.call({
      to: LIMIT_ORDER_PROTOCOL,
      data: orderData.order.predicate
    });
    console.log(`   arbitraryStaticCall result: ${result}`);
    console.log(`   Decoded: ${BigInt(result)}`);
  } catch (e) {
    console.log(`   ❌ arbitraryStaticCall failed: ${e.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });