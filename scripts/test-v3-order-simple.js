const { ethers } = require("hardhat");

// Mainnet addresses
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const LIMIT_ORDER_PROTOCOL = "0x111111125421ca6dc452d289314280a0f8842a65";

async function main() {
  console.log("🚀 Testing 1inch Simple Order on Hardhat Fork\n");

  const [signer] = await ethers.getSigners();
  console.log("👤 Signer:", signer.address);

  // Get tokens
  console.log("\n💰 Getting tokens...");
  const WETH_ABI = ["function deposit() payable", "function balanceOf(address) view returns (uint256)", "function approve(address, uint256) returns (bool)"];
  const weth = new ethers.Contract(WETH, WETH_ABI, signer);
  await weth.deposit({ value: ethers.parseEther("1") });
  
  const USDC_WHALE = "0x55FE002aefF02F77364de339a1292923A15844B8";
  const USDC_ABI = ["function transfer(address, uint256) returns (bool)", "function balanceOf(address) view returns (uint256)", "function approve(address, uint256) returns (bool)"];
  
  await ethers.provider.send("hardhat_impersonateAccount", [USDC_WHALE]);
  const whale = await ethers.getSigner(USDC_WHALE);
  await signer.sendTransaction({ to: USDC_WHALE, value: ethers.parseEther("0.1") });
  
  const usdcWhale = new ethers.Contract(USDC, USDC_ABI, whale);
  await usdcWhale.transfer(signer.address, ethers.parseUnits("1000", 6));
  await ethers.provider.send("hardhat_stopImpersonatingAccount", [USDC_WHALE]);
  
  const usdc = new ethers.Contract(USDC, USDC_ABI, signer);
  console.log("✅ Got WETH and USDC");

  // Create simple order using SDK types
  console.log("\n📋 Creating simple order...");
  
  const salt = ethers.randomBytes(32);
  const order = {
    salt: ethers.hexlify(salt),
    maker: signer.address,
    receiver: signer.address,
    makerAsset: WETH,
    takerAsset: USDC,
    makingAmount: ethers.parseUnits("0.1", 18).toString(),
    takingAmount: ethers.parseUnits("350", 6).toString(),
    makerTraits: "0"
  };

  console.log("📊 Order details:");
  console.log(`   Making: 0.1 WETH`);
  console.log(`   Taking: 350 USDC`);
  console.log(`   Rate: $3,500/WETH`);

  // Sign order with address types (not uint256)
  console.log("\n✍️ Signing order...");
  
  const domain = {
    name: "1inch Aggregation Router",
    version: "6",
    chainId: 1,
    verifyingContract: LIMIT_ORDER_PROTOCOL
  };

  const types = {
    Order: [
      { name: "salt", type: "uint256" },
      { name: "maker", type: "address" },      // Using address type
      { name: "receiver", type: "address" },   // Using address type
      { name: "makerAsset", type: "address" }, // Using address type
      { name: "takerAsset", type: "address" }, // Using address type
      { name: "makingAmount", type: "uint256" },
      { name: "takingAmount", type: "uint256" },
      { name: "makerTraits", type: "uint256" }
    ]
  };
  
  const signature = await signer.signTypedData(domain, types, order);
  console.log("✅ Order signed");

  // Approve tokens
  console.log("\n💳 Approving tokens...");
  await weth.approve(LIMIT_ORDER_PROTOCOL, ethers.parseEther("1"));
  await usdc.approve(LIMIT_ORDER_PROTOCOL, ethers.parseUnits("1000", 6));
  console.log("✅ Tokens approved");

  // Execute order with fillOrderTo
  console.log("\n🔄 Executing order with fillOrderTo...");
  
  // Try the simpler fillOrderTo function that doesn't have v4 structure
  const ABI = [{
    "inputs": [
      {
        "components": [
          {"internalType": "uint256", "name": "salt", "type": "uint256"},
          {"internalType": "address", "name": "makerAsset", "type": "address"},
          {"internalType": "address", "name": "takerAsset", "type": "address"},
          {"internalType": "address", "name": "maker", "type": "address"},
          {"internalType": "address", "name": "receiver", "type": "address"},
          {"internalType": "address", "name": "allowedSender", "type": "address"},
          {"internalType": "uint256", "name": "makingAmount", "type": "uint256"},
          {"internalType": "uint256", "name": "takingAmount", "type": "uint256"},
          {"internalType": "uint256", "name": "offsets", "type": "uint256"},
          {"internalType": "bytes", "name": "interactions", "type": "bytes"}
        ],
        "internalType": "struct OrderLib.Order",
        "name": "order",
        "type": "tuple"
      },
      {"internalType": "bytes", "name": "signature", "type": "bytes"},
      {"internalType": "bytes", "name": "interaction", "type": "bytes"},
      {"internalType": "uint256", "name": "makingAmount", "type": "uint256"},
      {"internalType": "uint256", "name": "takingAmount", "type": "uint256"},
      {"internalType": "uint256", "name": "skipPermit", "type": "uint256"},
      {"internalType": "address", "name": "target", "type": "address"}
    ],
    "name": "fillOrderTo",
    "outputs": [
      {"internalType": "uint256", "name": "actualMakingAmount", "type": "uint256"},
      {"internalType": "uint256", "name": "actualTakingAmount", "type": "uint256"}
    ],
    "stateMutability": "payable",
    "type": "function"
  }];
  
  const limitOrderProtocol = new ethers.Contract(LIMIT_ORDER_PROTOCOL, ABI, signer);
  
  // Check balances
  const wethBefore = await weth.balanceOf(signer.address);
  const usdcBefore = await usdc.balanceOf(signer.address);
  console.log(`\nBalances before:`);
  console.log(`   WETH: ${ethers.formatUnits(wethBefore, 18)}`);
  console.log(`   USDC: ${ethers.formatUnits(usdcBefore, 6)}`);
  
  try {
    // Try with extended order structure
    const orderExtended = {
      salt: order.salt,
      makerAsset: order.makerAsset,
      takerAsset: order.takerAsset,
      maker: order.maker,
      receiver: order.receiver,
      allowedSender: ethers.ZeroAddress, // Anyone can fill
      makingAmount: order.makingAmount,
      takingAmount: order.takingAmount,
      offsets: "0",
      interactions: "0x"
    };
    
    const fillTx = await limitOrderProtocol.fillOrderTo(
      orderExtended,
      signature,
      "0x", // interaction data
      0,    // makingAmount (0 = fill all)
      0,    // takingAmount (0 = fill all)
      0,    // skipPermit
      signer.address // target (who receives the tokens)
    );
    
    const receipt = await fillTx.wait();
    console.log(`\n✅ Order executed successfully!`);
    console.log(`   Tx hash: ${receipt.hash}`);
    
    // Check final balances
    const wethAfter = await weth.balanceOf(signer.address);
    const usdcAfter = await usdc.balanceOf(signer.address);
    console.log(`\nBalances after:`);
    console.log(`   WETH: ${ethers.formatUnits(wethAfter, 18)} (${ethers.formatUnits(wethAfter - wethBefore, 18)})`);
    console.log(`   USDC: ${ethers.formatUnits(usdcAfter, 6)} (+${ethers.formatUnits(usdcAfter - usdcBefore, 6)})`);
    
  } catch (error) {
    console.error("\n❌ Failed to execute order:", error.message);
    if (error.data) {
      console.log("Error data:", error.data);
    }
    
    // Try to decode the error
    console.log("\n🔍 Trying to get more error info...");
    try {
      const errorInterface = new ethers.Interface([
        "error BadSignature()",
        "error InvalidatedOrder()",
        "error OrderExpired()",
        "error WrongAmount()",
        "error PredicateFailed()"
      ]);
      const decodedError = errorInterface.parseError(error.data);
      console.log("Decoded error:", decodedError?.name || "Unknown");
    } catch (e) {
      console.log("Could not decode error");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });