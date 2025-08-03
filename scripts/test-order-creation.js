const { ethers } = require("hardhat");
const { generateChainlinkFunction } = require("../chainlink-function-generator");
const { createDynamicOrder, getOrderHash } = require("../1inch-sdk-integration");
const { saveOrder, savePredicateConfig } = require("../firebase-service-rtdb");

/**
 * Test script for full order creation flow
 * 
 * This script will:
 * 1. Create a predicate on-chain
 * 2. Create a 1inch order with that predicate
 * 3. Sign the order
 * 4. Store it in Firebase
 */

// Configuration
const PREDICATE_CONTRACT = "0xd378Fbce97cD181Cd7A7EcCe32571f1a37E226ed";

// Test tokens on Sepolia
const TEST_TOKENS = {
  WETH: "0xfff9976782d46cc05630d1f6ebab18b2324d6b14", // Wrapped ETH on Sepolia
  USDC: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8", // USDC on Sepolia (Aave)
  DAI: "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357"  // DAI on Sepolia (Aave)
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
  },
  {
    endpoint: "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
    authType: "none", 
    authValue: "",
    jsonPath: "ethereum.usd",
    operator: ">",
    threshold: "3000" // ETH > $3k
  }
];

async function main() {
  console.log("🚀 Testing Full Order Creation Flow");
  console.log("===================================\n");

  try {
    // Get signer
    const [signer] = await ethers.getSigners();
    console.log("👤 Using account:", signer.address);

    // Get contract instance
    const predicate = await ethers.getContractAt("DynamicAPIPredicateTest", PREDICATE_CONTRACT);
    console.log("📄 Predicate contract:", PREDICATE_CONTRACT);

    // Check if we're the keeper
    const keeper = await predicate.keeper();
    if (signer.address.toLowerCase() !== keeper.toLowerCase()) {
      console.error("❌ Error: You're not the keeper!");
      console.log("Your address:", signer.address);
      console.log("Keeper address:", keeper);
      return;
    }

    console.log("\n1️⃣ Creating Predicate on-chain");
    console.log("================================");

    // Generate Chainlink function
    const chainlinkFunction = generateChainlinkFunction(TEST_CONDITIONS, true); // AND logic
    console.log("📝 Generated Chainlink function (first 100 chars):");
    console.log(chainlinkFunction.substring(0, 100) + "...");

    // Convert conditions to contract format
    const contractConditions = TEST_CONDITIONS.map(cond => ({
      endpoint: cond.endpoint,
      authType: cond.authType,
      jsonPath: cond.jsonPath,
      operator: cond.operator === ">" ? 0 : cond.operator === "<" ? 1 : 2,
      threshold: ethers.parseUnits(cond.threshold, 0) // Convert to int256
    }));

    // Create predicate
    console.log("\n📤 Creating predicate on-chain...");
    const tx = await predicate.createPredicate(
      contractConditions,
      true, // AND logic
      ethers.toUtf8Bytes(chainlinkFunction)
    );

    console.log("⏳ Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Predicate created! Gas used:", receipt.gasUsed.toString());

    // Get predicate ID from event
    const event = receipt.logs.find(log => {
      try {
        const parsed = predicate.interface.parseLog(log);
        return parsed?.name === "PredicateCreated";
      } catch {
        return false;
      }
    });

    if (!event) {
      throw new Error("PredicateCreated event not found");
    }

    const parsed = predicate.interface.parseLog(event);
    const predicateId = parsed.args.predicateId;
    console.log("🆔 Predicate ID:", predicateId);

    // Save predicate config to Firebase
    console.log("\n💾 Saving predicate config to Firebase...");
    try {
      await savePredicateConfig(predicateId, {
        apiConditions: TEST_CONDITIONS,
        logicOperator: "AND",
        creator: signer.address,
        chainlinkFunction: chainlinkFunction
      });
      console.log("✅ Predicate config saved to Firebase");
    } catch (error) {
      console.log("⚠️  Firebase save failed (continuing anyway):", error.message);
    }

    console.log("\n2️⃣ Creating 1inch Order");
    console.log("========================");

    // Create order parameters
    const orderParams = {
      makerAsset: TEST_TOKENS.WETH,
      takerAsset: TEST_TOKENS.USDC,
      makingAmount: ethers.parseEther("0.1").toString(), // 0.1 WETH
      takingAmount: ethers.parseUnits("300", 6).toString(), // 300 USDC (6 decimals)
      predicateContract: PREDICATE_CONTRACT,
      predicateId: predicateId
    };

    console.log("\n📋 Order parameters:");
    console.log("  Maker asset (WETH):", orderParams.makerAsset);
    console.log("  Taker asset (USDC):", orderParams.takerAsset);
    console.log("  Making amount:", ethers.formatEther(orderParams.makingAmount), "WETH");
    console.log("  Taking amount:", ethers.formatUnits(orderParams.takingAmount, 6), "USDC");

    // Create 1inch order
    console.log("\n🔨 Creating 1inch order...");
    const orderResult = await createDynamicOrder(orderParams);
    console.log("✅ Order created successfully");

    // Add maker address to order
    const orderWithMaker = {
      ...orderResult.order,
      maker: signer.address,
      receiver: signer.address
    };

    // Update domain with Sepolia chainId
    const domain = {
      ...orderResult.domain,
      chainId: 11155111 // Sepolia
    };

    console.log("\n3️⃣ Signing Order");
    console.log("=================");

    // Sign the order
    const signature = await signer.signTypedData(
      domain,
      orderResult.types,
      orderWithMaker
    );
    console.log("✅ Order signed");
    console.log("📝 Signature:", signature.substring(0, 20) + "...");

    // Get order hash
    const orderHash = getOrderHash(orderWithMaker);
    console.log("🔐 Order hash:", orderHash);

    console.log("\n4️⃣ Storing Order in Firebase");
    console.log("=============================");

    // Save order to Firebase
    try {
      const orderId = await saveOrder(
        orderWithMaker,
        signature,
        predicateId,
        TEST_CONDITIONS,
        "AND",
        orderHash
      );
      console.log("✅ Order saved to Firebase!");
      console.log("🆔 Order ID:", orderId);
    } catch (error) {
      console.log("⚠️  Firebase save failed:", error.message);
      console.log("\n📋 Order data that would be saved:");
      console.log(JSON.stringify({
        order: orderWithMaker,
        signature: signature.substring(0, 20) + "...",
        predicateId: predicateId,
        orderHash: orderHash
      }, null, 2));
    }

    console.log("\n✨ Test Complete!");
    console.log("=================");
    console.log("\n📊 Summary:");
    console.log("  - Predicate ID:", predicateId);
    console.log("  - Order hash:", orderHash);
    console.log("  - Conditions: BTC > $100k AND ETH > $3k");
    console.log("  - Swap: 0.1 WETH → 300 USDC");
    console.log("\n🔍 What happens next:");
    console.log("  1. Keeper service monitors the predicate every 5 minutes");
    console.log("  2. When conditions are met, predicate returns true");
    console.log("  3. Taker bots can fill the order");
    console.log("  4. You receive USDC in exchange for WETH");

    // Test predicate verification
    console.log("\n5️⃣ Testing Predicate Verification");
    console.log("==================================");

    try {
      const isOrderValid = await predicate.isValidOrder(predicateId);
      console.log("📊 Current predicate result:", isOrderValid ? "TRUE ✅" : "FALSE ❌");

      // Manually set result for testing
      console.log("\n🔧 Setting test result to TRUE...");
      const setTx = await predicate.setTestResult(predicateId, true);
      await setTx.wait();
      console.log("✅ Test result set");

      const newResult = await predicate.isValidOrder(predicateId);
      console.log("📊 New predicate result:", newResult ? "TRUE ✅" : "FALSE ❌");
    } catch (error) {
      console.error("❌ Predicate verification error:", error.message);
    }

  } catch (error) {
    console.error("\n❌ Test failed:", error);
    console.error(error.stack);
  }
}

// Compile TypeScript files before running
async function compileTypeScript() {
  console.log("📦 Compiling TypeScript files...");
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);
  
  try {
    // Compile chainlink function generator
    await execPromise('npx tsc lib/chainlink-function-generator.ts --outDir . --esModuleInterop --resolveJsonModule --skipLibCheck');
    // Compile 1inch SDK integration  
    await execPromise('npx tsc lib/1inch-sdk-integration.ts --outDir . --esModuleInterop --resolveJsonModule --skipLibCheck');
    // Compile Firebase service
    await execPromise('npx tsc lib/firebase-service-v2.ts --outDir . --esModuleInterop --resolveJsonModule --skipLibCheck');
    console.log("✅ TypeScript compiled\n");
  } catch (error) {
    console.log("⚠️  Compilation warning (continuing anyway):", error.message);
  }
}

// Run the test
compileTypeScript()
  .then(() => main())
  .catch(error => {
    console.error(error);
    process.exit(1);
  });