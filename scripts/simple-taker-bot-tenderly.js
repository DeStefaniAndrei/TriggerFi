const { ethers } = require("hardhat");
const { initializeApp } = require("firebase/app");
const { getDatabase, ref, get, update } = require("firebase/database");

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

// Mainnet 1inch protocol
const LIMIT_ORDER_PROTOCOL = "0x111111125421ca6dc452d289314280a0f8842a65";

async function main() {
  console.log("🤖 Simple Taker Bot - Tenderly Fork\n");

  const [signer] = await ethers.getSigners();
  console.log("👤 Taker address:", signer.address);

  // Get order from Firebase
  const orderId = "0x93d43c27746D76e7606C55493A757127b33D7763-1754221978294-simple-tenderly";
  console.log("🔍 Fetching order:", orderId);

  const orderRef = ref(db, `orders/${orderId}`);
  const snapshot = await get(orderRef);

  if (!snapshot.exists()) {
    console.error("❌ Order not found");
    return;
  }

  const orderData = snapshot.val();
  console.log("✅ Order found");
  console.log(`   Making: ${ethers.formatUnits(orderData.makerAmount, 18)} WETH`);
  console.log(`   Taking: ${ethers.formatUnits(orderData.takerAmount, 6)} USDC\n`);

  // 1inch ABI
  const LIMIT_ORDER_PROTOCOL_ABI = [
    "function fillOrder(tuple(bytes32 salt, address makerAsset, address takerAsset, address maker, address receiver, address allowedSender, uint256 makingAmount, uint256 takingAmount, bytes offsets, bytes interactions, bytes predicate, bytes permit, bytes getMakingAmount, bytes getTakingAmount, bytes preInteraction, bytes postInteraction) order, bytes32 r, bytes32 vs, uint256 amount, uint256 takerTraits) payable returns (uint256 makingAmount, uint256 takingAmount, bytes32 orderHash)"
  ];

  const limitOrderProtocol = new ethers.Contract(
    LIMIT_ORDER_PROTOCOL,
    LIMIT_ORDER_PROTOCOL_ABI,
    signer
  );

  // Check balances
  const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)"
  ];
  
  const weth = new ethers.Contract(orderData.order.makerAsset, ERC20_ABI, signer);
  const usdc = new ethers.Contract(orderData.order.takerAsset, ERC20_ABI, signer);
  
  const wethBalance = await weth.balanceOf(signer.address);
  const usdcBalance = await usdc.balanceOf(signer.address);
  
  console.log("💰 Balances:");
  console.log(`   WETH: ${ethers.formatUnits(wethBalance, 18)}`);
  console.log(`   USDC: ${ethers.formatUnits(usdcBalance, 6)}\n`);

  // Split signature
  const signature = orderData.signature;
  const sigBytes = signature.startsWith('0x') ? signature.slice(2) : signature;
  const r = '0x' + sigBytes.slice(0, 64);
  const vs = '0x' + sigBytes.slice(64, 128);

  console.log("🔄 Executing fillOrder...");
  
  try {
    // First try simulation
    await limitOrderProtocol.fillOrder.staticCall(
      orderData.order,
      r,
      vs,
      0,  // amount = 0 (fill entire order)
      0   // takerTraits = 0
    );
    console.log("✅ Simulation successful, executing...\n");
    
    const fillTx = await limitOrderProtocol.fillOrder(
      orderData.order,
      r,
      vs,
      0,
      0
    );

    console.log("⏳ Waiting for confirmation...");
    const receipt = await fillTx.wait();
    
    console.log("\n✅ Order executed successfully!");
    console.log(`   Tx hash: ${receipt.hash}`);
    
    // Check final balances
    const wethBalanceAfter = await weth.balanceOf(signer.address);
    const usdcBalanceAfter = await usdc.balanceOf(signer.address);
    
    console.log("\n💰 Final balances:");
    console.log(`   WETH: ${ethers.formatUnits(wethBalanceAfter, 18)} (+${ethers.formatUnits(wethBalanceAfter - wethBalance, 18)})`);
    console.log(`   USDC: ${ethers.formatUnits(usdcBalanceAfter, 6)} (${ethers.formatUnits(usdcBalanceAfter - usdcBalance, 6)})`);

    // Update Firebase
    await update(orderRef, {
      status: 'filled',
      filledAt: Date.now(),
      fillTxHash: receipt.hash,
      filledBy: signer.address
    });
    
  } catch (error) {
    console.error("\n❌ Failed to execute order:", error.message);
    
    if (error.data) {
      console.log("Error data:", error.data);
    }
    
    // Try to decode error
    if (error.message.includes("InsufficientBalance")) {
      console.log("\n💡 Insufficient balance - check token allowances and balances");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });