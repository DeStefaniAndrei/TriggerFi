const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Testing JPY/USD Price Feed Directly");
  console.log("=====================================\n");

  const JPY_USD_FEED = "0x8A6af2B75F23831ADc973ce6288e5329F63D86c6";
  
  const aggregatorV3InterfaceABI = [
    {
      inputs: [],
      name: "decimals",
      outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "description",
      outputs: [{ internalType: "string", name: "", type: "string" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "latestRoundData",
      outputs: [
        { internalType: "uint80", name: "roundId", type: "uint80" },
        { internalType: "int256", name: "answer", type: "int256" },
        { internalType: "uint256", name: "startedAt", type: "uint256" },
        { internalType: "uint256", name: "updatedAt", type: "uint256" },
        { internalType: "uint80", name: "answeredInRound", type: "uint80" },
      ],
      stateMutability: "view",
      type: "function",
    },
  ];

  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/fbb4fa2b1b734058b1ef4b6a3bb2a602");

  try {
    console.log(`📍 JPY/USD Feed Address: ${JPY_USD_FEED}`);
    
    const priceFeed = new ethers.Contract(JPY_USD_FEED, aggregatorV3InterfaceABI, provider);
    
    // Check if contract exists
    const code = await provider.getCode(JPY_USD_FEED);
    console.log(`Contract exists: ${code !== '0x' ? 'Yes' : 'No'}`);
    
    if (code === '0x') {
      console.log("❌ No contract deployed at this address!");
      return;
    }
    
    // Get decimals
    try {
      const decimals = await priceFeed.decimals();
      console.log(`✅ Decimals: ${decimals}`);
    } catch (e) {
      console.log(`❌ Failed to get decimals: ${e.message}`);
    }
    
    // Get description
    try {
      const description = await priceFeed.description();
      console.log(`✅ Description: ${description}`);
    } catch (e) {
      console.log(`❌ Failed to get description: ${e.message}`);
    }
    
    // Get latest round data
    try {
      const roundData = await priceFeed.latestRoundData();
      console.log("\n📊 Latest Round Data:");
      console.log(`Round ID: ${roundData.roundId}`);
      console.log(`Answer: ${roundData.answer}`);
      console.log(`Started At: ${roundData.startedAt}`);
      console.log(`Updated At: ${roundData.updatedAt}`);
      console.log(`Answered In Round: ${roundData.answeredInRound}`);
      
      // Calculate price
      const decimals = 8; // Standard for Chainlink
      const price = Number(roundData.answer) / Math.pow(10, decimals);
      console.log(`\n💰 JPY/USD Price: $${price.toFixed(6)}`);
      
      // Check staleness
      const updatedAt = new Date(Number(roundData.updatedAt) * 1000);
      const now = new Date();
      const hoursAgo = (now - updatedAt) / 1000 / 60 / 60;
      console.log(`Last Updated: ${updatedAt.toISOString()} (${hoursAgo.toFixed(1)} hours ago)`);
      
      if (hoursAgo > 1) {
        console.log(`⚠️  WARNING: Price is stale (> 1 hour old)`);
      }
      
    } catch (e) {
      console.log(`\n❌ Failed to get latest round data: ${e.message}`);
      console.log(`Error details:`, e);
    }
    
  } catch (error) {
    console.log(`\n❌ General error: ${error.message}`);
    console.log(error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });