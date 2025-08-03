const { ethers } = require("hardhat");
const { CONTRACTS, CHAINLINK_CONFIG } = require("../lib/contracts");

async function main() {
  console.log("🚀 Deploying DynamicAPIPredicateV2");
  console.log("==================================\n");

  const [deployer] = await ethers.getSigners();
  console.log("👤 Deploying with account:", deployer.address);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH\n");

  // Deployment parameters
  const router = CONTRACTS.sepolia.chainlinkFunctions; // Chainlink Functions router
  const subscriptionId = CHAINLINK_CONFIG.subscriptionId;
  const donId = CHAINLINK_CONFIG.donId.sepolia;
  const keeper = deployer.address; // Use deployer as keeper for testing
  const treasury = deployer.address; // Use deployer as treasury for testing

  console.log("📋 Deployment parameters:");
  console.log(`   Router: ${router}`);
  console.log(`   Subscription ID: ${subscriptionId}`);
  console.log(`   DON ID: ${donId}`);
  console.log(`   Keeper: ${keeper}`);
  console.log(`   Treasury: ${treasury}\n`);

  // Deploy contract
  console.log("⏳ Deploying contract...");
  const DynamicAPIPredicateV2 = await ethers.getContractFactory("DynamicAPIPredicateV2");
  const predicate = await DynamicAPIPredicateV2.deploy(
    router,
    subscriptionId,
    donId,
    keeper,
    treasury
  );

  await predicate.waitForDeployment();
  const address = await predicate.getAddress();

  console.log(`✅ DynamicAPIPredicateV2 deployed to: ${address}\n`);

  // Verify deployment
  console.log("🔍 Verifying deployment...");
  const deployedKeeper = await predicate.keeper();
  const deployedSubscriptionId = await predicate.subscriptionId();
  const deployedDonId = await predicate.donId();

  console.log(`   Keeper: ${deployedKeeper}`);
  console.log(`   Subscription ID: ${deployedSubscriptionId}`);
  console.log(`   DON ID: ${deployedDonId}\n`);

  console.log("📝 Next steps:");
  console.log(`1. Add ${address} as a consumer to subscription ${subscriptionId}`);
  console.log("   Go to: https://functions.chain.link/sepolia/" + subscriptionId);
  console.log("2. Update CONTRACTS in lib/contracts.ts with the new address");
  console.log("3. Migrate existing predicates if needed");
  console.log("\n✨ Deployment complete!");

  // Save to CLAUDE.md
  console.log("\n📄 Add this to CLAUDE.md:");
  console.log(`DynamicAPIPredicateV2 (Sepolia): ${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });