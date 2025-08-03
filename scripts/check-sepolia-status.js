const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking Sepolia network status...\n");
  
  const [signer] = await ethers.getSigners();
  
  // Check latest block
  const blockNumber = await signer.provider.getBlockNumber();
  console.log("Latest block:", blockNumber);
  
  // Check signer balance
  const balance = await signer.provider.getBalance(signer.address);
  console.log("Signer balance:", ethers.formatEther(balance), "ETH");
  
  // Check pending transactions
  const pendingTx = "0xabd39ade9f77e0733a15d7e8fe0e27618aa58bbe4c2e511b07fe608d9cf6a333";
  
  try {
    const tx = await signer.provider.getTransaction(pendingTx);
    if (tx) {
      console.log("\nPending transaction found:");
      console.log("- Nonce:", tx.nonce);
      console.log("- Gas Price:", ethers.formatUnits(tx.gasPrice, "gwei"), "gwei");
      console.log("- Gas Limit:", tx.gasLimit.toString());
    }
  } catch (e) {
    console.log("Transaction not found or confirmed");
  }
}

main().catch(console.error);