const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Analyzing Contract Revert\n");

  const PREDICATE_ADDRESS = "0xd378Fbce97cD181Cd7A7EcCe32571f1a37E226ed";
  const [signer] = await ethers.getSigners();
  const predicate = await ethers.getContractAt("DynamicAPIPredicateTest", PREDICATE_ADDRESS);

  const predicateId = "0x85b1bb540ce3e1a0cbdbe30bc33ad86596e95b5ec2fd9cb93a336666c521b999";

  // Check if we can read predicate config
  console.log("📊 Checking predicate configuration...");
  
  try {
    // Get predicate info - check if it exists
    const predicateData = await predicate.predicates(predicateId);
    console.log("Maker address:", predicateData.maker || predicateData[0]);
    console.log("Use AND:", predicateData.useAND || predicateData[1]);
    console.log("Last check time:", predicateData.lastCheckTime?.toString() || predicateData[3]?.toString());
    console.log("Last result:", predicateData.lastResult || predicateData[4]);
  } catch (error) {
    console.error("Error reading predicate:", error.message);
  }

  // Let's try to understand what's happening in checkConditions
  console.log("\n🔍 Simulating checkConditions call...");

  // The function is reverting somewhere. Let's check each requirement:
  // 1. Caller must be keeper
  const keeper = await predicate.keeper();
  console.log("Keeper address:", keeper);
  console.log("Your address:", signer.address);
  console.log("Is keeper?", keeper.toLowerCase() === signer.address.toLowerCase());

  // 2. Predicate must exist (maker != address(0))
  // We already checked this above

  // 3. The issue might be in the Chainlink call itself
  console.log("\n🔗 Chainlink Configuration:");
  const chainlinkAddress = await predicate.chainlinkFunctions();
  console.log("Chainlink Functions address:", chainlinkAddress);

  // Let's check if the Chainlink contract exists
  const chainlinkCode = await signer.provider.getCode(chainlinkAddress);
  console.log("Chainlink contract exists?", chainlinkCode !== "0x" ? "YES ✅" : "NO ❌");

  // Try a static call to see where it fails
  console.log("\n🧪 Attempting static call...");
  try {
    // This won't actually send a transaction, just simulates it
    await predicate.checkConditions.staticCall(predicateId);
    console.log("✅ Static call succeeded (shouldn't happen)");
  } catch (error) {
    console.error("❌ Static call failed:", error.message);
    
    // Try to get more details
    if (error.data) {
      console.log("\nError data:", error.data);
      
      // Common Chainlink errors
      if (error.message.includes("InvalidConsumer")) {
        console.log("\n⚠️  Contract is not authorized as a consumer!");
        console.log("Make sure", PREDICATE_ADDRESS, "is added to subscription", await predicate.subscriptionId());
      }
    }
  }

  // Check if the issue is with the JavaScript code
  console.log("\n📄 Checking stored Chainlink function...");
  try {
    // We need to read the predicate's chainlinkFunction field
    // This might require a custom getter or we need to parse the struct
    console.log("Note: Cannot directly read chainlinkFunction from public mapping");
    console.log("The function code was stored during createPredicate");
  } catch (error) {
    console.log("Error:", error.message);
  }
}

main()
  .then(() => {
    console.log("\nAnalysis complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    console.error(error.stack);
    process.exit(1);
  });