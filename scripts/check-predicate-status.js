const { ethers } = require("hardhat");
const { CONTRACTS, DYNAMIC_API_PREDICATE_ABI } = require("../lib/contracts");

async function main() {
  console.log("🔍 Checking Predicate Status");
  console.log("============================\n");

  const predicateId = "0xbc5941431f96e14d9afe0f2e885f3b7150f380862c6994c98f9a7847804b310f";
  console.log(`Predicate ID: ${predicateId}\n`);

  // Get signer
  const [signer] = await ethers.getSigners();

  // Connect to predicate contract
  const predicateContract = new ethers.Contract(
    CONTRACTS.sepolia.dynamicAPIPredicate,
    DYNAMIC_API_PREDICATE_ABI,
    signer
  );

  try {
    // Check if predicate exists
    console.log("1️⃣ Checking if predicate exists...");
    const result = await predicateContract.checkCondition(predicateId);
    console.log(`   ✅ Predicate exists!`);
    console.log(`   Condition result: ${result === 1n ? "TRUE (met)" : "FALSE (not met)"}\n`);

    // Get update count
    console.log("2️⃣ Checking update count...");
    const updateCount = await predicateContract.updateCount(predicateId);
    console.log(`   Update count: ${updateCount}`);
    
    // Get fees owed
    console.log("\n3️⃣ Checking fees owed...");
    const feesOwed = await predicateContract.getUpdateFees(predicateId);
    console.log(`   Fees owed: ${ethers.formatUnits(feesOwed, 6)} USDC`);
    console.log(`   ($2 per update × ${updateCount} updates = $${Number(ethers.formatUnits(feesOwed, 6))})`);
    
    // Calculate ETH equivalent
    const usdcAmount = Number(ethers.formatUnits(feesOwed, 6));
    const ethPriceUSD = 3500;
    const ethAmount = usdcAmount / ethPriceUSD;
    console.log(`   ETH equivalent: ${ethAmount.toFixed(6)} ETH (at $${ethPriceUSD}/ETH)\n`);

    // Get predicate configuration
    console.log("4️⃣ Checking predicate configuration...");
    const predicateConfig = await predicateContract.predicates(predicateId);
    console.log(`   Maker: ${predicateConfig[0]}`);
    console.log(`   Use AND logic: ${predicateConfig[1]}`);
    console.log(`   Last check time: ${predicateConfig[2]}`);
    console.log(`   Last result: ${predicateConfig[3]}`);
    
    if (predicateConfig[2] > 0n) {
      const lastCheckDate = new Date(Number(predicateConfig[2]) * 1000);
      console.log(`   Last checked: ${lastCheckDate.toLocaleString()}`);
    } else {
      console.log(`   ⚠️  Never checked by keeper yet!`);
    }

  } catch (error) {
    if (error.message.includes("Predicate not found")) {
      console.log("❌ Predicate not found in contract!");
      console.log("   The predicate needs to be created first.");
      console.log("   This happens when an order is created but the predicate hasn't been registered.");
    } else {
      console.error("❌ Error:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });