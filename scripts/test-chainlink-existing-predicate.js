/**
 * Test Chainlink Functions with Existing Predicate
 * 
 * This script tests calling Chainlink Functions on our existing JPY predicate.
 * It will consume LINK tokens from your subscription.
 */

const { ethers } = require("hardhat");
const { CONTRACTS, DYNAMIC_API_PREDICATE_ABI } = require("../lib/contracts");

async function main() {
  console.log("🔗 Testing Chainlink Functions with Existing Predicate");
  console.log("=====================================================\n");

  const predicateId = "0xbc5941431f96e14d9afe0f2e885f3b7150f380862c6994c98f9a7847804b310f";
  console.log(`Predicate ID: ${predicateId}`);
  console.log("This predicate checks:");
  console.log("  1. USD/JPY > 145 from exchangerate-api.com");
  console.log("  2. USD/JPY > 145 from coinbase.com");
  console.log("  Both conditions must be TRUE (AND logic)\n");

  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("👤 Calling as:", signer.address);

  // Connect to predicate contract
  const predicateContract = new ethers.Contract(
    CONTRACTS.sepolia.dynamicAPIPredicate,
    DYNAMIC_API_PREDICATE_ABI,
    signer
  );

  try {
    // Check current state before calling
    console.log("📊 Current state:");
    const currentResult = await predicateContract.checkCondition(predicateId);
    console.log(`   Condition result: ${currentResult === 1n ? "TRUE" : "FALSE"}`);
    
    const updateCountBefore = await predicateContract.updateCount(predicateId);
    console.log(`   Update count: ${updateCountBefore}`);
    console.log(`   Total fees owed: $${Number(updateCountBefore) * 2} USD\n`);

    // Check if we're the keeper
    const keeper = await predicateContract.keeper();
    if (keeper.toLowerCase() !== signer.address.toLowerCase()) {
      console.log("⚠️  Warning: You're not the authorized keeper");
      console.log(`   Keeper: ${keeper}`);
      console.log(`   You: ${signer.address}`);
      console.log("   This call will fail\n");
      return;
    }

    console.log("✅ You are the authorized keeper\n");

    // Estimate gas
    console.log("⛽ Estimating gas...");
    const gasEstimate = await predicateContract.checkConditions.estimateGas(predicateId);
    console.log(`   Estimated gas: ${gasEstimate}`);
    console.log(`   Gas limit will be: ${gasEstimate * 120n / 100n} (20% buffer)\n`);

    // Call checkConditions - this triggers Chainlink Functions
    console.log("🚀 Calling checkConditions to trigger Chainlink Functions...");
    console.log("   This will:");
    console.log("   1. Execute Chainlink Function on DON");
    console.log("   2. Make HTTP requests to both APIs");
    console.log("   3. Process responses and check conditions");
    console.log("   4. Call fulfillRequest to update on-chain state");
    console.log("   5. Consume LINK from subscription #5385\n");

    const tx = await predicateContract.checkConditions(predicateId, {
      gasLimit: gasEstimate * 120n / 100n // 20% buffer
    });
    console.log(`📤 Transaction sent: ${tx.hash}`);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed}`);
    console.log(`   Transaction cost: ${ethers.formatEther(receipt.gasUsed * receipt.gasPrice)} ETH\n`);

    // Parse events
    console.log("📝 Transaction events:");
    for (const log of receipt.logs) {
      try {
        const parsed = predicateContract.interface.parseLog(log);
        if (parsed) {
          console.log(`   Event: ${parsed.name}`);
          if (parsed.name === "RequestSent" || parsed.name === "FunctionsRequest") {
            console.log(`   Request ID: ${parsed.args[0] || parsed.args.requestId}`);
          }
        }
      } catch {}
    }

    // The Chainlink Function will be executed asynchronously
    console.log("\n⏱️  Chainlink Function is now executing...");
    console.log("   Expected execution time: 10-30 seconds");
    console.log("   The DON will:");
    console.log("   - Fetch USD/JPY from exchangerate-api.com");
    console.log("   - Fetch USD/JPY from coinbase.com");
    console.log("   - Compare both values > 145");
    console.log("   - Return TRUE if both conditions met\n");
    
    // Monitor for updates
    console.log("📊 Monitoring for updates (60 seconds)...");
    let lastResult = currentResult;
    let resultChanged = false;
    
    for (let i = 0; i < 12; i++) { // Check every 5 seconds for 60 seconds
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const newResult = await predicateContract.checkCondition(predicateId);
      const updateCount = await predicateContract.updateCount(predicateId);
      
      if (newResult !== lastResult || updateCount > updateCountBefore) {
        console.log(`\n🎉 Update detected at ${new Date().toLocaleTimeString()}!`);
        console.log(`   Condition result: ${newResult === 1n ? "TRUE" : "FALSE"}`);
        console.log(`   Update count: ${updateCount}`);
        resultChanged = true;
        break;
      }
      
      process.stdout.write(".");
    }

    if (!resultChanged) {
      console.log("\n\n⚠️  No update detected yet");
      console.log("   The Chainlink Function might still be processing");
      console.log("   Check back in a minute\n");
    }

    // Final state check
    console.log("\n📊 Final state:");
    const finalResult = await predicateContract.checkCondition(predicateId);
    console.log(`   Condition result: ${finalResult === 1n ? "TRUE" : "FALSE"}`);
    
    const updateCountAfter = await predicateContract.updateCount(predicateId);
    console.log(`   Update count: ${updateCountAfter}`);
    console.log(`   Updates performed: ${updateCountAfter - updateCountBefore}`);

    console.log("\n💰 Fee calculation:");
    const fees = await predicateContract.getUpdateFees(predicateId);
    console.log(`   Total fees owed: ${ethers.formatUnits(fees, 6)} USDC`);
    console.log(`   New updates: ${Number(updateCountAfter) - Number(updateCountBefore)} × $2 = $${(Number(updateCountAfter) - Number(updateCountBefore)) * 2}`);

    console.log("\n✅ Chainlink Functions test complete!");
    console.log("\n📋 Check your subscription for LINK usage:");
    console.log("   https://functions.chain.link/sepolia/5385");
    console.log("\n💡 Note: If no LINK was consumed, the function might have failed");
    console.log("   Check contract events on Etherscan for error details");

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    
    if (error.message.includes("Only keeper")) {
      console.log("\n💡 Solution: You're not the authorized keeper");
      const keeper = await predicateContract.keeper();
      console.log(`   Current keeper: ${keeper}`);
      console.log(`   Your address: ${signer.address}`);
    } else if (error.message.includes("Predicate not found")) {
      console.log("\n💡 The predicate hasn't been created yet");
      console.log("   Run the keeper service first to create it");
    } else if (error.message.includes("insufficient funds")) {
      console.log("\n💡 Your wallet needs more Sepolia ETH for gas");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });