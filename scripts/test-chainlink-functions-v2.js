const { ethers } = require("hardhat");
const { CONTRACTS } = require("../lib/contracts");

// Test script to verify Chainlink Functions work with V2 contract
// This tests real Chainlink Functions execution and LINK consumption
async function main() {
  console.log("🧪 Testing Chainlink Functions with DynamicAPIPredicateV2");
  console.log("========================================================\n");

  const [signer] = await ethers.getSigners();
  console.log("👤 Testing with account:", signer.address);

  // Get V2 contract
  const predicateAddress = CONTRACTS.sepolia.dynamicAPIPredicateV2;
  console.log("📄 Using V2 contract:", predicateAddress);
  
  const predicate = await ethers.getContractAt(
    "DynamicAPIPredicateV2",
    predicateAddress,
    signer
  );

  // Check if contract is properly configured
  console.log("\n🔍 Checking contract configuration:");
  const subscriptionId = await predicate.subscriptionId();
  const donId = await predicate.donId();
  const keeper = await predicate.keeper();
  
  console.log(`   Subscription ID: ${subscriptionId}`);
  console.log(`   DON ID: ${donId}`);
  console.log(`   Keeper: ${keeper}`);
  console.log(`   Is signer the keeper? ${keeper.toLowerCase() === signer.address.toLowerCase()}`);

  // Create a simple test predicate
  console.log("\n📝 Creating test predicate...");
  
  // Simple condition to test: Check if ETH price > $3000
  const conditions = [{
    endpoint: "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
    authType: "none",
    jsonPath: "ethereum.usd",
    operator: 0, // > (greater than)
    threshold: ethers.parseUnits("3000", 0) // $3000
  }];

  // Chainlink Function code that will process the API response
  const chainlinkFunctionCode = `
const apiResponse = await Functions.makeHttpRequest({
  url: args[1], // API endpoint
  method: 'GET',
  timeout: 5000
});

if (apiResponse.error) {
  throw Error('Request failed');
}

const data = apiResponse.data;
let value = data;

// Parse JSON path (ethereum.usd)
const pathParts = args[3].split('.');
for (const part of pathParts) {
  value = value[part];
  if (value === undefined) {
    throw Error('Invalid JSON path');
  }
}

// Compare value with threshold
const threshold = parseInt(args[5]);
const operator = args[4];

let result = false;
if (operator === '>') {
  result = value > threshold;
} else if (operator === '<') {
  result = value < threshold;
} else if (operator === '=') {
  result = value === threshold;
}

return Functions.encodeUint256(result ? 1 : 0);
  `.trim();

  try {
    // Create predicate
    console.log("⏳ Creating predicate with conditions:");
    console.log(`   API: ${conditions[0].endpoint}`);
    console.log(`   Path: ${conditions[0].jsonPath}`);
    console.log(`   Condition: ETH price > $3000`);
    
    const tx = await predicate.createPredicate(
      conditions,
      true, // useAND (doesn't matter with single condition)
      ethers.toUtf8Bytes(chainlinkFunctionCode)
    );
    
    const receipt = await tx.wait();
    console.log(`✅ Predicate created in tx: ${receipt.hash}`);
    
    // Get predicate ID from event
    const event = receipt.logs.find(log => {
      try {
        const parsed = predicate.interface.parseLog(log);
        return parsed.name === "PredicateCreated";
      } catch {
        return false;
      }
    });
    
    const predicateId = predicate.interface.parseLog(event).args.predicateId;
    console.log(`📋 Predicate ID: ${predicateId}`);
    
    // Check initial state
    console.log("\n🔍 Checking initial predicate state:");
    const initialResult = await predicate.checkCondition(predicateId);
    console.log(`   Initial result: ${initialResult.toString()} (0 = not checked yet)`);
    
    // Trigger Chainlink Functions check
    console.log("\n🚀 Triggering Chainlink Functions check...");
    console.log("⚠️  This will consume LINK tokens from subscription #5385");
    
    let checkReceipt;
    try {
      const checkTx = await predicate.checkConditions(predicateId);
      checkReceipt = await checkTx.wait();
      console.log(`✅ Check triggered in tx: ${checkReceipt.hash}`);
    } catch (checkError) {
      console.error(`\n❌ Failed to trigger check: ${checkError.message}`);
      
      // Try to get more details about the error
      if (checkError.data) {
        console.log("Error data:", checkError.data);
      }
      
      throw checkError;
    }
    
    // Look for RequestSent event
    const requestEvent = checkReceipt.logs.find(log => {
      try {
        const parsed = predicate.interface.parseLog(log);
        return parsed.name === "RequestSent";
      } catch {
        return false;
      }
    });
    
    if (requestEvent) {
      const { requestId } = predicate.interface.parseLog(requestEvent).args;
      console.log(`📡 Chainlink request ID: ${requestId}`);
      console.log("\n⏳ Waiting for Chainlink to fulfill request...");
      console.log("   This typically takes 30-60 seconds");
      console.log("   Check https://functions.chain.link/sepolia/5385 for request status");
      
      // Wait for fulfillment
      let fulfilled = false;
      let attempts = 0;
      const maxAttempts = 20; // 2 minutes max
      
      while (!fulfilled && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 6000)); // Wait 6 seconds
        attempts++;
        
        // Check if result has been updated
        const currentResult = await predicate.checkCondition(predicateId);
        if (currentResult.toString() !== "0") {
          fulfilled = true;
          console.log(`\n✅ Request fulfilled! Result: ${currentResult.toString()}`);
          console.log(`   ETH price is ${currentResult.toString() === "1" ? ">" : "<="} $3000`);
        } else {
          process.stdout.write(".");
        }
      }
      
      if (!fulfilled) {
        console.log("\n⏱️  Request not fulfilled within 2 minutes");
        console.log("   Check the Chainlink dashboard for request status");
      }
      
      // Check final state
      console.log("\n📊 Final predicate state:");
      const finalResult = await predicate.checkCondition(predicateId);
      const updateCount = await predicate.updateCount(predicateId);
      console.log(`   Result: ${finalResult.toString()}`); 
      console.log(`   Update count: ${updateCount.toString()}`);
      console.log(`   Fees accumulated: $${updateCount.toString() * 2} USDC`);
      
    } else {
      console.log("❌ RequestSent event not found - check if contract is added as consumer");
    }
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    
    if (error.message.includes("Not subscribed")) {
      console.log("\n📝 Contract needs to be added as consumer:");
      console.log(`   1. Go to https://functions.chain.link/sepolia/5385`);
      console.log(`   2. Add consumer: ${predicateAddress}`);
      console.log(`   3. Ensure subscription has LINK balance`);
    }
  }
  
  console.log("\n✨ Test complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });