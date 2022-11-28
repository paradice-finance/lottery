import { expect } from "chai";
import { ethers } from "hardhat";

describe("Lock", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployLotterySmartContract() {
    // Contracts are deployed using the first signer/account by default

    const [] = await ethers.getSigners();

    const Lottery = await ethers.getContractFactory("Lottery");
    const lottery = await Lottery.deploy(
      "0x6A832387425887A12239bF361D56C33D535F746f",
      2,
      1
    );
  }
});
