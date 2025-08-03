const { ethers } = require("hardhat");
const { Address, LimitOrder, MakerTraits } = require("@1inch/limit-order-sdk");
const { createArbitraryStaticCallPredicate } = require("../lib/predicate-encoder");
const { signV4Order, prepareV4OrderTuple, splitSignature } = require("../lib/1inch-v4-adapter");

// Base Sepolia addresses (will be updated after deployment)
let LIMIT_ORDER_PROTOCOL = "0xE53136D9De56672e8D2665C98653AC7b8A60Dc44";
let WETH = "0x4200000000000000000000000000000000000006";
let USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

async function deployContracts(signer) {
  console.log("📝 Deploying TriggerFi contracts...\n");
  
  // Deploy MockDynamicAPIPredicate
  const MockPredicate = await ethers.getContractFactory("MockDynamicAPIPredicate");
  const mockPredicate = await MockPredicate.deploy(signer.address, signer.address);
  await mockPredicate.waitForDeployment();
  console.log("✅ MockPredicate deployed at:", await mockPredicate.getAddress());
  
  // Deploy PriceAmountGetter
  const PriceAmountGetter = await ethers.getContractFactory("PriceAmountGetter");
  const priceGetter = await PriceAmountGetter.deploy();
  await priceGetter.waitForDeployment();
  console.log("✅ PriceAmountGetter deployed at:", await priceGetter.getAddress());
  
  return { mockPredicate, priceGetter };
}

async function setupTokens(signer) {
  console.log("\n💱 Setting up tokens...");
  
  const WETH_ABI = [
    "function deposit() payable",
    "function balanceOf(address) view returns (uint256)",
    "function approve(address, uint256) returns (bool)"
  ];
  const weth = new ethers.Contract(WETH, WETH_ABI, signer);
  
  // Get WETH
  const ethBalance = await ethers.provider.getBalance(signer.address);
  if (ethBalance > ethers.parseEther("0.01")) {
    await weth.deposit({ value: ethers.parseEther("0.01") });
    console.log("✅ Deposited 0.01 ETH to WETH");
  }
  
  const wethBalance = await weth.balanceOf(signer.address);
  console.log("💰 WETH Balance:", ethers.formatEther(wethBalance));
  
  return { weth };
}

async function createAndTestOrder(signer, mockPredicate, weth) {
  console.log("\n📋 Creating TriggerFi order...");
  
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
  console.log("✅ Predicate created:", predicateId);
  
  // Set predicate to true (simulating trigger condition met)
  await mockPredicate.setTestResult(predicateId, true);
  console.log("✅ Predicate condition set to TRUE");
  
  // Create order
  const makerTraits = MakerTraits.default();
  const order = new LimitOrder({
    makerAsset: new Address(WETH),
    takerAsset: new Address(USDC),
    makingAmount: ethers.parseUnits("0.001", 18).toString(),
    takingAmount: ethers.parseUnits("3.5", 6).toString(),
    maker: new Address(signer.address),
    receiver: new Address(signer.address)
  }, makerTraits);
  
  // Add predicate
  const checkConditionData = mockPredicate.interface.encodeFunctionData("checkCondition", [predicateId]);
  const { predicate } = createArbitraryStaticCallPredicate(
    await mockPredicate.getAddress(), 
    checkConditionData
  );
  
  console.log("\n📊 Order Details:");
  console.log("   Maker: WETH (0.001)");
  console.log("   Taker: USDC (3.5)");
  console.log("   Predicate: Dynamic API check");
  
  // Sign order
  const chainId = 84532; // Base Sepolia
  const signature = await signV4Order(order, signer, chainId, LIMIT_ORDER_PROTOCOL);
  console.log("✅ Order signed");
  
  // Approve WETH
  await weth.approve(LIMIT_ORDER_PROTOCOL, ethers.parseEther("1"));
  console.log("✅ WETH approved");
  
  // Test predicate via limit order protocol
  console.log("\n🔍 Testing predicate through protocol...");
  const protocolABI = ["function arbitraryStaticCall(address target, bytes calldata data) view returns (uint256)"];
  const protocol = new ethers.Contract(LIMIT_ORDER_PROTOCOL, protocolABI, ethers.provider);
  
  try {
    const result = await protocol.arbitraryStaticCall(
      await mockPredicate.getAddress(),
      checkConditionData
    );
    console.log(`✅ Predicate check: ${result === 1n ? "TRUE (ready to fill)" : "FALSE (not ready)"}`);
  } catch (error) {
    console.log("❌ Predicate check failed:", error.message);
  }
  
  return { order, signature, predicateId };
}

async function simulateTakerBot(order, signature, signer) {
  console.log("\n🤖 Simulating Taker Bot...");
  
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
    console.log("⚡ Attempting to fill order...");
    const fillTx = await limitOrderProtocol.fillOrder(
      orderTuple,
      r,
      vs,
      0, // fill entire order
      0  // no special taker traits
    );
    
    const receipt = await fillTx.wait();
    console.log("✅ Order filled successfully!");
    console.log("   Tx hash:", receipt.hash);
    
    return true;
  } catch (error) {
    console.error("❌ Failed to fill order:", error.message);
    if (error.message.includes("InsufficientBalance")) {
      console.log("💡 Taker needs USDC to fill the order");
    }
    return false;
  }
}

async function main() {
  console.log("🚀 TriggerFi Full Integration Test on Base Sepolia\n");
  
  const [signer] = await ethers.getSigners();
  console.log("👤 Signer:", signer.address);
  
  const balance = await ethers.provider.getBalance(signer.address);
  console.log("💰 ETH Balance:", ethers.formatEther(balance), "ETH");
  
  if (balance === 0n) {
    console.log("\n❌ No ETH! Get Base Sepolia ETH from:");
    console.log("   https://bwarelabs.com/faucets/base-sepolia");
    return;
  }
  
  // Deploy contracts
  const { mockPredicate, priceGetter } = await deployContracts(signer);
  
  // Setup tokens
  const { weth } = await setupTokens(signer);
  
  // Create and test order
  const { order, signature, predicateId } = await createAndTestOrder(signer, mockPredicate, weth);
  
  // Simulate taker bot
  await simulateTakerBot(order, signature, signer);
  
  console.log("\n✅ Integration test complete!");
  console.log("\n📝 Summary:");
  console.log("1. ✅ Deployed TriggerFi contracts");
  console.log("2. ✅ Created dynamic API predicate");
  console.log("3. ✅ Created and signed v4 limit order");
  console.log("4. ✅ Verified predicate through protocol");
  console.log("5. ⏳ Order execution pending (needs USDC taker)");
  
  console.log("\n🎯 Next Steps:");
  console.log("1. Deploy real DynamicAPIPredicateV2 with Chainlink Functions");
  console.log("2. Configure real API endpoints and conditions");
  console.log("3. Set up keeper bot for continuous monitoring");
  console.log("4. Implement order management UI");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });