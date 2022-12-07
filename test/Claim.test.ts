import { expect } from "chai";
import { ethers } from "hardhat";
require("dotenv").config({ path: ".env" });

describe("Lottery", function () {
  let owner: any, A: any, B: any, C: any, D: any;

  let Lottery;
  let lottery;
  let RandomNumberGenerator;

  // beforeEach(async () => {
  //   [owner, A, B, C] = await ethers.getSigners();
  //   Lottery = await ethers.getContractFactory("Lottery");
  //   lottery = await Lottery.deploy(
  //     "0x6A832387425887A12239bF361D56C33D535F746f",
  //     2,
  //     1
  //   );

  //   RandomNumberGenerator = await ethers.getContractFactory(
  //     "RandomNumberGenerator"
  //   );
  // });

  it("Claim", async function () {
    expect(2).to.be.equal(2);
  });

  /* Claim tests
  /  - Should revert when sending wrong argument.
  /  - Should revert when lotto status is not "completed".
  /  - Should revert when sender is not ticket owner.
  /  - Should revert when winner claim twice.
  /  - Should emit when transfer token to winner.
  */
});
