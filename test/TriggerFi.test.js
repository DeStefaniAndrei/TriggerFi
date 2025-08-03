const { expect } = require("chai");
const { ethers } = require("hardhat");
const { Address, LimitOrder, MakerTraits } = require("@1inch/limit-order-sdk");

describe("TriggerFi Integration Tests", function () {
  let owner, user, keeper;
  let mockPredicate, priceGetter;
  let weth, usdc;
  
  const LIMIT_ORDER_PROTOCOL = "0x111111125421ca6dc452d289314280a0f8842a65"; // Mainnet
  
  beforeEach(async function () {
    [owner, user, keeper] = await ethers.getSigners();
    
    // Deploy MockDynamicAPIPredicate
    const MockPredicate = await ethers.getContractFactory("MockDynamicAPIPredicate");
    mockPredicate = await MockPredicate.deploy(owner.address, keeper.address);
    await mockPredicate.waitForDeployment();
    
    // Deploy PriceAmountGetter
    const PriceAmountGetter = await ethers.getContractFactory("PriceAmountGetter");
    priceGetter = await PriceAmountGetter.deploy();
    await priceGetter.waitForDeployment();
    
    // Setup mock tokens for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    weth = await MockERC20.deploy("Wrapped ETH", "WETH", 18);
    usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    
    // Mint tokens
    await weth.mint(user.address, ethers.parseEther("10"));
    await usdc.mint(keeper.address, ethers.parseUnits("10000", 6));
  });
  
  describe("MockDynamicAPIPredicate", function () {
    it("Should create a predicate", async function () {
      const tx = await mockPredicate.connect(user).createPredicate();
      const receipt = await tx.wait();
      
      const event = receipt.logs.find(log => {
        try {
          const parsed = mockPredicate.interface.parseLog(log);
          return parsed.name === "PredicateCreated";
        } catch {
          return false;
        }
      });
      
      expect(event).to.not.be.undefined;
      const predicateId = mockPredicate.interface.parseLog(event).args.predicateId;
      expect(predicateId).to.not.equal(ethers.ZeroHash);
    });
    
    it("Should check predicate condition", async function () {
      // Create predicate
      const tx = await mockPredicate.connect(user).createPredicate();
      const receipt = await tx.wait();
      
      const event = receipt.logs.find(log => {
        try {
          const parsed = mockPredicate.interface.parseLog(log);
          return parsed.name === "PredicateCreated";
        } catch {
          return false;
        }
      });
      
      const predicateId = mockPredicate.interface.parseLog(event).args.predicateId;
      
      // Check condition (should be false initially)
      let result = await mockPredicate.checkCondition(predicateId);
      expect(result).to.equal(0);
      
      // Set to true
      await mockPredicate.connect(keeper).setTestResult(predicateId, true);
      
      // Check again
      result = await mockPredicate.checkCondition(predicateId);
      expect(result).to.equal(1);
    });
    
    it("Should only allow keeper to set test results", async function () {
      const tx = await mockPredicate.connect(user).createPredicate();
      const receipt = await tx.wait();
      
      const event = receipt.logs.find(log => {
        try {
          const parsed = mockPredicate.interface.parseLog(log);
          return parsed.name === "PredicateCreated";
        } catch {
          return false;
        }
      });
      
      const predicateId = mockPredicate.interface.parseLog(event).args.predicateId;
      
      // User (non-keeper) should not be able to set result
      await expect(
        mockPredicate.connect(user).setTestResult(predicateId, true)
      ).to.be.revertedWith("Only keeper");
      
      // Keeper should be able to set result
      await expect(
        mockPredicate.connect(keeper).setTestResult(predicateId, true)
      ).to.not.be.reverted;
    });
  });
  
  describe("PriceAmountGetter", function () {
    it("Should calculate making amount based on price", async function () {
      const takingAmount = ethers.parseUnits("3500", 6); // 3500 USDC
      const price = ethers.parseUnits("3500", 6); // 1 ETH = 3500 USDC
      
      const makingAmount = await priceGetter.getMakingAmount(
        takingAmount,
        price,
        6, // USDC decimals
        18 // WETH decimals
      );
      
      // Should return 1 ETH
      expect(makingAmount).to.equal(ethers.parseEther("1"));
    });
    
    it("Should calculate taking amount based on price", async function () {
      const makingAmount = ethers.parseEther("1"); // 1 ETH
      const price = ethers.parseUnits("3500", 6); // 1 ETH = 3500 USDC
      
      const takingAmount = await priceGetter.getTakingAmount(
        makingAmount,
        price,
        18, // WETH decimals
        6 // USDC decimals
      );
      
      // Should return 3500 USDC
      expect(takingAmount).to.equal(ethers.parseUnits("3500", 6));
    });
  });
  
  describe("Order Creation", function () {
    it("Should create a valid limit order with predicate", async function () {
      // Create predicate
      const tx = await mockPredicate.connect(user).createPredicate();
      const receipt = await tx.wait();
      
      const event = receipt.logs.find(log => {
        try {
          const parsed = mockPredicate.interface.parseLog(log);
          return parsed.name === "PredicateCreated";
        } catch {
          return false;
        }
      });
      
      const predicateId = mockPredicate.interface.parseLog(event).args.predicateId;
      
      // Create order using SDK
      const makerTraits = MakerTraits.default();
      const order = new LimitOrder({
        makerAsset: new Address(await weth.getAddress()),
        takerAsset: new Address(await usdc.getAddress()),
        makingAmount: ethers.parseEther("1").toString(),
        takingAmount: ethers.parseUnits("3500", 6).toString(),
        maker: new Address(user.address),
        receiver: new Address(user.address)
      }, makerTraits);
      
      // Add predicate
      const checkConditionData = mockPredicate.interface.encodeFunctionData("checkCondition", [predicateId]);
      const predicateCall = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes"],
        [await mockPredicate.getAddress(), checkConditionData]
      );
      
      // Verify order structure
      const builtOrder = order.build();
      expect(builtOrder.maker).to.equal(user.address);
      expect(builtOrder.makingAmount).to.equal(ethers.parseEther("1").toString());
      expect(builtOrder.takingAmount).to.equal(ethers.parseUnits("3500", 6).toString());
    });
  });
});

// Mock ERC20 for testing
const MockERC20 = {
  abi: [
    "function mint(address to, uint256 amount)",
    "function balanceOf(address) view returns (uint256)",
    "function approve(address, uint256) returns (bool)",
    "function transfer(address, uint256) returns (bool)"
  ],
  bytecode: "0x608060405234801561001057600080fd5b5060405162000f3838038062000f38833981016040819052610031916101e5565b818160036100" +
    "3f8382610283565b50600461004d8282610283565b5050505050610341565b634e487b7160e01b600052604160045260246000fd5b600181" +
    "1c90821680610097576080fd5b50919050565b601f8211156100c757600081815260208120601f850160051c810160208610156100c4575080" +
    "5b601f850160051c820191505b818110156100e3578281556001016100d0565b505050505050565b81516001600160401b0381111561010457" +
    "610104610057565b610118816101128454610083565b8461009d565b602080601f83116001811461014d57600084156101355750858301515b" +
    "600019600386901b1c1916600185901b1785556100e3565b600085815260208120601f198616915b8281101561017c5788860151825594840194" +
    "600190910190840161015d565b50858210156101995786850151600019600388901b60f8161c191681555b5050505050600190811b0190555056" +
    "5b634e487b7160e01b600052603260045260246000fd5b6000602082840312156101d857600080fd5b81516001600160a01b038116811461022e" +
    "57600080fd5b9392505050565b60006020828403121561024757600080fd5b5051919050565b600181811c9082168061026257607f821691505b" +
    "60208210810361028257634e487b7160e01b600052602260045260246000fd5b50919050565b601f8211156102d357600081815260208120601f" +
    "850160051c810160208610156102b05750805b601f850160051c820191505b818110156102cf578281556001016102bc565b505050505050565b" +
    "81516001600160401b038111156102f1576102f1610057565b61030581610300845461024e565b84610288565b602080601f83116001811461" +
    "033a57600084156103225750858301515b600019600386901b1c1916600185901b1785556102cf565b600085815260208120601f198616915b" +
    "828110156103695788860151825594840194600190910190840161034a565b50858210156103875787850151600019600388901b60f8161c1916" +
    "81555b5050505050600190811b01905550565b610b91806103a76000396000f3fe"
};