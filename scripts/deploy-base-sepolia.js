const { ethers } = require("hardhat");

// Base Sepolia addresses
const LIMIT_ORDER_PROTOCOL = "0xE53136D9De56672e8D2665C98653AC7b8A60Dc44";
const WETH = "0x4200000000000000000000000000000000000006";
const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

async function main() {
  console.log("🚀 Deploying TriggerFi infrastructure to Base Sepolia\n");

  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "ETH");
  
  // Get current nonce
  const nonce = await ethers.provider.getTransactionCount(deployer.address);
  console.log("📊 Current nonce:", nonce, "\n");

  // 1. Deploy MockDynamicAPIPredicate (for testing without Chainlink)
  console.log("📝 Deploying MockDynamicAPIPredicate...");
  const MockPredicate = await ethers.getContractFactory("MockDynamicAPIPredicate");
  const mockPredicate = await MockPredicate.deploy(
    deployer.address,
    deployer.address
  );
  await mockPredicate.waitForDeployment();
  const mockAddress = await mockPredicate.getAddress();
  console.log("✅ MockPredicate deployed at:", mockAddress);

  // 2. Deploy PriceAmountGetter for dynamic pricing
  console.log("\n📝 Deploying PriceAmountGetter...");
  const PriceAmountGetter = await ethers.getContractFactory("PriceAmountGetter");
  const priceGetter = await PriceAmountGetter.deploy();
  await priceGetter.waitForDeployment();
  const priceGetterAddress = await priceGetter.getAddress();
  console.log("✅ PriceAmountGetter deployed at:", priceGetterAddress);

  // 3. Deploy CustomOrderManager for order tracking
  console.log("\n📝 Deploying CustomOrderManager...");
  const CustomOrderManager = await ethers.getContractFactory("CustomOrderManager");
  const orderManager = await CustomOrderManager.deploy(
    LIMIT_ORDER_PROTOCOL,
    mockAddress,
    deployer.address
  );
  await orderManager.waitForDeployment();
  const orderManagerAddress = await orderManager.getAddress();
  console.log("✅ CustomOrderManager deployed at:", orderManagerAddress);

  // 4. Save deployment info
  const deployment = {
    network: "baseSepolia",
    chainId: 84532,
    timestamp: new Date().toISOString(),
    contracts: {
      limitOrderProtocol: LIMIT_ORDER_PROTOCOL,
      mockPredicate: mockAddress,
      priceAmountGetter: priceGetterAddress,
      customOrderManager: orderManagerAddress
    },
    tokens: {
      WETH: WETH,
      USDC: USDC
    }
  };

  const fs = require("fs");
  fs.writeFileSync(
    "./deployments/base-sepolia.json",
    JSON.stringify(deployment, null, 2)
  );

  console.log("\n✅ Deployment complete!");
  console.log("\n📄 Deployment saved to deployments/base-sepolia.json");
  console.log("\nNext steps:");
  console.log("1. Run: npx hardhat run scripts/test-base-sepolia-order.js --network baseSepolia");
  console.log("2. Create orders with real predicates");
  console.log("3. Set up keeper bot for monitoring");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });