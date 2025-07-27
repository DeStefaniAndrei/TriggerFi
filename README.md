# TriggerFi - Yield-Optimized Limit Orders for DeFi

TriggerFi is a sophisticated DeFi protocol that enables users to create automated limit orders that execute based on external yield conditions, specifically Aave interest rates. The protocol combines the power of Aave's lending protocol with 1inch's limit order protocol to maximize capital efficiency.

## 🚀 Features

- **Yield-Aware Orders**: Create limit orders that trigger based on Aave interest rate conditions
- **Capital Efficiency**: Keep funds earning yield in Aave while waiting for optimal swap conditions
- **Trustless Execution**: All logic runs on-chain with atomic transactions
- **1inch Integration**: Leverage the battle-tested 1inch limit order protocol
- **Real-time Monitoring**: Track current rates and order status in real-time
- **Modern Wallet Connection**: Seamless wallet integration with RainbowKit

## 🏗️ Architecture

### Smart Contracts

1. **AaveRatePredicate** (`contracts/AaveRatePredicate.sol`)
   - View-only contract for checking Aave interest rates
   - Called via `staticcall` during order execution
   - Supports both variable borrow and supply rate monitoring

2. **AaveWithdrawInteraction** (`contracts/AaveWithdrawInteraction.sol`)
   - Pre-interaction contract for withdrawing funds from Aave
   - Called during order filling process
   - Handles both partial and full withdrawals

3. **TriggerFiOrderManager** (`contracts/TriggerFiOrderManager.sol`)
   - Main contract for order management
   - Coordinates between predicate and interaction contracts
   - Handles order creation and validation

### Frontend

- **Next.js/React** application with TypeScript
- **Wagmi/Viem** for Ethereum interactions
- **RainbowKit** for modern wallet connections
- **Tailwind CSS** for styling
- **Radix UI** components for consistent design

## 🛠️ Setup & Installation

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- Hardhat for smart contract development

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd TriggerFi
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file with the following variables:
   ```env
   # WalletConnect Project ID (required for RainbowKit)
   # Get one at https://cloud.walletconnect.com/
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here
   
   # RPC URLs for different networks
   MAINNET_RPC_URL=https://eth-mainnet.alchemyapi.io/v2/your_api_key
   SEPOLIA_RPC_URL=https://eth-sepolia.alchemyapi.io/v2/your_api_key
   POLYGON_RPC_URL=https://polygon-mainnet.alchemyapi.io/v2/your_api_key
   
   # Private key for contract deployment (optional)
   PRIVATE_KEY=your_private_key_here
   
   # Etherscan API key for contract verification
   ETHERSCAN_API_KEY=your_etherscan_api_key_here
   POLYGONSCAN_API_KEY=your_polygonscan_api_key_here
   ```

4. **Start the development server**
   ```bash
   pnpm run dev
   ```

### RainbowKit Setup

The project uses RainbowKit for wallet connections, which provides:

- **Modern UI**: Beautiful, accessible wallet connection interface
- **Multi-wallet Support**: MetaMask, WalletConnect, Coinbase Wallet, and more
- **Network Switching**: Easy switching between Ethereum, Polygon, and other networks
- **Mobile Support**: QR code scanning for mobile wallets

To get your WalletConnect Project ID:
1. Visit [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. Create a new project
3. Copy the Project ID to your environment variables

## 📝 Smart Contract Development

### Compile Contracts
```bash
npx hardhat compile
```

### Run Tests
```bash
npx hardhat test
```

### Deploy Contracts
```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

### Verify Contracts
```bash
npx hardhat verify --network mainnet <contract_address> <constructor_args>
```

## 🔧 Usage

### Creating a Yield-Optimized Order

1. **Connect Wallet**: Use the RainbowKit connect button in the navbar
2. **Navigate to Create Order**: Click "Create Order" from the main page
3. **Configure Order**:
   - Select the asset to monitor (e.g., USDC, WETH)
   - Choose target token for the swap
   - Set rate threshold (e.g., 5% APY)
   - Configure withdrawal amount
   - Set minimum output amount
4. **Set Conditions**:
   - Choose between variable borrow or supply rate monitoring
   - Set whether to trigger when rate is above or below threshold
5. **Create Order**: Sign the transaction to create your order

### Order Execution Flow

1. **Condition Monitoring**: The predicate contract continuously monitors Aave rates
2. **Rate Check**: When a taker attempts to fill the order, the predicate is called
3. **Condition Validation**: If conditions are met, execution continues
4. **Fund Withdrawal**: The pre-interaction contract withdraws funds from Aave
5. **Swap Execution**: The 1inch protocol executes the swap atomically

## 📊 Technical Details

### Rate Format
- Aave rates are returned in "ray" format (27 decimals)
- Conversion: `rate_percentage = ray_rate / 10^25`
- Example: `0.045 * 10^27 = 45000000000000000000000000`

### 1inch Integration
- Orders use EIP-712 signing for security
- Predicate and pre-interaction data are encoded as bytes
- Orders are submitted to 1inch orderbook via REST API

### Aave Integration
- Supports Aave V3 protocol
- Monitors both supply and variable borrow rates
- Handles aToken balances and withdrawals

## 🧪 Testing

### Unit Tests
```bash
npx hardhat test
```

### Integration Tests
```bash
npx hardhat test --grep "Integration"
```

### Fork Testing
```bash
npx hardhat test --network hardhat
```

## 🔒 Security Considerations

- **Predicate Contracts**: View-only, called via `staticcall`
- **Access Control**: Owner-only functions for emergency operations
- **Reentrancy Protection**: All external calls are protected
- **Input Validation**: Comprehensive parameter validation
- **Atomic Execution**: All operations revert on failure

## 📈 Roadmap

- [ ] Multi-chain support (Polygon, Optimism, Arbitrum)
- [ ] Advanced rate conditions (compound rates, moving averages)
- [ ] Order templates and presets
- [ ] Mobile application
- [ ] API for third-party integrations
- [ ] Governance token and DAO

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs.triggerfi.com](https://docs.triggerfi.com)
- **Discord**: [discord.gg/triggerfi](https://discord.gg/triggerfi)
- **Twitter**: [@TriggerFi](https://twitter.com/TriggerFi)

## ⚠️ Disclaimer

This software is provided "as is" without warranty. Users should conduct their own research and due diligence before using this protocol. DeFi protocols carry inherent risks including but not limited to smart contract risk, market risk, and impermanent loss.
