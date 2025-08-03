const { ethers } = require("hardhat");

async function main() {
  const txHash = "0x1cea6177a5d5d179215d9866a9c1be462e015ec24350306f81ad7f82e10da04f";
  console.log("🔍 Checking transaction status...\n");

  const [signer] = await ethers.getSigners();
  const provider = signer.provider;

  // Get transaction receipt
  const receipt = await provider.getTransactionReceipt(txHash);
  
  if (!receipt) {
    console.log("⏳ Transaction pending or not found");
    return;
  }

  console.log("✅ Transaction confirmed!");
  console.log("Block number:", receipt.blockNumber);
  console.log("Gas used:", receipt.gasUsed.toString());
  console.log("Status:", receipt.status === 1 ? "Success ✅" : "Failed ❌");

  if (receipt.status === 0) {
    // Transaction failed
    console.log("\n❌ Transaction reverted");
    
    // Try to get more info
    const tx = await provider.getTransaction(txHash);
    console.log("\nTransaction details:");
    console.log("To:", tx.to);
    console.log("Data:", tx.data.substring(0, 100) + "...");
  } else {
    // Transaction succeeded
    console.log("\n📋 Events emitted:", receipt.logs.length);
    
    // Get contract to parse events
    const PREDICATE_ADDRESS = "0xd378Fbce97cD181Cd7A7EcCe32571f1a37E226ed";
    const predicate = await ethers.getContractAt("DynamicAPIPredicateTest", PREDICATE_ADDRESS);
    
    receipt.logs.forEach((log, i) => {
      try {
        const parsed = predicate.interface.parseLog(log);
        console.log(`\nEvent ${i}: ${parsed.name}`);
        if (parsed.args) {
          Object.keys(parsed.args).forEach(key => {
            if (isNaN(key)) { // Skip numeric indices
              console.log(`  ${key}:`, parsed.args[key].toString());
            }
          });
        }
      } catch {
        console.log(`\nEvent ${i}: Unknown event from ${log.address}`);
      }
    });

    // Check the update count
    const predicateId = "0x85b1bb540ce3e1a0cbdbe30bc33ad86596e95b5ec2fd9cb93a336666c521b999";
    const updateCount = await predicate.updateCount(predicateId);
    console.log("\n📊 Update count after transaction:", updateCount.toString());
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });