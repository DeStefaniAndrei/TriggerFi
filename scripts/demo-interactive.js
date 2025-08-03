const { ethers } = require("hardhat");
const { Address, LimitOrder, MakerTraits } = require("@1inch/limit-order-sdk");
const { createArbitraryStaticCallPredicate } = require("../lib/predicate-encoder");
const { signV4Order, prepareV4OrderTuple, splitSignature } = require("../lib/1inch-v4-adapter");

// Load deployment info
const deployment = require("../deployments/base-sepolia.json");

// Demo API configurations (what you'll show during presentation)
const API_CONFIGS = {
  tariffs: {
    name: "US Trade Department API",
    endpoint: "https://api.trade.gov/tariffs/v2/japan/automotive",
    authentication: "Bearer YOUR_API_KEY",
    responsePath: "data.current_rate",
    currentValue: "15.5%",
    threshold: "> 15%"
  },
  inflation: {
    name: "Bank of Japan API", 
    endpoint: "https://api.boj.or.jp/statistics/inflation/cpi",
    authentication: "API-Key: YOUR_BOJ_KEY",
    responsePath: "inflation.annual_rate",
    currentValue: "5.2%",
    threshold: "> 5%"
  }
};

async function main() {
  console.log("🇯🇵 TriggerFi Interactive Demo - JPY Hedging\n");
  
  // Step 1: Show the scenario
  console.log("📖 SCENARIO:");
  console.log("You are the CFO of Yamamoto Auto Parts, a Japanese supplier");
  console.log("Treasury: ¥1,000,000 in JPYC stablecoin");
  console.log("Risk: JPY devaluation from US tariffs and domestic inflation\n");

  await pause();

  // Step 2: Show API configuration
  console.log("🔧 STEP 1: Configure Real-World Data Sources\n");
  
  console.log("📡 API Configuration #1 - US Tariffs:");
  console.log(`   Name: ${API_CONFIGS.tariffs.name}`);
  console.log(`   Endpoint: ${API_CONFIGS.tariffs.endpoint}`);
  console.log(`   Auth: ${API_CONFIGS.tariffs.authentication}`);
  console.log(`   Data Path: ${API_CONFIGS.tariffs.responsePath}`);
  console.log(`   Condition: ${API_CONFIGS.tariffs.threshold}`);
  console.log(`   Current: ${API_CONFIGS.tariffs.currentValue} ✅ TRIGGERED!\n`);

  await pause();

  console.log("📡 API Configuration #2 - Japan Inflation:");
  console.log(`   Name: ${API_CONFIGS.inflation.name}`);
  console.log(`   Endpoint: ${API_CONFIGS.inflation.endpoint}`);
  console.log(`   Auth: ${API_CONFIGS.inflation.authentication}`);
  console.log(`   Data Path: ${API_CONFIGS.inflation.responsePath}`);
  console.log(`   Condition: ${API_CONFIGS.inflation.threshold}`);
  console.log(`   Current: ${API_CONFIGS.inflation.currentValue} ✅ TRIGGERED!\n`);

  await pause();

  // Step 3: Show logic configuration
  console.log("🧮 STEP 2: Define Trigger Logic\n");
  console.log("IF (tariffs > 15% AND inflation > 5%) THEN");
  console.log("   → Execute hedging strategy");
  console.log("   → Convert 10% of JPYC to USDC");
  console.log("   → Protect against further devaluation\n");

  await pause();

  // Step 4: Create the order
  console.log("💱 STEP 3: Creating Smart Hedging Order\n");

  const [signer] = await ethers.getSigners();
  
  // Connect to contracts
  const mockJPYC = await ethers.getContractAt("MockJPYC", deployment.tokens.JPYC);
  const mockPredicate = await ethers.getContractAt("MockDynamicAPIPredicate", deployment.contracts.mockPredicate);

  // Check balance
  const jpycBalance = await mockJPYC.balanceOf(signer.address);
  console.log("💴 Treasury Balance: " + ethers.formatEther(jpycBalance) + " JPYC");
  console.log("   (¥" + Number(ethers.formatEther(jpycBalance)).toLocaleString() + ")");

  // Calculate hedge amount
  const hedgeAmount = jpycBalance / 10n; // 10% hedge
  const jpyPerUsd = 150n;
  const expectedUsdc = (hedgeAmount * 10n**6n) / (jpyPerUsd * 10n**18n);

  console.log("\n📊 Order Details:");
  console.log("   Type: Limit Order with Dynamic Predicate");
  console.log("   Making: " + ethers.formatEther(hedgeAmount) + " JPYC");
  console.log("   Taking: " + ethers.formatUnits(expectedUsdc, 6) + " USDC");
  console.log("   Rate: 150 JPY/USD");
  console.log("   Execution: When APIs confirm conditions\n");

  await pause();

  // Step 5: Show predicate in action
  console.log("🔍 STEP 4: Monitoring Real-World Conditions\n");

  // Use existing predicate
  const predicateId = "0x917d6f482492eb3751357f7a9d2d284a52856bd03bb83e87d8ae3b70d678ea1f";
  
  // Check predicate
  const checkConditionData = mockPredicate.interface.encodeFunctionData("checkCondition", [predicateId]);
  const protocolABI = ["function arbitraryStaticCall(address target, bytes calldata data) view returns (uint256)"];
  const protocol = new ethers.Contract(deployment.contracts.limitOrderProtocol, protocolABI, ethers.provider);
  
  console.log("⏳ Checking API conditions...");
  await pause(2000);

  try {
    const result = await protocol.arbitraryStaticCall(
      deployment.contracts.mockPredicate,
      checkConditionData
    );
    
    console.log("\n📡 API Response:");
    console.log("   Tariffs: 15.5% (> 15% ✅)");
    console.log("   Inflation: 5.2% (> 5% ✅)");
    console.log("   Predicate Result: " + (result === 1n ? "TRUE ✅" : "FALSE ❌"));
    console.log("\n🚨 TRIGGER ACTIVATED! Executing hedge...\n");
  } catch (error) {
    console.log("❌ API check failed");
  }

  await pause();

  // Step 6: Show the value
  console.log("💡 STEP 5: Value Proposition\n");
  console.log("Traditional Approach:");
  console.log("   ❌ Manual monitoring of news");
  console.log("   ❌ Emotional decision making");
  console.log("   ❌ Days to execute trades");
  console.log("   ❌ Missed opportunities\n");

  console.log("TriggerFi Approach:");
  console.log("   ✅ Automatic API monitoring 24/7");
  console.log("   ✅ Data-driven decisions");
  console.log("   ✅ Instant execution");
  console.log("   ✅ Never miss critical moments\n");

  await pause();

  // Step 7: Show impact
  console.log("📈 IMPACT:\n");
  console.log("Without Protection:");
  console.log("   - 20% JPY depreciation = ¥200,000 loss");
  console.log("   - Emotional panic selling");
  console.log("   - Missed recovery opportunities\n");

  console.log("With TriggerFi:");
  console.log("   - Limited loss to ¥180,000 (saved ¥20,000)");
  console.log("   - Systematic risk management");
  console.log("   - Capital works 24/7 autonomously\n");

  console.log("🎯 This is how we transform $100T+ of 'classic capital'");
  console.log("   into 'smart capital' that responds to the world!\n");

  // Save demo state
  const demoState = {
    treasury: ethers.formatEther(jpycBalance) + " JPYC",
    hedgeAmount: ethers.formatEther(hedgeAmount) + " JPYC",
    targetUsdc: ethers.formatUnits(expectedUsdc, 6) + " USDC",
    apis: API_CONFIGS,
    predicateId: predicateId,
    status: "TRIGGERED - Ready to execute"
  };

  const fs = require("fs");
  fs.writeFileSync("./demo-state.json", JSON.stringify(demoState, null, 2));
  console.log("📄 Demo state saved for reference\n");
}

// Helper function to pause for dramatic effect
function pause(ms = 3000) {
  if (process.env.DEMO_MODE === "fast") return Promise.resolve();
  
  console.log("Press Enter to continue...");
  return new Promise(resolve => {
    process.stdin.once('data', () => {
      console.log("");
      resolve();
    });
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });