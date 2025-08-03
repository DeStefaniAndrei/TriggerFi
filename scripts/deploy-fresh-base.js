const { ethers } = require("hardhat");

// Base Sepolia addresses
const LIMIT_ORDER_PROTOCOL = "0xE53136D9De56672e8D2665C98653AC7b8A60Dc44";
const WETH = "0x4200000000000000000000000000000000000006";
const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

async function waitForTx(tx, name) {
  console.log(`⏳ Waiting for ${name} tx: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`✅ ${name} confirmed in block ${receipt.blockNumber}`);
  return receipt;
}

async function main() {
  console.log("🚀 Fresh deployment to Base Sepolia\n");

  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "ETH");
  
  // Get current nonce and gas price
  const nonce = await ethers.provider.getTransactionCount(deployer.address, "pending");
  const feeData = await ethers.provider.getFeeData();
  console.log("📊 Current nonce:", nonce);
  console.log("⛽ Gas price:", ethers.formatUnits(feeData.gasPrice, "gwei"), "gwei\n");

  try {
    // 1. Deploy MockDynamicAPIPredicate
    console.log("📝 Deploying MockDynamicAPIPredicate...");
    const MockPredicate = await ethers.getContractFactory("MockDynamicAPIPredicate");
    const mockPredicate = await MockPredicate.deploy(
      deployer.address,
      deployer.address,
      { nonce: nonce }
    );
    await waitForTx(mockPredicate.deploymentTransaction(), "MockPredicate deployment");
    const mockAddress = await mockPredicate.getAddress();
    console.log("📍 MockPredicate address:", mockAddress);

    // 2. Deploy PriceAmountGetter
    console.log("\n📝 Deploying PriceAmountGetter...");
    const PriceAmountGetter = await ethers.getContractFactory("PriceAmountGetter");
    const priceGetter = await PriceAmountGetter.deploy({ nonce: nonce + 1 });
    await waitForTx(priceGetter.deploymentTransaction(), "PriceAmountGetter deployment");
    const priceGetterAddress = await priceGetter.getAddress();
    console.log("📍 PriceAmountGetter address:", priceGetterAddress);

    // 3. Deploy CustomOrderManager
    console.log("\n📝 Deploying CustomOrderManager...");
    const CustomOrderManager = await ethers.getContractFactory("CustomOrderManager");
    const orderManager = await CustomOrderManager.deploy(
      LIMIT_ORDER_PROTOCOL,
      mockAddress,
      deployer.address,
      { nonce: nonce + 2 }
    );
    await waitForTx(orderManager.deploymentTransaction(), "CustomOrderManager deployment");
    const orderManagerAddress = await orderManager.getAddress();
    console.log("📍 CustomOrderManager address:", orderManagerAddress);

    // Save deployment info
    const deployment = {
      network: "baseSepolia",
      chainId: 84532,
      timestamp: new Date().toISOString(),
      deployer: deployer.address,
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

    console.log("\n✅ All contracts deployed successfully!");
    console.log("\n📄 Deployment saved to deployments/base-sepolia.json");
    
    // Test predicate
    console.log("\n🧪 Testing predicate creation...");
    const tx = await mockPredicate.createPredicate({ nonce: nonce + 3 });
    const receipt = await waitForTx(tx, "Create predicate");
    
    const event = receipt.logs.find(log => {
      try {
        const parsed = mockPredicate.interface.parseLog(log);
        return parsed.name === "PredicateCreated";
      } catch {
        return false;
      }
    });
    
    if (event) {
      const predicateId = mockPredicate.interface.parseLog(event).args.predicateId;
      console.log("✅ Test predicate created:", predicateId);
    }
    
    console.log("\n🎯 Next steps:");
    console.log("1. Run: npx hardhat run scripts/test-base-sepolia-order.js --network baseSepolia");
    console.log("2. Get some Base Sepolia USDC for testing");
    console.log("3. Test order execution");
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });