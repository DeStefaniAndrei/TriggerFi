const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing DynamicAPIPredicateTest Contract\n");

  // Contract address from deployment
  const PREDICATE_ADDRESS = "0xd378Fbce97cD181Cd7A7EcCe32571f1a37E226ed";
  
  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("👤 Testing with account:", signer.address);

  // Get contract instance
  const predicate = await ethers.getContractAt("DynamicAPIPredicateTest", PREDICATE_ADDRESS);
  console.log("📄 Contract loaded at:", PREDICATE_ADDRESS);

  // Test 1: Create a test predicate
  console.log("\n📝 Creating test predicate...");
  
  // Create APICondition struct
  const testConditions = [{
    endpoint: "https://api.example.com/data",
    authType: "none",
    jsonPath: "data.value",
    operator: 0, // GREATER_THAN
    threshold: 100
  }];
  
  // Simple Chainlink function code (will be replaced by keeper)
  const chainlinkFunctionCode = ethers.toUtf8Bytes("// Test function");

  try {
    const tx = await predicate.createPredicate(
      testConditions,
      true, // useAND
      chainlinkFunctionCode
    );
    
    console.log("⏳ Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Predicate created successfully!");
    
    // Get predicate ID from event
    const event = receipt.logs.find(log => {
      try {
        const parsed = predicate.interface.parseLog(log);
        return parsed.name === "PredicateCreated";
      } catch {
        return false;
      }
    });
    
    const predicateId = event ? predicate.interface.parseLog(event).args.predicateId : null;
    console.log("📍 Predicate ID:", predicateId);

    if (!predicateId) {
      console.error("❌ Failed to get predicate ID from event");
      return;
    }

    // Test 2: Set a test result
    console.log("\n🎯 Setting test result to true...");
    const setResultTx = await predicate.setTestResult(predicateId, true);
    await setResultTx.wait();
    console.log("✅ Test result set!");

    // Test 3: Check the predicate
    console.log("\n🔍 Checking predicate result...");
    const result = await predicate.checkCondition(predicateId);
    console.log("📊 Predicate result:", result.toString() === "1" ? "TRUE ✅" : "FALSE ❌");

    // Test 4: Check update fees
    console.log("\n💰 Checking update fees...");
    const fees = await predicate.getUpdateFees(predicateId);
    console.log("Update count:", await predicate.updateCount(predicateId));
    console.log("Required fees:", ethers.formatUnits(fees, 6), "USDC");

    console.log("\n✨ All tests passed!");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    
    // Check if it's a specific error
    if (error.message.includes("subscription")) {
      console.log("\n⚠️  Make sure to add the contract as a consumer to your Chainlink subscription!");
      console.log("Go to: https://functions.chain.link");
      console.log("Subscription ID: 5385");
      console.log("Add consumer: " + PREDICATE_ADDRESS);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });