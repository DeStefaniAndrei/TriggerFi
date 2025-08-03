# TriggerFi Taker Bot Guide

## Overview
The TriggerFi Taker Bot monitors Firebase for orders with met conditions and executes them on 1inch while collecting fees for predicate updates.

## How It Works

### 1. **Monitoring Orders**
- Connects to Firebase Realtime Database
- Watches for orders with `status: 'active'`
- Real-time updates when orders change

### 2. **Checking Conditions**
- Calls `checkCondition()` on the predicate contract
- This is a view function (no gas cost)
- Returns 1 if conditions are met, 0 otherwise

### 3. **Fee Collection**
- Calculates fees: $2 USD per predicate update
- Converts USD to ETH at hardcoded rate ($3500/ETH for MVP)
- Pays fees in ETH to the predicate contract
- Fees go to treasury address (keeper wallet)

### 4. **Order Execution**
- After paying fees, executes order on 1inch
- Fills entire order (no partial fills in MVP)
- Updates Firebase with transaction hashes

## Setup

### Prerequisites
1. **ETH Balance**: Need ETH for fee payments and gas
2. **Token Approvals**: Approve 1inch to spend your tokens
3. **Environment**: Configure Hardhat with your private key

### Running the Bot

1. **Test Mode** (check without executing):
   ```bash
   npx hardhat run scripts/test-taker-bot.js --network sepolia
   ```

2. **Live Mode** (monitor and execute):
   ```bash
   npx hardhat run scripts/taker-bot-triggerfi.js --network sepolia
   ```

## Fee Economics

### Why ETH Instead of USDC?
- Contract limitation: `collectFees` is payable (expects ETH)
- Future enhancement: Update contract to accept USDC
- Current workaround: Convert USD amount to ETH

### Fee Calculation Example
- Predicate checked 5 times = $10 in fees
- At $3500/ETH = 0.00286 ETH payment
- Keeper collects ETH, manually funds Chainlink subscription

### Who Pays What?
- **Taker**: Pays $2 per predicate update (in ETH)
- **Keeper**: Pays Chainlink subscription (funded by collected fees)
- **Maker**: Pays nothing (gasless orders)

## Error Handling

### Common Issues

1. **"Predicate not found"**
   - Predicate hasn't been created yet
   - Check predicate ID is correct

2. **"Insufficient fee payment"**
   - Not enough ETH to cover fees
   - Check ETH balance

3. **"Order not fillable"**
   - Conditions not met yet
   - Token approvals missing
   - Insufficient token balance

## Monitoring

The bot logs detailed information:
- 📋 Orders found and their status
- 🔍 Processing each order
- ✅ Successful executions
- ❌ Errors with explanations

## Security Notes

1. **Private Key**: Never commit your private key
2. **Approvals**: Only approve what you intend to trade
3. **Fees**: Always verify fee amounts before execution
4. **Orders**: Check order parameters match expectations

## Future Enhancements

1. **USDC Fee Payment**: Update contract to accept USDC directly
2. **Partial Fills**: Support filling orders partially
3. **Multi-chain**: Deploy on multiple networks
4. **Advanced Routing**: Use 1inch advanced features
5. **MEV Protection**: Add flashbots integration

## Troubleshooting

### Bot Not Finding Orders
- Check Firebase connection
- Verify orders have `status: 'active'`
- Ensure predicate conditions are being checked by keeper

### Transactions Failing
- Check ETH balance for gas
- Verify token approvals
- Ensure predicate conditions are actually met

### High Gas Costs
- Consider batching multiple orders
- Wait for lower gas prices
- Use gas price oracles

## Support

For issues or questions:
1. Check the logs for detailed error messages
2. Verify all prerequisites are met
3. Test with small amounts first
4. Review smart contract state on Etherscan