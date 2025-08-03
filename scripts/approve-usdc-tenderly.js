const { ethers } = require("hardhat");

const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const LIMIT_ORDER_PROTOCOL = "0x111111125421ca6dc452d289314280a0f8842a65";

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)"
];

async function main() {
  console.log("💳 Approving USDC for 1inch");
  console.log("==========================\n");

  const [signer] = await ethers.getSigners();
  const usdc = new ethers.Contract(USDC, ERC20_ABI, signer);

  // Check current balance and allowance
  const balance = await usdc.balanceOf(signer.address);
  const currentAllowance = await usdc.allowance(signer.address, LIMIT_ORDER_PROTOCOL);
  
  console.log(`USDC balance: ${ethers.formatUnits(balance, 6)}`);
  console.log(`Current allowance: ${ethers.formatUnits(currentAllowance, 6)}`);

  if (currentAllowance < ethers.parseUnits("350", 6)) {
    console.log("\n⏳ Approving USDC...");
    const tx = await usdc.approve(LIMIT_ORDER_PROTOCOL, ethers.parseUnits("1000", 6));
    await tx.wait();
    console.log("✅ USDC approved!");
  } else {
    console.log("✅ USDC already approved!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });