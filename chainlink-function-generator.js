"use strict";
/**
 * Generates Chainlink Function JavaScript code from user-defined API conditions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePredicateId = exports.validateAPIConditions = exports.generateChainlinkFunction = void 0;
/**
 * Generate Chainlink Function code that checks multiple API conditions
 * @param conditions Array of API conditions to check
 * @param useAND Whether to use AND logic (true) or OR logic (false)
 * @returns JavaScript code for Chainlink Function
 */
function generateChainlinkFunction(conditions, useAND) {
    return "\n// Chainlink Function to check ".concat(conditions.length, " API conditions\n// Logic: ").concat(useAND ? 'AND' : 'OR', "\n\n// Helper function to parse JSON path\nfunction getValueFromPath(data, path) {\n  try {\n    // Support both dot notation and bracket notation\n    const parts = path.split(/\\.(?![^\\[]*\\])|(?:\\[['\"]?)([^\\]'\"]+)(?:['\"]?\\])/g)\n      .filter(part => part !== undefined && part !== '');\n    \n    let value = data;\n    for (const part of parts) {\n      if (value === null || value === undefined) {\n        return null;\n      }\n      value = value[part];\n    }\n    return value;\n  } catch (error) {\n    console.error('Error parsing path:', path, error);\n    return null;\n  }\n}\n\n// Helper function to compare values\nfunction compareValues(value, operator, threshold) {\n  const numValue = Number(value);\n  const numThreshold = Number(threshold);\n  \n  if (isNaN(numValue) || isNaN(numThreshold)) {\n    console.error('Non-numeric comparison:', value, threshold);\n    return false;\n  }\n  \n  switch (operator) {\n    case '>': return numValue > numThreshold;\n    case '<': return numValue < numThreshold;\n    case '=': return numValue === numThreshold;\n    default: return false;\n  }\n}\n\n// Main function\nconst makeRequest = async () => {\n  try {\n    // Array to store results of each condition\n    const results = [];\n    \n    // Check each API condition\n    ").concat(conditions.map(function (condition, index) { return "\n    // Condition ".concat(index + 1, ": ").concat(condition.endpoint, "\n    try {\n      const response").concat(index, " = await Functions.makeHttpRequest({\n        url: '").concat(condition.endpoint, "',\n        ").concat(condition.authType !== 'none' ? "headers: {\n          ".concat(condition.authType === 'apiKey'
        ? "'X-API-Key': '".concat(condition.authValue, "'")
        : "'Authorization': 'Bearer ".concat(condition.authValue, "'"), "\n        },") : '', "\n        timeout: 9000\n      });\n      \n      if (response").concat(index, ".error) {\n        console.error('API ").concat(index + 1, " error:', response").concat(index, ".error);\n        results.push(false);\n      } else {\n        const data").concat(index, " = response").concat(index, ".data;\n        const value").concat(index, " = getValueFromPath(data").concat(index, ", '").concat(condition.jsonPath, "');\n        const result").concat(index, " = compareValues(value").concat(index, ", '").concat(condition.operator, "', '").concat(condition.threshold, "');\n        \n        console.log('API ").concat(index + 1, " - Value:', value").concat(index, ", 'Threshold:', '").concat(condition.threshold, "', 'Result:', result").concat(index, ");\n        results.push(result").concat(index, ");\n      }\n    } catch (error) {\n      console.error('Error checking condition ").concat(index + 1, ":', error);\n      results.push(false);\n    }"); }).join('\n'), "\n    \n    // Apply logic operator\n    const finalResult = ").concat(useAND
        ? 'results.every(r => r === true)'
        : 'results.some(r => r === true)', ";\n    \n    console.log('All results:', results);\n    console.log('Final result (").concat(useAND ? 'AND' : 'OR', "):', finalResult);\n    \n    // Return encoded boolean result\n    return Functions.encodeUint256(finalResult ? 1 : 0);\n    \n  } catch (error) {\n    console.error('Unexpected error:', error);\n    // Return false (0) on any unexpected error\n    return Functions.encodeUint256(0);\n  }\n};\n\n// Execute the function\nreturn await makeRequest();\n");
}
exports.generateChainlinkFunction = generateChainlinkFunction;
/**
 * Validate API conditions before generating function
 * @param conditions Array of API conditions to validate
 * @returns Array of validation errors, empty if valid
 */
function validateAPIConditions(conditions) {
    var errors = [];
    conditions.forEach(function (condition, index) {
        // Validate endpoint
        try {
            new URL(condition.endpoint);
        }
        catch (_a) {
            errors.push("Condition ".concat(index + 1, ": Invalid URL format"));
        }
        // Validate JSON path
        if (!condition.jsonPath || condition.jsonPath.trim() === '') {
            errors.push("Condition ".concat(index + 1, ": JSON path is required"));
        }
        // Validate threshold is numeric
        if (isNaN(Number(condition.threshold))) {
            errors.push("Condition ".concat(index + 1, ": Threshold must be a number"));
        }
        // Validate auth
        if (condition.authType !== 'none' && !condition.authValue) {
            errors.push("Condition ".concat(index + 1, ": Auth value required for ").concat(condition.authType));
        }
    });
    return errors;
}
exports.validateAPIConditions = validateAPIConditions;
/**
 * Generate a hash for the predicate configuration
 * @param conditions Array of API conditions
 * @param useAND Logic operator
 * @returns Predicate ID hash
 */
function generatePredicateId(conditions, useAND, maker) {
    var configString = JSON.stringify({ conditions: conditions, useAND: useAND, maker: maker });
    // Simple hash for demo - in production use proper hashing
    return '0x' + Buffer.from(configString).toString('hex').slice(0, 64);
}
exports.generatePredicateId = generatePredicateId;
