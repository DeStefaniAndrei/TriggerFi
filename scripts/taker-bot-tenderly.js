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

// Mock predicate address on Tenderly
const MOCK_PREDICATE_ADDRESS = "0xa0890426D0AA348Ef978bB97Ad1120f320Dbf92B";

// Mainnet 1inch protocol
const LIMIT_ORDER_PROTOCOL = "0x111111125421ca6dc452d289314280a0f8842a65";

async function main() {
  console.log("🤖 TriggerFi Taker Bot - Tenderly Fork");
  console.log("======================================\n");

  const [signer] = await ethers.getSigners();
  console.log("👤 Taker address:", signer.address);

  // Check ETH balance for fees
  const ethBalance = await ethers.provider.getBalance(signer.address);
  console.log("💰 ETH balance:", ethers.formatEther(ethBalance), "ETH\n");

  // Get specific order from Firebase
  const orderId = "0x93d43c27746D76e7606C55493A757127b33D7763-1754221774243-tenderly-weth";
  console.log("🔍 Fetching order:", orderId);

  const orderRef = ref(db, `orders/${orderId}`);
  const snapshot = await get(orderRef);

  if (!snapshot.exists()) {
    console.error("❌ Order not found in Firebase");
    return;
  }

  const orderData = snapshot.val();
  console.log("✅ Order found");
  console.log(`   Predicate ID: ${orderData.predicateId}`);
  console.log(`   Maker: ${orderData.maker}`);
  // Determine decimals based on token
  const isWETH = orderData.makerAsset.toLowerCase() === "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
  const makerDecimals = isWETH ? 18 : 18; // Both WETH and JPYC use 18
  const makerSymbol = isWETH ? "WETH" : "JPYC";
  
  console.log(`   Making: ${ethers.formatUnits(orderData.makerAmount, makerDecimals)} ${makerSymbol}`);
  console.log(`   Taking: ${ethers.formatUnits(orderData.takerAmount, 6)} USDC\n`);

  // Check predicate status
  console.log("🔍 Checking predicate status...");
  const mockPredicate = await ethers.getContractAt(
    "MockDynamicAPIPredicate",
    MOCK_PREDICATE_ADDRESS,
    signer
  );

  const predicateResult = await mockPredicate.checkCondition(orderData.predicateId);
  console.log(`   Predicate result: ${predicateResult} (1 = true)`);

  if (predicateResult !== 1n) {
    console.log("❌ Predicate is false, order cannot be filled");
    return;
  }

  // Calculate fees
  console.log("\n💰 Calculating fees...");
  const updateCount = await mockPredicate.updateCount(orderData.predicateId);
  const feeAmount = await mockPredicate.getUpdateFees(orderData.predicateId);
  console.log(`   Update count: ${updateCount}`);
  console.log(`   Fee amount: $${ethers.formatUnits(feeAmount, 6)} USDC`);

  // Convert USDC fee to ETH (hardcoded rate for MVP)
  const ethPriceUSD = 3500;
  const usdcAmount = Number(ethers.formatUnits(feeAmount, 6));
  const ethAmount = usdcAmount / ethPriceUSD;
  const ethAmountWei = ethers.parseEther(ethAmount.toFixed(18));
  console.log(`   ETH equivalent: ${ethAmount.toFixed(6)} ETH @ $${ethPriceUSD}/ETH`);

  // Pay fees
  console.log("\n💸 Paying fees...");
  const feeTx = await mockPredicate.collectFees(orderData.predicateId, {
    value: ethAmountWei
  });
  await feeTx.wait();
  console.log("✅ Fees paid successfully");
  console.log(`   Fee tx: ${feeTx.hash}`);

  // Execute order on 1inch
  console.log("\n🔄 Executing order on 1inch...");
  
  // 1inch ABI with correct fillOrder signature
  const LIMIT_ORDER_PROTOCOL_ABI = [
    "function fillOrder(tuple(bytes32 salt, address makerAsset, address takerAsset, address maker, address receiver, address allowedSender, uint256 makingAmount, uint256 takingAmount, bytes offsets, bytes interactions, bytes predicate, bytes permit, bytes getMakingAmount, bytes getTakingAmount, bytes preInteraction, bytes postInteraction) order, bytes32 r, bytes32 vs, uint256 amount, uint256 takerTraits) payable returns (uint256 makingAmount, uint256 takingAmount, bytes32 orderHash)"
  ];

  const limitOrderProtocol = new ethers.Contract(
    LIMIT_ORDER_PROTOCOL,
    LIMIT_ORDER_PROTOCOL_ABI,
    signer
  );

  // Split signature into r and vs components
  const signature = orderData.signature;
  const sigBytes = signature.startsWith('0x') ? signature.slice(2) : signature;
  const r = '0x' + sigBytes.slice(0, 64);
  const vs = '0x' + sigBytes.slice(64, 128);

  console.log("   Executing fillOrder...");
  
  try {
    // Check token balances before fill
    const ERC20_ABI = [
      "function balanceOf(address) view returns (uint256)",
      "function allowance(address owner, address spender) view returns (uint256)"
    ];
    const makerToken = new ethers.Contract(orderData.order.makerAsset, ERC20_ABI, signer);
    const takerToken = new ethers.Contract(orderData.order.takerAsset, ERC20_ABI, signer);
    
    const makerBalanceBefore = await makerToken.balanceOf(signer.address);
    const takerBalanceBefore = await takerToken.balanceOf(signer.address);
    
    console.log(`   ${makerSymbol} balance before: ${ethers.formatUnits(makerBalanceBefore, makerDecimals)}`);
    console.log(`   USDC balance before: ${ethers.formatUnits(takerBalanceBefore, 6)}`);
    
    // Also check allowances
    const makerAllowance = await makerToken.allowance(signer.address, LIMIT_ORDER_PROTOCOL);
    const takerAllowance = await takerToken.allowance(signer.address, LIMIT_ORDER_PROTOCOL);
    console.log(`   ${makerSymbol} allowance: ${ethers.formatUnits(makerAllowance, makerDecimals)}`);
    console.log(`   USDC allowance: ${ethers.formatUnits(takerAllowance, 6)}`);

    // Try to simulate the transaction first
    try {
      await limitOrderProtocol.fillOrder.staticCall(
        orderData.order,
        r,
        vs,
        0,  // amount = 0 (fill entire order)
        0   // takerTraits = 0 (default)
      );
      console.log("   ✅ Simulation successful, executing...");
    } catch (simError) {
      console.error("   ❌ Simulation failed:", simError.message);
      if (simError.data) {
        console.log("   Error data:", simError.data);
      }
    }

    const fillTx = await limitOrderProtocol.fillOrder(
      orderData.order,
      r,
      vs,
      0,  // amount = 0 (fill entire order)
      0   // takerTraits = 0 (default)
    );

    console.log("   ⏳ Waiting for confirmation...");
    const fillReceipt = await fillTx.wait();
    
    console.log("\n✅ Order executed successfully!");
    console.log(`   Fill tx: ${fillReceipt.hash}`);
    
    // Check token balances after fill
    const makerBalanceAfter = await makerToken.balanceOf(signer.address);
    const takerBalanceAfter = await takerToken.balanceOf(signer.address);
    
    console.log(`\n   ${makerSymbol} balance after: ${ethers.formatUnits(makerBalanceAfter, makerDecimals)}`);
    console.log(`   USDC balance after: ${ethers.formatUnits(takerBalanceAfter, 6)}`);
    console.log(`   ${makerSymbol} received: ${ethers.formatUnits(makerBalanceAfter - makerBalanceBefore, makerDecimals)}`);
    console.log(`   USDC spent: ${ethers.formatUnits(takerBalanceBefore - takerBalanceAfter, 6)}`);

    // Update order status in Firebase
    console.log("\n📝 Updating order status...");
    await update(orderRef, {
      status: 'filled',
      filledAt: Date.now(),
      fillTxHash: fillReceipt.hash,
      feeTxHash: feeTx.hash,
      filledBy: signer.address,
      feesPaid: ethers.formatEther(ethAmountWei) + " ETH"
    });
    console.log("✅ Order marked as filled in Firebase");

  } catch (error) {
    console.error("\n❌ Failed to execute order:", error.message);
    
    // Common errors
    if (error.message.includes("insufficient")) {
      console.log("\n💡 Possible issues:");
      console.log(`   - Maker doesn't have enough ${makerSymbol}`);
      console.log("   - Taker doesn't have enough USDC");
      console.log("   - Tokens not approved for 1inch");
    } else if (error.message.includes("predicate")) {
      console.log("\n💡 Predicate check failed on 1inch side");
    }
    
    // Update order with error
    await update(orderRef, {
      lastError: error.message,
      lastErrorAt: Date.now()
    });
  }

  console.log("\n✨ Taker bot execution complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });