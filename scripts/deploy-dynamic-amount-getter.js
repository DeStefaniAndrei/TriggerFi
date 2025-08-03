const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Deploying DynamicAmountGetter to Sepolia");
  console.log("===========================================\n");

  // Get the deployed DynamicAPIPredicate address
  const DYNAMIC_API_PREDICATE = "0xd378Fbce97cD181Cd7A7EcCe32571f1a37E226ed";

  const [deployer] = await ethers.getSigners();
  console.log("📍 Deploying from address:", deployer.address);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH\n");

  try {
    // Deploy DynamicAmountGetter
    console.log("📄 Deploying DynamicAmountGetter contract...");
    const DynamicAmountGetter = await ethers.getContractFactory("DynamicAmountGetter");
    const dynamicAmountGetter = await DynamicAmountGetter.deploy(DYNAMIC_API_PREDICATE);
    
    console.log("⏳ Waiting for deployment transaction...");
    console.log("📝 Transaction hash:", dynamicAmountGetter.deploymentTransaction().hash);
    
    await dynamicAmountGetter.waitForDeployment();
    const address = await dynamicAmountGetter.getAddress();
    
    console.log("✅ DynamicAmountGetter deployed to:", address);
    console.log("🔗 View on Etherscan: https://sepolia.etherscan.io/address/" + address);

    // Wait for more confirmations
    console.log("\n⏳ Waiting for 3 block confirmations...");
    await dynamicAmountGetter.deploymentTransaction().wait(3);
    console.log("✅ Deployment confirmed!");

    // Verify the contract setup
    console.log("\n🔍 Verifying contract setup...");
    const predicateAddress = await dynamicAmountGetter.dynamicAPIPredicate();
    console.log("📍 DynamicAPIPredicate address:", predicateAddress);
    
    // Test price feed access
    console.log("\n📊 Testing price feeds...");
    try {
      const ethPrice = await dynamicAmountGetter.getLatestPrice(0); // ETH
      console.log("✅ ETH/USD price:", ethers.formatUnits(ethPrice, 8), "USD");
      
      const btcPrice = await dynamicAmountGetter.getLatestPrice(1); // BTC
      console.log("✅ BTC/USD price:", ethers.formatUnits(btcPrice, 8), "USD");
      
      const jpyPrice = await dynamicAmountGetter.getLatestPrice(2); // JPY
      console.log("✅ JPY/USD price:", ethers.formatUnits(jpyPrice, 8), "USD");
      
      const usdcPrice = await dynamicAmountGetter.getLatestPrice(3); // USDC
      console.log("✅ USDC/USD price:", ethers.formatUnits(usdcPrice, 8), "USD");
    } catch (error) {
      console.log("⚠️  Price feed test failed:", error.message);
    }

    // Save deployment info
    const deploymentInfo = {
      network: "sepolia",
      dynamicAmountGetter: address,
      dynamicAPIPredicate: DYNAMIC_API_PREDICATE,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      transactionHash: dynamicAmountGetter.deploymentTransaction().hash
    };

    const filename = `deployment-amount-getter-sepolia-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
    console.log("\n💾 Deployment info saved to:", filename);

    // Update contracts.ts
    console.log("\n📝 Update lib/contracts.ts with:");
    console.log(`dynamicAmountGetter: "${address}",`);

    console.log("\n✨ Deployment complete!");
    console.log("=====================================");
    console.log("\n📋 Summary:");
    console.log("  - DynamicAmountGetter:", address);
    console.log("  - DynamicAPIPredicate:", DYNAMIC_API_PREDICATE);
    console.log("  - Network: Sepolia");
    console.log("\n🎯 Next steps:");
    console.log("  1. Update lib/contracts.ts with the new address");
    console.log("  2. Update app/create-order/page.tsx with the address");
    console.log("  3. Test dynamic pricing with JPYC/USDC pair");

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    console.error(error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });