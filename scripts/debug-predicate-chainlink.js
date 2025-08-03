const { ethers } = require("hardhat");
const { CONTRACTS, DYNAMIC_API_PREDICATE_ABI } = require("../lib/contracts");

async function main() {
  console.log("🔍 Debugging Predicate Chainlink Setup");
  console.log("=====================================\n");

  const predicateId = "0xbc5941431f96e14d9afe0f2e885f3b7150f380862c6994c98f9a7847804b310f";
  const [signer] = await ethers.getSigners();

  // Get contract with extended ABI
  const extendedABI = [
    ...DYNAMIC_API_PREDICATE_ABI,
    "function predicates(bytes32) view returns (address maker, bool, bytes, uint256, bool)",
    "function chainlinkFunctions() view returns (address)",
    "function subscriptionId() view returns (uint64)",
    "function gasLimit() view returns (uint32)",
    "function donId() view returns (bytes32)",
    "function requestToPredicate(bytes32) view returns (bytes32)"
  ];

  const predicateContract = new ethers.Contract(
    CONTRACTS.sepolia.dynamicAPIPredicate,
    extendedABI,
    signer
  );

  try {
    console.log("📋 Contract Configuration:");
    console.log(`   Address: ${predicateContract.target}`);
    console.log(`   Keeper: ${await predicateContract.keeper()}`);
    
    // Check Chainlink configuration
    console.log("\n🔗 Chainlink Configuration:");
    const chainlinkAddr = await predicateContract.chainlinkFunctions();
    console.log(`   Chainlink Functions: ${chainlinkAddr}`);
    console.log(`   Subscription ID: ${await predicateContract.subscriptionId()}`);
    console.log(`   Gas Limit: ${await predicateContract.gasLimit()}`);
    const donId = await predicateContract.donId();
    console.log(`   DON ID: ${donId}`);

    // Check predicate details
    console.log("\n📊 Predicate Details:");
    try {
      const predicateData = await predicateContract.predicates(predicateId);
      console.log(`   Maker: ${predicateData[0]}`);
      console.log(`   Use AND: ${predicateData[1]}`);
      console.log(`   Function Code Length: ${predicateData[2].length} bytes`);
      console.log(`   Last Check Time: ${predicateData[3]}`);
      console.log(`   Last Result: ${predicateData[4]}`);
      
      // Show first 200 chars of function code
      if (predicateData[2].length > 0) {
        const functionCode = ethers.toUtf8String(predicateData[2]);
        console.log(`\n📄 Chainlink Function Code (preview):`);
        console.log(functionCode.substring(0, 200) + "...");
      }
    } catch (e) {
      console.log("   ❌ Error reading predicate data:", e.message);
    }

    // Try to understand why checkConditions might fail
    console.log("\n🔍 Debugging checkConditions requirements:");
    
    // 1. Check if predicate exists
    try {
      const result = await predicateContract.checkCondition(predicateId);
      console.log(`   ✅ Predicate exists (current result: ${result === 1n ? "TRUE" : "FALSE"})`);
    } catch (e) {
      console.log(`   ❌ Predicate doesn't exist: ${e.message}`);
      return;
    }

    // 2. Check if caller is keeper
    if (signer.address.toLowerCase() === (await predicateContract.keeper()).toLowerCase()) {
      console.log(`   ✅ You are the keeper`);
    } else {
      console.log(`   ❌ You are NOT the keeper`);
      return;
    }

    // 3. Try calling with explicit gas limit
    console.log("\n🚀 Attempting to call checkConditions with explicit gas...");
    try {
      const tx = await predicateContract.checkConditions(predicateId, {
        gasLimit: 500000 // Fixed gas limit
      });
      console.log(`   ✅ Transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`   ✅ Transaction confirmed! Gas used: ${receipt.gasUsed}`);
    } catch (e) {
      console.log(`   ❌ Transaction failed: ${e.message}`);
      
      // Try to decode the error
      if (e.data) {
        console.log(`   Error data: ${e.data}`);
        try {
          const errorName = predicateContract.interface.parseError(e.data);
          console.log(`   Decoded error: ${errorName}`);
        } catch {}
      }
    }

  } catch (error) {
    console.error("\n❌ Error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });