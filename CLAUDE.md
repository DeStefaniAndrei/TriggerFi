# IMPORTANT
- Always prioritize writing clean, simple, and modular code.
- Use simple & easy-to-understand language. Write in short sentences.
- DO NOT BE LAZY! Always read files in FULL!!
- DO NOT CODE IF THERE'S ANYTHING YOU AREN'T COMPLETELY SURE OF OR DON'T UNDERSTAND
- Always ask for clarification when working with new SDKs/APIs
- Explain the code as simply as possible as if you were speaking to a beginner dev, do it in the code comments

# TriggerFi Project Overview

## Dynamic Capital Allocation Infrastructure
TriggerFi converts "classic capital" into "smart capital" - capital that automatically shifts between assets using real-world information to maximize productivity.

## Problem Statement
There's $100T+ in global capital that's blind to real-world events. Current DeFi automation can only react to simple on-chain conditions, missing 99% of market-moving signals (inflation data, tariffs, supply chain disruptions, economic indicators). This creates massive inefficiencies - companies holding depreciating foreign currency reserves, treasuries sitting idle during inflation, traders missing correlations between traditional markets and crypto.

## Solution: Intelligent Limit Orders with User-Defined Real-World Triggers
TriggerFi enables users to create intelligent limit orders that execute based on ANY real-world data source. Users input their own API endpoints, define triggering conditions, and let their capital automatically respond to global events via trustless 1inch swaps.

## Core Features
1. **User-Defined APIs**: Input any API endpoint, key, and trigger conditions
2. **Complex Logic**: Combine multiple APIs with AND/OR operators
3. **Automatic Integration**: APIs automatically integrated into Chainlink Functions
4. **Trustless Execution**: On-chain verification and execution via 1inch
5. **Smart Capital**: Capital that autonomously optimizes based on world events

## Target Audience (Priority Order)
1. **International Corporations** - Managing foreign currency reserves ($10T+ market)
2. **Treasury Managers** (DAOs, Corporations) - Managing $100M+ in stablecoins
3. **Institutional DeFi Traders** - Seeking automated cross-market arbitrage
4. **Tokenized Asset Issuers** (RWA protocols) - Need dynamic liquidity management

## Architecture

### Current Implementation
- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS, shadcn/ui components
- **Smart Contracts**: Hardhat development environment with Solidity contracts
- **DeFi Integration**: 1inch Limit Order Protocol v4 for execution
- **Oracle Integration**: Chainlink Functions for API calls and verification
- **Order Builder**: Creates 1inch orders with custom predicates

### System Architecture

#### 1. Order Creation Flow
- User inputs API endpoints, keys, and trigger conditions
- User defines comparison operators (>, <, =) and values
- Multiple APIs can be combined with AND/OR logic
- Order signed as EIP-712 message (gasless)

#### 2. Predicate Generation
- User's APIs automatically inserted into Chainlink Function contract
- Function becomes the predicate for 1inch limit order
- Supports complex multi-condition logic

#### 3. Execution
- Chainlink Functions periodically check API conditions
- When predicate returns true, order becomes fillable
- Taker bot executes order on 1inch
- Trustless swap execution

## MVP Demo: JPY Stablecoin Hedging

### Use Case
A company trading with Japanese clients holds JPY stablecoins for efficient transactions. They want to protect against JPY devaluation.

### Demo Predicate
- **Condition 1**: US tariffs on Japanese cars > 15% (current rate)
- **Condition 2**: AND JPY inflation rate > 5% (currently ~3.3%)
- **Action**: Convert 1,000,000 JPYC to USDC at market rate

### Economic Value
These indicators suggest likely JPY depreciation, so automatic conversion minimizes capital loss and makes their capital more "productive".

## Blockchain Infrastructure Advantages

1. **Information Objectivity**: No manipulation of data, trustless verification
2. **Full Capital Control**: Users maintain custody, no intermediary risk
3. **24/7 Autonomous Execution**: No banking hours or human intervention
4. **Composability**: Other protocols can build on predicates
5. **Transparency**: All trades and conditions verifiable on-chain
6. **No Counterparty Risk**: Direct wallet-to-wallet execution
7. **Censorship Resistance**: No institution can block capital movements
8. **Global Accessibility**: Anyone can create smart capital strategies
9. **Programmable Capital**: Capital becomes responsive to world events
10. **Lower Costs**: No management fees, only gas for execution
11. **No Regulatory Overhead**: No compliance costs passed to users

## Technical Implementation Details

### Chainlink Functions Integration
- User APIs dynamically inserted into Function source code
- Handles authentication (API keys, Bearer tokens) - encrypted with Chainlink DON
- Parses responses to extract comparison values
- Returns boolean for predicate evaluation
- MVP: Batch check multiple orders to save gas
- Post-MVP: Transition to off-chain monitoring system ($50/month for 10,000 conditions vs $500,000 in gas)
- Post-MVP Alternative: TLS Notary integration for trustless HTTPS data verification

### 1inch Integration
- Using Limit Order Protocol v4
- Predicate contract calls Chainlink Function
- Uses amountGetters for dynamic pricing (e.g., JPYC/USDC from Chainlink price feeds)
- Taker bot monitors and executes when conditions met

### API Configuration
- **Endpoint**: Full URL to API
- **Authentication**: API key, Bearer token, or OAuth
- **Response Path**: JSON path to value (e.g., `data.inflation_rate`)
- **Comparison**: >, <, or = with threshold value
- **Logic**: AND/OR for multiple conditions
- **Data Type**: Currently only supports int256 (integers) for comparison values

### Current Limitations - Integer Values Only
- **MVP Limitation**: External API data must be numeric (int256) for comparisons
- **Examples of supported data**:
  - Inflation rate: 5.2 → 52 (multiply by 10 for decimal precision)
  - Temperature: 75 (Fahrenheit)
  - Price: 1850 (USD cents for $18.50)
  - Percentage: 15 (for 15%)
- **Examples of unsupported data (Post-MVP)**:
  - Strings: "bullish", "active", "high risk"
  - Booleans: true/false (must use 1/0 instead)
  - Complex objects or arrays

### Logic Operator Limitations
- **Current MVP**: Can only use ALL AND or ALL OR logic
- **Supported logic patterns**:
  - `A AND B AND C` (all conditions must be true)
  - `A OR B OR C` (any condition can be true)
- **NOT supported (Post-MVP)**:
  - Mixed operators: `A AND (B OR C)`
  - Nested groups: `(A AND B) OR (C AND D)`
  - NOT operators: `A AND NOT B`
- **Why this limitation**: Simplifies Chainlink Function generation and predicate evaluation
- **Post-hackathon**: Will implement expression tree parser for complex logic

### Post-MVP Enhancements
- **String Comparisons**: Support for equality checks on text values
  - Example: "status == 'active'"
  - Example: "alert_level == 'high'"
- **Boolean Support**: Native true/false handling
- **Enum Support**: Predefined value sets
- **Range Checks**: "value BETWEEN 10 AND 20"
- **Pattern Matching**: Basic regex for strings

### API Response Parsing
- Supports dot notation: `data.rates.inflation`
- Supports bracket notation: `data['rates']['inflation']`
- Supports array access: `results[0].value`
- Graceful error handling with safe defaults
- Automatic type conversion to numbers
- User can test paths in UI before saving

## Development Guidelines
- Use TypeScript for all new code
- Follow React best practices with hooks and functional components
- Implement proper error handling for all blockchain interactions
- Test smart contracts thoroughly before deployment
- Handle API failures gracefully
- Implement rate limiting for API calls
- Use proper gas estimation for all transactions
- Prioritize user control and transparency

## IMPORTANT: Environment Variables Issue (Hackathon Workaround)
Due to Next.js environment variable issues and hackathon deadline:
- DO NOT use .env for sensitive variables
- Hardcode test values directly in files
- This is ONLY for hackathon demo with test wallets
- Test wallet has no real funds, so security is not critical
- Post-hackathon: Fix proper env variable handling

## Technical Solutions

### API Response Parsing
- JSONPath-like syntax with dot/bracket notation
- UI testing tool for path validation
- Template library for common APIs

### Update Frequency
- MVP: 5-minute intervals (balance cost/responsiveness)
- User-configurable: 1-60 minutes
- Future: Event-driven via webhooks

### Error Handling
- 3x retry with exponential backoff
- Cache last valid response
- Safe default values (-999999 for errors)
- User notifications for persistent failures

### Gas Optimization
- Batch up to 10 orders per Chainlink call
- 2-minute response caching
- Post-MVP: Off-chain monitoring layer

### Security
- Chainlink DON encrypted secrets for API keys
- No keys stored in TriggerFi contracts
- User controls key lifecycle

## File Structure
- `/app` - Next.js app router pages
- `/components` - Reusable React components
- `/contracts` - Solidity smart contracts
- `/lib` - Utility functions and integrations
- `/hooks` - Custom React hooks
- `/test` - Test files for contracts and integrations
- `/scripts` - Deployment and monitoring scripts

## Current Branch: on-chain-order-execution
Implementing dynamic API integration with Chainlink Functions for real-world triggered limit orders.

## Deployed Contracts (Sepolia)
- **DynamicAPIPredicateV2**: 0x462C4Be5274e8C616C49B659b1cC3Fbdf7A26b6b (Active - uses Chainlink Functions properly)
- **DynamicAPIPredicateV1**: 0xd378Fbce97cD181Cd7A7EcCe32571f1a37E226ed (Deprecated - doesn't inherit FunctionsClient)
- **DynamicAmountGetter**: 0x5b02226E1820E80F6212f31Fe51Cf01A7B3D10b2 (Active - for dynamic pricing)

**IMPORTANT**: Always use V2 contract for new development. V1 is kept for reference only.

## Important Technical Notes

### 1inch Integration
- Using 1inch Limit Order Protocol v4
- ASK FOR DOCUMENTATION when implementing taker bot
- Taker bot questions to clarify:
  - How does fillOrder work exactly?
  - What are the gas optimization strategies?
  - How to handle partial fills?
  - What are maker/taker fee structures?

### Chainlink Functions
- Max execution time: 10 seconds
- Max memory: 128MB
- Supports HTTP requests with auth
- Consider response size limits
- Plan for API rate limiting
- **IMPORTANT**: When deploying to mainnet, update all Chainlink price feed addresses in contracts

### MVP Priorities
1. Single API condition support first
2. Basic comparison operators (>, <, =)
3. JPY hedging demo with two APIs
4. Simple UI for API configuration
5. Ignore pre/post interactions for now

## Custom Order Management (Not Using 1inch API)
- Store orders ourselves (on-chain events or Firebase)
- Allows gas-consuming predicates
- Taker pays for predicate execution
- More flexibility than 1inch API restrictions

## Predicate Encoding (From Mentor)
- Use arbitraryStaticCall for calling contracts
- Must strip 0x prefix: hexDataSlice(params, 2)
- Predicates return uint256 (1 for true, 0 for false)
- See lib/predicate-encoder.ts for implementation

## MVP Simplifications (Due to Hackathon Timeline)

### Protocol-Owned Keeper Model
- **Implementation**: TriggerFi operates the sole keeper service
- **Revenue Model**: Flat $2 fee per predicate check charged to takers
- **Update Frequency**: Every 5 minutes for all active orders
- **Note**: Not the most gas-efficient solution, but fastest to implement

### Simplified Fee Collection
- Takers pay fee when filling orders (not optimized for gas)
- Fee covers Chainlink Function costs + profit margin
- Future optimization: Dynamic pricing based on update frequency

### Deferred Problems (Post-MVP)
1. **Dead Order Problem**: Orders that never fill still consume update costs
   - Future solution: Order expiry or deposit-based updates
2. **Update Efficiency**: Currently updates all orders every 5 minutes
   - Future solution: Smart updating based on proximity to trigger
3. **Fee Structure**: Flat fee doesn't account for order size
   - Future solution: Percentage-based or hybrid fee model

### Why These Simplifications
- Hackathon timeline requires fast implementation
- Proves core concept without complex economics
- Easy to understand and demonstrate
- Can be optimized post-MVP based on usage data

## Predicate Verification & Fee Solution

### Problem: Taker Gas Waste
- Takers can't access maker's API keys to check predicates
- Without checking, takers waste gas on orders that won't fill
- Need solution that keeps API keys secure while enabling verification

### Solution: Protocol-Owned Keeper with On-Chain Caching
1. **TriggerFi Keeper Service**:
   - Updates all predicates every 5 minutes using Chainlink Functions
   - API keys remain encrypted in Chainlink DON (secure)
   - Results stored on-chain in DynamicAPIPredicate contract

2. **Free Predicate Checking**:
   - Takers call `checkCondition()` view function (costs no gas)
   - Returns cached predicate result from last update
   - Takers only attempt fills when predicate = true

### Fee Structure: $2 Per Update
- **Cost Model**: $2 per predicate update (every 5 minutes)
- **Accumulation**: Fees accumulate until order is filled
   - Example: Order updated 10 times = $20 in fees
- **Payment**: Taker pays all accumulated fees when filling
- **Reset**: After successful fill, update counter resets to 0

### Implementation Details
```solidity
// In DynamicAPIPredicate contract
mapping(bytes32 => uint256) public updateCount;     // Track updates per predicate
mapping(bytes32 => bool) public lastResult;         // Cache predicate results
uint256 public constant UPDATE_FEE = 2 * 10**18;    // $2 in stablecoin

// Keeper calls this every 5 minutes
function checkConditions(bytes32 predicateId) external {
    // ... execute Chainlink Function ...
    updateCount[predicateId]++;
}

// Takers call this for free (view function)
function checkCondition(bytes32 predicateId) external view returns (uint256) {
    return lastResult[predicateId] ? 1 : 0;
}

// Calculate fees owed
function getUpdateFees(bytes32 predicateId) external view returns (uint256) {
    return updateCount[predicateId] * UPDATE_FEE;
}
```

### Economic Flow
1. **TriggerFi** fronts ~$2 per update in Chainlink costs
2. **Accumulation**: Costs accumulate as updateCount increases
3. **Recovery**: When taker fills, pays updateCount * $2
4. **Profit**: TriggerFi profits from spread between actual costs and fees
5. **Risk**: Unfilled orders = unrecovered monitoring costs

### Why This Works
- **For Takers**: No wasted gas + can verify before filling
- **For Makers**: API keys secure + automatic monitoring
- **For TriggerFi**: Revenue model that scales with usage
- **Incentive Alignment**: Quick fills = lower fees for takers
## Deployment
- Firebase Hosting can be used for website deployment

## Current Deployed Contracts (Sepolia Testnet)

### Smart Contracts
- **DynamicAPIPredicateV2**: `0x462C4Be5274e8C616C49B659b1cC3Fbdf7A26b6b` (Active)
  - Properly inherits from FunctionsClient
  - Manages predicates for Chainlink Functions
  - Stores API conditions and results
  - Tracks update counts for fee calculation
  
- **DynamicAPIPredicate (V1)**: `0xd378Fbce97cD181Cd7A7EcCe32571f1a37E226ed` (Deprecated)
  - Original version - doesn't work with Chainlink Functions
  - Kept for reference only
  
- **DynamicAmountGetter**: `0x5b02226E1820E80F6212f31Fe51Cf01A7B3D10b2` (Active)
  - Implements 1inch IAmountGetter interface
  - Calculates dynamic pricing based on gas costs and keeper fees
  - Integrates with Chainlink price feeds

### Chainlink Infrastructure
- **Functions Router**: `0xb83E47C2bC239B3bf370bc41e1459A34b41238D0`
- **DON ID**: `0x66756e2d657468657265756d2d7365706f6c69612d3100000000000000000000`
- **Subscription ID**: 5385

### Price Feed Addresses (Sepolia)
- **ETH/USD**: `0x694AA1769357215DE4FAC081bf1f309aDC325306`
- **BTC/USD**: `0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43`
- **JPY/USD**: `0x8A6af2B75F23831ADc973ce6288e5329F63D86c6`
- **USDC/USD**: Hardcoded as 1:1 (no feed on Sepolia)

### Token Addresses (Sepolia)
- **WETH**: `0xfff9976782d46cc05630d1f6ebab18b2324d6b14`
- **USDC**: `0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8`
- **DAI**: `0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357`
- **JPYC**: `0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB`

### Important Notes
- **Keeper Address**: `0x93d43c27746D76e7606C55493A757127b33D7763`
- **Update these addresses when deploying new versions**
- **All addresses must be updated when moving to mainnet**
