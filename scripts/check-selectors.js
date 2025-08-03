const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking Function Selectors\n");

  // Calculate function selectors
  const selectors = [
    "checkCondition(bytes32)",
    "arbitraryStaticCall(address,bytes)",
    "checkConditions(bytes32)",
    "getConditionResult(bytes32)"
  ];
  
  for (const sig of selectors) {
    const selector = ethers.id(sig).slice(0, 10);
    console.log(`${sig}: ${selector}`);
  }
  
  // Check the actual ABI
  const mockABI = [
    "function checkCondition(bytes32 predicateId) external view returns (uint256)"
  ];
  
  const iface = new ethers.Interface(mockABI);
  const fragment = iface.getFunction("checkCondition");
  console.log(`\nActual checkCondition selector: ${iface.getFunction("checkCondition").selector}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });