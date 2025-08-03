const { ethers } = require("hardhat");

// Mainnet addresses
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const LIMIT_ORDER_PROTOCOL_V3 = "0x119c71D3BbAC22029622cbaEc24854d3D32D2828"; // v3

async function main() {
  console.log("🚀 Testing 1inch v3 Protocol fillOrder\n");

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

  // Create v3 order
  console.log("\n📋 Creating v3 order...");
  
  const salt = ethers.randomBytes(32);
  const order = {
    salt: ethers.hexlify(salt),
    makerAsset: WETH,
    takerAsset: USDC,
    maker: signer.address,
    receiver: signer.address,
    allowedSender: ethers.ZeroAddress, // Anyone can fill
    makingAmount: ethers.parseUnits("0.1", 18).toString(),
    takingAmount: ethers.parseUnits("350", 6).toString(),
    offsets: "0",
    makerAssetData: "0x",
    takerAssetData: "0x",
    getMakerAmount: "0x",
    getTakerAmount: "0x",
    predicate: "0x",
    permit: "0x",
    interaction: "0x"
  };

  console.log("📊 Order details:");
  console.log(`   Making: 0.1 WETH`);
  console.log(`   Taking: 350 USDC`);

  // Sign order with v3 structure
  console.log("\n✍️ Signing order...");
  
  const domain = {
    name: "1inch Limit Order Protocol",
    version: "3",
    chainId: 1,
    verifyingContract: LIMIT_ORDER_PROTOCOL_V3
  };

  const types = {
    Order: [
      { name: "salt", type: "uint256" },
      { name: "makerAsset", type: "address" },
      { name: "takerAsset", type: "address" },
      { name: "maker", type: "address" },
      { name: "receiver", type: "address" },
      { name: "allowedSender", type: "address" },
      { name: "makingAmount", type: "uint256" },
      { name: "takingAmount", type: "uint256" },
      { name: "offsets", type: "uint256" },
      { name: "makerAssetData", type: "bytes" },
      { name: "takerAssetData", type: "bytes" },
      { name: "getMakerAmount", type: "bytes" },
      { name: "getTakerAmount", type: "bytes" },
      { name: "predicate", type: "bytes" },
      { name: "permit", type: "bytes" },
      { name: "interaction", type: "bytes" }
    ]
  };
  
  const signature = await signer.signTypedData(domain, types, order);
  console.log("✅ Order signed");

  // Approve tokens
  console.log("\n💳 Approving tokens...");
  await weth.approve(LIMIT_ORDER_PROTOCOL_V3, ethers.parseEther("1"));
  await usdc.approve(LIMIT_ORDER_PROTOCOL_V3, ethers.parseUnits("1000", 6));
  console.log("✅ Tokens approved");

  // Execute order using fillOrder (v3 style)
  console.log("\n🔄 Executing order with fillOrder...");
  
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
          {"internalType": "bytes", "name": "makerAssetData", "type": "bytes"},
          {"internalType": "bytes", "name": "takerAssetData", "type": "bytes"},
          {"internalType": "bytes", "name": "getMakerAmount", "type": "bytes"},
          {"internalType": "bytes", "name": "getTakerAmount", "type": "bytes"},
          {"internalType": "bytes", "name": "predicate", "type": "bytes"},
          {"internalType": "bytes", "name": "permit", "type": "bytes"},
          {"internalType": "bytes", "name": "interaction", "type": "bytes"}
        ],
        "internalType": "struct OrderLib.Order",
        "name": "order",
        "type": "tuple"
      },
      {"internalType": "bytes", "name": "signature", "type": "bytes"},
      {"internalType": "bytes", "name": "interaction", "type": "bytes"}
    ],
    "name": "fillOrder",
    "outputs": [
      {"internalType": "uint256", "name": "actualMakingAmount", "type": "uint256"},
      {"internalType": "uint256", "name": "actualTakingAmount", "type": "uint256"},
      {"internalType": "bytes32", "name": "orderHash", "type": "bytes32"}
    ],
    "stateMutability": "payable",
    "type": "function"
  }];
  
  const limitOrderProtocol = new ethers.Contract(LIMIT_ORDER_PROTOCOL_V3, ABI, signer);
  
  // Check balances
  const wethBefore = await weth.balanceOf(signer.address);
  const usdcBefore = await usdc.balanceOf(signer.address);
  console.log(`\nBalances before:`);
  console.log(`   WETH: ${ethers.formatUnits(wethBefore, 18)}`);
  console.log(`   USDC: ${ethers.formatUnits(usdcBefore, 6)}`);
  
  try {
    const fillTx = await limitOrderProtocol.fillOrder(
      order,
      signature,
      "0x" // interaction data
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
      
      // Try to decode common errors
      const errorInterface = new ethers.Interface([
        "error BadSignature()",
        "error InvalidatedOrder()",
        "error PredicateFailed()",
        "error MakingAmountTooLow()",
        "error TakingAmountTooHigh()",
        "error PrivateOrder()",
        "error NotEnoughAllowance(uint256 amount, uint256 allowance)",
        "error NotEnoughBalance(uint256 amount, uint256 balance)"
      ]);
      
      try {
        const decodedError = errorInterface.parseError(error.data);
        console.log("Decoded error:", decodedError?.name || "Unknown");
        if (decodedError?.args) {
          console.log("Error args:", decodedError.args);
        }
      } catch (e) {
        console.log("Could not decode error");
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });