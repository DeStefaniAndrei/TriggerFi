import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, sepolia, polygon, baseSepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'TriggerFi',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'your-project-id',
  chains: [baseSepolia, sepolia, mainnet, polygon],
  ssr: true,
});
