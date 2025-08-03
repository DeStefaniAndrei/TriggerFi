const { ethers } = require("hardhat");

/**
 * Demonstrates the complete TriggerFi flow:
 * 1. Create a predicate with API conditions
 * 2. Keeper updates the predicate 
 * 3. Check predicate status (what 1inch would do)
 * 4. Show fee accumulation
 */

async function main() {
  console.log("🎯 TriggerFi Demo Flow\n");

  const PREDICATE_ADDRESS = "0xd378Fbce97cD181Cd7A7EcCe32571f1a37E226ed";
  const [signer] = await ethers.getSigners();
  const predicate = await ethers.getContractAt("DynamicAPIPredicateTest", PREDICATE_ADDRESS);

  // Step 1: Create a new predicate for JPY hedging demo
  console.log("📝 Step 1: Creating JPY Hedging Predicate");
  console.log("Conditions:");
  console.log("- US tariffs on Japanese cars > 15%");
  console.log("- AND JPY inflation rate > 5%");
  console.log("Action: Convert JPYC to USDC\n");

  const jpyConditions = [
    {
      endpoint: "https://api.example.com/us-tariffs", // Mock API
      authType: "none",
      jsonPath: "data.japan.cars",
      operator: 0, // GREATER_THAN
      threshold: 15
    },
    {
      endpoint: "https://api.example.com/japan-inflation", // Mock API
      authType: "none", 
      jsonPath: "data.inflation_rate",
      operator: 0, // GREATER_THAN
      threshold: 5
    }
  ];

  // For demo, we'll use a simple function that returns false
  const demoChainlinkFunction = ethers.toUtf8Bytes(`
    // Demo function for JPY hedging
    const makeRequest = async () => {
      // In production, this would check real APIs
      // For demo, return false (conditions not met)
      return Functions.encodeUint256(0);
    };
    return await makeRequest();
  `);

  try {
    const createTx = await predicate.createPredicate(
      jpyConditions,
      true, // useAND
      demoChainlinkFunction
    );
    
    console.log("⏳ Creating predicate...");
    const createReceipt = await createTx.wait();
    
    // Get predicate ID
    const event = createReceipt.logs.find(log => {
      try {
        const parsed = predicate.interface.parseLog(log);
        return parsed.name === "PredicateCreated";
      } catch {
        return false;
      }
    });
    
    const jpyPredicateId = event ? predicate.interface.parseLog(event).args.predicateId : null;
    console.log("✅ JPY Predicate created:", jpyPredicateId);

    // Step 2: Check existing BTC predicate (updated by keeper)
    console.log("\n📊 Step 2: Checking Active Predicates");
    
    const btcPredicateId = "0x85b1bb540ce3e1a0cbdbe30bc33ad86596e95b5ec2fd9cb93a336666c521b999";
    
    // Check BTC predicate
    console.log("\n🔍 BTC Price Predicate:");
    const btcResult = await predicate.checkCondition(btcPredicateId);
    const btcUpdateCount = await predicate.updateCount(btcPredicateId);
    const btcFees = await predicate.getUpdateFees(btcPredicateId);
    
    console.log("- Condition: BTC > $30,000");
    console.log("- Current Status:", btcResult.toString() === "1" ? "TRUE ✅ (Order can execute)" : "FALSE ❌ (Order cannot execute)");
    console.log("- Updates performed:", btcUpdateCount.toString());
    console.log("- Accumulated fees:", ethers.formatUnits(btcFees, 6), "USDC");

    // Check JPY predicate
    if (jpyPredicateId) {
      console.log("\n🔍 JPY Hedging Predicate:");
      const jpyResult = await predicate.checkCondition(jpyPredicateId);
      const jpyUpdateCount = await predicate.updateCount(jpyPredicateId);
      const jpyFees = await predicate.getUpdateFees(jpyPredicateId);
      
      console.log("- Conditions: Tariffs > 15% AND Inflation > 5%");
      console.log("- Current Status:", jpyResult.toString() === "1" ? "TRUE ✅" : "FALSE ❌");
      console.log("- Updates performed:", jpyUpdateCount.toString());
      console.log("- Accumulated fees:", ethers.formatUnits(jpyFees, 6), "USDC");
    }

    // Step 3: Demonstrate what a taker bot would do
    console.log("\n🤖 Step 3: Taker Bot Perspective");
    console.log("\nTaker bot checks predicates before attempting fills:");
    
    if (btcResult.toString() === "1") {
      console.log("✅ BTC predicate is TRUE - would attempt to fill order");
      console.log("   - Must pay", ethers.formatUnits(btcFees, 6), "USDC in fees");
      console.log("   - Fees cover", btcUpdateCount.toString(), "keeper updates");
    } else {
      console.log("❌ BTC predicate is FALSE - would skip order");
      console.log("   - Saves gas by not attempting failed fill");
    }

    // Step 4: Show economic model
    console.log("\n💰 Step 4: Economic Model");
    console.log("\nProtocol Economics:");
    console.log("- Keeper fronts ~$0.50 per update (Chainlink costs)");
    console.log("- Charges $2.00 per update to takers");
    console.log("- Profit: $1.50 per update");
    console.log("\nIncentive Alignment:");
    console.log("- Quick fills = Lower fees for takers");
    console.log("- More updates = Higher revenue for protocol");
    console.log("- Makers get automatic monitoring without paying");

    // Show next steps
    console.log("\n🚀 Next Steps for Full Demo:");
    console.log("1. Create 1inch order with predicate");
    console.log("2. Run taker bot to monitor orders");
    console.log("3. Execute swaps when conditions are met");
    console.log("4. Collect fees on successful fills");

  } catch (error) {
    console.error("\n❌ Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });