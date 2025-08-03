const { ethers } = require("hardhat");

async function main() {
  const [signer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(signer.address);
  
  console.log("🔍 Base Sepolia Balance Check");
  console.log("👤 Wallet:", signer.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "ETH");
  
  if (balance === 0n) {
    console.log("\n❌ You need Base Sepolia ETH to proceed!");
    console.log("\n🚰 Get Base Sepolia ETH from one of these faucets:");
    console.log("1. Alchemy: https://www.alchemy.com/faucets/base-sepolia");
    console.log("2. QuickNode: https://faucet.quicknode.com/base/sepolia");
    console.log("3. Bwarelabs: https://bwarelabs.com/faucets/base-sepolia");
    console.log("\n💡 Tips:");
    console.log("- Alchemy faucet requires signing in with an Alchemy account");
    console.log("- QuickNode faucet requires holding 0.001 ETH on mainnet");
    console.log("- Bwarelabs faucet is usually the easiest to use");
  } else {
    console.log("\n✅ You have Base Sepolia ETH! Ready to deploy and test.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });