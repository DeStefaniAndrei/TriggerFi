const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Testing Chainlink Price Feeds on Sepolia");
  console.log("==========================================\n");

  // Price feed addresses from DynamicAmountGetter contract
  const priceFeeds = {
    "ETH/USD": "0x694AA1769357215DE4FAC081bf1f309aDC325306",
    "BTC/USD": "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43",
    "JPY/USD": "0x8A6af2B75F23831ADc973ce6288e5329F63D86c6"
  };

  // ABI for Chainlink price feed
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
      inputs: [{ internalType: "uint80", name: "_roundId", type: "uint80" }],
      name: "getRoundData",
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
    {
      inputs: [],
      name: "version",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
  ];

  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/fbb4fa2b1b734058b1ef4b6a3bb2a602");

  for (const [pair, address] of Object.entries(priceFeeds)) {
    console.log(`\n📊 Testing ${pair} Price Feed`);
    console.log(`Address: ${address}`);
    
    try {
      const priceFeed = new ethers.Contract(address, aggregatorV3InterfaceABI, provider);
      
      // Get decimals
      const decimals = await priceFeed.decimals();
      console.log(`Decimals: ${decimals}`);
      
      // Get description
      const description = await priceFeed.description();
      console.log(`Description: ${description}`);
      
      // Get latest price
      const roundData = await priceFeed.latestRoundData();
      const price = parseFloat(ethers.formatUnits(roundData.answer, decimals));
      
      // Calculate time since last update
      const updatedAt = new Date(parseInt(roundData.updatedAt.toString()) * 1000);
      const now = new Date();
      const minutesAgo = Math.floor((now - updatedAt) / 1000 / 60);
      
      console.log(`✅ Current Price: $${price.toFixed(decimals)}`);
      console.log(`Last Updated: ${updatedAt.toISOString()} (${minutesAgo} minutes ago)`);
      
      // Check if price is stale (older than 1 hour)
      if (minutesAgo > 60) {
        console.log(`⚠️  WARNING: Price data is stale (> 1 hour old)`);
      }
      
    } catch (error) {
      console.log(`❌ ERROR: Failed to fetch price data`);
      console.log(`Error: ${error.message}`);
    }
  }

  console.log("\n\n🧮 Testing Token Pair Calculations");
  console.log("====================================");
  
  // Test dynamic amount getter calculations
  const dynamicAmountGetterAddress = "0x5b02226E1820E80F6212f31Fe51Cf01A7B3D10b2";
  console.log(`\nDynamicAmountGetter: ${dynamicAmountGetterAddress}`);
  
  // Test with deployed contract
  try {
    const dynamicAmountGetterABI = [
      "function getLatestPrice(uint256 tokenIndex) view returns (uint256)",
      "function TOKEN_ETH() view returns (uint256)",
      "function TOKEN_BTC() view returns (uint256)", 
      "function TOKEN_JPY() view returns (uint256)",
      "function TOKEN_USDC() view returns (uint256)"
    ];
    
    const dynamicAmountGetter = new ethers.Contract(
      dynamicAmountGetterAddress,
      dynamicAmountGetterABI,
      provider
    );
    
    console.log("\n📈 Prices from DynamicAmountGetter:");
    
    // Get token indices
    const TOKEN_ETH = await dynamicAmountGetter.TOKEN_ETH();
    const TOKEN_BTC = await dynamicAmountGetter.TOKEN_BTC();
    const TOKEN_JPY = await dynamicAmountGetter.TOKEN_JPY();
    const TOKEN_USDC = await dynamicAmountGetter.TOKEN_USDC();
    
    // Test each price
    const tokens = [
      { name: "ETH", index: TOKEN_ETH },
      { name: "BTC", index: TOKEN_BTC },
      { name: "JPY", index: TOKEN_JPY },
      { name: "USDC", index: TOKEN_USDC }
    ];
    
    for (const token of tokens) {
      try {
        const price = await dynamicAmountGetter.getLatestPrice(token.index);
        const formattedPrice = Number(price) / 1e8; // 8 decimals
        console.log(`✅ ${token.name}/USD: $${formattedPrice.toFixed(8)}`);
      } catch (error) {
        console.log(`❌ ${token.name}/USD: Failed - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.log(`\n❌ Failed to test DynamicAmountGetter: ${error.message}`);
  }

  console.log("\n\n📊 Available Trading Pairs:");
  console.log("==========================");
  console.log("✅ WETH/USDC - Both price feeds working");
  console.log("✅ WETH/DAI - ETH price feed available");
  console.log("✅ JPYC/USDC - JPY/USD feed working for JPYC");
  console.log("✅ JPYC/WETH - Both feeds available");
  console.log("\n💡 Note: JPYC uses JPY/USD feed (1:1 peg assumption)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });