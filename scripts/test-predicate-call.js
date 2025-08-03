const { ethers } = require("hardhat");

const MOCK_PREDICATE_ADDRESS = "0xa0890426D0AA348Ef978bB97Ad1120f320Dbf92B";
const LIMIT_ORDER_PROTOCOL = "0x111111125421ca6dc452d289314280a0f8842a65";

async function main() {
  console.log("🧪 Testing Predicate Calls\n");

  const [signer] = await ethers.getSigners();
  
  const predicateId = "0x7ce58539622d23ca9b63c2d78c2231a17b462e5352bef6d9235ed908f9953dbc";
  
  // Test 1: Direct call to checkCondition
  console.log("1️⃣ Direct call to checkCondition:");
  const mockPredicate = await ethers.getContractAt(
    "MockDynamicAPIPredicate",
    MOCK_PREDICATE_ADDRESS,
    signer
  );
  
  try {
    const result = await mockPredicate.checkCondition(predicateId);
    console.log(`   Result: ${result} (uint256)`);
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
  }
  
  // Test 2: Low-level call to checkCondition
  console.log("\n2️⃣ Low-level call to checkCondition:");
  try {
    // Encode checkCondition(bytes32)
    const functionSelector = "0x489a775a";
    const params = ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32"],
      [predicateId]
    );
    const calldata = ethers.concat([functionSelector, params]);
    
    const result = await ethers.provider.call({
      to: MOCK_PREDICATE_ADDRESS,
      data: calldata
    });
    console.log(`   Raw result: ${result}`);
    console.log(`   Decoded: ${BigInt(result)}`);
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
  }
  
  // Test 3: arbitraryStaticCall on 1inch
  console.log("\n3️⃣ arbitraryStaticCall via 1inch:");
  
  // Helper function to create arbitraryStaticCall predicate
  function createArbitraryStaticCallPredicate(target, calldata) {
    const selector = ethers.id("arbitraryStaticCall(address,bytes)").slice(0, 10);
    const params = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "bytes"],
      [target, calldata]
    );
    // Important: strip the 0x and first 32 bytes (offset) from params
    return ethers.concat([selector, ethers.dataSlice(params, 32)]);
  }
  
  try {
    // Create the calldata for checkCondition
    const functionSelector = "0x489a775a";
    const params = ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32"],
      [predicateId]
    );
    const checkConditionCalldata = ethers.concat([functionSelector, params]);
    
    // Create arbitraryStaticCall predicate
    const predicate = createArbitraryStaticCallPredicate(
      MOCK_PREDICATE_ADDRESS,
      checkConditionCalldata
    );
    
    console.log(`   Predicate: ${predicate}`);
    console.log(`   Length: ${predicate.length} chars`);
    
    // Call 1inch with the predicate
    const result = await ethers.provider.call({
      to: LIMIT_ORDER_PROTOCOL,
      data: predicate
    });
    console.log(`   Result: ${result}`);
    console.log(`   Decoded: ${BigInt(result)}`);
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
  }
  
  // Test 4: Test with different offset stripping
  console.log("\n4️⃣ Testing different offset stripping:");
  
  try {
    const functionSelector = "0x489a775a";
    const params = ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32"],
      [predicateId]
    );
    const checkConditionCalldata = ethers.concat([functionSelector, params]);
    
    // Try stripping only 2 bytes (0x)
    const selector = ethers.id("arbitraryStaticCall(address,bytes)").slice(0, 10);
    const abiParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "bytes"],
      [MOCK_PREDICATE_ADDRESS, checkConditionCalldata]
    );
    const predicate2 = ethers.concat([selector, ethers.dataSlice(abiParams, 2)]);
    
    console.log(`   Predicate (2 byte strip): ${predicate2}`);
    
    const result = await ethers.provider.call({
      to: LIMIT_ORDER_PROTOCOL,
      data: predicate2
    });
    console.log(`   Result: ${result}`);
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });