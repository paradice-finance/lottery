import * as chai from 'chai';
import BN from 'bn.js';
chai.use(require('chai-bn')(BN));

import { ethers } from 'hardhat';
require('dotenv').config({ path: '.env' });

describe('Lottery Contract', function () {
  let owner: any, A: any, B: any, C: any, D: any;
  let Token;
  let token: any;
  let Lottery;
  let lottery: any;
  let MockRandomNumberGenerator;
  let mockRandomNumberGenerator: any;

  beforeEach(async () => {
    [owner, A, B, C] = await ethers.getSigners();
    Token = await ethers.getContractFactory('Mock_erc20');
    token = await Token.deploy(1000);
    await token.deployed();

    console.log(token.address);
    Lottery = await ethers.getContractFactory('Lottery');

    lottery = await Lottery.deploy(
      token.address, //_token
      20, // _sizeOfLotteryNumbers
      1, // _ticketPrice
      owner.address, // _treasuryAddress
      4, // _treasuryRatio
      1, // _affiliateRatio
      95 // _winnerRatio
    );

    await lottery.deployed();

    MockRandomNumberGenerator = await ethers.getContractFactory(
      'MockRandomNumberGenerator'
    );
    mockRandomNumberGenerator = await MockRandomNumberGenerator.deploy(
      5555,
      lottery.address
    );
  });

  describe('Mock token contract', function () {
    it('should get balance properly.', async function () {
      chai.expect(await token.balanceOf(owner.address)).not.be.equal(0);
      chai.expect(await token.balanceOf(A.address)).to.be.equal(0);
    });
  });

  describe('Creating a new lottery', function () {
    it('should revert when not owner', async function () {});
    it('should revert when invalid current lotto status', async function () {});
    it('should emit event LotteryOpen when success', async function () {});
  });

  describe('Config new lottery', function () {
    it('should revert when not owners', async function () {});
    it('should revert when previous lotteryStatus is not Completed', async function () {});
    it('should revert when invalid _token address', async function () {});
    it('should revert when invalid _sizeOfLottery', async function () {});
    it('should revert when invalid _ticketPrice', async function () {});
    it('should revert when invalid ratio', async function () {});
    it('should emit event ConfigLottery when success', async function () {});
  });

  describe('Buy tickets', function () {
    it('should revert when call by invalid address', async function () {});
    it('should revert when current lotteryStatus is not Open', async function () {});
    it('should revert when buying ticket quantity > available tickets ', async function () {});
    it('should revert when invalid _chosenNumbersForEachTicket', async function () {});
    it("should revert when buyer don't have enough token for transfer", async function () {});
    it('should emit event NewBatchMint and Affiliate when success', async function () {});
    it('should emit event LotteryClose when fully sell tickets', async function () {});
  });

  describe('Request winning number', function () {
    it('should revert when current lotteryStatus is not Closed', async function () {});
    it('should transfer to treasury address equal to pool - aff - winner', async function () {});
    it('should emit event RequestNumbers when success', async function () {});
  });

  describe('Fullfil winning number', function () {
    it('should revert when current lotteryStatus is not Closed', async function () {});
    it('should revert when invalid _requestId', async function () {});
    it('should update lottery status to "Completed" when success', async function () {});
    it('should emit event WinningTicket when success', async function () {});
  });

  describe('Claim win reward', function () {
    it('should revert when send invalid lotteryId', async function () {});
    it('should revert when send invalid ticketId', async function () {});
    it('should revert when lotto status is not "completed"', async function () {});
    it('should revert when sender is not ticket owner', async function () {});
    it('should revert when winner claim twice', async function () {});
    it("should revert when can't transfer token to winner", async function () {});
    it('should emit event ClaimWinReward when success', async function () {});
  });

  describe('Claim affiliate', function () {
    it('should revert when lotteryStatus is not Completed', async function () {});
    it('should not transfer when total claim is zero', async function () {});
    it('should emit event ClaimedAffiliate when success', async function () {});
  });
});
