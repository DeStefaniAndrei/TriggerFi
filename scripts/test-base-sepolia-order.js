const { ethers } = require("hardhat");
const { Address, LimitOrder, MakerTraits } = require("@1inch/limit-order-sdk");
const { createArbitraryStaticCallPredicate } = require("../lib/predicate-encoder");
const { signV4Order, prepareV4OrderTuple, splitSignature } = require("../lib/1inch-v4-adapter");

// Base Sepolia addresses
const LIMIT_ORDER_PROTOCOL = "0xE53136D9De56672e8D2665C98653AC7b8A60Dc44"; // Hackathon deployed
const WETH = "0x4200000000000000000000000000000000000006"; // Base WETH
const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC

async function main() {
  console.log("🚀 Testing Limit Order Protocol on Base Sepolia\n");

  const [signer] = await ethers.getSigners();
  console.log("👤 Signer:", signer.address);

  // Check balance
  const balance = await ethers.provider.getBalance(signer.address);
  console.log("💰 ETH Balance:", ethers.formatEther(balance), "ETH");

  // First, let's check if the limit order protocol is deployed
  console.log("\n🔍 Checking Limit Order Protocol...");
  const code = await ethers.provider.getCode(LIMIT_ORDER_PROTOCOL);
  console.log(`✅ Contract exists: ${code.length > 2}`);

  // Deploy mock predicate
  console.log("\n📝 Deploying mock predicate...");
  const MockPredicate = await ethers.getContractFactory("MockDynamicAPIPredicate");
  const mockPredicate = await MockPredicate.deploy(signer.address, signer.address);
  await mockPredicate.waitForDeployment();
  const mockAddress = await mockPredicate.getAddress();
  console.log(`✅ Mock deployed at: ${mockAddress}`);

  // Create predicate
  const tx = await mockPredicate.createPredicate();
  const receipt = await tx.wait();
  
  const event = receipt.logs.find(log => {
    try {
      const parsed = mockPredicate.interface.parseLog(log);
      return parsed.name === "PredicateCreated";
    } catch {
      return false;
    }
  });

  const predicateId = mockPredicate.interface.parseLog(event).args.predicateId;
  console.log(`✅ Predicate created: ${predicateId}`);
  
  // Set to true
  await mockPredicate.setTestResult(predicateId, true);
  console.log("✅ Predicate set to true");

  // Get some WETH
  console.log("\n💱 Getting WETH...");
  const WETH_ABI = [
    "function deposit() payable",
    "function balanceOf(address) view returns (uint256)",
    "function approve(address, uint256) returns (bool)"
  ];
  const weth = new ethers.Contract(WETH, WETH_ABI, signer);
  
  try {
    await weth.deposit({ value: ethers.parseEther("0.01") });
    console.log("✅ Deposited 0.01 ETH to WETH");
  } catch (error) {
    console.error("❌ Failed to deposit WETH:", error.message);
  }

  const wethBalance = await weth.balanceOf(signer.address);
  console.log("WETH Balance:", ethers.formatEther(wethBalance), "WETH");

  // Create order using SDK
  console.log("\n📋 Creating order with SDK...");
  
  const makerTraits = MakerTraits.default();
  const order = new LimitOrder({
    makerAsset: new Address(WETH),
    takerAsset: new Address(USDC),
    makingAmount: ethers.parseUnits("0.001", 18).toString(), // 0.001 WETH
    takingAmount: ethers.parseUnits("3.5", 6).toString(),    // 3.5 USDC
    maker: new Address(signer.address),
    receiver: new Address(signer.address)
  }, makerTraits);

  console.log("📊 Order details:");
  console.log(`   Making: 0.001 WETH`);
  console.log(`   Taking: 3.5 USDC`);

  // Add predicate
  const checkConditionData = mockPredicate.interface.encodeFunctionData("checkCondition", [predicateId]);
  const { predicate } = createArbitraryStaticCallPredicate(mockAddress, checkConditionData);
  
  console.log(`   Predicate: ${predicate.slice(0, 66)}...`);

  // Sign order with v4 adapter
  console.log("\n✍️ Signing order with v4 adapter...");
  const chainId = 84532; // Base Sepolia
  
  const signature = await signV4Order(order, signer, chainId, LIMIT_ORDER_PROTOCOL);
  console.log("✅ Order signed with v4 format");

  // Approve WETH
  console.log("\n💳 Approving WETH...");
  await weth.approve(LIMIT_ORDER_PROTOCOL, ethers.parseEther("1"));
  console.log("✅ WETH approved");

  // Test the limit order protocol
  console.log("\n🔍 Testing limit order protocol functions...");
  
  // Try basic function calls to understand the interface
  const testABI = [
    "function version() view returns (string)",
    "function DOMAIN_SEPARATOR() view returns (bytes32)",
    "function arbitraryStaticCall(address target, bytes calldata data) view returns (uint256)"
  ];
  
  const testContract = new ethers.Contract(LIMIT_ORDER_PROTOCOL, testABI, ethers.provider);
  
  try {
    // Test arbitraryStaticCall with our predicate
    const result = await testContract.arbitraryStaticCall(mockAddress, checkConditionData);
    console.log(`✅ Predicate check result: ${result}`);
    console.log(`   Predicate returns: ${result === 1n ? "TRUE" : "FALSE"}`);
  } catch (error) {
    console.log("❌ arbitraryStaticCall not available or failed:", error.message);
  }

  // Try to execute the order
  console.log("\n🔄 Testing order execution...");
  
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
    "outputs": [
      {"internalType": "uint256", "name": "makingAmount", "type": "uint256"},
      {"internalType": "uint256", "name": "takingAmount", "type": "uint256"},
      {"internalType": "bytes32", "name": "orderHash", "type": "bytes32"}
    ],
    "stateMutability": "payable",
    "type": "function"
  }];
  
  const limitOrderProtocol = new ethers.Contract(LIMIT_ORDER_PROTOCOL, fillOrderABI, signer);
  const orderTuple = prepareV4OrderTuple(order);
  const { r, vs } = splitSignature(signature);
  
  try {
    // First act as maker - taker needs USDC
    console.log("\n💱 Simulating taker with USDC...");
    console.log("For real test: Taker needs Base Sepolia USDC to take the order");
    
    const fillTx = await limitOrderProtocol.fillOrder(
      orderTuple,
      r,
      vs,
      0, // fill entire order
      0  // no special taker traits
    );
    
    const receipt = await fillTx.wait();
    console.log(`\n✅ Order executed successfully!`);
    console.log(`   Tx hash: ${receipt.hash}`);
    
  } catch (error) {
    console.error("\n❌ Failed to execute order:", error.message);
    if (error.message.includes("InsufficientBalance")) {
      console.log("\n💡 Taker needs Base Sepolia USDC to fill the order");
    }
  }
  
  console.log("\n✅ Base Sepolia test complete!");
  console.log("Next steps:");
  console.log("1. Deploy TriggerFi infrastructure to Base Sepolia");
  console.log("2. Create orders with real predicates");
  console.log("3. Test keeper bot monitoring");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });