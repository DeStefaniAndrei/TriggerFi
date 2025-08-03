const { ethers } = require("hardhat");

/**
 * Test Chainlink Functions with proper formatting
 * This test creates a minimal Chainlink Function to identify the issue
 */

async function main() {
  console.log("🧪 Testing Chainlink Functions with Proper Formatting\n");

  const PREDICATE_ADDRESS = "0xd378Fbce97cD181Cd7A7EcCe32571f1a37E226ed";
  const [signer] = await ethers.getSigners();
  const predicate = await ethers.getContractAt("DynamicAPIPredicateTest", PREDICATE_ADDRESS);

  console.log("👤 Signer:", signer.address);
  console.log("📄 Contract:", PREDICATE_ADDRESS);

  // Create a VERY simple predicate with minimal Chainlink function
  console.log("\n📝 Creating minimal test predicate...");

  // Simple condition
  const testConditions = [{
    endpoint: "https://api.coinbase.com/v2/exchange-rates?currency=BTC",
    authType: "none",
    jsonPath: "data.rates.USD",
    operator: 0, // GREATER_THAN
    threshold: 1000 // BTC > $1000
  }];

  // Minimal Chainlink Function - just return 1
  // This is the EXACT format Chainlink expects
  const minimalFunction = `
const makeRequest = async () => {
  return Functions.encodeUint256(1);
};
return await makeRequest();
`;

  console.log("📄 Chainlink Function to deploy:");
  console.log(minimalFunction);

  try {
    // Create predicate with minimal function
    const createTx = await predicate.createPredicate(
      testConditions,
      true,
      ethers.toUtf8Bytes(minimalFunction)
    );
    
    console.log("\n⏳ Transaction sent:", createTx.hash);
    const receipt = await createTx.wait();
    
    // Get predicate ID
    const event = receipt.logs.find(log => {
      try {
        const parsed = predicate.interface.parseLog(log);
        return parsed.name === "PredicateCreated";
      } catch {
        return false;
      }
    });
    
    const predicateId = event ? predicate.interface.parseLog(event).args.predicateId : null;
    console.log("✅ Predicate created:", predicateId);

    if (!predicateId) {
      console.error("Failed to get predicate ID");
      return;
    }

    // Now test calling Chainlink Functions
    console.log("\n🚀 Testing Chainlink Functions call...");
    
    try {
      // First, let's check what the contract will send
      console.log("\n📊 Contract state before call:");
      console.log("- Chainlink Router:", await predicate.chainlinkFunctions());
      console.log("- Subscription ID:", await predicate.subscriptionId());
      console.log("- DON ID:", await predicate.donId());
      console.log("- Gas Limit:", await predicate.gasLimit());
      
      // Try the Chainlink call
      const checkTx = await predicate.checkConditions(predicateId, {
        gasLimit: 1000000
      });
      
      console.log("\n✅ Chainlink call sent!");
      console.log("Transaction:", checkTx.hash);
      
      const checkReceipt = await checkTx.wait();
      console.log("Gas used:", checkReceipt.gasUsed.toString());
      
      // Look for events
      console.log("\n📋 Events emitted:");
      for (const log of checkReceipt.logs) {
        try {
          const parsed = predicate.interface.parseLog(log);
          console.log("-", parsed.name);
        } catch {
          // Check if it's from Chainlink contract
          if (log.address.toLowerCase() !== PREDICATE_ADDRESS.toLowerCase()) {
            console.log("- Event from Chainlink:", log.address);
          }
        }
      }
      
      console.log("\n⏰ Waiting 30 seconds for Chainlink to process...");
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      // Check result
      const result = await predicate.checkCondition(predicateId);
      console.log("\n📊 Final predicate result:", result.toString() === "1" ? "TRUE ✅" : "FALSE ❌");
      
    } catch (error) {
      console.error("\n❌ Chainlink call failed:", error.message);
      
      // Try to decode the revert reason
      if (error.data) {
        console.log("\nError data:", error.data);
        
        // Common Chainlink errors
        const errorSignatures = {
          "0x1d0eb7e1": "OnlyRouterCanFulfill",
          "0x8969ab53": "InvalidCallbackGasLimit", 
          "0x2e6b18a4": "EmptySource",
          "0xa94ca626": "EmptySecrets",
          "0x4b4e5753": "EmptyArgs",
          "0x96834ad3": "NoInlineSecrets",
          "0xb1c1b9c7": "InvalidDONId"
        };
        
        const errorSig = error.data.slice(0, 10);
        if (errorSignatures[errorSig]) {
          console.log("Decoded error:", errorSignatures[errorSig]);
        }
      }
    }

  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });