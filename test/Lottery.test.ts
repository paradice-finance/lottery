import { expect } from "chai";
import { ethers } from "hardhat";
require("dotenv").config({ path: ".env" });

describe("Lottery", function () {
  let owner: any, A: any, B: any, C: any, D: any;
  let Token;
  let token: any;
  let Lottery;
  let lottery: any;
  let MockRandomNumberGenerator;
  let mockRandomNumberGenerator: any;

  beforeEach(async () => {
    [owner, A, B, C] = await ethers.getSigners();
    Token = await ethers.getContractFactory("MockToken");
    token = await Token.deploy();
    await token.deployed();

    // console.log(token.address);
    console.log(token.address);
    Lottery = await ethers.getContractFactory("Lottery");
    lottery = await Lottery.deploy(token.address, 2, 1, owner.address);

    await lottery.deployed();

    MockRandomNumberGenerator = await ethers.getContractFactory(
      "MockRandomNumberGenerator"
    );
    mockRandomNumberGenerator = await MockRandomNumberGenerator.deploy(
      5555,
      lottery.address
    );
    //   RandomNumberGenerator = await ethers.getContractFactory(
    //     "RandomNumberGenerator"
    //   );
  });

  it("Owner have token balance. others is not.", async function () {
    expect(await token.balanceOf(owner.address)).not.be.equal(0);

    expect(await token.balanceOf(A.address)).to.be.equal(0);
  });

  it("Random contract can get requestId", async function () {
    console.log(
      await mockRandomNumberGenerator.connect(owner).requestRandomNumber(1, 4)
    );
    expect(
      await mockRandomNumberGenerator.connect(owner).requestRandomNumber(1, 4)
    ).not.be.equal(0);

    expect(await token.balanceOf(A.address)).to.be.equal(0);
  });

  /* Creating a new lottery tests 
  /  - Should revert when not owner
  /  - Should revert when invalid current lotto status
  /  - Should emit event LotteryOpen when success
  */

  /* Config new lottery 
  /  - Should revert when not owners
  /  - Should revert when previous lotteryStatus is not Completed
  /  - Should revert when invalid _token address
  /  - Should revert when invalid _sizeOfLottery 
  /  - Should revert when invalid _ticketPrice
  /  - Should revert when invalid ratio
  /  - Should emit event ConfigLottery when success
  */

  /* Buy tickets 
  /  - Should revert when call by invalid address
  /  - Should revert when current lotteryStatus is not Open
  /  - Should revert when buying ticket quantity > available tickets 
  /  - Should revert when invalid _chosenNumbersForEachTicket
  /  - Should revert when buyer don't have enough token for transfer
  /  - Should emit event NewBatchMint and Affiliate when success
  /  - Should emit event LotteryClose when fully sell tickets
  */

  /* Drawing winning ticket
  /  - Should revert when current lotteryStatus is not Closed
  /  - Should transfer to treasury address equal to pool - aff - winner
  /  - Should emit event RequestNumbers when success
  */

  /* Numbers draw 
  /  - Should revert when current lotteryStatus is not Closed
  /  - Should revert when invalid _requestId
  /  - Should update lottery status to "Completed" when success
  /  - Should emit event WinningTicket when success
  */

  /* ClaimWinReward tests
  /  - Should revert when sending wrong argument.
  /  - Should revert when lotto status is not "completed".
  /  - Should revert when sender is not ticket owner.
  /  - Should revert when winner claim twice.
  /  - Should emit when transfer token to winner.
  */

  /* Claim Affiliate
  /  - Should revert when lotteryStatus is not Completed
  /  - should not transfer when total claim is zero
  /  - Should emit event ClaimedAffiliate when success
  */
});
