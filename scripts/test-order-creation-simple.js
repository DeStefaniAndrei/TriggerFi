const { ethers } = require("hardhat");
const { generateChainlinkFunction } = require("../chainlink-function-generator");
const { createDynamicOrder, getOrderHash } = require("../1inch-sdk-integration");

/**
 * Simplified test script for order creation flow (without Firebase)
 */

// Configuration
const PREDICATE_CONTRACT = "0xd378Fbce97cD181Cd7A7EcCe32571f1a37E226ed";

// Test tokens on Sepolia
const TEST_TOKENS = {
  WETH: "0xfff9976782d46cc05630d1f6ebab18b2324d6b14", // Wrapped ETH on Sepolia
  USDC: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8", // USDC on Sepolia (Aave)
};

// Test API conditions
const TEST_CONDITIONS = [
  {
    endpoint: "https://api.coinbase.com/v2/exchange-rates?currency=BTC",
    authType: "none",
    authValue: "",
    jsonPath: "data.rates.USD",
    operator: ">",
    threshold: "100000" // BTC > $100k
  }
];

async function main() {
  console.log("🚀 Testing Order Creation (Simplified)");
  console.log("=====================================\n");

  try {
    const [signer] = await ethers.getSigners();
    console.log("👤 Using account:", signer.address);

    const predicate = await ethers.getContractAt("DynamicAPIPredicateTest", PREDICATE_CONTRACT);
    console.log("📄 Predicate contract:", PREDICATE_CONTRACT);

    // Check keeper
    const keeper = await predicate.keeper();
    if (signer.address.toLowerCase() !== keeper.toLowerCase()) {
      console.error("❌ Error: You're not the keeper!");
      return;
    }
    console.log("✅ Keeper verified\n");

    // Step 1: Create predicate
    console.log("1️⃣ Creating Predicate");
    console.log("======================");

    const chainlinkFunction = generateChainlinkFunction(TEST_CONDITIONS, true);
    const contractConditions = TEST_CONDITIONS.map(cond => ({
      endpoint: cond.endpoint,
      authType: cond.authType,
      jsonPath: cond.jsonPath,
      operator: cond.operator === ">" ? 0 : cond.operator === "<" ? 1 : 2,
      threshold: ethers.parseUnits(cond.threshold, 0)
    }));

    const tx = await predicate.createPredicate(
      contractConditions,
      true, // AND logic
      ethers.toUtf8Bytes(chainlinkFunction)
    );

    console.log("⏳ Tx sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Predicate created! Gas:", receipt.gasUsed.toString());

    // Get predicate ID
    const event = receipt.logs.find(log => {
      try {
        const parsed = predicate.interface.parseLog(log);
        return parsed?.name === "PredicateCreated";
      } catch {
        return false;
      }
    });

    if (!event) throw new Error("PredicateCreated event not found");
    
    const parsed = predicate.interface.parseLog(event);
    const predicateId = parsed.args.predicateId;
    console.log("🆔 Predicate ID:", predicateId);

    // Step 2: Create 1inch order
    console.log("\n2️⃣ Creating 1inch Order");
    console.log("========================");

    const orderParams = {
      makerAsset: TEST_TOKENS.WETH,
      takerAsset: TEST_TOKENS.USDC,
      makingAmount: ethers.parseEther("0.01").toString(), // 0.01 WETH
      takingAmount: ethers.parseUnits("30", 6).toString(), // 30 USDC
      predicateContract: PREDICATE_CONTRACT,
      predicateId: predicateId
    };

    console.log("📋 Order params:");
    console.log("  Swap:", ethers.formatEther(orderParams.makingAmount), "WETH →", 
                ethers.formatUnits(orderParams.takingAmount, 6), "USDC");

    const orderResult = await createDynamicOrder(orderParams);
    console.log("✅ Order structure created");

    const orderWithMaker = {
      ...orderResult.order,
      maker: signer.address,
      receiver: signer.address
    };

    const domain = {
      ...orderResult.domain,
      chainId: 11155111 // Sepolia
    };

    // Step 3: Sign order
    console.log("\n3️⃣ Signing Order");
    console.log("=================");

    const signature = await signer.signTypedData(
      domain,
      orderResult.types,
      orderWithMaker
    );
    console.log("✅ Order signed");

    const orderHash = getOrderHash(orderWithMaker);
    console.log("🔐 Order hash:", orderHash);

    // Step 4: Test predicate
    console.log("\n4️⃣ Testing Predicate");
    console.log("====================");

    // Check current state
    const isValid = await predicate.checkCondition(predicateId);
    console.log("📊 Current state:", isValid.toString() === "1" ? "TRUE ✅" : "FALSE ❌");

    // Set test result
    console.log("\n🔧 Setting test result to TRUE...");
    const setTx = await predicate.setTestResult(predicateId, true);
    await setTx.wait();
    console.log("✅ Test result set");

    const newState = await predicate.checkCondition(predicateId);
    console.log("📊 New state:", newState.toString() === "1" ? "TRUE ✅" : "FALSE ❌");

    // Summary
    console.log("\n✨ Test Complete!");
    console.log("==================");
    console.log("\n📋 Order Summary:");
    console.log("  Predicate ID:", predicateId);
    console.log("  Order hash:", orderHash);
    console.log("  Condition: BTC > $100,000");
    console.log("  Swap: 0.01 WETH → 30 USDC");
    console.log("  Predicate state:", newState.toString() === "1" ? "TRUE (test mode)" : "FALSE");
    console.log("\n🎯 Next Steps:");
    console.log("  1. Save order data to your database");
    console.log("  2. Run keeper service to monitor conditions");
    console.log("  3. When conditions are met, taker can execute");

    // Output order data for manual storage
    console.log("\n📦 Order Data (for manual storage):");
    console.log(JSON.stringify({
      orderId: `${signer.address}-${Date.now()}`,
      orderHash: orderHash,
      predicateId: predicateId,
      order: orderWithMaker,
      signature: signature,
      apiConditions: TEST_CONDITIONS,
      logicOperator: "AND",
      status: "active"
    }, null, 2));

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error);
  }
}

// Run the test
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });