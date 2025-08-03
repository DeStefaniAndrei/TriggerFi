const { ethers } = require("hardhat");

/**
 * Test the complete flow without Chainlink Functions
 * Uses setTestResult to simulate API responses
 */

async function main() {
  console.log("🧪 Testing Complete Flow (Without Chainlink)\n");

  const PREDICATE_ADDRESS = "0xd378Fbce97cD181Cd7A7EcCe32571f1a37E226ed";
  const [signer] = await ethers.getSigners();
  const predicate = await ethers.getContractAt("DynamicAPIPredicateTest", PREDICATE_ADDRESS);

  // Step 1: Create a realistic predicate for demo
  console.log("📝 Step 1: Creating JPY Hedging Predicate");
  console.log("Scenario: Company wants to hedge JPY exposure");
  console.log("Conditions:");
  console.log("  1. US tariffs on Japanese cars > 15%");
  console.log("  2. Japan inflation rate > 5%");
  console.log("Action: Swap 1M JPYC → USDC when both conditions are true\n");

  const jpyConditions = [
    {
      endpoint: "https://api.trade.gov/tariffs/japan/automotive",
      authType: "apiKey",
      jsonPath: "data.tariff_rate",
      operator: 0, // GREATER_THAN
      threshold: 15
    },
    {
      endpoint: "https://api.stat.go.jp/inflation/current",
      authType: "bearer",
      jsonPath: "inflation.annual_rate",
      operator: 0, // GREATER_THAN
      threshold: 5
    }
  ];

  // Generate a realistic Chainlink function
  const chainlinkFunction = generateChainlinkFunction(jpyConditions, true);

  try {
    // Create the predicate
    const createTx = await predicate.createPredicate(
      jpyConditions,
      true, // AND logic
      ethers.toUtf8Bytes(chainlinkFunction)
    );
    
    console.log("⏳ Creating predicate...");
    const receipt = await createTx.wait();
    
    const event = receipt.logs.find(log => {
      try {
        const parsed = predicate.interface.parseLog(log);
        return parsed.name === "PredicateCreated";
      } catch {
        return false;
      }
    });
    
    const predicateId = event.args.predicateId;
    console.log("✅ Predicate created:", predicateId);

    // Step 2: Simulate keeper checking APIs
    console.log("\n🤖 Step 2: Keeper Service Simulation");
    console.log("Keeper checks APIs every 5 minutes...\n");
    
    // Simulate first check - conditions not met
    console.log("⏰ Update #1 (0 minutes):");
    console.log("  - US tariffs: 10% (< 15%) ❌");
    console.log("  - Japan inflation: 3.3% (< 5%) ❌");
    console.log("  - Result: FALSE (Order cannot execute)");
    
    let tx = await predicate.setTestResult(predicateId, false);
    await tx.wait();
    
    // Simulate fee accumulation
    const updateCount1 = await predicate.updateCount(predicateId);
    console.log("  - Update count: 1");
    console.log("  - Fees accumulated: $2.00");

    // Simulate second check - tariffs increase
    console.log("\n⏰ Update #2 (5 minutes later):");
    console.log("  - US tariffs: 20% (> 15%) ✅");
    console.log("  - Japan inflation: 3.3% (< 5%) ❌");
    console.log("  - Result: FALSE (Still need both conditions)");
    
    // Note: In real implementation, checkConditions would increment count
    // For demo, we'll increment manually by calling a mock update

    // Simulate third check - both conditions met
    console.log("\n⏰ Update #3 (10 minutes later):");
    console.log("  - US tariffs: 20% (> 15%) ✅");
    console.log("  - Japan inflation: 5.5% (> 5%) ✅");
    console.log("  - Result: TRUE (Order can now execute!)");
    
    tx = await predicate.setTestResult(predicateId, true);
    await tx.wait();

    // Step 3: Taker bot perspective
    console.log("\n💱 Step 3: Taker Bot Execution");
    
    const result = await predicate.checkCondition(predicateId);
    console.log("Taker checks predicate:", result.toString() === "1" ? "TRUE ✅" : "FALSE ❌");
    
    if (result.toString() === "1") {
      console.log("\n🎯 Executing 1inch order:");
      console.log("  - Swapping: 1,000,000 JPYC → USDC");
      console.log("  - Current rate: 1 JPYC = 0.0067 USDC");
      console.log("  - Expected output: ~6,700 USDC");
      console.log("  - Fee payment: $6.00 (3 updates × $2)");
      console.log("  - Net benefit: Avoided 5% currency depreciation (~$335 saved)");
    }

    // Step 4: Show complete economics
    console.log("\n💰 Step 4: Economic Analysis");
    console.log("\nFor the Company (Maker):");
    console.log("  - Cost: $0 (no upfront fees)");
    console.log("  - Benefit: Automated hedging saved ~$335");
    console.log("  - ROI: Infinite (no cost to maker)");
    
    console.log("\nFor TriggerFi (Protocol):");
    console.log("  - Cost: ~$1.50 (3 Chainlink calls)");
    console.log("  - Revenue: $6.00 (3 updates × $2)");
    console.log("  - Profit: $4.50 per order");
    
    console.log("\nFor Taker Bot:");
    console.log("  - Cost: $6.00 in fees + gas");
    console.log("  - Revenue: 1inch protocol fees + MEV");
    console.log("  - Benefit: No failed transactions");

    // Show all predicates
    console.log("\n📊 Active Predicates Summary:");
    console.log("\n1. BTC Price Monitor (Demo)");
    console.log("   ID: 0x85b1bb540ce3e1a0cbdbe30bc33ad86596e95b5ec2fd9cb93a336666c521b999");
    console.log("   Condition: BTC > $30,000");
    console.log("   Status: TRUE ✅");
    
    console.log("\n2. JPY Hedging Strategy");
    console.log(`   ID: ${predicateId}`);
    console.log("   Conditions: Tariffs > 15% AND Inflation > 5%");
    console.log("   Status: TRUE ✅");

  } catch (error) {
    console.error("\n❌ Error:", error.message);
  }
}

// Helper function to generate Chainlink function code
function generateChainlinkFunction(conditions, useAND) {
  return `
// Generated Chainlink Function for ${conditions.length} conditions
const makeRequest = async () => {
  try {
    const results = [];
    
    ${conditions.map((cond, i) => `
    // Condition ${i + 1}: ${cond.endpoint}
    const response${i} = await Functions.makeHttpRequest({
      url: "${cond.endpoint}",
      ${cond.authType !== "none" ? `headers: {
        ${cond.authType === "apiKey" ? `"X-API-Key": secrets.apiKey${i}` : `"Authorization": "Bearer " + secrets.token${i}`}
      },` : ""}
      timeout: 9000
    });
    
    if (!response${i}.error) {
      const value${i} = ${generatePathExtractor(cond.jsonPath, `response${i}.data`)};
      results.push(${cond.operator === 0 ? ">" : cond.operator === 1 ? "<" : "=="} ${cond.threshold});
    } else {
      results.push(false);
    }
    `).join("")}
    
    const finalResult = results.${useAND ? "every" : "some"}(r => r === true);
    return Functions.encodeUint256(finalResult ? 1 : 0);
    
  } catch (error) {
    return Functions.encodeUint256(0);
  }
};

return await makeRequest();
`;
}

function generatePathExtractor(path, dataVar) {
  const parts = path.split(".");
  return parts.reduce((acc, part) => `${acc}["${part}"]`, dataVar);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });