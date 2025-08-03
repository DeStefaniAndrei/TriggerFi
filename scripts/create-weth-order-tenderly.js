const { ethers } = require("hardhat");
const { initializeApp } = require("firebase/app");
const { getDatabase, ref, set } = require("firebase/database");

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBfB4-oobyrnq1RX4J4HEujkBPUweSGZ8Y",
  authDomain: "triggerfi.firebaseapp.com",
  databaseURL: "https://triggerfi-default-rtdb.firebaseio.com",
  projectId: "triggerfi",
  storageBucket: "triggerfi.firebasestorage.app",
  messagingSenderId: "69321969889",
  appId: "1:69321969889:web:0316a93174587f095da7a0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Helper function to create arbitraryStaticCall predicate
function createArbitraryStaticCallPredicate(target, calldata) {
  const selector = ethers.id("arbitraryStaticCall(address,bytes)").slice(0, 10);
  const params = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "bytes"],
    [target, calldata]
  );
  return { 
    predicate: ethers.concat([selector, ethers.dataSlice(params, 2)])
  };
}

// Mainnet addresses
const MAINNET_TOKENS = {
  WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
};

// Mock predicate contract deployed on fork
const MOCK_PREDICATE_ADDRESS = "0xa0890426D0AA348Ef978bB97Ad1120f320Dbf92B";

async function main() {
  console.log("🚀 Creating WETH → USDC Order on Tenderly Fork");
  console.log("==============================================\n");

  const [signer] = await ethers.getSigners();
  console.log("👤 Maker address:", signer.address);

  // Step 1: Create a predicate
  console.log("📝 Step 1: Creating predicate...");
  const mockPredicate = await ethers.getContractAt(
    "MockDynamicAPIPredicate",
    MOCK_PREDICATE_ADDRESS,
    signer
  );

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
  console.log(`✅ Predicate created: ${predicateId}\n`);

  // Step 2: Create the order - 0.1 WETH for 350 USDC
  console.log("📋 Step 2: Creating order...");
  
  const makerAsset = MAINNET_TOKENS.WETH;
  const takerAsset = MAINNET_TOKENS.USDC;
  const makingAmount = ethers.parseUnits("0.1", 18);  // 0.1 WETH
  const takingAmount = ethers.parseUnits("350", 6);   // 350 USDC

  // Create predicate bytes
  const functionSelector = "0x7278912a"; // checkCondition(bytes32) selector - correct one!
  const params = ethers.AbiCoder.defaultAbiCoder().encode(
    ["bytes32"],
    [predicateId]
  );
  const predicateCalldata = ethers.concat([functionSelector, params]);

  const { predicate } = createArbitraryStaticCallPredicate(
    MOCK_PREDICATE_ADDRESS,
    predicateCalldata
  );

  // Create order
  const salt = ethers.randomBytes(32);
  const order = {
    salt: ethers.hexlify(salt),
    makerAsset: makerAsset,
    takerAsset: takerAsset,
    maker: signer.address,
    receiver: signer.address,
    allowedSender: ethers.ZeroAddress,
    makingAmount: makingAmount.toString(),
    takingAmount: takingAmount.toString(),
    offsets: "0x",
    interactions: "0x",
    predicate: predicate,
    permit: "0x",
    getMakingAmount: "0x",
    getTakingAmount: "0x",
    preInteraction: "0x",
    postInteraction: "0x"
  };

  console.log("📊 Order details:");
  console.log(`   Maker: ${signer.address}`);
  console.log(`   Making: 0.1 WETH`);
  console.log(`   Taking: 350 USDC`);
  console.log(`   Rate: $3,500/WETH\n`);

  // Step 3: Sign the order
  console.log("✍️ Step 3: Signing order...");
  
  const domain = {
    name: "1inch Limit Order Protocol",
    version: "4",
    chainId: 1,
    verifyingContract: "0x111111125421ca6dc452d289314280a0f8842a65"
  };

  const types = {
    Order: [
      { name: "salt", type: "bytes32" },
      { name: "makerAsset", type: "address" },
      { name: "takerAsset", type: "address" },
      { name: "maker", type: "address" },
      { name: "receiver", type: "address" },
      { name: "allowedSender", type: "address" },
      { name: "makingAmount", type: "uint256" },
      { name: "takingAmount", type: "uint256" },
      { name: "offsets", type: "bytes" },
      { name: "interactions", type: "bytes" },
      { name: "predicate", type: "bytes" },
      { name: "permit", type: "bytes" },
      { name: "getMakingAmount", type: "bytes" },
      { name: "getTakingAmount", type: "bytes" },
      { name: "preInteraction", type: "bytes" },
      { name: "postInteraction", type: "bytes" }
    ]
  };
  
  const signature = await signer.signTypedData(domain, types, order);
  console.log(`✅ Order signed\n`);

  // Step 4: Save to Firebase
  console.log("💾 Step 4: Saving to Firebase...");
  
  const orderHash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
    ["tuple(bytes32,address,address,address,address,address,uint256,uint256,bytes,bytes,bytes,bytes,bytes,bytes,bytes,bytes)"],
    [[
      order.salt,
      order.makerAsset,
      order.takerAsset,
      order.maker,
      order.receiver,
      order.allowedSender,
      order.makingAmount,
      order.takingAmount,
      order.offsets,
      order.interactions,
      order.predicate,
      order.permit,
      order.getMakingAmount,
      order.getTakingAmount,
      order.preInteraction,
      order.postInteraction
    ]]
  ));

  const orderId = `${signer.address}-${Date.now()}-tenderly-weth`;
  
  const orderData = {
    orderId: orderId,
    orderHash: orderHash,
    predicateId: predicateId,
    order: order,
    signature: signature,
    maker: signer.address,
    makerAsset: makerAsset,
    takerAsset: takerAsset,
    makerAmount: makingAmount.toString(),
    takerAmount: takingAmount.toString(),
    status: 'active',
    network: 'tenderly-fork',
    mockPredicate: MOCK_PREDICATE_ADDRESS,
    apiConditions: [
      {
        endpoint: "Mock API - Testing Only",
        jsonPath: "test.value",
        operator: ">",
        threshold: "0"
      }
    ],
    logicOperator: "AND"
  };

  const orderRef = ref(db, `orders/${orderId}`);
  await set(orderRef, orderData);

  console.log(`✅ Order saved to Firebase with ID: ${orderId}\n`);

  // Step 5: Set predicate and update count
  console.log("⚙️ Step 5: Setting up predicate...");
  
  await mockPredicate.setTestResult(predicateId, true);
  console.log("✅ Predicate set to true");
  
  await mockPredicate.setUpdateCount(predicateId, 2);
  console.log("✅ Update count set to 2 ($4 in fees)\n");

  // Display summary
  console.log("📝 Summary:");
  console.log(`   Order ID: ${orderId}`);
  console.log(`   Predicate ID: ${predicateId}`);
  console.log(`   Order: 0.1 WETH → 350 USDC`);
  console.log(`   Predicate: TRUE`);
  console.log(`   Fees: $4 (2 updates)`);
  console.log("\n💡 Next: Run the taker bot to execute this order");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });