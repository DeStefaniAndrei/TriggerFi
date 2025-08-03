const { ethers } = require("hardhat");
const { CONTRACTS } = require("../lib/contracts");

// Test parameters from order creation
const MOCK_PREDICATE_ADDRESS = "0xa0890426D0AA348Ef978bB97Ad1120f320Dbf92B";
const PREDICATE_ID = "0x65d8bd9f0c5ad9f43c02bdd085e3f256ff7cca0efe13218ecea50f70adf223cf";
const ORDER_ID = "0x93d43c27746D76e7606C55493A757127b33D7763-1754219667876-tenderly";

// Mainnet token addresses
const JPYC = "0x2370f9d504c7a6E775bf6E14B3F12846b594cD53";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

// ERC20 ABI for approvals
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

async function main() {
  console.log("🧪 Tenderly Fork Test Flow");
  console.log("=========================\n");

  const [signer] = await ethers.getSigners();
  console.log("👤 Test account:", signer.address);

  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log("🌐 Network: Chain ID", network.chainId, "\n");

  // Step 1: Set predicate to true
  console.log("📝 Step 1: Setting predicate to true...");
  const mockPredicate = await ethers.getContractAt(
    "MockDynamicAPIPredicate",
    MOCK_PREDICATE_ADDRESS,
    signer
  );

  let tx = await mockPredicate.setTestResult(PREDICATE_ID, true);
  await tx.wait();
  console.log("✅ Predicate set to true");

  // Verify predicate state
  const predicateResult = await mockPredicate.checkCondition(PREDICATE_ID);
  console.log(`   Predicate result: ${predicateResult} (1 = true)\n`);

  // Step 2: Set update count for fees
  console.log("💰 Step 2: Setting update count for fees...");
  tx = await mockPredicate.setUpdateCount(PREDICATE_ID, 5);
  await tx.wait();
  console.log("✅ Update count set to 5 ($10 in fees)");

  // Check fees
  const fees = await mockPredicate.getUpdateFees(PREDICATE_ID);
  console.log(`   Fees owed: $${ethers.formatUnits(fees, 6)} USDC\n`);

  // Step 3: Approve tokens
  console.log("💳 Step 3: Approving tokens...");
  
  // Get 1inch protocol address
  const limitOrderProtocol = "0x111111125421ca6dc452d289314280a0f8842a65"; // mainnet

  // Approve JPYC for maker
  const jpycToken = new ethers.Contract(JPYC, ERC20_ABI, signer);
  const jpycBalance = await jpycToken.balanceOf(signer.address);
  console.log(`   JPYC balance: ${ethers.formatUnits(jpycBalance, 18)}`);
  
  tx = await jpycToken.approve(limitOrderProtocol, ethers.parseUnits("1000", 18));
  await tx.wait();
  console.log("✅ JPYC approved for 1inch");

  // Approve USDC for taker (same account for testing)
  const usdcToken = new ethers.Contract(USDC, ERC20_ABI, signer);
  const usdcBalance = await usdcToken.balanceOf(signer.address);
  console.log(`   USDC balance: ${ethers.formatUnits(usdcBalance, 6)}`);
  
  tx = await usdcToken.approve(limitOrderProtocol, ethers.parseUnits("1000", 6));
  await tx.wait();
  console.log("✅ USDC approved for 1inch\n");

  // Step 4: Run taker bot
  console.log("🤖 Step 4: Running taker bot...");
  console.log("   Order ID:", ORDER_ID);
  console.log("   Predicate ID:", PREDICATE_ID);
  console.log("\n💡 To execute the order, run:");
  console.log("   npx hardhat run scripts/taker-bot-tenderly.js --network tenderly");
  console.log("\n   Or use the existing taker bot with network override:");
  console.log("   node scripts/taker-bot-triggerfi.js --network tenderly");

  // Display summary
  console.log("\n📊 Test Setup Complete:");
  console.log("   ✅ Predicate is true");
  console.log("   ✅ Update count is 5 ($10 fees)");
  console.log("   ✅ JPYC approved for 1inch");
  console.log("   ✅ USDC approved for 1inch");
  console.log("   ✅ Order ready for execution");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });