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

  it("Random", async function () {
    expect(2).to.be.equal(2);
  });

  /* RequestRandomNumber tests 
  /  - Should revert when send invalid lotteryId.
  /  - Should revert when send invalid roundSize input.
  /  - Should revert when not called by Lottery address.
  /  - Should emit when received requestId from LINK. 
  */

  /* FulfillRandomWords tests 
  /  - Should revert when not called by LINK SmartContract.
  / - Should revert when random value greater than or equal round size.
  */
});
