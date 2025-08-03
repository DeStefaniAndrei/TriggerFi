const { ethers } = require("hardhat");

const LIMIT_ORDER_PROTOCOL = "0x111111125421ca6dc452d289314280a0f8842a65";

async function main() {
  console.log("🧪 Testing 1inch Protocol v4 on Hardhat Fork\n");

  const [signer] = await ethers.getSigners();
  console.log("👤 Test account:", signer.address);
  
  // Check contract
  const code = await ethers.provider.getCode(LIMIT_ORDER_PROTOCOL);
  console.log(`✅ Contract exists: ${code.length > 2}\n`);

  // Test with the arbitraryStaticCall that we're using
  const ABI = [
    "function arbitraryStaticCall(address target, bytes calldata data) view returns (uint256)"
  ];

  const limitOrderProtocol = new ethers.Contract(LIMIT_ORDER_PROTOCOL, ABI, ethers.provider);

  // Deploy our mock predicate first
  console.log("📝 Deploying MockDynamicAPIPredicate...");
  const MockPredicate = await ethers.getContractFactory("MockDynamicAPIPredicate");
  const mockPredicate = await MockPredicate.deploy(signer.address, signer.address); // keeper and treasury
  await mockPredicate.waitForDeployment();
  const mockAddress = await mockPredicate.getAddress();
  console.log(`✅ Mock deployed at: ${mockAddress}\n`);

  // Create a predicate
  const tx = await mockPredicate.createPredicate();
  const receipt = await tx.wait();
  
  const event = receipt.logs.find(log => {
    try {
      const parsed = mockPredicate.interface.parseLog(log);
      return parsed.name === "PredicateCreated";
    } catch {
      return false;
    }
  });

  const predicateId = mockPredicate.interface.parseLog(event).args.predicateId;
  console.log(`✅ Predicate created: ${predicateId}`);

  // Set it to true
  await mockPredicate.setTestResult(predicateId, true);
  console.log("✅ Predicate set to true\n");

  // Test calling it directly
  console.log("🔍 Testing direct call to mock predicate:");
  const directResult = await mockPredicate.checkCondition(predicateId);
  console.log(`   Direct result: ${directResult}\n`);

  // Now test through 1inch's arbitraryStaticCall
  console.log("🔍 Testing through 1inch arbitraryStaticCall:");
  
  try {
    // Encode the checkCondition call
    const checkConditionData = mockPredicate.interface.encodeFunctionData("checkCondition", [predicateId]);
    
    // Call through 1inch
    const result = await limitOrderProtocol.arbitraryStaticCall(mockAddress, checkConditionData);
    console.log(`   ✅ Result: ${result}`);
    console.log(`   Success! The predicate returned: ${result === 1n ? "TRUE" : "FALSE"}`);
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    
    // Try a simpler test - just return a constant
    console.log("\n🔍 Testing with a simpler call:");
    try {
      // Try calling a view function that just returns a constant
      const simpleData = "0x"; // empty calldata
      const result2 = await limitOrderProtocol.arbitraryStaticCall(mockAddress, simpleData);
      console.log(`   Result: ${result2}`);
    } catch (e2) {
      console.error(`   ❌ Also failed: ${e2.message}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });