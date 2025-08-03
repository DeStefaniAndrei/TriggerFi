const { ethers } = require("hardhat");

const LIMIT_ORDER_PROTOCOL = "0x111111125421ca6dc452d289314280a0f8842a65";

async function main() {
  console.log("🧪 Testing 1inch Protocol on Hardhat Fork\n");

  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log("🌐 Network:", network.name, "Chain ID:", network.chainId);
  
  const blockNumber = await ethers.provider.getBlockNumber();
  console.log("📦 Block number:", blockNumber);

  // Check if contract exists
  const code = await ethers.provider.getCode(LIMIT_ORDER_PROTOCOL);
  console.log(`\n✅ Contract deployed: ${code !== "0x" ? "Yes" : "No"}`);
  console.log(`📏 Code size: ${(code.length - 2) / 2} bytes`);

  // Try to call DOMAIN_SEPARATOR
  const ABI = [
    "function DOMAIN_SEPARATOR() view returns (bytes32)",
    "function timestampBelow(uint256 timestamp) view returns (uint256)"
  ];

  const limitOrderProtocol = new ethers.Contract(LIMIT_ORDER_PROTOCOL, ABI, ethers.provider);

  try {
    console.log("\n📋 Testing basic view functions:");
    
    // Test DOMAIN_SEPARATOR
    const domainSeparator = await limitOrderProtocol.DOMAIN_SEPARATOR();
    console.log(`   ✅ DOMAIN_SEPARATOR: ${domainSeparator}`);
    
    // Test a simple predicate
    const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const timestampResult = await limitOrderProtocol.timestampBelow(futureTimestamp);
    console.log(`   ✅ timestampBelow(${futureTimestamp}): ${timestampResult}`);
    
    console.log("\n✅ 1inch Protocol v4 is working correctly on Hardhat fork!");
    
  } catch (error) {
    console.error("\n❌ Failed to interact with 1inch:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });