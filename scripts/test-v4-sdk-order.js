const { ethers } = require("hardhat");
const { Address, LimitOrder, MakerTraits } = require("@1inch/limit-order-sdk");

// Mainnet addresses
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const LIMIT_ORDER_PROTOCOL = "0x111111125421ca6dc452d289314280a0f8842a65";

async function main() {
  console.log("🚀 Testing 1inch v4 Order with SDK on Hardhat Fork\n");

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

  // Create simple order using SDK
  console.log("\n📋 Creating order with SDK...");
  
  // Create MakerTraits with no special features
  const makerTraits = MakerTraits.default();
  
  // Create the limit order using SDK
  const order = new LimitOrder({
    makerAsset: new Address(WETH),
    takerAsset: new Address(USDC),
    makingAmount: ethers.parseUnits("0.1", 18).toString(), // 0.1 WETH
    takingAmount: ethers.parseUnits("350", 6).toString(),   // 350 USDC
    maker: new Address(signer.address)
    // receiver will default to maker
  }, makerTraits);

  console.log("📊 Order details:");
  console.log(`   Making: 0.1 WETH`);
  console.log(`   Taking: 350 USDC`);
  console.log(`   Rate: $3,500/WETH`);

  // Get typed data for signing with mainnet chainId (1inch expects mainnet chainId)
  console.log("\n✍️ Signing order...");
  const actualChainId = (await ethers.provider.getNetwork()).chainId;
  console.log(`   Actual Chain ID: ${actualChainId}`);
  console.log(`   Using Chain ID for signing: 1 (mainnet)`);
  
  // Use mainnet chainId for signing as 1inch protocol expects it
  const typedData = order.getTypedData(1);
  
  // Sign the order
  const signature = await signer.signTypedData(
    typedData.domain,
    { Order: typedData.types.Order },
    typedData.message
  );
  console.log("✅ Order signed");

  // Approve tokens
  console.log("\n💳 Approving tokens...");
  await weth.approve(LIMIT_ORDER_PROTOCOL, ethers.parseEther("1"));
  await usdc.approve(LIMIT_ORDER_PROTOCOL, ethers.parseUnits("1000", 6));
  console.log("✅ Tokens approved");

  // Execute order
  console.log("\n🔄 Executing order...");
  
  const ABI = [{
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
  
  const limitOrderProtocol = new ethers.Contract(LIMIT_ORDER_PROTOCOL, ABI, signer);
  
  // Split signature
  const sigBytes = signature.startsWith('0x') ? signature.slice(2) : signature;
  const r = '0x' + sigBytes.slice(0, 64);
  const vs = '0x' + sigBytes.slice(64, 128);
  
  // Check balances
  const wethBefore = await weth.balanceOf(signer.address);
  const usdcBefore = await usdc.balanceOf(signer.address);
  console.log(`\nBalances before:`);
  console.log(`   WETH: ${ethers.formatUnits(wethBefore, 18)}`);
  console.log(`   USDC: ${ethers.formatUnits(usdcBefore, 6)}`);
  
  try {
    // Convert order to contract format
    const orderStruct = [
      typedData.message.salt,
      typedData.message.maker,
      typedData.message.receiver,
      typedData.message.makerAsset,
      typedData.message.takerAsset,
      typedData.message.makingAmount,
      typedData.message.takingAmount,
      typedData.message.makerTraits
    ];
    
    const fillTx = await limitOrderProtocol.fillOrder(
      orderStruct,
      r,
      vs,
      0, // fill entire order
      0  // no special taker traits
    );
    
    const receipt = await fillTx.wait();
    console.log(`\n✅ Order executed successfully!`);
    console.log(`   Tx hash: ${receipt.hash}`);
    
    // Check final balances
    const wethAfter = await weth.balanceOf(signer.address);
    const usdcAfter = await usdc.balanceOf(signer.address);
    console.log(`\nBalances after:`);
    console.log(`   WETH: ${ethers.formatUnits(wethAfter, 18)} (${ethers.formatUnits(wethAfter - wethBefore, 18)})`);
    console.log(`   USDC: ${ethers.formatUnits(usdcAfter, 6)} (${ethers.formatUnits(usdcAfter - usdcBefore, 6)})`);
    
  } catch (error) {
    console.error("\n❌ Failed to execute order:", error.message);
    if (error.data) {
      console.log("Error data:", error.data);
    }
    
    // Log the typed data for debugging
    console.log("\n📝 Order typed data:");
    console.log(JSON.stringify(typedData, null, 2));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });