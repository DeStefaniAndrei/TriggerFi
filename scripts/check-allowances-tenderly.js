const { ethers } = require("hardhat");

const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const LIMIT_ORDER_PROTOCOL = "0x111111125421ca6dc452d289314280a0f8842a65";

const ERC20_ABI = [
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)"
];

async function main() {
  console.log("💳 Checking Token Allowances\n");

  const [signer] = await ethers.getSigners();
  console.log("👤 Address:", signer.address);

  const weth = new ethers.Contract(WETH, ERC20_ABI, signer);
  const usdc = new ethers.Contract(USDC, ERC20_ABI, signer);

  // Check balances
  const wethBalance = await weth.balanceOf(signer.address);
  const usdcBalance = await usdc.balanceOf(signer.address);
  
  console.log("\n💰 Balances:");
  console.log(`   WETH: ${ethers.formatUnits(wethBalance, 18)}`);
  console.log(`   USDC: ${ethers.formatUnits(usdcBalance, 6)}`);

  // Check allowances
  const wethAllowance = await weth.allowance(signer.address, LIMIT_ORDER_PROTOCOL);
  const usdcAllowance = await usdc.allowance(signer.address, LIMIT_ORDER_PROTOCOL);
  
  console.log("\n✅ Allowances for 1inch Protocol:");
  console.log(`   WETH: ${ethers.formatUnits(wethAllowance, 18)}`);
  console.log(`   USDC: ${ethers.formatUnits(usdcAllowance, 6)}`);
  
  // Since we're both maker and taker, we need both tokens approved
  console.log("\n💡 Status:");
  if (wethAllowance >= ethers.parseUnits("0.1", 18)) {
    console.log("   ✅ WETH allowance sufficient for maker");
  } else {
    console.log("   ❌ WETH needs approval (maker needs to approve)");
  }
  
  if (usdcAllowance >= ethers.parseUnits("350", 6)) {
    console.log("   ✅ USDC allowance sufficient for taker");
  } else {
    console.log("   ❌ USDC needs approval (taker needs to approve)");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });