import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Testing Sepolia deployment setup...\n");

  try {
    // Get network info
    const network = await ethers.provider.getNetwork();
    console.log("🌐 Network:", network.name);
    console.log("🔗 Chain ID:", network.chainId);
    
    // Get signer info
    const [signer] = await ethers.getSigners();
    console.log("\n📱 Deployer address:", signer.address);
    
    // Check balance
    const balance = await signer.provider.getBalance(signer.address);
    console.log("💰 Balance:", ethers.formatEther(balance), "ETH");
    
    // Check if we have enough for deployment
    if (balance < ethers.parseEther("0.1")) {
      console.warn("\n⚠️  Low balance! You need at least 0.1 Sepolia ETH for deployment");
      console.log("Get free Sepolia ETH from: https://sepoliafaucet.com/");
    } else {
      console.log("✅ Sufficient balance for deployment!");
    }
    
    // Test contract compilation
    console.log("\n📦 Testing contract compilation...");
    try {
      const DynamicAPIPredicateTest = await ethers.getContractFactory("DynamicAPIPredicateTest");
      console.log("✅ Contract compiled successfully!");
    } catch (compileError) {
      console.error("❌ Contract compilation failed:", compileError);
    }
    
    console.log("\n✨ Ready to deploy!");
    
  } catch (error) {
    console.error("\n❌ Setup test failed:", error);
  }
}

main().catch(console.error);