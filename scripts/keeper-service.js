const { ethers } = require("hardhat");

/**
 * Keeper Service for TriggerFi
 * 
 * This service:
 * 1. Monitors active predicates
 * 2. Checks API conditions every 5 minutes
 * 3. Updates predicate results on-chain
 * 
 * For MVP: Uses setTestResult instead of Chainlink Functions
 * Post-MVP: Will use proper Chainlink Functions integration
 */

// Configuration
const UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
const PREDICATE_CONTRACT = "0xd378Fbce97cD181Cd7A7EcCe32571f1a37E226ed";

// Track active predicates (in production, this would come from events or database)
const ACTIVE_PREDICATES = [
  {
    id: "0x85b1bb540ce3e1a0cbdbe30bc33ad86596e95b5ec2fd9cb93a336666c521b999",
    conditions: [{
      endpoint: "https://api.coinbase.com/v2/exchange-rates?currency=BTC",
      jsonPath: "data.rates.USD",
      operator: ">",
      threshold: 30000
    }]
  },
  {
    id: "0xbc5941431f96e14d9afe0f2e885f3b7150f380862c6994c98f9a7847804b310f",
    conditions: [
      {
        endpoint: "https://api.exchangerate-api.com/v4/latest/USD",
        jsonPath: "rates.JPY",
        operator: ">",
        threshold: 145 // USD/JPY > 145 means JPY is weakening
      },
      {
        endpoint: "https://api.coinbase.com/v2/exchange-rates?currency=USD",
        jsonPath: "data.rates.JPY",
        operator: ">",
        threshold: 145 // Second source for confirmation
      }
    ],
    useAND: true // Both conditions must be true
  }
];

/**
 * Check if API conditions are met
 */
async function checkAPIConditions(conditions, useAND = true) {
  console.log(`\n🔍 Checking ${conditions.length} conditions (${useAND ? 'AND' : 'OR'} logic)`);
  
  const results = [];
  
  for (const condition of conditions) {
    try {
      console.log(`\n📡 Calling API: ${condition.endpoint}`);
      const response = await fetch(condition.endpoint, { 
        signal: AbortSignal.timeout(10000) 
      });
      const data = await response.json();
      
      // Extract value from response using jsonPath
      const value = getValueFromPath(data, condition.jsonPath);
      console.log(`📊 Value at ${condition.jsonPath}: ${value}`);
      
      // Compare with threshold
      const numValue = parseFloat(value);
      const numThreshold = parseFloat(condition.threshold);
      
      let result = false;
      switch (condition.operator) {
        case '>':
          result = numValue > numThreshold;
          break;
        case '<':
          result = numValue < numThreshold;
          break;
        case '=':
          result = numValue === numThreshold;
          break;
      }
      
      console.log(`⚖️  ${numValue} ${condition.operator} ${numThreshold} = ${result ? 'TRUE ✅' : 'FALSE ❌'}`);
      results.push(result);
      
    } catch (error) {
      console.error(`❌ API error for ${condition.endpoint}:`, error.message);
      results.push(false); // Default to false on error
    }
  }
  
  // Apply logic operator
  const finalResult = useAND 
    ? results.every(r => r === true)
    : results.some(r => r === true);
    
  console.log(`\n📊 Final result (${useAND ? 'AND' : 'OR'}): ${finalResult ? 'TRUE ✅' : 'FALSE ❌'}`);
  return finalResult;
}

/**
 * Extract value from object using dot notation path
 */
function getValueFromPath(data, path) {
  const parts = path.split('.');
  let value = data;
  
  for (const part of parts) {
    if (value === null || value === undefined) {
      return null;
    }
    value = value[part];
  }
  
  return value;
}

/**
 * Update predicate result on-chain
 */
async function updatePredicateOnChain(predicateId, result) {
  console.log(`\n📝 Updating predicate ${predicateId.substring(0, 10)}... to ${result}`);
  
  try {
    const [signer] = await ethers.getSigners();
    const predicate = await ethers.getContractAt("DynamicAPIPredicateTest", PREDICATE_CONTRACT);
    
    // For MVP: Use setTestResult instead of Chainlink Functions
    const tx = await predicate.setTestResult(predicateId, result);
    console.log(`⏳ Transaction sent: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`✅ Updated successfully! Gas used: ${receipt.gasUsed.toString()}`);
    
    // Increment update count happens automatically in checkConditions
    // For now, we're using setTestResult which doesn't increment it
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to update predicate:`, error.message);
    return false;
  }
}

/**
 * Main keeper loop
 */
async function runKeeper() {
  console.log("🤖 TriggerFi Keeper Service Started");
  console.log(`⏰ Update interval: ${UPDATE_INTERVAL / 1000} seconds`);
  console.log(`📄 Contract: ${PREDICATE_CONTRACT}`);
  
  const [signer] = await ethers.getSigners();
  console.log(`👤 Keeper address: ${signer.address}`);
  
  // Verify we're the keeper
  const predicate = await ethers.getContractAt("DynamicAPIPredicateTest", PREDICATE_CONTRACT);
  const contractKeeper = await predicate.keeper();
  
  if (signer.address.toLowerCase() !== contractKeeper.toLowerCase()) {
    console.error("❌ Error: You're not the authorized keeper!");
    console.log("Your address:", signer.address);
    console.log("Keeper address:", contractKeeper);
    return;
  }
  
  console.log("✅ Keeper authorization verified\n");
  
  // Main loop
  while (true) {
    console.log("\n" + "=".repeat(60));
    console.log(`🔄 Starting update cycle at ${new Date().toLocaleString()}`);
    console.log("=".repeat(60));
    
    for (const predicateInfo of ACTIVE_PREDICATES) {
      console.log(`\n📍 Processing predicate: ${predicateInfo.id.substring(0, 10)}...`);
      
      try {
        // Check API conditions with the correct logic (AND/OR)
        const useAND = predicateInfo.useAND !== undefined ? predicateInfo.useAND : true;
        const result = await checkAPIConditions(predicateInfo.conditions, useAND);
        
        // Update on-chain
        await updatePredicateOnChain(predicateInfo.id, result);
        
      } catch (error) {
        console.error(`❌ Error processing predicate:`, error.message);
      }
    }
    
    console.log(`\n⏳ Waiting ${UPDATE_INTERVAL / 1000} seconds until next update...`);
    console.log(`Next update at: ${new Date(Date.now() + UPDATE_INTERVAL).toLocaleString()}`);
    
    // Wait for next interval
    await new Promise(resolve => setTimeout(resolve, UPDATE_INTERVAL));
  }
}

/**
 * Get active predicates from contract events
 * (For production - currently using hardcoded list)
 */
async function getActivePredicates() {
  // TODO: Query PredicateCreated events
  // TODO: Filter out predicates that have been filled
  // TODO: Return list of active predicates with their conditions
  return ACTIVE_PREDICATES;
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Keeper service shutting down...');
  process.exit(0);
});

// Start the keeper
runKeeper()
  .catch(error => {
    console.error('❌ Keeper service failed:', error);
    process.exit(1);
  });