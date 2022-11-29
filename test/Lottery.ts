import { expect } from "chai";
import { ethers } from "hardhat";
require("dotenv").config({ path: ".env" });

describe("Lottery", function () {
  let owner: any, A: any, B: any, C: any, D: any;

  let Lottery;
  let lottery;
  let RandomNumberGenerator;
  let randomNumberGenerator;

  beforeEach(async () => {
    [owner, A, B, C] = await ethers.getSigners();
    Lottery = await ethers.getContractFactory("Lottery");
    lottery = await Lottery.deploy(
      "0x6A832387425887A12239bF361D56C33D535F746f",
      2,
      1
    );

    RandomNumberGenerator = await ethers.getContractFactory(
      "RandomNumberGenerator"
    );

    randomNumberGenerator = await RandomNumberGenerator.deploy(
      6379,
      lottery.address
    );
  });

  it("Create new lotto", async function () {
    expect(2).to.equal(2);
  });
});
