const { ethers } = require("hardhat");
const { CONTRACTS } = require("../lib/contracts");

async function main() {
  console.log("🚀 Deploying MockDynamicAPIPredicate to Tenderly Fork");
  console.log("====================================================\n");

  const [deployer] = await ethers.getSigners();
  console.log("👤 Deploying with account:", deployer.address);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH\n");

  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log("🌐 Network:");
  console.log(`   Chain ID: ${network.chainId}`);
  console.log(`   Name: ${network.name}\n`);

  // Deploy parameters
  const keeper = deployer.address; // Use deployer as keeper for testing
  const treasury = deployer.address; // Use deployer as treasury for testing

  console.log("📋 Deployment parameters:");
  console.log(`   Keeper: ${keeper}`);
  console.log(`   Treasury: ${treasury}\n`);

  // Deploy contract
  console.log("⏳ Deploying contract...");
  const MockDynamicAPIPredicate = await ethers.getContractFactory("MockDynamicAPIPredicate");
  const predicate = await MockDynamicAPIPredicate.deploy(keeper, treasury);

  await predicate.waitForDeployment();
  const address = await predicate.getAddress();

  console.log(`✅ MockDynamicAPIPredicate deployed to: ${address}\n`);

  // Verify deployment
  console.log("🔍 Verifying deployment...");
  const deployedKeeper = await predicate.keeper();
  const deployedTreasury = await predicate.treasury();

  console.log(`   Keeper: ${deployedKeeper}`);
  console.log(`   Treasury: ${deployedTreasury}\n`);

  console.log("📝 Next steps:");
  console.log("1. Create a test predicate using createPredicate()");
  console.log("2. Set predicate result with setTestResult()");
  console.log("3. Set update count with setUpdateCount()");
  console.log("4. Create and sign a limit order");
  console.log("5. Run taker bot to execute order");

  // Save deployment info
  console.log("\n💾 Deployment info:");
  console.log(`   MOCK_PREDICATE_ADDRESS="${address}"`);
  console.log(`   NETWORK="tenderly"`);
  console.log(`   KEEPER="${keeper}"`);

  return address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });