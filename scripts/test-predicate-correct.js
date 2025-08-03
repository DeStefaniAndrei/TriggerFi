const { ethers } = require("hardhat");

const MOCK_PREDICATE_ADDRESS = "0xa0890426D0AA348Ef978bB97Ad1120f320Dbf92B";
const LIMIT_ORDER_PROTOCOL = "0x111111125421ca6dc452d289314280a0f8842a65";

async function main() {
  console.log("🧪 Testing Correct Predicate\n");

  const predicateId = "0xa66d6e91cb53d409f1bd39f6d3263833051f4f867cafd5dcf8daf18f1a6406ba";
  
  // Build the correct calldata
  const functionSelector = "0x7278912a"; // checkCondition(bytes32)
  const params = ethers.AbiCoder.defaultAbiCoder().encode(
    ["bytes32"],
    [predicateId]
  );
  const checkConditionCalldata = ethers.concat([functionSelector, params]);
  
  console.log("📋 Calldata for checkCondition:");
  console.log(`   ${checkConditionCalldata}`);
  
  // Test direct call
  console.log("\n1️⃣ Direct call to mock contract:");
  try {
    const result = await ethers.provider.call({
      to: MOCK_PREDICATE_ADDRESS,
      data: checkConditionCalldata
    });
    console.log(`   Result: ${result}`);
    console.log(`   Decoded: ${BigInt(result)}`);
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
  }
  
  // Create arbitraryStaticCall predicate (method from predicate-encoder.ts)
  const selector = ethers.id("arbitraryStaticCall(address,bytes)").slice(0, 10);
  const abiParams = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "bytes"],
    [MOCK_PREDICATE_ADDRESS, checkConditionCalldata]
  );
  // Strip 2 bytes as per predicate-encoder.ts
  const predicate = ethers.concat([selector, ethers.dataSlice(abiParams, 2)]);
  
  console.log("\n2️⃣ arbitraryStaticCall predicate:");
  console.log(`   ${predicate}`);
  console.log(`   Length: ${predicate.length} chars`);
  
  // Test on 1inch
  console.log("\n3️⃣ Call to 1inch protocol:");
  try {
    const result = await ethers.provider.call({
      to: LIMIT_ORDER_PROTOCOL,
      data: predicate
    });
    console.log(`   Result: ${result}`);
    console.log(`   Decoded: ${BigInt(result)}`);
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    
    // Try to get more info
    if (e.data) {
      console.log(`   Error data: ${e.data}`);
    }
  }
  
  // Let's also check if 1inch contract exists
  console.log("\n4️⃣ Checking 1inch contract:");
  const code = await ethers.provider.getCode(LIMIT_ORDER_PROTOCOL);
  console.log(`   Contract deployed: ${code !== "0x" ? "✅ Yes" : "❌ No"}`);
  
  // Try a simpler predicate - just return 1
  console.log("\n5️⃣ Testing with timestampBelow predicate:");
  const timestampSelector = ethers.id("timestampBelow(uint256)").slice(0, 10);
  const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  const timestampParams = ethers.AbiCoder.defaultAbiCoder().encode(
    ["uint256"],
    [futureTimestamp]
  );
  const timestampPredicate = ethers.concat([timestampSelector, ethers.dataSlice(timestampParams, 2)]);
  
  try {
    const result = await ethers.provider.call({
      to: LIMIT_ORDER_PROTOCOL,
      data: timestampPredicate
    });
    console.log(`   Result: ${result}`);
    console.log(`   Should be 1 (true) since timestamp is in future`);
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