/**
 * Test Order Execution
 * 
 * This script simulates executing an order with the taker bot.
 * For testing, we'll simulate fee payment even though update count is 0.
 */

const { ethers } = require("hardhat");
const { initializeApp } = require("firebase/app");
const { getDatabase, ref, get, update } = require("firebase/database");
const { CONTRACTS, DYNAMIC_API_PREDICATE_ABI } = require("../lib/contracts");

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

async function main() {
  console.log("🧪 Testing Order Execution");
  console.log("=========================\n");

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);

  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("👤 Taker address:", signer.address);

  // Check balances
  const ethBalance = await ethers.provider.getBalance(signer.address);
  console.log("💰 ETH balance:", ethers.formatEther(ethBalance), "ETH");

  // Get WETH and USDC contracts
  const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function approve(address,uint256) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)"
  ];
  const weth = new ethers.Contract("0xfff9976782d46cc05630d1f6ebab18b2324d6b14", ERC20_ABI, signer);
  const usdc = new ethers.Contract("0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8", ERC20_ABI, signer);

  const wethBalance = await weth.balanceOf(signer.address);
  const usdcBalance = await usdc.balanceOf(signer.address);
  console.log("💰 WETH balance:", ethers.formatUnits(wethBalance, 18), "WETH");
  console.log("💰 USDC balance:", ethers.formatUnits(usdcBalance, 6), "USDC\n");

  try {
    // Find our test order
    const ordersRef = ref(db, "orders");
    const snapshot = await get(ordersRef);
    const orders = snapshot.val();
    
    const testOrder = Object.entries(orders).find(([_, order]) => 
      order.predicateId === "0xbc5941431f96e14d9afe0f2e885f3b7150f380862c6994c98f9a7847804b310f" &&
      order.status === "active"
    );

    if (!testOrder) {
      console.log("❌ Test order not found");
      return;
    }

    const [orderId, orderData] = testOrder;
    console.log(`📄 Found test order: ${orderId}`);
    console.log(`   Swap: ${ethers.formatUnits(orderData.order.makingAmount, 18)} WETH → ${ethers.formatUnits(orderData.order.takingAmount, 6)} USDC\n`);

    // Simulate fee payment
    console.log("💸 Simulating fee payment...");
    console.log("   In production: Would pay $2 per update in ETH");
    console.log("   For testing: Skipping fee payment (update count = 0)\n");

    // Check 1inch approval
    console.log("🔐 Checking 1inch approvals...");
    const limitOrderProtocol = CONTRACTS.sepolia.limitOrderProtocol || "0x111111125421ca6dc452d289314280a0f8842a65";
    
    // As taker, we need to approve USDC spending
    const currentAllowance = await usdc.allowance(signer.address, limitOrderProtocol);
    console.log(`   Current USDC allowance: ${ethers.formatUnits(currentAllowance, 6)} USDC`);
    
    if (currentAllowance < orderData.order.takingAmount) {
      console.log("   ⚠️  Need to approve USDC spending for 1inch");
      console.log(`   Required: ${ethers.formatUnits(orderData.order.takingAmount, 6)} USDC`);
      
      // Approve max amount
      console.log("\n   📝 Approving USDC...");
      const approveTx = await usdc.approve(limitOrderProtocol, ethers.MaxUint256);
      console.log(`   Transaction: ${approveTx.hash}`);
      await approveTx.wait();
      console.log("   ✅ USDC approved!\n");
    } else {
      console.log("   ✅ USDC already approved\n");
    }

    // Simulate order execution
    console.log("🔄 Order Execution Steps:");
    console.log("   1. Taker sends 300 USDC to 1inch contract");
    console.log("   2. 1inch verifies predicate returns TRUE");
    console.log("   3. 1inch transfers 0.1 WETH from maker to taker");
    console.log("   4. 1inch transfers 300 USDC from taker to maker");
    console.log("   5. Order marked as filled\n");

    // Check if we have enough USDC
    if (usdcBalance < orderData.order.takingAmount) {
      console.log("❌ Insufficient USDC balance!");
      console.log(`   Need: ${ethers.formatUnits(orderData.order.takingAmount, 6)} USDC`);
      console.log(`   Have: ${ethers.formatUnits(usdcBalance, 6)} USDC`);
      console.log("\n💡 To get test USDC on Sepolia:");
      console.log("   1. Visit https://staging.aave.com/faucet/");
      console.log("   2. Connect wallet and mint USDC");
      return;
    }

    console.log("✅ All checks passed! Ready to execute.");
    console.log("\n⚠️  This is a simulation. To actually execute:");
    console.log("   Run: npx hardhat run scripts/execute-real-order.js --network sepolia");
    console.log("\n📝 Note: The maker also needs to approve WETH spending for 1inch");

  } catch (error) {
    console.error("\n❌ Error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });