const { ethers } = require("hardhat");

const LIMIT_ORDER_PROTOCOL = "0x111111125421ca6dc452d289314280a0f8842a65";

async function main() {
  console.log("🧪 Testing 1inch Protocol on Tenderly Fork\n");

  // Check if contract exists
  const code = await ethers.provider.getCode(LIMIT_ORDER_PROTOCOL);
  console.log(`Contract deployed: ${code !== "0x" ? "✅ Yes" : "❌ No"}`);
  console.log(`Code size: ${(code.length - 2) / 2} bytes\n`);

  // Try to call a simple view function
  const ABI = [
    "function DOMAIN_SEPARATOR() view returns (bytes32)",
    "function version() view returns (string)",
    "function name() view returns (string)"
  ];

  const limitOrderProtocol = new ethers.Contract(LIMIT_ORDER_PROTOCOL, ABI, ethers.provider);

  try {
    console.log("📋 Contract Info:");
    
    // Try DOMAIN_SEPARATOR
    try {
      const domainSeparator = await limitOrderProtocol.DOMAIN_SEPARATOR();
      console.log(`   DOMAIN_SEPARATOR: ${domainSeparator}`);
    } catch (e) {
      console.log(`   DOMAIN_SEPARATOR: ❌ Failed - ${e.message}`);
    }

    // Test fillOrder with empty order
    const fillOrderABI = [
      "function fillOrder(tuple(bytes32 salt, address makerAsset, address takerAsset, address maker, address receiver, address allowedSender, uint256 makingAmount, uint256 takingAmount, bytes offsets, bytes interactions, bytes predicate, bytes permit, bytes getMakingAmount, bytes getTakingAmount, bytes preInteraction, bytes postInteraction) order, bytes32 r, bytes32 vs, uint256 amount, uint256 takerTraits) payable returns (uint256 makingAmount, uint256 takingAmount, bytes32 orderHash)"
    ];
    
    const protocol = new ethers.Contract(LIMIT_ORDER_PROTOCOL, fillOrderABI, ethers.provider);
    
    // Create a minimal test order
    const testOrder = {
      salt: ethers.zeroPadValue("0x01", 32),
      makerAsset: ethers.ZeroAddress,
      takerAsset: ethers.ZeroAddress,
      maker: ethers.ZeroAddress,
      receiver: ethers.ZeroAddress,
      allowedSender: ethers.ZeroAddress,
      makingAmount: "0",
      takingAmount: "0",
      offsets: "0x",
      interactions: "0x",
      predicate: "0x",
      permit: "0x",
      getMakingAmount: "0x",
      getTakingAmount: "0x",
      preInteraction: "0x",
      postInteraction: "0x"
    };
    
    console.log("\n🧪 Testing fillOrder with empty order:");
    try {
      await protocol.fillOrder.staticCall(
        testOrder,
        ethers.zeroPadValue("0x01", 32), // r
        ethers.zeroPadValue("0x01", 32), // vs
        0,
        0
      );
      console.log("   ✅ Call succeeded (shouldn't happen with invalid order)");
    } catch (e) {
      console.log(`   ❌ Call failed as expected: ${e.message.substring(0, 50)}...`);
      
      // Check if it's a specific 1inch error
      if (e.data) {
        console.log(`   Error selector: ${e.data.slice(0, 10)}`);
      }
    }
    
  } catch (error) {
    console.error("❌ Failed to interact with contract:", error.message);
  }

  // Let's also check block number to ensure fork is working
  console.log("\n🔍 Fork Status:");
  const blockNumber = await ethers.provider.getBlockNumber();
  console.log(`   Current block: ${blockNumber}`);
  
  const block = await ethers.provider.getBlock(blockNumber);
  console.log(`   Block timestamp: ${new Date(block.timestamp * 1000).toISOString()}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });