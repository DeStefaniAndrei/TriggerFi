# TriggerFi Demo Guide - JPY Hedging Use Case

## 🎯 Demo Overview

**Scenario**: A Japanese corporation with ¥1,000,000 in JPYC treasury wants to protect against JPY devaluation.

**Triggers**:
- US tariffs on Japanese cars > 15% (currently 15.5%)
- Japan inflation rate > 5% (currently 5.2%)

**Action**: Automatically convert 10% of JPYC holdings to USDC when both conditions are met.

## 📍 Live Demo on Base Sepolia

### Deployed Contracts
- **Mock JPYC**: `0xd378Fbce97cD181Cd7A7EcCe32571f1a37E226ed`
- **Dynamic Predicate**: `0xb1b20C1BA8dfa44B16917A9221E48D0E85685f6A`
- **Order Manager**: `0x6E194fdeba7431937C14bfcD95470A9Ca6084CC1`
- **1inch Protocol**: `0xE53136D9De56672e8D2665C98653AC7b8A60Dc44`

### Demo Wallet
- Address: `0x93d43c27746D76e7606C55493A757127b33D7763`
- Has: 1,000,000 mJPYC

## 🚀 Running the Demo

### 1. Show Current Setup
```bash
# Check JPYC balance and market conditions
npx hardhat run scripts/demo-jpy-hedging-simple.js --network baseSepolia
```

**Output Shows**:
- Corporation has ¥1,000,000 in JPYC
- Inflation at 5.2% (above 5% threshold)
- Tariffs at 15.5% (above 15% threshold)
- Both conditions met → Hedging triggered!

### 2. Key Points to Highlight

#### A. Smart Capital vs Classic Capital
- **Classic**: Corporation manually monitors news, makes emotional decisions
- **TriggerFi**: Capital automatically responds to data-driven triggers

#### B. Real-World Integration
- APIs can be any data source (central banks, trade departments, news feeds)
- In production: Use real inflation APIs, tariff databases
- Demo uses mock data for illustration

#### C. Value Proposition
- **Risk**: 20% JPY depreciation = ¥200,000 loss
- **Protection**: Auto-hedge 10% = limit loss to ¥180,000
- **Cost**: < $10 in gas fees
- **Speed**: Instant execution when conditions met

### 3. Technical Flow

```
1. Corporation deposits JPYC
                ↓
2. Creates order with API-based predicate
                ↓
3. APIs monitored by Chainlink Functions
                ↓
4. When tariffs > 15% AND inflation > 5%
                ↓
5. Predicate returns TRUE
                ↓
6. Keeper bot executes JPYC → USDC swap
                ↓
7. Corporation protected from further devaluation
```

## 💡 Demo Script

```
"Imagine you're a Japanese auto parts manufacturer with significant JPY reserves.

Current situation:
- You hold ¥1,000,000 in corporate treasury
- US considering tariffs on Japanese cars
- Japan experiencing inflation

Traditional approach:
- CFO reads news every morning
- Weekly meetings to discuss hedging
- Emotional decisions based on headlines
- Days or weeks to execute trades

TriggerFi approach:
- Set data-driven triggers: tariffs > 15%, inflation > 5%
- APIs automatically monitored 24/7
- Instant execution when thresholds crossed
- No emotions, just data

Result: Your capital becomes 'smart' - automatically protecting itself based on real-world events.

This is how we convert $100T+ of 'classic capital' into 'smart capital' that responds to the world."
```

## 📊 Live Data Points

During demo, show:
1. **Order created**: Hash `0x8be677513dba29613b52e79d14051805ee498a91d36eb690f0e58fee7806e096`
2. **Predicate active**: Returns TRUE (ready to execute)
3. **Protection level**: 10% of treasury (100,000 JPYC → 666 USDC)
4. **Execution**: Awaiting keeper bot

## 🎯 Key Differentiators

1. **User-Defined APIs**: Any data source, not just on-chain
2. **Complex Logic**: Multiple conditions with AND/OR
3. **Trustless**: On-chain verification via Chainlink
4. **Composable**: Other protocols can use predicates

## 🔧 Technical Details

### Order Structure
```javascript
{
  "maker": "JPYC",
  "taker": "USDC", 
  "amount": "100,000 JPYC",
  "rate": "150 JPY/USD",
  "predicate": "tariffs > 15% AND inflation > 5%"
}
```

### Predicate Verification
- Uses `arbitraryStaticCall` for gas-free checking
- Returns 1 (true) when conditions met
- Can integrate any external API via Chainlink

## 📈 Market Opportunity

- **$10T+** in corporate FX reserves globally
- **$100T+** in passive capital that could be "smart"
- **Problem**: 99% of capital is blind to real-world events
- **Solution**: TriggerFi makes capital responsive

## 🚀 Next Steps After Demo

1. **Real Chainlink Integration**
   - Deploy with actual API endpoints
   - Show live data feeds

2. **Multiple Use Cases**
   - Weather derivatives for farmers
   - Supply chain hedging
   - Macro trading strategies

3. **Cross-Chain**
   - Deploy on multiple chains
   - Aggregate liquidity

## 💬 Common Questions

**Q: Why not just use stop-loss orders?**
A: Stop-losses only react to price. TriggerFi reacts to the *causes* of price movements.

**Q: What about API reliability?**
A: Chainlink's decentralized oracle network ensures reliability. Multiple data sources can be aggregated.

**Q: How is this different from traditional hedging?**
A: Instant, trustless, 24/7, no intermediaries, much lower cost.

## 📱 Contact for Live Demo

Ready to see it in action on Base Sepolia testnet!