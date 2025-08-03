const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Verifying Base Sepolia Setup\n");
  
  const [signer] = await ethers.getSigners();
  
  // 1. Check balance
  const balance = await ethers.provider.getBalance(signer.address);
  console.log("✅ Wallet:", signer.address);
  console.log("✅ Balance:", ethers.formatEther(balance), "ETH");
  
  if (balance === 0n) {
    console.log("\n❌ Still waiting for ETH...");
    console.log("Get it from: https://bwarelabs.com/faucets/base-sepolia");
    return;
  }
  
  // 2. Check limit order protocol
  const LIMIT_ORDER_PROTOCOL = "0xE53136D9De56672e8D2665C98653AC7b8A60Dc44";
  const code = await ethers.provider.getCode(LIMIT_ORDER_PROTOCOL);
  console.log("✅ Limit Order Protocol:", code.length > 2 ? "Deployed" : "Not found");
  
  // 3. Test basic contract deployment
  console.log("\n🧪 Testing contract deployment...");
  try {
    const TestContract = await ethers.getContractFactory("MockDynamicAPIPredicate");
    const gasEstimate = await ethers.provider.estimateGas({
      from: signer.address,
      data: TestContract.bytecode
    });
    console.log("✅ Deployment gas estimate:", gasEstimate.toString());
    console.log("✅ Estimated cost:", ethers.formatEther(gasEstimate * 1000000000n), "ETH");
  } catch (error) {
    console.log("❌ Deployment test failed:", error.message);
  }
  
  // 4. Check token contracts
  console.log("\n📊 Checking token contracts...");
  const WETH = "0x4200000000000000000000000000000000000006";
  const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  
  const wethCode = await ethers.provider.getCode(WETH);
  const usdcCode = await ethers.provider.getCode(USDC);
  
  console.log("✅ WETH:", wethCode.length > 2 ? "Deployed" : "Not found");
  console.log("✅ USDC:", usdcCode.length > 2 ? "Deployed" : "Not found");
  
  console.log("\n🎯 Ready to proceed!");
  console.log("\nNext commands:");
  console.log("1. Deploy contracts: npx hardhat run scripts/deploy-base-sepolia.js --network baseSepolia");
  console.log("2. Run full test: npx hardhat run scripts/full-integration-test.js --network baseSepolia");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });