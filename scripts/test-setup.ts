import { ethers } from "hardhat";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🔍 Testing your deployment setup...\n");

  // Check environment variables
  console.log("📋 Environment Variables:");
  console.log("========================");
  console.log("PRIVATE_KEY:", process.env.PRIVATE_KEY ? "✅ Set" : "❌ Missing");
  console.log("SEPOLIA_RPC_URL:", process.env.SEPOLIA_RPC_URL ? "✅ Set" : "❌ Missing");
  console.log("MAINNET_RPC_URL:", process.env.MAINNET_RPC_URL ? "✅ Set" : "❌ Missing");
  console.log("ETHERSCAN_API_KEY:", process.env.ETHERSCAN_API_KEY ? "✅ Set (optional)" : "⚠️  Not set (optional)");
  
  if (!process.env.PRIVATE_KEY || !process.env.SEPOLIA_RPC_URL) {
    console.error("\n❌ Missing required environment variables!");
    console.log("\n📝 Please update your .env file with:");
    console.log("PRIVATE_KEY=your_wallet_private_key_without_0x");
    console.log("SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY");
    return;
  }

  // Test connection
  try {
    console.log("\n🌐 Testing Sepolia connection...");
    const [signer] = await ethers.getSigners();
    console.log("✅ Connected to Sepolia!");
    console.log("📱 Deployer address:", signer.address);
    
    const balance = await signer.provider.getBalance(signer.address);
    console.log("💰 Balance:", ethers.formatEther(balance), "ETH");
    
    if (balance < ethers.parseEther("0.1")) {
      console.warn("\n⚠️  Low balance! You need at least 0.1 Sepolia ETH");
      console.log("Get free Sepolia ETH from: https://sepoliafaucet.com/");
    } else {
      console.log("\n✅ Sufficient balance for deployment!");
    }
    
  } catch (error) {
    console.error("\n❌ Connection failed:", error);
  }
}

main().catch(console.error);