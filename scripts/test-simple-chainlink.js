/**
 * Test Simple Chainlink Function
 * 
 * Creates a very simple predicate to test if Chainlink Functions work at all
 */

const { ethers } = require("hardhat");
const { CONTRACTS, DYNAMIC_API_PREDICATE_ABI } = require("../lib/contracts");

async function main() {
  console.log("🧪 Testing Simple Chainlink Function");
  console.log("===================================\n");

  const [signer] = await ethers.getSigners();
  console.log("👤 Testing as:", signer.address);

  const predicateContract = new ethers.Contract(
    CONTRACTS.sepolia.dynamicAPIPredicate,
    DYNAMIC_API_PREDICATE_ABI,
    signer
  );

  try {
    // Create a very simple predicate - just return true
    console.log("📝 Creating simple test predicate...");
    
    const simpleConditions = [{
      endpoint: "https://api.coinbase.com/v2/exchange-rates?currency=USD",
      authType: "none", 
      jsonPath: "data.currency",
      operator: 2, // equals
      threshold: 0 // We'll check if currency equals "USD" (comparing strings as 0)
    }];

    // Simple Chainlink Function that just returns 1
    const simpleFunctionCode = `
// Super simple test function
const response = await Functions.makeHttpRequest({
  url: "https://api.coinbase.com/v2/exchange-rates?currency=USD"
});

// Just return 1 (true) for testing
return Functions.encodeUint256(1);
`;

    const tx = await predicateContract.createPredicate(
      simpleConditions,
      true, // useAND
      ethers.toUtf8Bytes(simpleFunctionCode)
    );
    
    console.log("⏳ Creating predicate...");
    const receipt = await tx.wait();
    
    // Get predicate ID from event
    const event = receipt.logs.find(log => {
      try {
        const parsed = predicateContract.interface.parseLog(log);
        return parsed.name === "PredicateCreated";
      } catch {
        return false;
      }
    });
    
    if (!event) {
      console.log("❌ No PredicateCreated event found");
      return;
    }
    
    const parsed = predicateContract.interface.parseLog(event);
    const predicateId = parsed.args[0];
    console.log(`✅ Predicate created: ${predicateId}\n`);

    // Now try to call Chainlink Functions
    console.log("🚀 Calling Chainlink Functions...");
    console.log("   This simple function just returns true");
    
    try {
      const checkTx = await predicateContract.checkConditions(predicateId, {
        gasLimit: 500000
      });
      console.log(`📤 Transaction sent: ${checkTx.hash}`);
      console.log("⏳ Waiting for confirmation...");
      
      const checkReceipt = await checkTx.wait();
      console.log(`✅ Transaction confirmed!`);
      console.log(`   Block: ${checkReceipt.blockNumber}`);
      console.log(`   Gas used: ${checkReceipt.gasUsed}`);
      console.log(`   Status: ${checkReceipt.status === 1 ? "Success" : "Failed"}`);
      
      if (checkReceipt.status === 0) {
        console.log("\n❌ Transaction reverted!");
        console.log("   This means Chainlink Functions couldn't be called");
        console.log("\n💡 Check:");
        console.log("   1. Is the contract added as a consumer to subscription 5385?");
        console.log("   2. Does the subscription have LINK balance?");
        console.log("   3. Is the Chainlink Functions router address correct?");
      } else {
        console.log("\n✅ Chainlink Functions called successfully!");
        console.log("   LINK tokens were consumed from your subscription");
        
        // Wait for result
        console.log("\n⏳ Waiting 30 seconds for Chainlink response...");
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        const result = await predicateContract.checkCondition(predicateId);
        console.log(`\n📊 Predicate result: ${result === 1n ? "TRUE ✅" : "FALSE ❌"}`);
        
        const updateCount = await predicateContract.updateCount(predicateId);
        console.log(`   Update count: ${updateCount}`);
      }
      
    } catch (error) {
      console.log("\n❌ Failed to call Chainlink Functions");
      console.log(`   Error: ${error.message}`);
      
      if (error.message.includes("Only keeper")) {
        console.log("\n💡 You're not the keeper. Current keeper:");
        console.log(`   ${await predicateContract.keeper()}`);
      }
    }

  } catch (error) {
    console.error("\n❌ Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });