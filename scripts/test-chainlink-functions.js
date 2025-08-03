const { ethers } = require("hardhat");
const { generateChainlinkFunction } = require("../dist/lib/chainlink-function-generator");

/**
 * Test Chainlink Functions with real API calls
 * This script will:
 * 1. Create a predicate with real API conditions
 * 2. Trigger Chainlink Functions to check the APIs
 * 3. Verify the results
 */

async function main() {
  console.log("🧪 Testing Chainlink Functions Integration\n");

  // Contract address from deployment
  const PREDICATE_ADDRESS = "0xd378Fbce97cD181Cd7A7EcCe32571f1a37E226ed";
  
  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("👤 Testing with account:", signer.address);

  // Get contract instance
  const predicate = await ethers.getContractAt("DynamicAPIPredicateTest", PREDICATE_ADDRESS);
  console.log("📄 Contract loaded at:", PREDICATE_ADDRESS);

  // Test 1: Create a predicate with real APIs
  console.log("\n📝 Creating predicate with real API conditions...");
  
  // Using public APIs that don't require authentication
  const testConditions = [
    {
      endpoint: "https://api.coinbase.com/v2/exchange-rates?currency=BTC",
      authType: "none",
      authValue: "",
      jsonPath: "data.rates.USD",
      operator: ">",
      threshold: "30000" // BTC price > $30,000
    },
    {
      endpoint: "https://api.blockchain.info/stats",
      authType: "none",
      authValue: "",
      jsonPath: "market_price_usd",
      operator: ">",
      threshold: "30000" // BTC price > $30,000
    }
  ];

  // Generate Chainlink Function code
  const useAND = true; // Both conditions must be true
  const chainlinkFunctionCode = generateChainlinkFunction(testConditions, useAND);
  
  console.log("\n📄 Generated Chainlink Function (preview):");
  console.log(chainlinkFunctionCode.substring(0, 500) + "...\n");

  try {
    // Convert conditions to contract format
    const contractConditions = testConditions.map(cond => ({
      endpoint: cond.endpoint,
      authType: cond.authType,
      jsonPath: cond.jsonPath,
      operator: cond.operator === ">" ? 0 : cond.operator === "<" ? 1 : 2,
      threshold: parseInt(cond.threshold)
    }));

    // Create the predicate
    const createTx = await predicate.createPredicate(
      contractConditions,
      useAND,
      ethers.toUtf8Bytes(chainlinkFunctionCode)
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

    // Test 2: Trigger Chainlink Functions
    console.log("\n🚀 Triggering Chainlink Functions to check APIs...");
    console.log("This will make real HTTP requests via Chainlink!");
    
    try {
      const checkTx = await predicate.checkConditions(predicateId);
      console.log("⏳ Chainlink Function request sent, tx:", checkTx.hash);
      const checkReceipt = await checkTx.wait();
      
      console.log("✅ Chainlink Function triggered successfully!");
      console.log("Gas used:", checkReceipt.gasUsed.toString());
      
      // Wait for Chainlink to process (usually takes 10-30 seconds)
      console.log("\n⏰ Waiting 30 seconds for Chainlink to process...");
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      // Check the result
      console.log("\n🔍 Checking predicate result...");
      const result = await predicate.checkCondition(predicateId);
      const isTrue = result.toString() === "1";
      
      console.log("📊 Predicate result:", isTrue ? "TRUE ✅" : "FALSE ❌");
      console.log("Interpretation: BTC price is", isTrue ? "above" : "below", "$30,000 on both APIs");
      
      // Get update count and fees
      const updateCount = await predicate.updateCount(predicateId);
      const fees = await predicate.getUpdateFees(predicateId);
      
      console.log("\n💰 Fee Information:");
      console.log("Updates performed:", updateCount.toString());
      console.log("Total fees accumulated:", ethers.formatUnits(fees, 6), "USDC");
      
    } catch (error) {
      if (error.message.includes("Only keeper")) {
        console.error("\n❌ Error: Only the keeper can check conditions");
        console.log("Your address:", signer.address);
        console.log("Keeper address:", await predicate.keeper());
        console.log("\nMake sure you're using the same wallet that deployed the contract!");
      } else {
        throw error;
      }
    }

    // Test 3: Manual test result (for debugging)
    console.log("\n🎯 Setting manual test result to verify contract works...");
    try {
      const setResultTx = await predicate.setTestResult(predicateId, true);
      await setResultTx.wait();
      
      const manualResult = await predicate.checkCondition(predicateId);
      console.log("✅ Manual test successful, predicate now returns:", manualResult.toString() === "1" ? "TRUE" : "FALSE");
    } catch (error) {
      console.log("⚠️  Cannot set manual result (keeper only)");
    }

    console.log("\n✨ Test complete!");
    console.log("\n📋 Next steps:");
    console.log("1. Check Chainlink Functions dashboard for request details");
    console.log("2. Implement keeper service to automate updates");
    console.log("3. Create 1inch orders using this predicate");

  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    
    if (error.message.includes("gas")) {
      console.log("\n💡 Tip: Make sure your wallet has enough Sepolia ETH");
    } else if (error.message.includes("subscription")) {
      console.log("\n💡 Tip: Make sure the contract is added as a consumer to your Chainlink subscription");
    }
  }
}

// Helper function to compile TypeScript if needed
async function compileTypeScript() {
  console.log("📦 Compiling TypeScript files...");
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);
  
  try {
    await execPromise('npx tsc lib/chainlink-function-generator.ts --outDir dist/lib --esModuleInterop --resolveJsonModule');
    console.log("✅ TypeScript compiled\n");
  } catch (error) {
    console.log("⚠️  TypeScript compilation warning:", error.message);
  }
}

// Run compilation then main
compileTypeScript()
  .then(() => main())
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });