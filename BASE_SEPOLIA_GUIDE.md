# TriggerFi Base Sepolia Deployment Guide

## 🎯 Current Status

We've successfully pivoted to Base Sepolia after discovering a hackathon-deployed 1inch Limit Order Protocol v4 at:
`0xE53136D9De56672e8D2665C98653AC7b8A60Dc44`

### ✅ Completed
- Identified and verified the hackathon protocol uses v4 interface
- Created v4 adapter to handle SDK v3 → Protocol v4 conversion
- Prepared all deployment and test scripts
- Set up integration test suite

### ⏳ Waiting For
- Base Sepolia ETH (get from https://bwarelabs.com/faucets/base-sepolia)
- Your wallet: `0x93d43c27746D76e7606C55493A757127b33D7763`

## 🚀 Quick Start (Once You Have ETH)

1. **Deploy TriggerFi Infrastructure**
   ```bash
   npx hardhat run scripts/deploy-base-sepolia.js --network baseSepolia
   ```

2. **Run Integration Test**
   ```bash
   npx hardhat run scripts/full-integration-test.js --network baseSepolia
   ```

3. **Test Basic Order**
   ```bash
   npx hardhat run scripts/test-base-sepolia-order.js --network baseSepolia
   ```

## 📋 What Gets Deployed

1. **MockDynamicAPIPredicate** - For testing without Chainlink Functions
2. **PriceAmountGetter** - For dynamic pricing based on oracles
3. **CustomOrderManager** - For tracking and managing orders

## 🔧 How It Works

1. **Order Creation**
   - User defines API endpoints and trigger conditions
   - Creates limit order with dynamic predicate
   - Signs with v4 format for Base Sepolia protocol

2. **Predicate Checking**
   - Protocol calls `arbitraryStaticCall` on predicate contract
   - Predicate checks API conditions (or mock values for testing)
   - Returns 1 (true) when conditions met, 0 (false) otherwise

3. **Order Execution**
   - Taker bot monitors orders
   - When predicate returns true, calls `fillOrder`
   - Trustless swap executed on-chain

## 📊 Key Addresses

### Base Sepolia
- Limit Order Protocol: `0xE53136D9De56672e8D2665C98653AC7b8A60Dc44`
- WETH: `0x4200000000000000000000000000000000000006`
- USDC: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

### After Deployment
- MockDynamicAPIPredicate: [Will be deployed]
- PriceAmountGetter: [Will be deployed]
- CustomOrderManager: [Will be deployed]

## 🎯 Demo Scenario

**JPY Stablecoin Hedging**
- Condition 1: US tariffs on Japanese cars > 15%
- Condition 2: JPY inflation > 5%
- Action: Convert JPYC → USDC when both conditions met
- Value: Protects against JPY devaluation from trade/inflation pressures

## 🛠️ Technical Details

### V4 Order Structure
```javascript
{
  salt: uint256,
  maker: uint256,      // Address as uint256
  receiver: uint256,   // Address as uint256
  makerAsset: uint256, // Address as uint256
  takerAsset: uint256, // Address as uint256
  makingAmount: uint256,
  takingAmount: uint256,
  makerTraits: uint256
}
```

### Predicate Integration
- Uses `arbitraryStaticCall` for gas-free condition checking
- Returns uint256 (1 for true, 0 for false)
- Can call any external contract/API via Chainlink Functions

## 📝 Next Steps After Deployment

1. **Real Chainlink Functions**
   - Deploy DynamicAPIPredicateV2 with Chainlink integration
   - Configure real API endpoints
   - Set up DON secrets for API keys

2. **Production Keeper Bot**
   - Implement continuous order monitoring
   - Add profitability calculations
   - Handle gas price fluctuations

3. **Frontend Integration**
   - Connect order creation UI
   - Display active orders
   - Show predicate status

## 🔍 Monitoring Commands

```bash
# Check wallet balance
npx hardhat run scripts/check-base-balance.js --network baseSepolia

# Monitor for incoming ETH
npx hardhat run scripts/monitor-base-balance.js --network baseSepolia

# Check protocol status
npx hardhat run scripts/check-base-sepolia-protocol.js --network baseSepolia
```