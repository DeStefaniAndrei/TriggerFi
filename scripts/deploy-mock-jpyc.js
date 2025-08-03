const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying Mock JPYC to Base Sepolia\n");

  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "ETH");

  // Deploy MockJPYC
  console.log("\n📝 Deploying MockJPYC...");
  const MockJPYC = await ethers.getContractFactory("MockJPYC");
  const mockJPYC = await MockJPYC.deploy();
  await mockJPYC.waitForDeployment();
  
  const jpycAddress = await mockJPYC.getAddress();
  console.log("✅ MockJPYC deployed at:", jpycAddress);

  // Check initial balance
  const jpycBalance = await mockJPYC.balanceOf(deployer.address);
  console.log("💴 Initial JPYC balance:", ethers.formatEther(jpycBalance), "mJPYC");

  // Update deployment file
  const fs = require("fs");
  const deploymentPath = "./deployments/base-sepolia.json";
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  
  deployment.tokens.JPYC = jpycAddress;
  deployment.lastUpdated = new Date().toISOString();
  
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log("\n📄 Updated deployment file with JPYC address");

  // Test token functions
  console.log("\n🧪 Testing token functions...");
  const exchangeRate = await mockJPYC.getExchangeRate();
  console.log("💱 Exchange rate:", exchangeRate.toString(), "(1 JPYC = 1 JPY)");
  
  const [inflationRate, tariffRate] = await mockJPYC.getMarketConditions();
  console.log("📊 Market conditions:");
  console.log("   Inflation: ", (Number(inflationRate) / 100).toFixed(1) + "%");
  console.log("   Tariffs: ", (Number(tariffRate) / 100).toFixed(1) + "%");

  console.log("\n✅ Mock JPYC ready for demo!");
  console.log("\n📝 Token details:");
  console.log("   Name: Mock JPY Coin");
  console.log("   Symbol: mJPYC");
  console.log("   Decimals: 18");
  console.log("   Initial supply: 1,000,000 mJPYC");
  
  console.log("\n🎯 Next steps:");
  console.log("1. Create Chainlink Functions subscription");
  console.log("2. Deploy DynamicAPIPredicateV2");
  console.log("3. Create demo order with JPYC → USDC swap");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });