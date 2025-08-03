/**
 * Generates Chainlink Function JavaScript code from user-defined API conditions
 */

export interface APICondition {
  endpoint: string;
  authType: "apiKey" | "bearer" | "none";
  authValue: string;
  jsonPath: string;
  operator: ">" | "<" | "=";
  threshold: string;
}

/**
 * Generate Chainlink Function code that checks multiple API conditions
 * @param conditions Array of API conditions to check
 * @param useAND Whether to use AND logic (true) or OR logic (false)
 * @returns JavaScript code for Chainlink Function
 */
export function generateChainlinkFunction(
  conditions: APICondition[],
  useAND: boolean
): string {
  return `
// Chainlink Function to check ${conditions.length} API conditions
// Logic: ${useAND ? 'AND' : 'OR'}

// Helper function to parse JSON path
function getValueFromPath(data, path) {
  try {
    // Support both dot notation and bracket notation
    const parts = path.split(/\\.(?![^\\[]*\\])|(?:\\[['"]?)([^\\]'"]+)(?:['"]?\\])/g)
      .filter(part => part !== undefined && part !== '');
    
    let value = data;
    for (const part of parts) {
      if (value === null || value === undefined) {
        return null;
      }
      value = value[part];
    }
    return value;
  } catch (error) {
    console.error('Error parsing path:', path, error);
    return null;
  }
}

// Helper function to compare values
function compareValues(value, operator, threshold) {
  const numValue = Number(value);
  const numThreshold = Number(threshold);
  
  if (isNaN(numValue) || isNaN(numThreshold)) {
    console.error('Non-numeric comparison:', value, threshold);
    return false;
  }
  
  switch (operator) {
    case '>': return numValue > numThreshold;
    case '<': return numValue < numThreshold;
    case '=': return numValue === numThreshold;
    default: return false;
  }
}

// Main function
const makeRequest = async () => {
  try {
    // Array to store results of each condition
    const results = [];
    
    // Check each API condition
    ${conditions.map((condition, index) => `
    // Condition ${index + 1}: ${condition.endpoint}
    try {
      const response${index} = await Functions.makeHttpRequest({
        url: '${condition.endpoint}',
        ${condition.authType !== 'none' ? `headers: {
          ${condition.authType === 'apiKey' 
            ? `'X-API-Key': '${condition.authValue}'` 
            : `'Authorization': 'Bearer ${condition.authValue}'`
          }
        },` : ''}
        timeout: 9000
      });
      
      if (response${index}.error) {
        console.error('API ${index + 1} error:', response${index}.error);
        results.push(false);
      } else {
        const data${index} = response${index}.data;
        const value${index} = getValueFromPath(data${index}, '${condition.jsonPath}');
        const result${index} = compareValues(value${index}, '${condition.operator}', '${condition.threshold}');
        
        console.log('API ${index + 1} - Value:', value${index}, 'Threshold:', '${condition.threshold}', 'Result:', result${index});
        results.push(result${index});
      }
    } catch (error) {
      console.error('Error checking condition ${index + 1}:', error);
      results.push(false);
    }`).join('\n')}
    
    // Apply logic operator
    const finalResult = ${useAND 
      ? 'results.every(r => r === true)' 
      : 'results.some(r => r === true)'
    };
    
    console.log('All results:', results);
    console.log('Final result (${useAND ? 'AND' : 'OR'}):', finalResult);
    
    // Return encoded boolean result
    return Functions.encodeUint256(finalResult ? 1 : 0);
    
  } catch (error) {
    console.error('Unexpected error:', error);
    // Return false (0) on any unexpected error
    return Functions.encodeUint256(0);
  }
};

// Execute the function
return await makeRequest();
`;
}

/**
 * Validate API conditions before generating function
 * @param conditions Array of API conditions to validate
 * @returns Array of validation errors, empty if valid
 */
export function validateAPIConditions(conditions: APICondition[]): string[] {
  const errors: string[] = [];
  
  conditions.forEach((condition, index) => {
    // Validate endpoint
    try {
      new URL(condition.endpoint);
    } catch {
      errors.push(`Condition ${index + 1}: Invalid URL format`);
    }
    
    // Validate JSON path
    if (!condition.jsonPath || condition.jsonPath.trim() === '') {
      errors.push(`Condition ${index + 1}: JSON path is required`);
    }
    
    // Validate threshold is numeric
    if (isNaN(Number(condition.threshold))) {
      errors.push(`Condition ${index + 1}: Threshold must be a number`);
    }
    
    // Validate auth
    if (condition.authType !== 'none' && !condition.authValue) {
      errors.push(`Condition ${index + 1}: Auth value required for ${condition.authType}`);
    }
  });
  
  return errors;
}

/**
 * Generate a hash for the predicate configuration
 * @param conditions Array of API conditions
 * @param useAND Logic operator
 * @returns Predicate ID hash
 */
export function generatePredicateId(
  conditions: APICondition[],
  useAND: boolean,
  maker: string
): string {
  const configString = JSON.stringify({ conditions, useAND, maker });
  // Simple hash for demo - in production use proper hashing
  return '0x' + Buffer.from(configString).toString('hex').slice(0, 64);
}