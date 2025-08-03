const { ethers } = require("hardhat");
const { Address, LimitOrder, MakerTraits } = require("@1inch/limit-order-sdk");

const LIMIT_ORDER_PROTOCOL = "0x111111125421ca6dc452d289314280a0f8842a65";

async function main() {
  console.log("🔍 Debugging 1inch Protocol on Hardhat Fork\n");

  const [signer] = await ethers.getSigners();
  console.log("👤 Signer:", signer.address);

  // Check protocol version and domain separator
  console.log("\n📊 Checking protocol details...");
  
  const ABI = [
    "function version() view returns (string)",
    "function DOMAIN_SEPARATOR() view returns (bytes32)",
    "function LIMIT_ORDER_TYPEHASH() view returns (bytes32)"
  ];
  
  const limitOrderProtocol = new ethers.Contract(LIMIT_ORDER_PROTOCOL, ABI, ethers.provider);
  
  try {
    const domainSeparator = await limitOrderProtocol.DOMAIN_SEPARATOR();
    console.log("✅ DOMAIN_SEPARATOR:", domainSeparator);
    
    try {
      const typehash = await limitOrderProtocol.LIMIT_ORDER_TYPEHASH();
      console.log("✅ LIMIT_ORDER_TYPEHASH:", typehash);
    } catch (e) {
      console.log("❌ No LIMIT_ORDER_TYPEHASH function");
    }
    
    try {
      const version = await limitOrderProtocol.version();
      console.log("✅ Version:", version);
    } catch (e) {
      console.log("❌ No version function");
    }
  } catch (error) {
    console.error("Error getting protocol details:", error.message);
  }

  // Check what the SDK generates
  console.log("\n📋 Creating order with SDK...");
  
  const makerTraits = MakerTraits.default();
  const order = new LimitOrder({
    makerAsset: new Address("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"), // WETH
    takerAsset: new Address("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"), // USDC
    makingAmount: ethers.parseUnits("0.1", 18).toString(),
    takingAmount: ethers.parseUnits("350", 6).toString(),
    maker: new Address(signer.address)
  }, makerTraits);

  const typedData = order.getTypedData(1);
  
  console.log("\n📝 SDK Generated TypedData:");
  console.log(JSON.stringify(typedData, null, 2));
  
  // Check if addresses are being converted correctly
  console.log("\n🔍 Checking Address conversions:");
  console.log("Maker address:", signer.address);
  console.log("Maker in order:", order.maker.toString());
  console.log("Maker in typedData:", typedData.message.maker);
  
  // Try to understand the expected domain separator
  console.log("\n🔍 Computing expected domain separator...");
  const expectedDomain = {
    name: "1inch Aggregation Router",
    version: "6",
    chainId: 1,
    verifyingContract: LIMIT_ORDER_PROTOCOL
  };
  
  const domainTypes = {
    EIP712Domain: [
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" }
    ]
  };
  
  const computedDomainSeparator = ethers.TypedDataEncoder.hashStruct(
    "EIP712Domain",
    domainTypes,
    expectedDomain
  );
  
  console.log("Computed DOMAIN_SEPARATOR:", computedDomainSeparator);
  
  // Test actual fillOrder function signature
  console.log("\n🔍 Checking fillOrder function...");
  const fillOrderABI = [{
    "inputs": [
      {
        "components": [
          {"internalType": "uint256", "name": "salt", "type": "uint256"},
          {"internalType": "uint256", "name": "maker", "type": "uint256"},
          {"internalType": "uint256", "name": "receiver", "type": "uint256"},
          {"internalType": "uint256", "name": "makerAsset", "type": "uint256"},
          {"internalType": "uint256", "name": "takerAsset", "type": "uint256"},
          {"internalType": "uint256", "name": "makingAmount", "type": "uint256"},
          {"internalType": "uint256", "name": "takingAmount", "type": "uint256"},
          {"internalType": "uint256", "name": "makerTraits", "type": "uint256"}
        ],
        "internalType": "struct IOrderMixin.Order",
        "name": "order",
        "type": "tuple"
      },
      {"internalType": "bytes32", "name": "r", "type": "bytes32"},
      {"internalType": "bytes32", "name": "vs", "type": "bytes32"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"},
      {"internalType": "uint256", "name": "takerTraits", "type": "uint256"}
    ],
    "name": "fillOrder",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }];
  
  const fillOrderContract = new ethers.Contract(LIMIT_ORDER_PROTOCOL, fillOrderABI, ethers.provider);
  console.log("✅ fillOrder function exists with v4 signature");
  
  // Try a different approach - check hashOrder function
  console.log("\n🔍 Testing hashOrder function...");
  const hashOrderABI = [{
    "inputs": [
      {
        "components": [
          {"internalType": "uint256", "name": "salt", "type": "uint256"},
          {"internalType": "uint256", "name": "maker", "type": "uint256"},
          {"internalType": "uint256", "name": "receiver", "type": "uint256"},
          {"internalType": "uint256", "name": "makerAsset", "type": "uint256"},
          {"internalType": "uint256", "name": "takerAsset", "type": "uint256"},
          {"internalType": "uint256", "name": "makingAmount", "type": "uint256"},
          {"internalType": "uint256", "name": "takingAmount", "type": "uint256"},
          {"internalType": "uint256", "name": "makerTraits", "type": "uint256"}
        ],
        "internalType": "struct IOrderMixin.Order",
        "name": "order",
        "type": "tuple"
      }
    ],
    "name": "hashOrder",
    "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
    "stateMutability": "view",
    "type": "function"
  }];
  
  const hashOrderContract = new ethers.Contract(LIMIT_ORDER_PROTOCOL, hashOrderABI, ethers.provider);
  
  try {
    // Test with uint256 addresses
    const testOrder = [
      ethers.toBigInt(typedData.message.salt),
      ethers.toBigInt(signer.address),
      ethers.toBigInt(signer.address),
      ethers.toBigInt("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"),
      ethers.toBigInt("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"),
      ethers.parseUnits("0.1", 18),
      ethers.parseUnits("350", 6),
      0
    ];
    
    const orderHash = await hashOrderContract.hashOrder(testOrder);
    console.log("✅ Order hash from contract:", orderHash);
    
    // Compare with SDK hash
    const sdkHash = order.getOrderHash(1);
    console.log("✅ Order hash from SDK:", sdkHash);
    console.log("Hashes match:", orderHash === sdkHash);
  } catch (error) {
    console.error("❌ Error hashing order:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });