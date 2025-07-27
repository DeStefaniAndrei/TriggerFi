import { ethers } from "hardhat";

async function main() {
  console.log("Deploying TriggerFi contracts...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Aave V3 addresses (Mainnet)
  const AAVE_POOL = "0x794a61358D6845594F94dc1DB02A252b5b4814aD";
  const AAVE_POOL_DATA_PROVIDER = "0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654";

  // 1inch Limit Order Protocol addresses (Mainnet)
  const ONEINCH_LIMIT_ORDER_PROTOCOL = "0x1111111254EEB25477B68fb85Ed929f73A960582";

  console.log("Deploying AaveRatePredicate...");
  const AaveRatePredicate = await ethers.getContractFactory("AaveRatePredicate");
  const ratePredicate = await AaveRatePredicate.deploy(AAVE_POOL_DATA_PROVIDER);
  await ratePredicate.waitForDeployment();
  console.log("AaveRatePredicate deployed to:", await ratePredicate.getAddress());

  console.log("Deploying AaveWithdrawInteraction...");
  const AaveWithdrawInteraction = await ethers.getContractFactory("AaveWithdrawInteraction");
  const withdrawInteraction = await AaveWithdrawInteraction.deploy(AAVE_POOL);
  await withdrawInteraction.waitForDeployment();
  console.log("AaveWithdrawInteraction deployed to:", await withdrawInteraction.getAddress());

  console.log("Deploying TriggerFiOrderManager...");
  const TriggerFiOrderManager = await ethers.getContractFactory("TriggerFiOrderManager");
  const orderManager = await TriggerFiOrderManager.deploy(
    await ratePredicate.getAddress(),
    await withdrawInteraction.getAddress()
  );
  await orderManager.waitForDeployment();
  console.log("TriggerFiOrderManager deployed to:", await orderManager.getAddress());

  console.log("\nDeployment Summary:");
  console.log("===================");
  console.log("AaveRatePredicate:", await ratePredicate.getAddress());
  console.log("AaveWithdrawInteraction:", await withdrawInteraction.getAddress());
  console.log("TriggerFiOrderManager:", await orderManager.getAddress());
  console.log("\nAave V3 Pool:", AAVE_POOL);
  console.log("Aave V3 Pool Data Provider:", AAVE_POOL_DATA_PROVIDER);
  console.log("1inch Limit Order Protocol:", ONEINCH_LIMIT_ORDER_PROTOCOL);

  // Verify contracts on Etherscan (optional)
  console.log("\nTo verify contracts on Etherscan, run:");
  console.log(`npx hardhat verify --network mainnet ${await ratePredicate.getAddress()} "${AAVE_POOL_DATA_PROVIDER}"`);
  console.log(`npx hardhat verify --network mainnet ${await withdrawInteraction.getAddress()} "${AAVE_POOL}"`);
  console.log(`npx hardhat verify --network mainnet ${await orderManager.getAddress()} "${await ratePredicate.getAddress()}" "${await withdrawInteraction.getAddress()}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 