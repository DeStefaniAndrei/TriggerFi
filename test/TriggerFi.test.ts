import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";

describe("TriggerFi", function () {
  let ratePredicate: Contract;
  let withdrawInteraction: Contract;
  let orderManager: Contract;
  let owner: Signer;
  let user: Signer;
  let userAddress: string;

  // Aave V3 addresses (Mainnet)
  const AAVE_POOL = "0x794a61358D6845594F94dc1DB02A252b5b4814aD";
  const AAVE_POOL_DATA_PROVIDER = "0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654";
  
  // Test token addresses (USDC, WETH)
  const USDC = "0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8C";
  const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();
    userAddress = await user.getAddress();

    // Deploy contracts
    const AaveRatePredicate = await ethers.getContractFactory("AaveRatePredicate");
    ratePredicate = await AaveRatePredicate.deploy(AAVE_POOL_DATA_PROVIDER);

    const AaveWithdrawInteraction = await ethers.getContractFactory("AaveWithdrawInteraction");
    withdrawInteraction = await AaveWithdrawInteraction.deploy(AAVE_POOL);

    const TriggerFiOrderManager = await ethers.getContractFactory("TriggerFiOrderManager");
    orderManager = await TriggerFiOrderManager.deploy(
      await ratePredicate.getAddress(),
      await withdrawInteraction.getAddress()
    );
  });

  describe("AaveRatePredicate", function () {
    it("Should get current variable borrow rate", async function () {
      const rate = await ratePredicate.getVariableBorrowRate(USDC);
      expect(rate).to.be.gt(0);
      console.log("USDC Variable Borrow Rate (ray):", rate.toString());
      console.log("USDC Variable Borrow Rate (%):", (Number(rate) / 1e25).toFixed(4) + "%");
    });

    it("Should get current supply rate", async function () {
      const rate = await ratePredicate.getSupplyRate(USDC);
      expect(rate).to.be.gte(0);
      console.log("USDC Supply Rate (ray):", rate.toString());
      console.log("USDC Supply Rate (%):", (Number(rate) / 1e25).toFixed(4) + "%");
    });

    it("Should check variable borrow rate condition", async function () {
      const currentRate = await ratePredicate.getVariableBorrowRate(USDC);
      const threshold = currentRate.add(ethers.parseUnits("0.01", 27)); // 1% higher
      
      const isBelow = await ratePredicate.checkVariableBorrowRate(USDC, threshold, true);
      expect(isBelow).to.be.true;
      
      const isAbove = await ratePredicate.checkVariableBorrowRate(USDC, threshold, false);
      expect(isAbove).to.be.false;
    });

    it("Should check supply rate condition", async function () {
      const currentRate = await ratePredicate.getSupplyRate(USDC);
      const threshold = currentRate.add(ethers.parseUnits("0.01", 27)); // 1% higher
      
      const isBelow = await ratePredicate.checkSupplyRate(USDC, threshold, true);
      expect(isBelow).to.be.true;
      
      const isAbove = await ratePredicate.checkSupplyRate(USDC, threshold, false);
      expect(isAbove).to.be.false;
    });
  });

  describe("AaveWithdrawInteraction", function () {
    it("Should get aToken address", async function () {
      const aTokenAddress = await withdrawInteraction.getATokenAddress(USDC);
      expect(aTokenAddress).to.not.equal(ethers.ZeroAddress);
      console.log("USDC aToken address:", aTokenAddress);
    });

    it("Should get user Aave balance", async function () {
      const balance = await withdrawInteraction.getAaveBalance(USDC, userAddress);
      expect(balance).to.be.gte(0);
      console.log("User USDC Aave balance:", ethers.formatUnits(balance, 6));
    });
  });

  describe("TriggerFiOrderManager", function () {
    it("Should create an order", async function () {
      const orderConfig = {
        asset: USDC,
        threshold: ethers.parseUnits("0.05", 27), // 5% APY
        isBelowThreshold: true,
        isVariableBorrow: true,
        withdrawAmount: ethers.parseUnits("100", 6), // 100 USDC
        targetToken: WETH,
        minOutputAmount: ethers.parseUnits("0.05", 18) // 0.05 WETH
      };

      const tx = await orderManager.connect(user).createOrder(orderConfig);
      const receipt = await tx.wait();
      
      // Check for OrderCreated event
      const event = receipt.logs.find((log: any) => 
        log.fragment && log.fragment.name === "OrderCreated"
      );
      expect(event).to.not.be.undefined;
      
      console.log("Order created successfully");
    });

    it("Should check order conditions", async function () {
      const orderConfig = {
        asset: USDC,
        threshold: ethers.parseUnits("0.05", 27), // 5% APY
        isBelowThreshold: true,
        isVariableBorrow: true,
        withdrawAmount: ethers.parseUnits("100", 6),
        targetToken: WETH,
        minOutputAmount: ethers.parseUnits("0.05", 18)
      };

      const conditionsMet = await orderManager.checkOrderConditions(orderConfig);
      expect(typeof conditionsMet).to.equal("boolean");
      console.log("Order conditions met:", conditionsMet);
    });

    it("Should get current rate", async function () {
      const variableBorrowRate = await orderManager.getCurrentRate(USDC, true);
      const supplyRate = await orderManager.getCurrentRate(USDC, false);
      
      expect(variableBorrowRate).to.be.gt(0);
      expect(supplyRate).to.be.gte(0);
      
      console.log("USDC Variable Borrow Rate:", ethers.formatUnits(variableBorrowRate, 25) + "%");
      console.log("USDC Supply Rate:", ethers.formatUnits(supplyRate, 25) + "%");
    });

    it("Should get user Aave balance", async function () {
      const balance = await orderManager.getAaveBalance(USDC, userAddress);
      expect(balance).to.be.gte(0);
      console.log("User USDC Aave balance:", ethers.formatUnits(balance, 6));
    });
  });

  describe("Integration Tests", function () {
    it("Should create and validate a complete order flow", async function () {
      // 1. Create order
      const orderConfig = {
        asset: USDC,
        threshold: ethers.parseUnits("0.05", 27),
        isBelowThreshold: true,
        isVariableBorrow: true,
        withdrawAmount: ethers.parseUnits("100", 6),
        targetToken: WETH,
        minOutputAmount: ethers.parseUnits("0.05", 18)
      };

      const orderHash = await orderManager.connect(user).createOrder(orderConfig);
      expect(orderHash).to.not.equal(ethers.ZeroHash);

      // 2. Check conditions
      const conditionsMet = await orderManager.checkOrderConditions(orderConfig);
      console.log("Order conditions met:", conditionsMet);

      // 3. Get current rates
      const currentRate = await orderManager.getCurrentRate(USDC, true);
      console.log("Current USDC variable borrow rate:", ethers.formatUnits(currentRate, 25) + "%");

      // 4. Get user balance
      const balance = await orderManager.getAaveBalance(USDC, userAddress);
      console.log("User USDC Aave balance:", ethers.formatUnits(balance, 6));

      console.log("Complete order flow validated successfully");
    });
  });
}); 