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

// Mainnet addresses
const MAINNET_TOKENS = {
  WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
};

async function main() {
  console.log("🚀 Creating Simple WETH → USDC Order (No Predicate)\n");

  const [signer] = await ethers.getSigners();
  console.log("👤 Maker address:", signer.address);

  // Create order without predicate
  const makerAsset = MAINNET_TOKENS.WETH;
  const takerAsset = MAINNET_TOKENS.USDC;
  const makingAmount = ethers.parseUnits("0.1", 18);  // 0.1 WETH
  const takingAmount = ethers.parseUnits("350", 6);   // 350 USDC

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
    predicate: "0x", // No predicate!
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
  console.log(`   Predicate: NONE (order always fillable)\n`);

  // Sign the order
  console.log("✍️ Signing order...");
  
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
  console.log("✅ Order signed\n");

  // Save to Firebase
  console.log("💾 Saving to Firebase...");
  
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

  const orderId = `${signer.address}-${Date.now()}-simple-tenderly`;
  
  const orderData = {
    orderId: orderId,
    orderHash: orderHash,
    order: order,
    signature: signature,
    maker: signer.address,
    makerAsset: makerAsset,
    takerAsset: takerAsset,
    makerAmount: makingAmount.toString(),
    takerAmount: takingAmount.toString(),
    status: 'active',
    network: 'tenderly-fork',
    type: 'simple-no-predicate'
  };

  const orderRef = ref(db, `orders/${orderId}`);
  await set(orderRef, orderData);

  console.log(`✅ Order saved with ID: ${orderId}\n`);

  console.log("📝 Summary:");
  console.log(`   Order ID: ${orderId}`);
  console.log(`   Order: 0.1 WETH → 350 USDC`);
  console.log(`   No predicate - always fillable`);
  console.log("\n💡 Next: Run simple taker bot to execute this order");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });