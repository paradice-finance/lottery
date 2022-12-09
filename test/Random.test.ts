import { expect } from "chai";
import { ethers } from "hardhat";
require("dotenv").config({ path: ".env" });

describe("RandomGenerator", function () {
  let owner: any, A: any, B: any, C: any, treasury: any;
  let Token;
  let token;
  let Lottery;
  let lottery;
  let MockVRF;
  let mockVRF;
  let RandomNumberGenerator;
  let randomNumberGenerator;
  let round_size;
  let ticket_price;

  beforeEach(async () => {
    [owner, A, B, C, treasury] = await ethers.getSigners();

    Token = await ethers.getContractFactory("Mock_erc20");
    token = await Token.deploy(1000);
    Lottery = await ethers.getContractFactory("Lottery");
    lottery = await Lottery.deploy(
      token.address,
      round_size,
      ticket_price,
      treasury,
      4,
      1,
      95
    );

    // MockVRF = await ethers.getContractFactory("Mock_VRFCoordinator");
    // mockVRF = await MockVRF.deploy();
  });

  describe("RequestRandomNumber", function () {
    it("Should revert when send invalid lotteryId.", async function () {});
    it("Should revert when send invalid roundSize input.", async function () {});
    it("Should revert when not called by Lottery address.", async function () {});
    it("Should emit event requestRandomNumber when success.", async function () {});
  });

  describe("FulfillRandomWords", function () {
    it("Should revert when not called by LINK SmartContract.", async function () {});
    it("Should revert when random value greater than or equal round size.", async function () {});
    it("Should emit event fulfillRandomWords when success.", async function () {});
  });
});
