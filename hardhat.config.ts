import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

// HACKATHON WORKAROUND: Hardcoded values due to Next.js env issues
// This is a test wallet with no real funds
const PRIVATE_KEY = "6ac767029147ca423267ec4a001285fec314564a46fdc56436e38934c6bf3c70";
const SEPOLIA_RPC_URL = "https://sepolia.infura.io/v3/fbb4fa2b1b734058b1ef4b6a3bb2a602";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      forking: {
        url: "https://eth.llamarpc.com",
        // Don't specify block number to use latest
      },
      accounts: [
        {
          privateKey: PRIVATE_KEY,
          balance: "10000000000000000000000", // 10,000 ETH
        },
      ],
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: [PRIVATE_KEY],
    },
    baseSepolia: {
      url: "https://sepolia.base.org",
      chainId: 84532,
      accounts: [PRIVATE_KEY],
    },
    base: {
      url: "https://mainnet.base.org",
      chainId: 8453,
      accounts: [PRIVATE_KEY],
      gasPrice: 1000000000, // 1 gwei
    },
    tenderly: {
      url: "https://virtual.mainnet.eu.rpc.tenderly.co/93163230-1fd3-4829-ae93-538b00018936",
      chainId: 1,
      accounts: [PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      sepolia: "", // Not needed for hackathon
    },
  },
  gasReporter: {
    enabled: false,
    currency: "USD",
  },
  mocha: {
    timeout: 40000,
  },
};

export default config; 