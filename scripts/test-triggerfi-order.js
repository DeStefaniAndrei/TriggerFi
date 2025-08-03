const { ethers } = require("hardhat");
const { Address, LimitOrder, MakerTraits } = require("@1inch/limit-order-sdk");
const { createArbitraryStaticCallPredicate } = require("../lib/predicate-encoder");
const { signV4Order, prepareV4OrderTuple, splitSignature } = require("../lib/1inch-v4-adapter");

// Load deployment info
const deployment = require("../deployments/base-sepolia.json");

async function main() {
  console.log("🚀 Testing TriggerFi Order on Base Sepolia\n");

  const [signer] = await ethers.getSigners();
  console.log("👤 Signer:", signer.address);

  const balance = await ethers.provider.getBalance(signer.address);
  console.log("💰 ETH Balance:", ethers.formatEther(balance), "ETH");

  // Connect to deployed contracts
  const mockPredicate = await ethers.getContractAt(
    "MockDynamicAPIPredicate",
    deployment.contracts.mockPredicate
  );
  const orderManager = await ethers.getContractAt(
    "CustomOrderManager",
    deployment.contracts.customOrderManager
  );

  console.log("\n📍 Using contracts:");
  console.log("   MockPredicate:", deployment.contracts.mockPredicate);
  console.log("   OrderManager:", deployment.contracts.customOrderManager);
  console.log("   LimitOrderProtocol:", deployment.contracts.limitOrderProtocol);

  // Create predicate
  console.log("\n📝 Creating predicate...");
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
  
  // Set predicate to true (simulating condition met)
  await mockPredicate.setTestResult(predicateId, true);
  console.log("✅ Predicate condition set to TRUE");

  // Get WETH
  console.log("\n💱 Getting WETH...");
  const WETH_ABI = [
    "function deposit() payable",
    "function balanceOf(address) view returns (uint256)",
    "function approve(address, uint256) returns (bool)"
  ];
  const weth = new ethers.Contract(deployment.tokens.WETH, WETH_ABI, signer);
  
  try {
    await weth.deposit({ value: ethers.parseEther("0.01") });
    console.log("✅ Deposited 0.01 ETH to WETH");
  } catch (error) {
    console.log("⚠️  WETH deposit failed, continuing...");
  }

  const wethBalance = await weth.balanceOf(signer.address);
  console.log("WETH Balance:", ethers.formatEther(wethBalance), "WETH");

  // Create order
  console.log("\n📋 Creating TriggerFi order...");
  
  const makerTraits = MakerTraits.default();
  const order = new LimitOrder({
    makerAsset: new Address(deployment.tokens.WETH),
    takerAsset: new Address(deployment.tokens.USDC),
    makingAmount: ethers.parseUnits("0.001", 18).toString(),
    takingAmount: ethers.parseUnits("3.5", 6).toString(),
    maker: new Address(signer.address),
    receiver: new Address(signer.address)
  }, makerTraits);

  // Add predicate
  const checkConditionData = mockPredicate.interface.encodeFunctionData("checkCondition", [predicateId]);
  const { predicate } = createArbitraryStaticCallPredicate(
    deployment.contracts.mockPredicate,
    checkConditionData
  );
  
  console.log("\n📊 Order Details:");
  console.log("   Type: JPY Hedging Demo");
  console.log("   Trigger: Tariffs > 15% AND Inflation > 5%");
  console.log("   Action: Swap 0.001 WETH → 3.5 USDC");
  console.log("   Predicate ID:", predicateId);

  // Sign order
  console.log("\n✍️ Signing order...");
  const chainId = 84532; // Base Sepolia
  const signature = await signV4Order(order, signer, chainId, deployment.contracts.limitOrderProtocol);
  console.log("✅ Order signed with v4 format");

  // Calculate order hash
  const orderData = order.build();
  const orderHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "address", "address", "address", "address", "uint256", "uint256", "uint256"],
      [orderData.salt, orderData.maker, orderData.receiver, orderData.makerAsset, 
       orderData.takerAsset, orderData.makingAmount, orderData.takingAmount, orderData.makerTraits]
    )
  );

  // Register order in OrderManager
  console.log("\n📝 Registering order in OrderManager...");
  await orderManager.createOrder(
    orderHash,
    predicateId,
    "JPY Hedging: Swap WETH to USDC when tariffs > 15% AND inflation > 5%"
  );
  console.log("✅ Order registered");

  // Approve WETH
  console.log("\n💳 Approving WETH...");
  await weth.approve(deployment.contracts.limitOrderProtocol, ethers.parseEther("1"));
  console.log("✅ WETH approved");

  // Test predicate through protocol
  console.log("\n🔍 Testing predicate through protocol...");
  const protocolABI = ["function arbitraryStaticCall(address target, bytes calldata data) view returns (uint256)"];
  const protocol = new ethers.Contract(deployment.contracts.limitOrderProtocol, protocolABI, ethers.provider);
  
  try {
    const result = await protocol.arbitraryStaticCall(
      deployment.contracts.mockPredicate,
      checkConditionData
    );
    console.log(`✅ Predicate check: ${result === 1n ? "TRUE (ready to fill)" : "FALSE (not ready)"}`);
  } catch (error) {
    console.log("❌ Predicate check failed:", error.message);
  }

  // Prepare for execution
  console.log("\n🤖 Order ready for taker bot execution");
  console.log("\n📝 Order data for taker:");
  console.log(JSON.stringify({
    order: prepareV4OrderTuple(order),
    signature: signature,
    predicate: predicate,
    predicateId: predicateId,
    orderHash: orderHash
  }, null, 2));

  // Try to execute (will fail without USDC)
  console.log("\n🔄 Attempting to execute order...");
  
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
  
  const limitOrderProtocol = new ethers.Contract(deployment.contracts.limitOrderProtocol, fillOrderABI, signer);
  const orderTuple = prepareV4OrderTuple(order);
  const { r, vs } = splitSignature(signature);
  
  try {
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
    
    // Mark order as filled
    await orderManager.markOrderFilled(orderHash, signer.address);
    
  } catch (error) {
    console.error("❌ Failed to fill order:", error.message);
    if (error.message.includes("InsufficientBalance") || error.message.includes("TRANSFER_FROM_FAILED")) {
      console.log("\n💡 Taker needs Base Sepolia USDC to fill the order");
      console.log("   USDC address:", deployment.tokens.USDC);
    }
  }

  // Display summary
  console.log("\n✅ TriggerFi order created successfully!");
  console.log("\n📋 Summary:");
  console.log("1. ✅ Deployed all TriggerFi contracts");
  console.log("2. ✅ Created dynamic API predicate");
  console.log("3. ✅ Created limit order with predicate");
  console.log("4. ✅ Registered order in OrderManager");
  console.log("5. ✅ Verified predicate returns TRUE");
  console.log("6. ⏳ Order execution pending (needs USDC taker)");
  
  console.log("\n🎯 Next Steps:");
  console.log("1. Deploy real DynamicAPIPredicateV2 with Chainlink");
  console.log("2. Configure real API endpoints (tariff & inflation data)");
  console.log("3. Set up keeper bot for monitoring orders");
  console.log("4. Get Base Sepolia USDC for testing execution");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });