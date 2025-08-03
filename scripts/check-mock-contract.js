const { ethers } = require("hardhat");

const MOCK_PREDICATE_ADDRESS = "0xa0890426D0AA348Ef978bB97Ad1120f320Dbf92B";

async function main() {
  console.log("🔍 Checking Mock Contract\n");

  const [signer] = await ethers.getSigners();
  
  // Get contract code
  const code = await ethers.provider.getCode(MOCK_PREDICATE_ADDRESS);
  console.log(`Contract deployed: ${code !== "0x" ? "✅ Yes" : "❌ No"}`);
  console.log(`Code length: ${code.length} chars\n`);
  
  // Check if it's really our mock contract
  const mockPredicate = await ethers.getContractAt(
    "MockDynamicAPIPredicate",
    MOCK_PREDICATE_ADDRESS,
    signer
  );
  
  // Try to call keeper
  try {
    const keeper = await mockPredicate.keeper();
    console.log(`Keeper address: ${keeper}`);
  } catch (e) {
    console.log(`❌ Failed to get keeper: ${e.message}`);
  }
  
  // Check a known predicate
  const predicateId = "0x7ce58539622d23ca9b63c2d78c2231a17b462e5352bef6d9235ed908f9953dbc";
  
  console.log(`\n📊 Predicate ${predicateId.slice(0, 10)}...:`);
  
  // Get predicate data using struct getter
  try {
    const predicateData = await mockPredicate.predicates(predicateId);
    console.log(`   Maker: ${predicateData.maker}`);
    console.log(`   Last Result: ${predicateData.lastResult}`);
    console.log(`   Update Count: ${predicateData.updateCount}`);
  } catch (e) {
    console.log(`   ❌ Failed to get predicate data: ${e.message}`);
  }
  
  // Try different ways to call checkCondition
  console.log("\n🧪 Testing checkCondition:");
  
  // Method 1: Direct contract call
  try {
    const result = await mockPredicate.checkCondition(predicateId);
    console.log(`   ✅ Direct call result: ${result}`);
  } catch (e) {
    console.log(`   ❌ Direct call failed: ${e.message}`);
  }
  
  // Method 2: Static call
  try {
    const result = await mockPredicate.checkCondition.staticCall(predicateId);
    console.log(`   ✅ Static call result: ${result}`);
  } catch (e) {
    console.log(`   ❌ Static call failed: ${e.message}`);
  }
  
  // Method 3: Build calldata manually
  try {
    const iface = mockPredicate.interface;
    const calldata = iface.encodeFunctionData("checkCondition", [predicateId]);
    console.log(`   Calldata: ${calldata}`);
    
    const result = await ethers.provider.call({
      to: MOCK_PREDICATE_ADDRESS,
      data: calldata
    });
    console.log(`   ✅ Manual call result: ${result}`);
    
    // Decode the result
    const decoded = iface.decodeFunctionResult("checkCondition", result);
    console.log(`   Decoded: ${decoded[0]}`);
  } catch (e) {
    console.log(`   ❌ Manual call failed: ${e.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });