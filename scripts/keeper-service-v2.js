const { ethers } = require("hardhat");
const { 
  getActivePredicates, 
  updatePredicateResult, 
  getOrdersByPredicate,
  updateOrderFees 
} = require("../dist/lib/firebase-service-rtdb");

/**
 * Enhanced Keeper Service for TriggerFi
 * 
 * This service:
 * 1. Monitors predicates from Firebase
 * 2. Checks API conditions every 5 minutes
 * 3. Updates predicate results on-chain
 * 4. Updates order fee tracking in Firebase
 * 
 * NOTE: Due to Chainlink Functions issues, we use setTestResult for now
 */

// Configuration
const UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes
const PREDICATE_CONTRACT = "0xd378Fbce97cD181Cd7A7EcCe32571f1a37E226ed";

/**
 * Check if API conditions are met
 */
async function checkAPIConditions(conditions, useAND = true) {
  console.log(`\n🔍 Checking ${conditions.length} conditions (${useAND ? 'AND' : 'OR'} logic)`);
  
  const results = [];
  
  for (const condition of conditions) {
    try {
      console.log(`\n📡 Calling API: ${condition.endpoint}`);
      
      // For demo, check if it's a real API we can call
      if (condition.endpoint.includes('coinbase.com') || 
          condition.endpoint.includes('blockchain.info')) {
        
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
          case 0: // Contract uses numbers
            result = numValue > numThreshold;
            break;
          case '<':
          case 1:
            result = numValue < numThreshold;
            break;
          case '=':
          case 2:
            result = numValue === numThreshold;
            break;
        }
        
        console.log(`⚖️  ${numValue} ${condition.operator} ${numThreshold} = ${result ? 'TRUE ✅' : 'FALSE ❌'}`);
        results.push(result);
        
      } else {
        // For demo APIs that don't exist, simulate results
        console.log(`📊 Demo API - simulating result`);
        const simulatedResult = Math.random() > 0.5;
        console.log(`⚖️  Simulated result: ${simulatedResult ? 'TRUE ✅' : 'FALSE ❌'}`);
        results.push(simulatedResult);
      }
      
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
    
    // Get current update count from contract
    const updateCount = await predicate.updateCount(predicateId);
    
    return { success: true, updateCount: updateCount.toString() };
  } catch (error) {
    console.error(`❌ Failed to update predicate:`, error.message);
    return { success: false, updateCount: "0" };
  }
}

/**
 * Compile TypeScript Firebase service
 */
async function compileFirebaseService() {
  console.log("📦 Compiling Firebase service...");
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);
  
  try {
    await execPromise('npx tsc lib/firebase-service-rtdb.ts --outDir dist/lib --esModuleInterop --resolveJsonModule --skipLibCheck --target ES2020 --module commonjs');
    console.log("✅ Firebase service compiled\n");
  } catch (error) {
    console.log("⚠️  Compilation warning (continuing anyway):", error.message);
  }
}

/**
 * Main keeper loop
 */
async function runKeeper() {
  console.log("🤖 TriggerFi Enhanced Keeper Service Started");
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
    
    try {
      // Get active predicates from Firebase
      const activePredicates = await getActivePredicates();
      console.log(`\n📋 Found ${activePredicates.length} active predicates`);
      
      for (const predicateConfig of activePredicates) {
        console.log(`\n📍 Processing predicate: ${predicateConfig.predicateId.substring(0, 10)}...`);
        
        try {
          // Check API conditions
          const result = await checkAPIConditions(
            predicateConfig.apiConditions, 
            predicateConfig.logicOperator === 'AND'
          );
          
          // Update on-chain
          const updateResult = await updatePredicateOnChain(predicateConfig.predicateId, result);
          
          if (updateResult.success) {
            // Update Firebase with result
            await updatePredicateResult(
              predicateConfig.predicateId, 
              result, 
              parseInt(updateResult.updateCount)
            );
            
            // Update fees for all orders using this predicate
            const orders = await getOrdersByPredicate(predicateConfig.predicateId);
            console.log(`📦 Found ${orders.length} orders using this predicate`);
            
            for (const order of orders) {
              const fees = parseInt(updateResult.updateCount) * 2; // $2 per update
              await updateOrderFees(order.orderId, parseInt(updateResult.updateCount), fees.toString());
            }
          }
          
        } catch (error) {
          console.error(`❌ Error processing predicate:`, error.message);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error in update cycle:`, error.message);
    }
    
    console.log(`\n⏳ Waiting ${UPDATE_INTERVAL / 1000} seconds until next update...`);
    console.log(`Next update at: ${new Date(Date.now() + UPDATE_INTERVAL).toLocaleString()}`);
    
    // Wait for next interval
    await new Promise(resolve => setTimeout(resolve, UPDATE_INTERVAL));
  }
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
compileFirebaseService()
  .then(() => runKeeper())
  .catch(error => {
    console.error('❌ Keeper service failed:', error);
    process.exit(1);
  });