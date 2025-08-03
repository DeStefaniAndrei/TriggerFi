const { ethers } = require("hardhat");

const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const LIMIT_ORDER_PROTOCOL = "0x111111125421ca6dc452d289314280a0f8842a65";

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)"
];

async function main() {
  console.log("💳 Approving WETH for 1inch");
  console.log("==========================\n");

  const [signer] = await ethers.getSigners();
  const weth = new ethers.Contract(WETH, ERC20_ABI, signer);

  // Check current balance and allowance
  const balance = await weth.balanceOf(signer.address);
  const currentAllowance = await weth.allowance(signer.address, LIMIT_ORDER_PROTOCOL);
  
  console.log(`WETH balance: ${ethers.formatEther(balance)}`);
  console.log(`Current allowance: ${ethers.formatEther(currentAllowance)}`);

  if (currentAllowance < ethers.parseEther("0.1")) {
    console.log("\n⏳ Approving WETH...");
    const tx = await weth.approve(LIMIT_ORDER_PROTOCOL, ethers.parseEther("1000"));
    await tx.wait();
    console.log("✅ WETH approved!");
  } else {
    console.log("✅ WETH already approved!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });