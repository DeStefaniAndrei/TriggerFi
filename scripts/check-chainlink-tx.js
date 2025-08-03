const { ethers } = require("hardhat");

async function main() {
  const txHash = "0xabd39ade9f77e0733a15d7e8fe0e27618aa58bbe4c2e511b07fe608d9cf6a333";
  const predicateId = "0x20afb048b647c396ba93c821302d485fcd5ccdc247c5585bda51c6ed886a1e89";
  const PREDICATE_ADDRESS = "0xd378Fbce97cD181Cd7A7EcCe32571f1a37E226ed";
  
  console.log("🔍 Checking Chainlink transaction...\n");

  const [signer] = await ethers.getSigners();
  const predicate = await ethers.getContractAt("DynamicAPIPredicateTest", PREDICATE_ADDRESS);
  
  // Get receipt
  const receipt = await signer.provider.getTransactionReceipt(txHash);
  
  if (!receipt) {
    console.log("Transaction still pending...");
    return;
  }
  
  console.log("✅ Transaction confirmed!");
  console.log("Status:", receipt.status === 1 ? "Success ✅" : "Failed ❌");
  console.log("Gas used:", receipt.gasUsed.toString());
  console.log("Block:", receipt.blockNumber);
  
  // Check events
  console.log("\n📋 Events:");
  for (const log of receipt.logs) {
    try {
      const parsed = predicate.interface.parseLog(log);
      console.log(`- ${parsed.name} from our contract`);
      if (parsed.name === "RequestSent" && parsed.args) {
        console.log("  Request ID:", parsed.args.requestId);
      }
    } catch {
      if (log.address.toLowerCase() !== PREDICATE_ADDRESS.toLowerCase()) {
        console.log(`- Event from ${log.address} (Chainlink?)`);
        // Try to decode Chainlink events
        const topics = log.topics;
        if (topics[0] === "0x85e1543bf6f01c87cddb7e64237231f8c6dc03d7db606b31a3c8bd97f3e0b6be") {
          console.log("  This is OracleRequest event from Chainlink!");
          console.log("  Request ID:", topics[1]);
        }
      }
    }
  }
  
  // Check predicate state
  console.log("\n📊 Checking predicate state:");
  const result = await predicate.checkCondition(predicateId);
  const updateCount = await predicate.updateCount(predicateId);
  
  console.log("Current result:", result.toString() === "1" ? "TRUE" : "FALSE");
  console.log("Update count:", updateCount.toString());
  
  // Check if there's a mapped request
  console.log("\n🔗 Checking for Chainlink response...");
  console.log("Note: Chainlink usually takes 10-60 seconds to respond");
  
  // Monitor for PredicateChecked event
  console.log("\n⏰ Monitoring for updates (60 seconds)...");
  
  const filter = predicate.filters.PredicateChecked(predicateId);
  let foundUpdate = false;
  
  const checkForUpdate = async () => {
    const events = await predicate.queryFilter(filter, receipt.blockNumber);
    if (events.length > 0) {
      console.log("\n✅ Predicate updated by Chainlink!");
      const latestEvent = events[events.length - 1];
      console.log("Result:", latestEvent.args.result ? "TRUE" : "FALSE");
      console.log("Block:", latestEvent.blockNumber);
      foundUpdate = true;
    }
  };
  
  // Check every 5 seconds for 1 minute
  for (let i = 0; i < 12; i++) {
    await checkForUpdate();
    if (foundUpdate) break;
    if (i < 11) {
      process.stdout.write(".");
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  
  if (!foundUpdate) {
    console.log("\n⚠️  No update received yet. Chainlink might still be processing.");
    console.log("Check https://functions.chain.link for request status");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });