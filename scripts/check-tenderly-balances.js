const { ethers } = require("hardhat");

// Mainnet token addresses
const TOKENS = {
  JPYC: "0x2370f9d504c7a6E775bf6E14B3F12846b594cD53",
  USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F"
};

// Known JPYC whale addresses (from Etherscan)
const JPYC_WHALES = [
  "0x4B18134d4F5826a97c41D7250fA388F1FA8dCaf0", // Large holder
  "0x2DD7253279190dD06ED4f5D03B27A42D8E4C09A7", // Another large holder
];

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

async function main() {
  console.log("💰 Checking Token Balances on Tenderly Fork");
  console.log("==========================================\n");

  const [signer] = await ethers.getSigners();
  console.log("👤 Your address:", signer.address);
  console.log("   ETH balance:", ethers.formatEther(await ethers.provider.getBalance(signer.address)), "ETH\n");

  // Check all token balances
  console.log("📊 Token Balances:");
  for (const [name, address] of Object.entries(TOKENS)) {
    const token = new ethers.Contract(address, ERC20_ABI, signer);
    try {
      const balance = await token.balanceOf(signer.address);
      const decimals = await token.decimals();
      console.log(`   ${name}: ${ethers.formatUnits(balance, decimals)}`);
    } catch (error) {
      console.log(`   ${name}: Error reading balance`);
    }
  }

  // Check JPYC whale balances
  console.log("\n🐋 JPYC Whale Balances:");
  const jpycToken = new ethers.Contract(TOKENS.JPYC, ERC20_ABI, signer);
  
  for (const whale of JPYC_WHALES) {
    try {
      const balance = await jpycToken.balanceOf(whale);
      console.log(`   ${whale}: ${ethers.formatUnits(balance, 18)} JPYC`);
    } catch (error) {
      console.log(`   ${whale}: Error reading balance`);
    }
  }

  // Option to get JPYC from a whale using Tenderly's impersonation
  console.log("\n💡 To get JPYC on Tenderly fork:");
  console.log("   1. Use Tenderly's account impersonation feature");
  console.log("   2. Or run: npx hardhat run scripts/get-jpyc-from-whale.js --network tenderly");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });