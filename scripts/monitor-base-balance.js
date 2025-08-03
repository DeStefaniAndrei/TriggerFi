const { ethers } = require("hardhat");

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("🔍 Monitoring Base Sepolia balance for:", signer.address);
  console.log("⏳ Checking every 10 seconds...\n");

  let lastBalance = 0n;
  
  const checkBalance = async () => {
    try {
      const balance = await ethers.provider.getBalance(signer.address);
      
      if (balance > lastBalance) {
        console.log(`\n✅ Received ${ethers.formatEther(balance - lastBalance)} ETH!`);
        console.log(`💰 New balance: ${ethers.formatEther(balance)} ETH`);
        console.log("\n🚀 Ready to run: npx hardhat run scripts/test-base-sepolia-order.js --network baseSepolia");
        process.exit(0);
      } else if (balance === 0n) {
        process.stdout.write(".");
      }
      
      lastBalance = balance;
    } catch (error) {
      console.error("\n❌ Error checking balance:", error.message);
    }
  };

  // Initial check
  await checkBalance();
  
  // Check every 10 seconds
  setInterval(checkBalance, 10000);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});