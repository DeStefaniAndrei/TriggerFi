import { expect } from "chai";
import { ethers } from "hardhat";
import { 
  createLimitOrder, 
  signLimitOrder, 
  getOrderHash,
  getLimitOrderProtocolAddress 
} from "../lib/1inch-sdk-integration";

describe("1inch SDK Integration", function () {
  let signer: any;
  let testOrder: any;

  beforeEach(async function () {
    [signer] = await ethers.getSigners();
    
    testOrder = {
      asset: "0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8C8", // USDC
      threshold: "50000000000000000000000000", // 5% in ray format
      isBelowThreshold: true,
      isVariableBorrow: true,
      withdrawAmount: "1000000000", // 1000 USDC (6 decimals)
      targetToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
      minOutputAmount: "500000000000000000" // 0.5 WETH (18 decimals)
    };
  });

  describe("Order Creation", function () {
    it("should create a valid limit order", function () {
      const ratePredicateAddress = "0x1234567890123456789012345678901234567890";
      const withdrawInteractionAddress = "0x0987654321098765432109876543210987654321";
      const makerAddress = signer.address;
      const receiverAddress = signer.address;

      const order = createLimitOrder(
        testOrder,
        ratePredicateAddress,
        withdrawInteractionAddress,
        makerAddress,
        receiverAddress
      );

      expect(order).to.have.property("salt");
      expect(order).to.have.property("makerAsset", testOrder.asset);
      expect(order).to.have.property("takerAsset", testOrder.targetToken);
      expect(order).to.have.property("maker", makerAddress);
      expect(order).to.have.property("receiver", receiverAddress);
      expect(order).to.have.property("makingAmount", testOrder.withdrawAmount);
      expect(order).to.have.property("takingAmount", testOrder.minOutputAmount);
      expect(order).to.have.property("predicate").that.is.not.empty;
      expect(order).to.have.property("preInteraction").that.is.not.empty;
    });

    it("should generate unique order hashes", function () {
      const ratePredicateAddress = "0x1234567890123456789012345678901234567890";
      const withdrawInteractionAddress = "0x0987654321098765432109876543210987654321";
      const makerAddress = signer.address;
      const receiverAddress = signer.address;

      const order1 = createLimitOrder(
        testOrder,
        ratePredicateAddress,
        withdrawInteractionAddress,
        makerAddress,
        receiverAddress
      );

      const order2 = createLimitOrder(
        testOrder,
        ratePredicateAddress,
        withdrawInteractionAddress,
        makerAddress,
        receiverAddress
      );

      const hash1 = getOrderHash(order1);
      const hash2 = getOrderHash(order2);

      expect(hash1).to.not.equal(hash2);
    });
  });

  describe("Order Signing", function () {
    it("should sign an order with EIP-712", async function () {
      const ratePredicateAddress = "0x1234567890123456789012345678901234567890";
      const withdrawInteractionAddress = "0x0987654321098765432109876543210987654321";
      const makerAddress = signer.address;
      const receiverAddress = signer.address;

      const order = createLimitOrder(
        testOrder,
        ratePredicateAddress,
        withdrawInteractionAddress,
        makerAddress,
        receiverAddress
      );

      const signature = await signLimitOrder(order, signer, 1); // Mainnet

      expect(signature).to.be.a("string");
      expect(signature).to.have.length(132); // 0x + 130 hex chars
      expect(signature).to.match(/^0x[a-fA-F0-9]{130}$/);
    });
  });

  describe("Protocol Addresses", function () {
    it("should return correct protocol addresses for different chains", function () {
      const mainnetAddress = getLimitOrderProtocolAddress(1);
      const polygonAddress = getLimitOrderProtocolAddress(137);
      const optimismAddress = getLimitOrderProtocolAddress(10);

      expect(mainnetAddress).to.equal("0x111111125421ca6dc452d289314280a0f8842a65");
      expect(polygonAddress).to.equal("0x111111125421ca6dc452d289314280a0f8842a65");
      expect(optimismAddress).to.equal("0x111111125421ca6dc452d289314280a0f8842a65");
    });

    it("should fallback to mainnet for unknown chains", function () {
      const unknownChainAddress = getLimitOrderProtocolAddress(999999);
      expect(unknownChainAddress).to.equal("0x111111125421ca6dc452d289314280a0f8842a65");
    });
  });

  describe("Order Hash Generation", function () {
    it("should generate consistent hashes for the same order", function () {
      const ratePredicateAddress = "0x1234567890123456789012345678901234567890";
      const withdrawInteractionAddress = "0x0987654321098765432109876543210987654321";
      const makerAddress = signer.address;
      const receiverAddress = signer.address;

      const order = createLimitOrder(
        testOrder,
        ratePredicateAddress,
        withdrawInteractionAddress,
        makerAddress,
        receiverAddress
      );

      const hash1 = getOrderHash(order);
      const hash2 = getOrderHash(order);

      expect(hash1).to.equal(hash2);
    });
  });
}); 