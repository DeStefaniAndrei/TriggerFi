require('dotenv').config();

console.log("🔍 Checking environment configuration...\n");

// Check private key
const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  console.log("❌ PRIVATE_KEY is not set in .env file");
} else {
  console.log("✅ PRIVATE_KEY is set");
  console.log("   Length:", privateKey.length, "characters");
  
  // Check if it starts with 0x
  if (privateKey.startsWith('0x')) {
    console.log("   ⚠️  WARNING: Private key starts with '0x' - please remove the '0x' prefix!");
  }
  
  // Check length (should be 64 characters for 32 bytes)
  if (privateKey.length !== 64) {
    console.log("   ❌ ERROR: Private key should be exactly 64 characters (32 bytes)");
    console.log("   Your key is", privateKey.length, "characters");
  } else {
    console.log("   ✅ Private key length is correct (64 characters)");
  }
  
  // Check if it's hex
  if (!/^[0-9a-fA-F]+$/.test(privateKey.replace('0x', ''))) {
    console.log("   ❌ ERROR: Private key contains non-hex characters");
  }
}

// Check RPC URLs
console.log("\n📡 RPC URLs:");
console.log("SEPOLIA_RPC_URL:", process.env.SEPOLIA_RPC_URL ? "✅ Set" : "❌ Not set");
console.log("MAINNET_RPC_URL:", process.env.MAINNET_RPC_URL ? "✅ Set" : "❌ Not set");

console.log("\n📝 How to fix:");
console.log("1. Make sure your private key is WITHOUT the '0x' prefix");
console.log("2. Private key should be exactly 64 characters");
console.log("3. Example format: PRIVATE_KEY=ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
console.log("   (This is a well-known test key, don't use it for real funds!)");