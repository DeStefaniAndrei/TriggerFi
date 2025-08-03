const { ethers } = require("hardhat");

const LIMIT_ORDER_PROTOCOL = "0x111111125421ca6dc452d289314280a0f8842a65";

async function main() {
  console.log("🔍 Debugging Domain Separator\n");

  // Check the actual domain separator on the contract
  const ABI = [
    "function DOMAIN_SEPARATOR() view returns (bytes32)",
    "function version() view returns (string)"
  ];
  
  const limitOrderProtocol = new ethers.Contract(LIMIT_ORDER_PROTOCOL, ABI, ethers.provider);
  
  try {
    const domainSeparator = await limitOrderProtocol.DOMAIN_SEPARATOR();
    console.log("✅ Contract DOMAIN_SEPARATOR:", domainSeparator);
    
    // Calculate expected domain separator
    const domain = {
      name: "1inch Aggregation Router",
      version: "6",
      chainId: 1,
      verifyingContract: LIMIT_ORDER_PROTOCOL
    };
    
    const domainTypes = {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" }
      ]
    };
    
    const calculatedSeparator = ethers.TypedDataEncoder.hashStruct(
      "EIP712Domain",
      domainTypes,
      domain
    );
    
    console.log("📊 Calculated DOMAIN_SEPARATOR:", calculatedSeparator);
    console.log("✅ Match:", domainSeparator === calculatedSeparator);
    
    // Also check with chainId 31337 (Hardhat)
    const hardhatDomain = { ...domain, chainId: 31337 };
    const hardhatSeparator = ethers.TypedDataEncoder.hashStruct(
      "EIP712Domain",
      domainTypes,
      hardhatDomain
    );
    
    console.log("\n📊 Hardhat DOMAIN_SEPARATOR:", hardhatSeparator);
    console.log("✅ Match with Hardhat:", domainSeparator === hardhatSeparator);
    
  } catch (error) {
    console.error("Error:", error.message);
    
    // Try different approach - check if it's using different version
    console.log("\n🔍 Trying different versions...");
    
    const domainTypesAlt = {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" }
      ]
    };
    
    for (const version of ["4", "5", "6"]) {
      const testDomain = {
        name: "1inch Limit Order Protocol",
        version: version,
        chainId: 1,
        verifyingContract: LIMIT_ORDER_PROTOCOL
      };
      
      const testSeparator = ethers.TypedDataEncoder.hashStruct(
        "EIP712Domain",
        domainTypesAlt,
        testDomain
      );
      
      console.log(`Version ${version}: ${testSeparator}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });