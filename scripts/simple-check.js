const { ethers } = require("hardhat");

async function main() {
  console.log("Testing simple functionality...");
  
  try {
    const [signer] = await ethers.getSigners();
    console.log("Signer address:", signer.address);
    
    const PREDICATE_ADDRESS = "0xd378Fbce97cD181Cd7A7EcCe32571f1a37E226ed";
    console.log("Contract address:", PREDICATE_ADDRESS);
    
    // Simple test
    const code = await signer.provider.getCode(PREDICATE_ADDRESS);
    console.log("Contract exists:", code !== "0x" ? "YES" : "NO");
    
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main().catch(console.error);