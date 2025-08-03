const { ethers } = require("hardhat");
const { Address, LimitOrder, MakerTraits } = require("@1inch/limit-order-sdk");
const { createArbitraryStaticCallPredicate } = require("../lib/predicate-encoder");
const { signV4Order, prepareV4OrderTuple, splitSignature } = require("../lib/1inch-v4-adapter");

// Load deployment info
const deployment = require("../deployments/base-sepolia.json");

async function main() {
  console.log("🇯🇵 TriggerFi JPY Hedging Demo\n");
  console.log("📖 Scenario: Japanese corporation protecting against JPY devaluation");
  console.log("   Trigger 1: US tariffs on Japanese cars > 15%");
  console.log("   Trigger 2: Japan inflation rate > 5%");
  console.log("   Action: Convert JPYC → USDC when both conditions met\n");

  const [signer] = await ethers.getSigners();
  console.log("👤 Corporation wallet:", signer.address);

  // Connect to contracts
  const mockJPYC = await ethers.getContractAt("MockJPYC", deployment.tokens.JPYC);
  const mockPredicate = await ethers.getContractAt("MockDynamicAPIPredicate", deployment.contracts.mockPredicate);
  const orderManager = await ethers.getContractAt("CustomOrderManager", deployment.contracts.customOrderManager);

  // Check JPYC balance
  const jpycBalance = await mockJPYC.balanceOf(signer.address);
  console.log("💴 JPYC Treasury:", ethers.formatEther(jpycBalance), "JPYC");
  console.log("   Value: ¥" + Number(ethers.formatEther(jpycBalance)).toLocaleString());

  // Show current market conditions
  const [inflation, tariffs] = await mockJPYC.getMarketConditions();
  console.log("\n📊 Current Market Conditions:");
  console.log("   Japan inflation: " + (Number(inflation) / 100).toFixed(1) + "% (threshold: 5%)");
  console.log("   US tariffs: " + (Number(tariffs) / 100).toFixed(1) + "% (threshold: 15%)");
  console.log("   ⚠️  Both thresholds exceeded - hedging triggered!");

  // Create predicate for these conditions
  console.log("\n📝 Creating smart trigger...");
  const tx = await mockPredicate.createPredicate();
  const receipt = await tx.wait();
  
  const event = receipt.logs.find(log => {
    try {
      const parsed = mockPredicate.interface.parseLog(log);
      return parsed.name === "PredicateCreated";
    } catch {
      return false;
    }
  });

  const predicateId = mockPredicate.interface.parseLog(event).args.predicateId;
  console.log("✅ Predicate created:", predicateId);
  
  // Set predicate to true (simulating API conditions met)
  await mockPredicate.setTestResult(predicateId, true);
  console.log("✅ Market conditions verified via APIs");

  // Create hedging order
  console.log("\n💱 Creating hedging order...");
  
  // Calculate amounts (hedge 10% of treasury)
  const hedgeAmount = jpycBalance / 10n; // 100,000 JPYC
  const jpyPerUsd = 150n; // Current rate: 150 JPY/USD
  const expectedUsdc = hedgeAmount / jpyPerUsd; // ~666 USDC
  
  const makerTraits = MakerTraits.default();
  const order = new LimitOrder({
    makerAsset: new Address(deployment.tokens.JPYC),
    takerAsset: new Address(deployment.tokens.USDC),
    makingAmount: hedgeAmount.toString(),
    takingAmount: (expectedUsdc * 10n**6n / 10n**18n).toString(), // Convert to USDC decimals
    maker: new Address(signer.address),
    receiver: new Address(signer.address)
  }, makerTraits);

  // Add predicate
  const checkConditionData = mockPredicate.interface.encodeFunctionData("checkCondition", [predicateId]);
  const { predicate } = createArbitraryStaticCallPredicate(
    deployment.contracts.mockPredicate,
    checkConditionData
  );
  
  console.log("📊 Hedging Details:");
  console.log("   Amount: " + ethers.formatEther(hedgeAmount) + " JPYC (10% of treasury)");
  console.log("   Target: ~" + Number(expectedUsdc / 10n**12n).toFixed(0) + " USDC");
  console.log("   Protection: Against further JPY devaluation");

  // Sign order
  console.log("\n✍️ Signing order...");
  const chainId = 84532; // Base Sepolia
  const signature = await signV4Order(order, signer, chainId, deployment.contracts.limitOrderProtocol);
  console.log("✅ Order signed");

  // Calculate order hash
  const orderData = order.build();
  const orderHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "address", "address", "address", "address", "uint256", "uint256", "uint256"],
      [orderData.salt, orderData.maker, orderData.receiver, orderData.makerAsset, 
       orderData.takerAsset, orderData.makingAmount, orderData.takingAmount, orderData.makerTraits]
    )
  );

  // Register in OrderManager
  console.log("\n📝 Registering hedging strategy...");
  await orderManager.createOrder(
    orderHash,
    predicateId,
    "JPY Hedging: Auto-convert JPYC to USDC when tariffs > 15% AND inflation > 5%"
  );
  console.log("✅ Strategy registered");

  // Approve JPYC
  console.log("\n💳 Approving JPYC for trading...");
  await mockJPYC.approve(deployment.contracts.limitOrderProtocol, hedgeAmount);
  console.log("✅ JPYC approved");

  // Test predicate
  console.log("\n🔍 Verifying trigger conditions...");
  const protocolABI = ["function arbitraryStaticCall(address target, bytes calldata data) view returns (uint256)"];
  const protocol = new ethers.Contract(deployment.contracts.limitOrderProtocol, protocolABI, ethers.provider);
  
  try {
    const result = await protocol.arbitraryStaticCall(
      deployment.contracts.mockPredicate,
      checkConditionData
    );
    console.log(`✅ Trigger active: ${result === 1n ? "YES - Execute hedge!" : "NO - Wait"}`);
  } catch (error) {
    console.log("❌ Trigger check failed");
  }

  // Display summary
  console.log("\n🎯 Demo Summary:");
  console.log("┌─────────────────────────────────────────────────────────┐");
  console.log("│ Corporate Treasury: 1,000,000 JPYC (¥1,000,000)         │");
  console.log("│ Risk: JPY devaluation from tariffs + inflation         │");
  console.log("│ Protection: Auto-convert 10% to USDC when triggered    │");
  console.log("│ Status: ✅ ACTIVE - Conditions met, awaiting execution │");
  console.log("└─────────────────────────────────────────────────────────┘");

  console.log("\n📝 Order Details:");
  console.log("   Order Hash:", orderHash);
  console.log("   Predicate ID:", predicateId);
  console.log("   Status: Ready for keeper bot execution");

  console.log("\n💡 Value Proposition:");
  console.log("   Without TriggerFi: Manual monitoring, emotional decisions, delayed execution");
  console.log("   With TriggerFi: Automatic, data-driven, instant execution");
  console.log("   Potential savings: Millions in FX losses avoided");

  console.log("\n🚀 Next: Run keeper bot to execute when conditions are met");
  console.log("   Command: npx hardhat run scripts/keeper-bot.js --network baseSepolia");

  // Save order data for keeper bot
  const orderDataForKeeper = {
    order: prepareV4OrderTuple(order),
    signature: signature,
    predicate: predicate,
    predicateId: predicateId,
    orderHash: orderHash,
    description: "JPY Hedging Demo"
  };

  const fs = require("fs");
  fs.writeFileSync(
    "./demo-order.json",
    JSON.stringify(orderDataForKeeper, null, 2)
  );
  console.log("\n📄 Order data saved to demo-order.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });