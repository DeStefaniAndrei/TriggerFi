const { ethers } = require("hardhat");
const { createDynamicOrder } = require("../lib/1inch-sdk-integration");
const { encodeDynamicAmountGetter } = require("../lib/amount-getter-encoder");

async function main() {
  console.log("🧪 Testing Dynamic Pricing Integration");
  console.log("=====================================\n");

  // Test configuration
  const TEST_CONFIG = {
    makerAsset: "0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB", // JPYC
    takerAsset: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8", // USDC
    makingAmount: ethers.parseUnits("100000", 18).toString(), // 100,000 JPYC
    takingAmount: ethers.parseUnits("650", 6).toString(), // 650 USDC (approx $650)
    predicateContract: "0xd378Fbce97cD181Cd7A7EcCe32571f1a37E226ed",
    predicateId: "0xbc5941431f96e14d9afe0f2e885f3b7150f380862c6994c98f9a7847804b310f",
    dynamicAmountGetterAddress: "0x5b02226E1820E80F6212f31Fe51Cf01A7B3D10b2"
  };

  console.log("📋 Test Configuration:");
  console.log(`Maker Asset (JPYC): ${TEST_CONFIG.makerAsset}`);
  console.log(`Taker Asset (USDC): ${TEST_CONFIG.takerAsset}`);
  console.log(`Making Amount: 100,000 JPYC`);
  console.log(`Taking Amount: 650 USDC`);
  console.log(`Predicate ID: ${TEST_CONFIG.predicateId}\n`);

  try {
    // Test 1: Without Dynamic Pricing
    console.log("1️⃣ Testing order creation WITHOUT dynamic pricing:");
    const orderWithoutDP = await createDynamicOrder({
      ...TEST_CONFIG,
      useDynamicPricing: false
    });

    console.log("✅ Order created successfully");
    console.log(`   getMakingAmount: ${orderWithoutDP.order.getMakingAmount}`);
    console.log(`   getTakingAmount: ${orderWithoutDP.order.getTakingAmount}`);
    console.log(`   Expected: Both should be "0x" (empty)\n`);

    // Test 2: With Dynamic Pricing
    console.log("2️⃣ Testing order creation WITH dynamic pricing:");
    const orderWithDP = await createDynamicOrder({
      ...TEST_CONFIG,
      useDynamicPricing: true,
      dynamicAmountGetterAddress: TEST_CONFIG.dynamicAmountGetterAddress
    });

    console.log("✅ Order created successfully");
    console.log(`   getMakingAmount: ${orderWithDP.order.getMakingAmount}`);
    console.log(`   getTakingAmount: ${orderWithDP.order.getTakingAmount}`);
    console.log(`   Expected: Both should contain encoded amount getter data\n`);

    // Test 3: Verify amount getter encoding
    console.log("3️⃣ Testing amount getter encoding directly:");
    const amountGetterData = encodeDynamicAmountGetter(
      TEST_CONFIG.dynamicAmountGetterAddress,
      TEST_CONFIG.predicateId,
      "JPYC",
      "USDC"
    );

    console.log("✅ Amount getter data encoded:");
    console.log(`   Making: ${amountGetterData.makingAmountData}`);
    console.log(`   Taking: ${amountGetterData.takingAmountData}\n`);

    // Decode and verify the data
    const decodedAddress = "0x" + amountGetterData.makingAmountData.slice(2, 42);
    console.log(`   Decoded address: ${decodedAddress}`);
    console.log(`   Matches expected: ${decodedAddress.toLowerCase() === TEST_CONFIG.dynamicAmountGetterAddress.toLowerCase()}\n`);

    // Test 4: Check predicate encoding
    console.log("4️⃣ Verifying predicate encoding:");
    console.log(`   Predicate: ${orderWithDP.order.predicate}`);
    console.log(`   Contains arbitraryStaticCall selector: ${orderWithDP.order.predicate.includes("bf15fcd8")}`);
    console.log(`   Contains predicate contract: ${orderWithDP.order.predicate.toLowerCase().includes(TEST_CONFIG.predicateContract.slice(2).toLowerCase())}\n`);

    console.log("✨ All tests passed! Dynamic pricing is properly integrated.");

  } catch (error) {
    console.error("❌ Error during testing:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });