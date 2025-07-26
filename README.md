# TriggerFi - Yield-Aware Limit Orders

A DeFi dApp that enables users to create intelligent limit orders that execute based on Aave yield conditions, powered by the 1inch Limit Order Protocol.

## Features

- **Yield-Aware Orders**: Create limit orders that execute when specific yield thresholds are met
- **Aave Integration**: Real-time lending rates and market data from Aave v3
- **1inch Protocol**: Secure order execution using 1inch Limit Order Protocol
- **Wallet Integration**: Connect with MetaMask and other wallets via RainbowKit
- **Order Management**: Monitor and manage your active orders
- **Mobile-Friendly**: Responsive design for all devices

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Web3**: wagmi + RainbowKit for wallet connections
- **State Management**: TanStack Query for API state
- **UI Components**: Radix UI primitives via shadcn/ui

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- MetaMask or compatible Web3 wallet

### Installation

1. Clone the repository:
\`\`\`bash
git clone https://github.com/your-username/triggerfi-dapp.git
cd triggerfi-dapp
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Set up environment variables:
\`\`\`bash
cp .env.example .env.local
\`\`\`

Add your WalletConnect Project ID:
\`\`\`
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
\`\`\`

4. Run the development server:
\`\`\`bash
npm run dev
\`\`\`

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

\`\`\`
├── app/                    # Next.js app directory
│   ├── create-order/      # Order creation page
│   ├── dashboard/         # Orders dashboard
│   └── page.tsx          # Landing page
├── components/            # Reusable components
│   ├── ui/               # shadcn/ui components
│   ├── navbar.tsx        # Navigation component
│   ├── token-selector.tsx # Token selection component
│   ├── yield-display.tsx  # Aave yield data display
│   └── order-preview.tsx  # Order preview component
├── lib/                  # Utility functions
│   └── wagmi.ts         # Wagmi configuration
└── hooks/               # Custom React hooks
\`\`\`

## Key Components

### Create Order Page
- Token selection for maker/taker assets
- Amount inputs with validation
- Yield threshold configuration
- Aave market data integration
- EIP-712 order signing (mock implementation)
- Order preview with JSON display

### Dashboard Page
- Order history table with status tracking
- Order details modal with full predicate logic
- Cancel order functionality for open orders
- Real-time order status updates

### Yield Display Component
- Live Aave lending rates
- Market utilization data
- Supply/borrow APY with trend indicators
- Total supply and borrow amounts

## API Integration Points

### Aave Integration
Currently using mock data. To integrate with real Aave data:

\`\`\`typescript
// Replace mock data in components/yield-display.tsx
const fetchAaveData = async (asset: string) => {
  const response = await fetch(`https://aave-api-v2.aave.com/data/markets-data`)
  const data = await response.json()
  return data.reserves.find(reserve => reserve.symbol === asset)
}
\`\`\`

### 1inch Integration
Order submission placeholder in `app/create-order/page.tsx`:

\`\`\`typescript
// TODO: Implement actual 1inch API integration
const submitToOneInch = async (signedOrder: any) => {
  const response = await fetch('https://api.1inch.io/v5.0/1/limit-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(signedOrder)
  })
  return response.json()
}
\`\`\`

## Development Notes

### TODOs for Production

1. **EIP-712 Signing**: Implement real order signing with user's private key
2. **1inch Protocol Utils**: Integrate `@1inch/limit-order-protocol-utils` for proper order encoding
3. **Aave API**: Replace mock data with real Aave v3 API calls
4. **Order Submission**: Implement actual 1inch orderbook submission
5. **Error Handling**: Add comprehensive error handling for Web3 operations
6. **Gas Estimation**: Add gas estimation for order operations
7. **Network Detection**: Implement proper network switching and validation

### Mock Implementations

The following features use mock data for demonstration:
- Aave yield rates (components/yield-display.tsx)
- Order signing (app/create-order/page.tsx)
- Order history (app/dashboard/page.tsx)
- 1inch API submission

### Environment Variables

Create a `.env.local` file with:
\`\`\`
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
NEXT_PUBLIC_AAVE_API_URL=https://aave-api-v2.aave.com
NEXT_PUBLIC_ONEINCH_API_URL=https://api.1inch.io/v5.0/1
\`\`\`

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push to main branch

### Build for Production

\`\`\`bash
npm run build
npm start
\`\`\`

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Hackathon Ready

This implementation provides a complete, functional UI skeleton perfect for hackathon demonstrations:

- ✅ Wallet connection with RainbowKit
- ✅ Modern, responsive UI with shadcn/ui
- ✅ Complete order creation flow
- ✅ Order management dashboard
- ✅ Mock Aave yield data integration
- ✅ EIP-712 order preview (mock)
- ✅ Clear TODOs for backend integration

The app is designed to showcase the concept effectively while providing clear integration points for production-ready features.
