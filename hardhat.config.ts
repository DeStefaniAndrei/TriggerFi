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
      // Local network for testing
    },
    sepolia: {
      url: SEPOLIA_RPC_URL,
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