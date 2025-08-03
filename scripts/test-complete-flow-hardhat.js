const { ethers } = require("hardhat");

// Helper function to create arbitraryStaticCall predicate
function createArbitraryStaticCallPredicate(target, calldata) {
  const selector = ethers.id("arbitraryStaticCall(address,bytes)").slice(0, 10);
  const params = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "bytes"],
    [target, calldata]
  );
  return ethers.concat([selector, ethers.dataSlice(params, 2)]);
}

// Mainnet addresses
const MAINNET_TOKENS = {
  WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
};

const LIMIT_ORDER_PROTOCOL = "0x111111125421ca6dc452d289314280a0f8842a65";

async function main() {
  console.log("🚀 Complete TriggerFi Order Flow Test on Hardhat Fork\n");

  const [signer] = await ethers.getSigners();
  console.log("👤 Test account:", signer.address);

  // Step 1: Give ourselves some tokens
  console.log("\n💰 Step 1: Getting test tokens...");
  
  // Get WETH by wrapping ETH
  const WETH_ABI = [
    "function deposit() payable",
    "function balanceOf(address) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)"
  ];
  const weth = new ethers.Contract(MAINNET_TOKENS.WETH, WETH_ABI, signer);
  
  await weth.deposit({ value: ethers.parseEther("1") });
  console.log("✅ Wrapped 1 ETH to WETH");
  
  // Get USDC from a whale (Circle's address)
  const USDC_WHALE = "0x55FE002aefF02F77364de339a1292923A15844B8";
  const USDC_ABI = [
    "function transfer(address to, uint256 amount) returns (bool)",
    "function balanceOf(address) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)"
  ];
  const usdc = new ethers.Contract(MAINNET_TOKENS.USDC, USDC_ABI, signer);
  
  // Impersonate the whale
  await ethers.provider.send("hardhat_impersonateAccount", [USDC_WHALE]);
  const whale = await ethers.getSigner(USDC_WHALE);
  
  // Send some ETH to whale for gas
  await signer.sendTransaction({
    to: USDC_WHALE,
    value: ethers.parseEther("1")
  });
  
  // Transfer USDC from whale
  const usdcWhale = new ethers.Contract(MAINNET_TOKENS.USDC, USDC_ABI, whale);
  await usdcWhale.transfer(signer.address, ethers.parseUnits("1000", 6));
  console.log("✅ Received 1000 USDC from whale");
  
  await ethers.provider.send("hardhat_stopImpersonatingAccount", [USDC_WHALE]);

  // Step 2: Deploy mock predicate
  console.log("\n📝 Step 2: Deploying mock predicate...");
  const MockPredicate = await ethers.getContractFactory("MockDynamicAPIPredicate");
  const mockPredicate = await MockPredicate.deploy(signer.address, signer.address);
  await mockPredicate.waitForDeployment();
  const mockAddress = await mockPredicate.getAddress();
  console.log(`✅ Mock deployed at: ${mockAddress}`);

  // Create predicate
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
  console.log(`✅ Predicate created: ${predicateId}`);
  
  // Set to true
  await mockPredicate.setTestResult(predicateId, true);
  console.log("✅ Predicate set to true");

  // Step 3: Create order
  console.log("\n📋 Step 3: Creating order...");
  
  // Create predicate bytes
  const checkConditionData = mockPredicate.interface.encodeFunctionData("checkCondition", [predicateId]);
  const predicate = createArbitraryStaticCallPredicate(mockAddress, checkConditionData);
  
  const salt = ethers.randomBytes(32);
  const order = {
    salt: ethers.hexlify(salt),
    maker: ethers.zeroPadValue(signer.address, 32), // Address type
    receiver: ethers.zeroPadValue(signer.address, 32), // Address type
    makerAsset: ethers.zeroPadValue(MAINNET_TOKENS.WETH, 32), // Address type
    takerAsset: ethers.zeroPadValue(MAINNET_TOKENS.USDC, 32), // Address type
    makingAmount: ethers.parseUnits("0.1", 18).toString(), // 0.1 WETH
    takingAmount: ethers.parseUnits("350", 6).toString(), // 350 USDC
    makerTraits: "0" // Default traits
  };

  console.log("📊 Order details:");
  console.log(`   Making: 0.1 WETH`);
  console.log(`   Taking: 350 USDC`);
  console.log(`   Rate: $3,500/WETH`);

  // Step 4: Sign order
  console.log("\n✍️ Step 4: Signing order...");
  
  const domain = {
    name: "1inch Limit Order Protocol",
    version: "4",
    chainId: 1,
    verifyingContract: LIMIT_ORDER_PROTOCOL
  };

  const types = {
    Order: [
      { name: "salt", type: "uint256" },
      { name: "maker", type: "uint256" },
      { name: "receiver", type: "uint256" },
      { name: "makerAsset", type: "uint256" },
      { name: "takerAsset", type: "uint256" },
      { name: "makingAmount", type: "uint256" },
      { name: "takingAmount", type: "uint256" },
      { name: "makerTraits", type: "uint256" }
    ]
  };
  
  const signature = await signer.signTypedData(domain, types, order);
  console.log("✅ Order signed");

  // Step 5: Approve tokens
  console.log("\n💳 Step 5: Approving tokens...");
  await weth.approve(LIMIT_ORDER_PROTOCOL, ethers.parseEther("1"));
  console.log("✅ WETH approved");
  await usdc.approve(LIMIT_ORDER_PROTOCOL, ethers.parseUnits("1000", 6));
  console.log("✅ USDC approved");

  // Step 6: Execute order
  console.log("\n🔄 Step 6: Executing order...");
  
  const LIMIT_ORDER_ABI = [
    "function fillOrder(tuple(uint256 salt, uint256 maker, uint256 receiver, uint256 makerAsset, uint256 takerAsset, uint256 makingAmount, uint256 takingAmount, uint256 makerTraits) order, bytes32 r, bytes32 vs, uint256 amount, uint256 takerTraits) payable returns (uint256 makingAmount, uint256 takingAmount, bytes32 orderHash)"
  ];
  
  const limitOrderProtocol = new ethers.Contract(LIMIT_ORDER_PROTOCOL, LIMIT_ORDER_ABI, signer);
  
  // Split signature
  const sigBytes = signature.startsWith('0x') ? signature.slice(2) : signature;
  const r = '0x' + sigBytes.slice(0, 64);
  const vs = '0x' + sigBytes.slice(64, 128);
  
  // Check balances before
  const wethBefore = await weth.balanceOf(signer.address);
  const usdcBefore = await usdc.balanceOf(signer.address);
  console.log(`\nBalances before:`);
  console.log(`   WETH: ${ethers.formatUnits(wethBefore, 18)}`);
  console.log(`   USDC: ${ethers.formatUnits(usdcBefore, 6)}`);
  
  try {
    // Add extension with predicate
    const orderWithExtension = {
      ...order,
      salt: ethers.solidityPacked(
        ["uint96", "address"],
        [ethers.dataSlice(order.salt, 0, 12), mockAddress]
      )
    };
    
    const fillTx = await limitOrderProtocol.fillOrder(
      orderWithExtension,
      r,
      vs,
      0, // amount = 0 (fill entire order)
      0, // takerTraits = 0
      {
        gasLimit: 500000
      }
    );
    
    const fillReceipt = await fillTx.wait();
    console.log(`\n✅ Order executed successfully!`);
    console.log(`   Tx hash: ${fillReceipt.hash}`);
    
    // Check balances after
    const wethAfter = await weth.balanceOf(signer.address);
    const usdcAfter = await usdc.balanceOf(signer.address);
    console.log(`\nBalances after:`);
    console.log(`   WETH: ${ethers.formatUnits(wethAfter, 18)} (${ethers.formatUnits(wethAfter - wethBefore, 18)})`);
    console.log(`   USDC: ${ethers.formatUnits(usdcAfter, 6)} (${ethers.formatUnits(usdcAfter - usdcBefore, 6)})`);
    
  } catch (error) {
    console.error("\n❌ Failed to execute order:", error.message);
    
    // Try without predicate
    console.log("\n🔄 Trying without predicate...");
    const simpleOrder = {
      ...order,
      salt: ethers.randomBytes(32) // New salt
    };
    
    const simpleSignature = await signer.signTypedData(domain, types, simpleOrder);
    const simpleSigBytes = simpleSignature.startsWith('0x') ? simpleSignature.slice(2) : simpleSignature;
    const simpleR = '0x' + simpleSigBytes.slice(0, 64);
    const simpleVs = '0x' + simpleSigBytes.slice(64, 128);
    
    try {
      const simpleFillTx = await limitOrderProtocol.fillOrder(
        simpleOrder,
        simpleR,
        simpleVs,
        0,
        0,
        {
          gasLimit: 500000
        }
      );
      
      await simpleFillTx.wait();
      console.log("✅ Simple order (no predicate) executed successfully!");
    } catch (e2) {
      console.error("❌ Simple order also failed:", e2.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });