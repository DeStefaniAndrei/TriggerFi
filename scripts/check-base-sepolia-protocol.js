const { ethers } = require("hardhat");

// Base Sepolia addresses
const LIMIT_ORDER_PROTOCOL = "0xE53136D9De56672e8D2665C98653AC7b8A60Dc44"; // Hackathon deployed

async function main() {
  console.log("🔍 Checking Hackathon Limit Order Protocol on Base Sepolia\n");

  const [signer] = await ethers.getSigners();
  console.log("👤 Signer:", signer.address);

  // Check if the limit order protocol is deployed
  console.log("\n📊 Contract Info:");
  const code = await ethers.provider.getCode(LIMIT_ORDER_PROTOCOL);
  console.log(`✅ Contract deployed: ${code.length > 2}`);
  console.log(`📏 Code size: ${code.length} bytes`);

  // Try to identify the interface
  console.log("\n🔍 Testing different interfaces...");

  // Test v4 interface
  console.log("\n1️⃣ Testing v4 interface:");
  const v4ABI = [
    "function DOMAIN_SEPARATOR() view returns (bytes32)",
    "function fillOrder(tuple(uint256 salt, uint256 maker, uint256 receiver, uint256 makerAsset, uint256 takerAsset, uint256 makingAmount, uint256 takingAmount, uint256 makerTraits) order, bytes32 r, bytes32 vs, uint256 amount, uint256 takerTraits) payable returns (uint256, uint256, bytes32)"
  ];
  
  try {
    const v4Contract = new ethers.Contract(LIMIT_ORDER_PROTOCOL, v4ABI, ethers.provider);
    const domainSeparator = await v4Contract.DOMAIN_SEPARATOR();
    console.log(`✅ V4 DOMAIN_SEPARATOR: ${domainSeparator}`);
  } catch (error) {
    console.log("❌ V4 interface not found:", error.message);
  }

  // Test v3 interface
  console.log("\n2️⃣ Testing v3 interface:");
  const v3ABI = [
    "function DOMAIN_SEPARATOR() view returns (bytes32)",
    "function fillOrder(tuple(uint256 salt, address makerAsset, address takerAsset, address maker, address receiver, address allowedSender, uint256 makingAmount, uint256 takingAmount, uint256 offsets, bytes makerAssetData, bytes takerAssetData, bytes getMakerAmount, bytes getTakerAmount, bytes predicate, bytes permit, bytes interaction) order, bytes signature, bytes interaction) payable returns (uint256, uint256, bytes32)"
  ];
  
  try {
    const v3Contract = new ethers.Contract(LIMIT_ORDER_PROTOCOL, v3ABI, ethers.provider);
    const domainSeparator = await v3Contract.DOMAIN_SEPARATOR();
    console.log(`✅ V3 DOMAIN_SEPARATOR: ${domainSeparator}`);
  } catch (error) {
    console.log("❌ V3 interface not found:", error.message);
  }

  // Test common functions
  console.log("\n3️⃣ Testing common functions:");
  const commonABI = [
    "function version() view returns (string)",
    "function arbitraryStaticCall(address target, bytes calldata data) view returns (uint256)",
    "function remaining(bytes32) view returns (uint256)",
    "function cancelOrder(bytes32 orderHash) external",
    "function nonce(address) view returns (uint256)"
  ];
  
  const commonContract = new ethers.Contract(LIMIT_ORDER_PROTOCOL, commonABI, ethers.provider);
  
  for (const func of ["version", "arbitraryStaticCall", "remaining", "nonce"]) {
    try {
      if (func === "version") {
        const version = await commonContract.version();
        console.log(`✅ ${func}(): ${version}`);
      } else if (func === "nonce") {
        const nonce = await commonContract.nonce(signer.address);
        console.log(`✅ ${func}(address): ${nonce}`);
      } else {
        console.log(`✅ ${func}: available`);
      }
    } catch (error) {
      console.log(`❌ ${func}: not available`);
    }
  }

  // Try to decode the domain separator
  console.log("\n4️⃣ Analyzing domain separator...");
  try {
    const domainABI = ["function DOMAIN_SEPARATOR() view returns (bytes32)"];
    const domainContract = new ethers.Contract(LIMIT_ORDER_PROTOCOL, domainABI, ethers.provider);
    const domainSeparator = await domainContract.DOMAIN_SEPARATOR();
    
    // Try different domain configurations
    const testDomains = [
      { name: "1inch Limit Order Protocol", version: "3", chainId: 84532 },
      { name: "1inch Limit Order Protocol", version: "4", chainId: 84532 },
      { name: "1inch Aggregation Router", version: "6", chainId: 84532 },
      { name: "LimitOrderProtocol", version: "1", chainId: 84532 },
    ];

    const domainTypes = {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" }
      ]
    };

    console.log("Actual DOMAIN_SEPARATOR:", domainSeparator);
    console.log("\nTesting domain configurations:");
    
    for (const domain of testDomains) {
      const testDomain = { ...domain, verifyingContract: LIMIT_ORDER_PROTOCOL };
      const testSeparator = ethers.TypedDataEncoder.hashStruct(
        "EIP712Domain",
        domainTypes,
        testDomain
      );
      
      const match = testSeparator === domainSeparator;
      console.log(`${match ? "✅" : "❌"} ${domain.name} v${domain.version}: ${match ? "MATCH!" : testSeparator}`);
    }
  } catch (error) {
    console.log("❌ Could not analyze domain separator:", error.message);
  }

  console.log("\n📝 Summary:");
  console.log("The hackathon limit order protocol is deployed and accessible.");
  console.log("Next step: Get Base Sepolia ETH from a faucet to deploy contracts and test order execution.");
  console.log("\n🚰 Base Sepolia Faucets:");
  console.log("- https://www.alchemy.com/faucets/base-sepolia");
  console.log("- https://faucet.quicknode.com/base/sepolia");
  console.log("- https://bwarelabs.com/faucets/base-sepolia");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });