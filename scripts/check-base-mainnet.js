const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Base Mainnet Check\n");

  const [signer] = await ethers.getSigners();
  console.log("👤 Wallet:", signer.address);

  // Check ETH balance
  const balance = await ethers.provider.getBalance(signer.address);
  console.log("💰 ETH Balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    console.log("\n⚠️  You need ETH on Base mainnet to deploy!");
    console.log("Bridge ETH from Ethereum mainnet at: https://bridge.base.org");
    return;
  }

  // Check gas price
  const feeData = await ethers.provider.getFeeData();
  console.log("\n⛽ Gas Price:", ethers.formatUnits(feeData.gasPrice, "gwei"), "gwei");

  // Check 1inch deployment
  const LIMIT_ORDER_PROTOCOL = "0x111111125421ca6dc452d289314280a0f8842a65";
  const code = await ethers.provider.getCode(LIMIT_ORDER_PROTOCOL);
  console.log("\n📊 1inch Limit Order Protocol:");
  console.log("   Address:", LIMIT_ORDER_PROTOCOL);
  console.log("   Status:", code.length > 2 ? "✅ Deployed" : "❌ Not found");

  // Estimate deployment costs
  console.log("\n💸 Estimated Deployment Costs:");
  const gasPrice = feeData.gasPrice;
  const deployments = [
    { name: "MockJPYC", gas: 1500000n },
    { name: "DynamicAPIPredicateV2", gas: 3000000n },
    { name: "CustomOrderManager", gas: 2000000n },
    { name: "PriceAmountGetter", gas: 1000000n }
  ];

  let totalGas = 0n;
  for (const deployment of deployments) {
    const cost = (deployment.gas * gasPrice) / 10n**18n;
    console.log(`   ${deployment.name}: ~${ethers.formatEther(deployment.gas * gasPrice)} ETH`);
    totalGas += deployment.gas;
  }

  const totalCost = (totalGas * gasPrice) / 10n**18n;
  console.log(`   Total: ~${ethers.formatEther(totalGas * gasPrice)} ETH`);

  // Check if wallet has enough
  const hasEnough = balance > totalGas * gasPrice;
  console.log(`\n${hasEnough ? "✅" : "❌"} Wallet has ${hasEnough ? "enough" : "insufficient"} ETH for deployment`);

  if (hasEnough) {
    console.log("\n🎯 Ready to deploy on Base mainnet!");
    console.log("Next: Run deployment script");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });