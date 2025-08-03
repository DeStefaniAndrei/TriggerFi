const { ethers } = require("hardhat");
const { CONTRACTS, DYNAMIC_API_PREDICATE_ABI } = require("../lib/contracts");
const { generateChainlinkFunction } = require("../lib/chainlink-function-generator");

async function main() {
  console.log("🔨 Creating Test Predicate");
  console.log("=========================\n");

  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("👤 Creating predicate as:", signer.address);

  // Connect to predicate contract
  const predicateContract = new ethers.Contract(
    CONTRACTS.sepolia.dynamicAPIPredicate,
    DYNAMIC_API_PREDICATE_ABI,
    signer
  );

  // Define test conditions (same as our JPY demo)
  const apiConditions = [
    {
      endpoint: "https://api.exchangerate-api.com/v4/latest/USD",
      authType: "none",
      jsonPath: "rates.JPY",
      operator: 0, // > (greater than)
      threshold: 150 // If USD/JPY > 150, it means JPY is weakening
    }
  ];

  console.log("📋 Predicate conditions:");
  console.log("   - Check if USD/JPY exchange rate > 150");
  console.log("   - Current rate should be ~147-150\n");

  try {
    // Generate Chainlink Function code
    console.log("🔧 Generating Chainlink Function code...");
    const functionCode = generateChainlinkFunction(apiConditions, true); // true for AND logic
    const functionCodeBytes = ethers.toUtf8Bytes(functionCode);
    
    // Create the predicate
    console.log("📝 Creating predicate on-chain...");
    const tx = await predicateContract.createPredicate(
      apiConditions,
      true, // useAND
      functionCodeBytes
    );
    
    console.log("⏳ Waiting for confirmation...");
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
    
    if (event) {
      const parsed = predicateContract.interface.parseLog(event);
      const predicateId = parsed.args[0];
      console.log(`\n✅ Predicate created successfully!`);
      console.log(`   Predicate ID: ${predicateId}`);
      console.log(`   Transaction: ${receipt.hash}`);
      console.log(`\n📝 Save this predicate ID for testing!`);
      
      // Now check if we can query it
      console.log("\n🔍 Verifying predicate exists...");
      const result = await predicateContract.checkCondition(predicateId);
      console.log(`   Condition result: ${result === 1n ? "TRUE" : "FALSE"} (expected FALSE until keeper updates)`);
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