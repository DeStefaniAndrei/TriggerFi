const { ethers } = require("hardhat");

async function main() {
  const txHash = "0x8584ab77ac6e1a71ccc5059cbca9554741a80d482f6f8d147a8db5ef735de6c2";
  console.log(`🔍 Checking failed transaction: ${txHash}\n`);

  try {
    // Get transaction receipt
    const receipt = await ethers.provider.getTransactionReceipt(txHash);
    console.log("📄 Transaction Receipt:");
    console.log(`   Status: ${receipt.status === 1 ? "✅ Success" : "❌ Failed"}`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed} / ${receipt.gasLimit || "?"}`);
    console.log(`   Reverted at: ${Math.round((Number(receipt.gasUsed) / 500000) * 100)}% of gas limit\n`);

    // Get transaction
    const tx = await ethers.provider.getTransaction(txHash);
    console.log("💸 Transaction Details:");
    console.log(`   From: ${tx.from}`);
    console.log(`   To: ${tx.to}`);
    console.log(`   Gas limit: ${tx.gasLimit}`);
    console.log(`   Data: ${tx.data}\n`);

    // Decode function call
    if (tx.data && tx.data.length > 10) {
      console.log("🔧 Function Call:");
      const selector = tx.data.slice(0, 10);
      console.log(`   Selector: ${selector}`);
      
      // Try to decode as checkConditions(bytes32)
      if (selector === "0x6ed2ff0b") {
        console.log(`   Function: checkConditions(bytes32)`);
        const predicateId = "0x" + tx.data.slice(10, 74);
        console.log(`   Predicate ID: ${predicateId}`);
      }
    }

    // Suggest debugging steps
    console.log("\n💡 Debugging suggestions:");
    console.log("1. The transaction used exactly 330,001 gas (suspicious round number)");
    console.log("2. This suggests it hit the exact gas limit set in the contract");
    console.log("3. The Chainlink Function might need more gas than 300,000");
    console.log("\n📝 Possible issues:");
    console.log("- Chainlink Functions Router not properly configured");
    console.log("- Subscription not funded or contract not added as consumer");
    console.log("- Function code too complex for gas limit");
    console.log("- Error in the JavaScript function code itself");

    // Check if it's a Chainlink issue
    console.log("\n🔗 To verify Chainlink setup:");
    console.log("1. Check subscription at: https://functions.chain.link/sepolia/5385");
    console.log("2. Ensure contract 0xd378Fbce97cD181Cd7A7EcCe32571f1a37E226ed is a consumer");
    console.log("3. Verify subscription has LINK balance");

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });