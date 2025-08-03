const { ethers } = require("hardhat");

/**
 * Simple test of Chainlink Functions integration
 * Tests with a basic predicate to verify the flow works
 */

async function main() {
  console.log("🧪 Testing Chainlink Functions Integration (Simple)\n");

  // Contract address from deployment
  const PREDICATE_ADDRESS = "0xd378Fbce97cD181Cd7A7EcCe32571f1a37E226ed";
  
  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("👤 Testing with account:", signer.address);

  // Get contract instance
  const predicate = await ethers.getContractAt("DynamicAPIPredicateTest", PREDICATE_ADDRESS);
  console.log("📄 Contract loaded at:", PREDICATE_ADDRESS);

  // Create a simple test predicate
  console.log("\n📝 Creating simple test predicate...");
  
  // Simple condition that should return true
  const testConditions = [{
    endpoint: "https://api.coinbase.com/v2/exchange-rates?currency=BTC",
    authType: "none",
    jsonPath: "data.rates.USD",
    operator: 0, // GREATER_THAN
    threshold: 1000 // BTC > $1000 (should always be true)
  }];
  
  // Simple Chainlink function that returns 1 (true)
  const simpleChainlinkFunction = ethers.toUtf8Bytes(`
    // Simple test function that checks BTC price
    const makeRequest = async () => {
      try {
        const response = await Functions.makeHttpRequest({
          url: 'https://api.coinbase.com/v2/exchange-rates?currency=BTC',
          timeout: 9000
        });
        
        if (response.error) {
          console.error('API error:', response.error);
          return Functions.encodeUint256(0);
        }
        
        const btcPrice = parseFloat(response.data.data.rates.USD);
        console.log('BTC Price:', btcPrice);
        
        // Check if BTC > $1000 (should always be true)
        const result = btcPrice > 1000 ? 1 : 0;
        return Functions.encodeUint256(result);
        
      } catch (error) {
        console.error('Error:', error);
        return Functions.encodeUint256(0);
      }
    };
    
    return await makeRequest();
  `);

  try {
    // Create the predicate
    const createTx = await predicate.createPredicate(
      testConditions,
      true, // useAND (doesn't matter with one condition)
      simpleChainlinkFunction
    );
    
    console.log("⏳ Creating predicate, tx:", createTx.hash);
    const createReceipt = await createTx.wait();
    
    // Get predicate ID from event
    const event = createReceipt.logs.find(log => {
      try {
        const parsed = predicate.interface.parseLog(log);
        return parsed.name === "PredicateCreated";
      } catch {
        return false;
      }
    });
    
    const predicateId = event ? predicate.interface.parseLog(event).args.predicateId : null;
    console.log("✅ Predicate created with ID:", predicateId);

    if (!predicateId) {
      console.error("❌ Failed to get predicate ID");
      return;
    }

    // Check keeper status
    const keeperAddress = await predicate.keeper();
    const isKeeper = signer.address.toLowerCase() === keeperAddress.toLowerCase();
    console.log("\n🔑 Keeper check:");
    console.log("Contract keeper:", keeperAddress);
    console.log("Your address:", signer.address);
    console.log("Are you keeper?", isKeeper ? "YES ✅" : "NO ❌");

    if (!isKeeper) {
      console.log("\n⚠️  You're not the keeper, but let's test other functions...");
    }

    // Test manual result setting (keeper only)
    if (isKeeper) {
      console.log("\n🎯 Testing manual result setting...");
      try {
        const setResultTx = await predicate.setTestResult(predicateId, true);
        await setResultTx.wait();
        console.log("✅ Manual result set to TRUE");
        
        const result = await predicate.checkCondition(predicateId);
        console.log("📊 Predicate now returns:", result.toString() === "1" ? "TRUE ✅" : "FALSE ❌");
      } catch (error) {
        console.error("❌ Failed to set manual result:", error.message);
      }

      // Test Chainlink Functions call
      console.log("\n🚀 Testing Chainlink Functions call...");
      try {
        const checkTx = await predicate.checkConditions(predicateId);
        console.log("⏳ Chainlink request sent, tx:", checkTx.hash);
        const checkReceipt = await checkTx.wait();
        
        console.log("✅ Transaction confirmed!");
        console.log("Gas used:", checkReceipt.gasUsed.toString());
        
        // Check for RequestSent event or any events
        console.log("\n📋 Events emitted:", checkReceipt.logs.length);
        checkReceipt.logs.forEach((log, i) => {
          try {
            const parsed = predicate.interface.parseLog(log);
            console.log(`Event ${i}:`, parsed.name);
          } catch {
            console.log(`Event ${i}: Unknown event`);
          }
        });
        
        // Get the request ID if available
        const requestEvent = checkReceipt.logs.find(log => {
          try {
            const parsed = predicate.interface.parseLog(log);
            return parsed.name === "RequestSent" || parsed.topic === "RequestSent";
          } catch {
            return false;
          }
        });
        
        if (requestEvent) {
          console.log("\n✅ Chainlink request sent successfully!");
          console.log("Request ID:", requestEvent.args?.requestId);
        }
        
      } catch (error) {
        console.error("❌ Chainlink call failed:", error.message);
        
        if (error.data) {
          console.log("\nError data:", error.data);
        }
      }
    }

    // Check current state
    console.log("\n📊 Current predicate state:");
    const currentResult = await predicate.checkCondition(predicateId);
    const updateCount = await predicate.updateCount(predicateId);
    const fees = await predicate.getUpdateFees(predicateId);
    
    console.log("Result:", currentResult.toString() === "1" ? "TRUE" : "FALSE");
    console.log("Update count:", updateCount.toString());
    console.log("Accumulated fees:", ethers.formatUnits(fees, 6), "USDC");

    console.log("\n✨ Test complete!");
    
    if (isKeeper) {
      console.log("\n📋 Next steps:");
      console.log("1. Check https://functions.chain.link for request status");
      console.log("2. Wait 30-60 seconds for Chainlink to process");
      console.log("3. Check if fulfillRequest was called");
    } else {
      console.log("\n⚠️  To fully test Chainlink Functions, use the keeper wallet");
    }

  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.log("\nFull error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });