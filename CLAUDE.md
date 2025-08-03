# IMPORTANT
- Always prioritize writing clean, simple, and modular code.
- Use simple & easy-to-understand language. Write in short sentences.
- DO NOT BE LAZY! Always read files in FULL!!
- DO NOT CODE IF THERE'S ANYTHING YOU AREN'T COMPLETELY SURE OF OR DON'T UNDERSTAND
- Always ask for clarification when working with new SDKs/APIs
- Explain the code as simply as possible as if you were speaking to a begginner dev, do it in the code comments

# TriggerFi Project Overview

## Problem Statement
There's $100T+ in global capital that's blind to real-world events. Current DeFi automation can only react to simple on-chain conditions, missing 99% of market-moving signals (inflation data, supply chain disruptions, weather events, social sentiment). This creates massive inefficiencies - treasuries sitting idle during inflation, companies holding excess inventory during demand spikes, traders missing correlations between traditional markets and crypto.

## Solution: Intelligent Limit Orders with Real-World Triggers
TriggerFi is a hybrid protocol that monitors ANY real-world data source off-chain, then executes trustless trades via 1inch when conditions trigger. We enable capital to automatically respond to the world, not just blockchain events.

## Unique Selling Points
1. **First protocol to combine real-world data with limit orders** - Not just automation, but intelligent capital redeployment
2. **Hybrid architecture** - Off-chain intelligence with on-chain execution
3. **Unlimited condition complexity** - From simple thresholds to ML predictions
4. **Trustless verification** - Uses Chainlink oracles to verify conditions on-chain
5. **Gas efficient** - Monitor 10,000 conditions for $50/month vs $500,000 in gas

## Target Audience (Priority Order)
1. **Treasury Managers** (DAOs, Corporations) - Managing $100M+ in idle stablecoins
2. **Tokenized Asset Issuers** (RWA protocols) - Need dynamic liquidity for supply chain, carbon credits
3. **Institutional DeFi Traders** - Seeking automated cross-market arbitrage
4. **Yield Aggregators** - Want to add real-world triggers to strategies

## Architecture

### Current Implementation
- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS, shadcn/ui components
- **Smart Contracts**: Hardhat development environment with Solidity contracts
  - `AaveRatePredicate.sol` - Checks Aave supply/borrow rates (implemented)
  - `AaveWithdrawInteraction.sol` - Handles Aave withdrawals (structure ready)
  - Note: Contract architecture might be refactored for hybrid model
- **DeFi Integration**: Aave protocol for yield triggers, 1inch for limit orders
- **Order Builder**: `limit-order-builder.ts` - Creates 1inch orders with predicates

### Planned Hybrid Architecture

#### 1. Order Creation (Off-Chain)
- Users sign EIP-712 messages (gasless)
- Orders stored in Firebase with complex conditions
- Zero gas cost, instant modifications

#### 2. Monitoring Layer (Off-Chain)
- Node.js service for continuous monitoring (implementation approach TBD - discuss with team)
- Polls multiple data sources:
  - Chainlink oracles (prices, rates, economic data)
  - External APIs (weather, traffic, sentiment)
  - Custom feeds (IoT sensors, supply chain)
- Note: Monitoring frequency and architecture to be discussed

#### 3. Trust Layer (Hybrid)
- Hourly merkle root commits on-chain
- Users can verify order inclusion
- Fallback for direct order submission

#### 4. Execution (On-Chain)
- Executor bot submits pre-signed orders to 1inch
- On-chain verification via Chainlink oracles
- Trustless swap execution

## MVP Implementation (2-Day Deadline)

### Day 1
1. **Enhance Predicate Contract**
   - Create `UniversalConditionPredicate.sol` supporting any Chainlink oracle
   - Add inflation oracle support (primary demo)
2. **Off-Chain Infrastructure**
   - Firebase setup for order storage
   - Simple Node.js monitoring script (or alternative - TBD)
3. **Core Demo**: Inflation hedge strategy
   - "When US CPI > 4%, swap USDC → commodity tokens"

### Day 2
1. **Frontend Enhancement**
   - Strategy builder UI with condition dropdowns
   - Support for multiple oracle types
2. **Executor Bot**
   - Polls Firebase for active orders
   - Submits to 1inch when conditions met
3. **Demo Dashboard**
   - Show potential value captured
   - Visualize active strategies

## Full Solution (Post-Hackathon)

### Extended Oracle Support
- UMA's Optimistic Oracle for community-verified data
- API3 Airnodes for first-party feeds
- Tellor for decentralized data
- Custom TLS Notary proofs for any HTTPS data

### Advanced Features
- Multi-condition logic (AND/OR/NOT)
- Time-based conditions
- Cross-chain execution
- Machine learning predictions
- Social sentiment analysis

## Use Cases (Implementation Priority)

### Priority 1: Financial Markets (Fastest Integration)
1. **Inflation Hedge** - Swap stables to commodities when CPI rises
2. **Gas Optimization** - Execute batched operations during low gas
3. **Market Correlation** - Rebalance based on TradFi indices

### Priority 2: Real-World Assets
1. **Supply Chain** - Adjust inventory tokens based on port congestion
2. **Carbon Credits** - Trade based on emission levels
3. **Weather Derivatives** - Hedge agricultural positions

### Priority 3: Advanced Applications
1. **Healthcare Supply** - Reallocate based on outbreak data
2. **Urban Logistics** - Optimize based on traffic patterns
3. **Energy Markets** - Trade based on grid demand

## Technical Decisions

### Trustless Verification
- MVP uses Chainlink oracles exclusively
- Off-chain monitoring is just efficiency layer
- All conditions verified on-chain during execution
- Users trust Chainlink, not TriggerFi

### Why Not Pure On-Chain?
- Gas costs: $200 per complex order vs $0.10
- Limited data sources
- No complex logic (ML, correlations)
- Slow iteration cycles

### Why Not Pure Off-Chain?
- Requires trust assumptions
- Centralization risks
- Less composable
- Regulatory concerns

## Development Guidelines
- Use TypeScript for all new code
- Follow React best practices with hooks and functional components
- Implement proper error handling for all blockchain interactions
- Test smart contracts thoroughly before deployment
- Use proper gas estimation for all transactions
- Implement loading states for all async operations
- Prioritize trustless design patterns

## API Integrations
- 1inch Limit Order Protocol for DEX execution
- Chainlink oracles for trustless data
- Aave protocol for DeFi triggers
- Firebase for order management
- External APIs via monitoring service

## File Structure
- `/app` - Next.js app router pages
- `/components` - Reusable React components
- `/contracts` - Solidity smart contracts
- `/lib` - Utility functions and integrations
- `/hooks` - Custom React hooks
- `/test` - Test files for contracts and integrations
- `/scripts` - Deployment and monitoring scripts (planned)

## Current Branch: on-chain-order-execution
Transitioning from pure on-chain to hybrid architecture for real-world condition support.

## Important Technical Notes

### 1inch Integration
- Using 1inch Limit Order Protocol v4
- ASK FOR DOCUMENTATION when implementing taker bot
- Taker bot questions to clarify:
  - How does fillOrder work exactly?
  - What are the gas optimization strategies?
  - How to handle partial fills?
  - What are maker/taker fee structures?

### External Data Strategy
- MVP: Chainlink Functions for weather/external APIs
- Post-MVP: Universal predicate system for any condition
- Focus on demonstrating real-world data integration
- Weather trading as primary demo (agricultural hedging use case)

### Taker Bot Implementation
- Acts as order executor when conditions are met
- Monitors Firebase for active orders
- Calls 1inch fillOrder when predicates return true
- ASK QUESTIONS about 1inch taker mechanics during implementation
- Runs every 30 seconds to check conditions
- Handles gas estimation and transaction management

