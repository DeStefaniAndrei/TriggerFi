const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Debugging Chainlink Functions Call\n");

  const PREDICATE_ADDRESS = "0xd378Fbce97cD181Cd7A7EcCe32571f1a37E226ed";
  const [signer] = await ethers.getSigners();
  const predicate = await ethers.getContractAt("DynamicAPIPredicateTest", PREDICATE_ADDRESS);

  // Use the predicate ID from previous test
  const predicateId = "0x85b1bb540ce3e1a0cbdbe30bc33ad86596e95b5ec2fd9cb93a336666c521b999";

  console.log("Contract address:", PREDICATE_ADDRESS);
  console.log("Predicate ID:", predicateId);
  console.log("Signer:", signer.address);

  // Check contract state
  console.log("\n📊 Contract Configuration:");
  console.log("Chainlink Functions:", await predicate.chainlinkFunctions());
  console.log("Subscription ID:", await predicate.subscriptionId());
  console.log("DON ID:", await predicate.donId());
  console.log("Gas Limit:", await predicate.gasLimit());
  console.log("Keeper:", await predicate.keeper());

  // Try to estimate gas for checkConditions
  console.log("\n⛽ Estimating gas for checkConditions...");
  try {
    const estimatedGas = await predicate.checkConditions.estimateGas(predicateId);
    console.log("Estimated gas:", estimatedGas.toString());
  } catch (error) {
    console.error("❌ Gas estimation failed:", error.message);
    
    // Try to decode the error
    if (error.data) {
      try {
        const decodedError = predicate.interface.parseError(error.data);
        console.log("Decoded error:", decodedError);
      } catch {
        console.log("Raw error data:", error.data);
      }
    }
  }

  // Try calling with explicit gas limit
  console.log("\n🚀 Attempting call with high gas limit...");
  try {
    const tx = await predicate.checkConditions(predicateId, {
      gasLimit: 1000000
    });
    console.log("✅ Transaction sent:", tx.hash);
  } catch (error) {
    console.error("❌ Call failed:", error.message);
    
    // Check if it's a specific revert reason
    if (error.reason) {
      console.log("Revert reason:", error.reason);
    }
  }

  // Check predicate existence
  console.log("\n🔍 Checking predicate existence...");
  try {
    // Try to call checkCondition to see if predicate exists
    const result = await predicate.checkCondition(predicateId);
    console.log("Predicate exists, current result:", result.toString() === "1" ? "TRUE" : "FALSE");
  } catch (error) {
    console.log("❌ Predicate might not exist:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });