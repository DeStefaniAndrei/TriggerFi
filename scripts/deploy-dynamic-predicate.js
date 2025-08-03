const { ethers } = require("hardhat");
const fs = require("fs");

/**
 * 🚀 Deployment Script for DynamicAPIPredicate Contract
 * 
 * This script deploys our main contract that handles:
 * - API condition checking via Chainlink Functions
 * - Fee collection for predicate updates
 * - Integration with 1inch Limit Order Protocol
 */

async function main() {
  console.log("🚀 Starting DynamicAPIPredicate Deployment...\n");

  // === STEP 1: Get Deployer Account ===
  // This gets the first account from your hardhat config (usually your MetaMask)
  const [deployer] = await ethers.getSigners();
  console.log("📱 Deploying with account:", deployer.address);
  
  // Check if we have enough ETH for deployment
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
  
  if (balance < ethers.parseEther("0.1")) {
    console.error("❌ Insufficient balance! You need at least 0.1 ETH for deployment");
    return;
  }

  // === STEP 2: Configuration ===
  // These are the important addresses we need for deployment
  
  // Chainlink Functions Subscription ID (created by user)
  const CHAINLINK_SUBSCRIPTION_ID = 5385; // Your subscription on Sepolia
  
  // Network-specific addresses
  const network = await ethers.provider.getNetwork();
  const networkName = network.name;
  console.log("🌐 Deploying to network:", networkName);
  
  // Check if we're in test mode (Sepolia)
  const isTestMode = networkName === "sepolia";
  
  let CHAINLINK_FUNCTIONS_ROUTER;
  let DON_ID;
  let USDC_ADDRESS;
  
  if (networkName === "sepolia") {
    // Sepolia testnet addresses
    CHAINLINK_FUNCTIONS_ROUTER = "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0";
    DON_ID = "0x66756e2d657468657265756d2d7365706f6c69612d3100000000000000000000";
    USDC_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // USDC on Sepolia
  } else if (networkName === "mainnet") {
    // Ethereum mainnet addresses
    CHAINLINK_FUNCTIONS_ROUTER = "0x65Dcc24F8ff9e51F10DCc7Ed1e4e2A61e6E14bd6";
    DON_ID = "0x66756e2d657468657265756d2d6d61696e6e65742d3100000000000000000000";
    USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // USDC on mainnet
  } else {
    console.error("❌ Unsupported network! Use sepolia or mainnet");
    return;
  }
  
  // Your addresses
  const KEEPER_ADDRESS = "0x93d43c27746D76e7606C55493A757127b33D7763"; // Your address as keeper
  const TREASURY_ADDRESS = "0x93d43c27746D76e7606C55493A757127b33D7763"; // Your address as treasury
  
  console.log("\n📋 Deployment Configuration:");
  console.log("================================");
  console.log("Chainlink Functions Router:", CHAINLINK_FUNCTIONS_ROUTER);
  console.log("DON ID:", DON_ID);
  console.log("Subscription ID:", CHAINLINK_SUBSCRIPTION_ID);
  console.log("Keeper Address:", KEEPER_ADDRESS);
  console.log("Treasury Address:", TREASURY_ADDRESS);
  console.log("================================\n");
  

  // === STEP 3: Deploy Contract ===
  // Deploy test version on Sepolia, regular version on mainnet
  const contractName = isTestMode ? "DynamicAPIPredicateTest" : "DynamicAPIPredicate";
  console.log(`📦 Deploying ${contractName} contract...`);
  
  // Get the contract factory (this compiles the contract)
  const DynamicAPIPredicate = await ethers.getContractFactory(contractName);
  
  // Deploy with constructor parameters
  const predicate = await DynamicAPIPredicate.deploy(
    CHAINLINK_FUNCTIONS_ROUTER,  // Chainlink Functions router address
    CHAINLINK_SUBSCRIPTION_ID,    // Your subscription ID
    DON_ID,                      // Decentralized Oracle Network ID
    KEEPER_ADDRESS,              // Who can call checkConditions()
    TREASURY_ADDRESS             // Where fees go
  );
  
  // Wait for deployment to complete
  console.log("⏳ Waiting for deployment...");
  await predicate.waitForDeployment();
  
  const predicateAddress = await predicate.getAddress();
  console.log("✅ DynamicAPIPredicate deployed to:", predicateAddress);

  // === STEP 4: Post-Deployment Setup ===
  console.log("\n🔧 Post-deployment steps:");
  
  // Add contract as consumer to Chainlink subscription
  console.log("\n⚠️  IMPORTANT: Add this contract to your Chainlink subscription!");
  console.log("1. Go to https://functions.chain.link");
  console.log("2. Click on your subscription (#" + CHAINLINK_SUBSCRIPTION_ID + ")");
  console.log("3. Click 'Add Consumer'");
  console.log("4. Enter this address:", predicateAddress);
  console.log("5. Confirm the transaction\n");

  // === STEP 5: Save Deployment Info ===
  const deploymentInfo = {
    network: networkName,
    deployedAt: new Date().toISOString(),
    contracts: {
      dynamicAPIPredicate: predicateAddress,
    },
    configuration: {
      chainlinkFunctionsRouter: CHAINLINK_FUNCTIONS_ROUTER,
      donId: DON_ID,
      subscriptionId: CHAINLINK_SUBSCRIPTION_ID,
      keeper: KEEPER_ADDRESS,
      treasury: TREASURY_ADDRESS,
      usdc: USDC_ADDRESS,
    },
    nextSteps: {
      1: "Add contract as consumer to Chainlink subscription",
      2: "Update frontend with contract address",
      3: "Set up Firebase for order storage",
      4: "Run keeper service for predicate updates",
      5: "Deploy taker bot for order execution"
    }
  };

  // Save to file
  const filename = `deployment-${networkName}-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to ${filename}`);

  // === STEP 6: Verify Contract (optional) ===
  console.log("\n🔍 To verify contract on Etherscan:");
  console.log(`npx hardhat verify --network ${networkName} ${predicateAddress} "${CHAINLINK_FUNCTIONS_ROUTER}" ${CHAINLINK_SUBSCRIPTION_ID} "${DON_ID}" "${KEEPER_ADDRESS}" "${TREASURY_ADDRESS}"`);

  console.log("\n✨ Deployment complete!");
}

// Run the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });