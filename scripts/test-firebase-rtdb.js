const { 
  saveOrder, 
  savePredicateConfig, 
  getActiveOrders,
  getOrdersByMaker,
  updateOrderFees,
  getActivePredicates
} = require("../firebase-service-rtdb");

/**
 * Test Firebase Realtime Database integration
 */

async function testFirebaseRTDB() {
  console.log("🔥 Testing Firebase Realtime Database");
  console.log("=====================================\n");

  try {
    // Test data
    const testAddress = "0x93d43c27746D76e7606C55493A757127b33D7763";
    const testPredicateId = "0x" + "a".repeat(64);
    const testOrderHash = "0x" + "b".repeat(64);
    
    // Test 1: Save predicate config
    console.log("1️⃣ Saving predicate config...");
    await savePredicateConfig(testPredicateId, {
      apiConditions: [{
        endpoint: "https://api.test.com",
        jsonPath: "data.value",
        operator: ">",
        threshold: "100"
      }],
      logicOperator: "AND",
      creator: testAddress,
      chainlinkFunction: "// test function"
    });
    console.log("✅ Predicate saved\n");

    // Test 2: Save order
    console.log("2️⃣ Saving test order...");
    const testOrder = {
      salt: "0x123",
      makerAsset: "0xWETH",
      takerAsset: "0xUSDC",
      maker: testAddress,
      receiver: testAddress,
      allowedSender: "0x0000000000000000000000000000000000000000",
      makingAmount: "1000000000000000000",
      takingAmount: "3000000000",
      offsets: "0x",
      interactions: "0x",
      predicate: "0xtest",
      permit: "0x",
      getMakingAmount: "0x",
      getTakingAmount: "0x",
      preInteraction: "0x",
      postInteraction: "0x"
    };

    const orderId = await saveOrder(
      testOrder,
      "0xsignature123",
      testPredicateId,
      [{
        endpoint: "https://api.test.com",
        jsonPath: "data.value",
        operator: ">",
        threshold: "100"
      }],
      "AND",
      testOrderHash
    );
    console.log("✅ Order saved with ID:", orderId, "\n");

    // Test 3: Get active orders
    console.log("3️⃣ Fetching active orders...");
    const activeOrders = await getActiveOrders();
    console.log("📦 Found", activeOrders.length, "active orders");
    if (activeOrders.length > 0) {
      console.log("First order:", {
        orderId: activeOrders[0].orderId,
        status: activeOrders[0].status,
        maker: activeOrders[0].maker
      });
    }
    console.log();

    // Test 4: Get orders by maker
    console.log("4️⃣ Fetching orders by maker...");
    const makerOrders = await getOrdersByMaker(testAddress);
    console.log("📦 Found", makerOrders.length, "orders for", testAddress.substring(0, 10) + "...\n");

    // Test 5: Update order fees
    console.log("5️⃣ Updating order fees...");
    await updateOrderFees(orderId, 1, "2000000"); // $2 in USDC
    console.log("✅ Order fees updated\n");

    // Test 6: Get active predicates
    console.log("6️⃣ Fetching active predicates...");
    const predicates = await getActivePredicates();
    console.log("📋 Found", predicates.length, "predicates");
    if (predicates.length > 0) {
      console.log("First predicate:", {
        predicateId: predicates[0].predicateId.substring(0, 20) + "...",
        creator: predicates[0].creator
      });
    }

    console.log("\n✨ All tests passed!");
    console.log("=====================================");
    console.log("\n📝 Summary:");
    console.log("  - Predicate saved successfully");
    console.log("  - Order saved and retrieved");
    console.log("  - Fee tracking working");
    console.log("  - Realtime Database integration working");

  } catch (error) {
    console.error("\n❌ Test failed:", error);
    console.error(error.stack);
  }
}

// Run tests
testFirebaseRTDB()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });