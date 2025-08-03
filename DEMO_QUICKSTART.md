# TriggerFi Demo Quick Start 🚀

## Start the Website

```bash
npm run dev
```

Then open http://localhost:3000

## Demo Flow

### 1. Connect Wallet
- Click "Connect Wallet" in the top right
- Select MetaMask or your preferred wallet
- **Switch to Base Sepolia network** (Chain ID: 84532)

### 2. Navigate to Demo
- Click the **🎯 Demo** button in the navigation
- You'll see the JPY Hedging scenario pre-configured

### 3. Demo Walkthrough

#### Step 1: Show the Scenario
- Japanese corporation with ¥1,000,000 treasury
- Risk: JPY devaluation from tariffs + inflation
- Solution: Auto-convert 10% to USDC when triggered

#### Step 2: Show API Configuration
The demo shows:
- **US Trade API**: Current tariffs at 15.5% (threshold: 15%)
- **Bank of Japan API**: Inflation at 5.2% (threshold: 5%)
- Both conditions are met ✅

#### Step 3: Review & Create
- Click "Review Order" to see the summary
- Click "Create Smart Order" to simulate creation
- Shows success screen with explanation

## Key Points to Emphasize

1. **Any API Works**: "Users can connect ANY API - weather, supply chain, news, economic data"

2. **Real-Time Monitoring**: "Chainlink checks these APIs every 5 minutes, 24/7"

3. **Trustless Execution**: "When conditions are met, execution is automatic - no human needed"

4. **Value Prop**: "This converts $100T+ of passive capital into smart capital that responds to the world"

## Demo Data

- **Mock JPYC**: `0xd378Fbce97cD181Cd7A7EcCe32571f1a37E226ed`
- **Conditions**: Both tariffs and inflation thresholds are exceeded
- **Action**: Swap 100,000 JPYC → 666 USDC
- **Network**: Base Sepolia (testnet)

## If Asked About Real Implementation

"This demo uses mock API responses for illustration. In production:
- Real APIs from trade.gov and boj.or.jp would be monitored
- Chainlink Functions handles the API calls securely
- Orders execute via 1inch protocol automatically"

## Troubleshooting

**Wrong Network?**
- The demo only works on Base Sepolia
- Add Base Sepolia: https://chainlist.org/chain/84532

**No Wallet Connected?**
- Install MetaMask: https://metamask.io
- Or use any Web3 wallet

**Demo Not Loading?**
- Make sure you ran `npm install` first
- Check console for errors

## Live Contract Addresses

All deployed on Base Sepolia:
- Mock JPYC: `0xd378Fbce97cD181Cd7A7EcCe32571f1a37E226ed`
- Mock Predicate: `0xb1b20C1BA8dfa44B16917A9221E48D0E85685f6A`
- Order Manager: `0x6E194fdeba7431937C14bfcD95470A9Ca6084CC1`
- 1inch Protocol: `0xE53136D9De56672e8D2665C98653AC7b8A60Dc44`