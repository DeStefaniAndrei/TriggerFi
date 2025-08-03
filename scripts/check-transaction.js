const { ethers } = require("hardhat");

async function main() {
  const txHash = "0xced10ba547414c5336296793bbcba2a412cc86dec4f1d46579082f8c79f78526";
  console.log(`🔍 Checking transaction: ${txHash}\n`);

  try {
    // Get transaction receipt
    const receipt = await ethers.provider.getTransactionReceipt(txHash);
    
    if (!receipt) {
      console.log("⏳ Transaction not found or still pending...");
      return;
    }

    console.log("📄 Transaction Receipt:");
    console.log(`   Status: ${receipt.status === 1 ? "✅ Success" : "❌ Failed"}`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed}`);
    console.log(`   Contract: ${receipt.to}`);
    
    if (receipt.logs.length > 0) {
      console.log(`\n📝 Events (${receipt.logs.length} total):`);
      receipt.logs.forEach((log, i) => {
        console.log(`   Event ${i + 1}:`);
        console.log(`   - Address: ${log.address}`);
        console.log(`   - Topics: ${log.topics.length}`);
        if (log.topics[0]) {
          console.log(`   - Topic 0: ${log.topics[0].slice(0, 20)}...`);
        }
      });
    }

    // Get transaction details
    const tx = await ethers.provider.getTransaction(txHash);
    console.log(`\n💸 Transaction Details:`);
    console.log(`   From: ${tx.from}`);
    console.log(`   To: ${tx.to}`);
    console.log(`   Value: ${ethers.formatEther(tx.value)} ETH`);
    console.log(`   Data length: ${(tx.data.length - 2) / 2} bytes`);
    
    // Try to decode the function call
    if (tx.data.length > 10) {
      const functionSelector = tx.data.slice(0, 10);
      console.log(`   Function selector: ${functionSelector}`);
      
      // Known function selectors
      const knownSelectors = {
        "0x2e7ba6ef": "checkConditions(bytes32)",
        "0x8da5cb5b": "owner()",
        "0x0f0872f0": "getUpdateFees(bytes32)",
        "0x3013ce29": "collectFees(bytes32)"
      };
      
      if (knownSelectors[functionSelector]) {
        console.log(`   Function: ${knownSelectors[functionSelector]}`);
      }
    }

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