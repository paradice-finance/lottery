import * as chai from 'chai';
import BN from 'bn.js';
chai.use(require('chai-bn')(BN));

import { ethers } from 'hardhat';
require('dotenv').config({ path: '.env' });
const { lotto } = require('./settings.ts');

describe('Lottery Contract', function () {
  let owner: any, buyer: any, buyerWithAllowance: any, C: any, D: any;
  let Token;
  let token: any;
  let Lottery;
  let lottery: any;
  let RandomNumberGenerator;
  let randomNumberGenerator: any;
  let MockVRF: any;
  let mockVRF: any;
  let nullAddress = '0x0000000000000000000000000000000000000000';
  let allowance = 10000000000000000000000n;

  beforeEach(async () => {
    [owner, buyer, buyerWithAllowance, C] = await ethers.getSigners();

    Token = await ethers.getContractFactory('Mock_erc20');
    token = await (await Token.deploy(100000)).deployed();
    await token.connect(owner).transfer(buyerWithAllowance.address, allowance);

    Lottery = await ethers.getContractFactory('Lottery');
    lottery = await Lottery.deploy(
      token.address,
      lotto.setup.sizeOfLotteryNumbers,
      lotto.setup.ticketPrice,
      owner.address,
      lotto.setup.treasuryRatio,
      lotto.setup.affiliateRatio,
      lotto.setup.winnerRatio
    );
    await lottery.deployed();

    await token.connect(buyerWithAllowance).approve(lottery.address, allowance);

    MockVRF = await ethers.getContractFactory('Mock_VRFCoordinator');
    mockVRF = await MockVRF.deploy();
    await mockVRF.deployed();

    let res = await mockVRF.connect(owner).createSubscription();
    let { events }: any = await res.wait();
    const subId = parseInt(events[0].topics[1]); // Subscription ID
    await mockVRF
      .connect(owner)
      .fundSubscription(subId, ethers.utils.parseUnits('3', 18)); // add Link to Subscription ID

    RandomNumberGenerator = await ethers.getContractFactory(
      'RandomNumberGenerator'
    );
    randomNumberGenerator = await RandomNumberGenerator.deploy(
      subId,
      lottery.address,
      mockVRF.address,
      lotto.chainLink.goerli.keyHash
    );

    await randomNumberGenerator.deployed();

    await lottery.initialize(randomNumberGenerator.address);

    let addConsumer: any = await mockVRF
      .connect(owner)
      .addConsumer(subId, randomNumberGenerator.address);
    addConsumer = await addConsumer.wait();
  });

  describe('Mock token contract', function () {
    it('should get balance properly.', async function () {
      chai.expect(await token.balanceOf(owner.address)).not.be.equal(0);
      chai.expect(await token.balanceOf(buyer.address)).to.be.equal(0);
    });
  });

  describe('Creating a new lottery', function () {
    it('should revert when not owner', async function () {
      await chai
        .expect(lottery.connect(buyer).createNewLotto())
        .to.be.revertedWith(lotto.errors.invalid_admin);
    });
    it('should revert when invalid current lotto status', async function () {
      await lottery.connect(owner).createNewLotto();
      await chai
        .expect(lottery.connect(owner).createNewLotto())
        .to.be.revertedWith(
          lotto.errors.create_new_lottery_when_previous_lottery_not_finished
        );
    });
    it('should emit event LotteryOpen when success', async function () {
      await chai
        .expect(lottery.connect(owner).createNewLotto())
        .to.emit(lottery, lotto.event.new);
    });
  });

  describe('Config new lottery', function () {
    it('should revert when not owners', async function () {
      await chai
        .expect(
          lottery
            .connect(buyer)
            .configNewLotto(
              token.address,
              lotto.setup.sizeOfLotteryNumbers,
              lotto.setup.ticketPrice,
              lotto.setup.winnerRatio,
              lotto.setup.treasuryRatio,
              lotto.setup.affiliateRatio
            )
        )
        .to.be.revertedWith(lotto.errors.invalid_admin);
    });
    it('should revert when previous lotteryStatus is not Completed', async function () {
      await lottery.connect(owner).createNewLotto();
      await chai
        .expect(
          lottery
            .connect(owner)
            .configNewLotto(
              token.address,
              lotto.setup.sizeOfLotteryNumbers,
              lotto.setup.ticketPrice,
              lotto.setup.winnerRatio,
              lotto.setup.treasuryRatio,
              lotto.setup.affiliateRatio
            )
        )
        .to.be.revertedWith(
          lotto.errors.config_new_lottery_when_previous_lottery_not_finished
        );
    });
    it('should revert when invalid _token address', async function () {
      await chai
        .expect(
          lottery
            .connect(owner)
            .configNewLotto(
              nullAddress,
              lotto.setup.sizeOfLotteryNumbers,
              lotto.setup.ticketPrice,
              lotto.setup.winnerRatio,
              lotto.setup.treasuryRatio,
              lotto.setup.affiliateRatio
            )
        )
        .to.be.revertedWith(lotto.errors.invalid_token_address);
    });
    it('should revert when invalid _sizeOfLottery', async function () {
      await chai
        .expect(
          lottery
            .connect(owner)
            .configNewLotto(
              token.address,
              0,
              lotto.setup.ticketPrice,
              lotto.setup.winnerRatio,
              lotto.setup.treasuryRatio,
              lotto.setup.affiliateRatio
            )
        )
        .to.be.revertedWith(lotto.errors.invalid_lottery_size);
    });
    it('should revert when invalid _ticketPrice', async function () {
      await chai
        .expect(
          lottery
            .connect(owner)
            .configNewLotto(
              token.address,
              lotto.setup.sizeOfLotteryNumbers,
              0,
              lotto.setup.winnerRatio,
              lotto.setup.treasuryRatio,
              lotto.setup.affiliateRatio
            )
        )
        .to.be.revertedWith(lotto.errors.invalid_ticket_price);
    });
    it('should revert when invalid ratio', async function () {
      await chai
        .expect(
          lottery
            .connect(owner)
            .configNewLotto(
              token.address,
              lotto.setup.sizeOfLotteryNumbers,
              lotto.setup.ticketPrice,
              lotto.setup.winnerRatio + 1,
              lotto.setup.treasuryRatio,
              lotto.setup.affiliateRatio
            )
        )
        .to.be.revertedWith(lotto.errors.invalid_ratio);
    });
    it('should emit event ConfigLottery when success', async function () {
      await chai
        .expect(
          lottery
            .connect(owner)
            .configNewLotto(
              token.address,
              lotto.setup.sizeOfLotteryNumbers,
              lotto.setup.ticketPrice,
              lotto.setup.winnerRatio,
              lotto.setup.treasuryRatio,
              lotto.setup.affiliateRatio
            )
        )
        .to.emit(lottery, lotto.event.config);
    });
  });

  describe('Batch buy tickets', function () {
    it('should revert when current lotteryStatus is not Open', async function () {
      await chai
        .expect(
          lottery.connect(buyer).batchBuyLottoTicket(1, [1], nullAddress, false)
        )
        .to.be.revertedWith(lotto.errors.invalid_buy_not_open);
    });
    it('should revert when buying ticket quantity > available tickets ', async function () {
      await lottery.connect(owner).createNewLotto();
      await chai
        .expect(
          lottery
            .connect(buyer)
            .batchBuyLottoTicket(6, [1, 2, 3, 4, 5, 6], nullAddress, false)
        )
        .to.be.revertedWith(lotto.errors.invalid_buy_to_large);
    });
    it('should revert when invalid _chosenNumbersForEachTicket', async function () {
      await lottery.connect(owner).createNewLotto();
      await chai
        .expect(
          lottery
            .connect(buyer)
            .batchBuyLottoTicket(3, [1, 2], nullAddress, false)
        )
        .to.be.revertedWith(lotto.errors.invalid_buy_chosen_number);
    });
    it("should revert when buyer don't have enough token for transfer", async function () {
      await lottery.connect(owner).createNewLotto();
      await chai
        .expect(
          lottery.connect(buyer).batchBuyLottoTicket(1, [1], nullAddress, false)
        )
        .to.be.revertedWith(lotto.errors.invalid_buy_approve);
    });
    it('should emit event NewBatchMint and Affiliate when success', async function () {
      await lottery.connect(owner).createNewLotto();
      await chai
        .expect(
          lottery
            .connect(buyerWithAllowance)
            .batchBuyLottoTicket(1, [1], nullAddress, false)
        )
        .to.emit(lottery, lotto.event.batchBuy)
        .to.emit(lottery, lotto.event.affiliate);
    });
    it('should emit event LotteryClose when fully sell tickets', async function () {
      await lottery.connect(owner).createNewLotto();
      await chai
        .expect(
          lottery
            .connect(buyerWithAllowance)
            .batchBuyLottoTicket(5, [1, 2, 3, 4, 5], nullAddress, false)
        )
        .to.emit(lottery, lotto.event.close);
    });
  });

  // describe('Request winning number', function () {
  //   it('should revert when current lotteryStatus is not Closed', async function () {});
  //   it('should transfer to treasury address equal to pool - aff - winner', async function () {});
  //   it('should emit event RequestNumbers when success', async function () {});
  // });

  // describe('Fullfil winning number', function () {
  //   it('should revert when current lotteryStatus is not Closed', async function () {});
  //   it('should revert when invalid _requestId', async function () {});
  //   it('should update lottery status to "Completed" when success', async function () {});
  //   it('should emit event WinningTicket when success', async function () {});
  // });

  // describe('Claim win reward', function () {
  //   it('should revert when send invalid lotteryId', async function () {});
  //   it('should revert when send invalid ticketId', async function () {});
  //   it('should revert when lotto status is not "completed"', async function () {});
  //   it('should revert when sender is not ticket owner', async function () {});
  //   it('should revert when winner claim twice', async function () {});
  //   it("should revert when can't transfer token to winner", async function () {});
  //   it('should emit event ClaimWinReward when success', async function () {});
  // });

  // describe('Claim affiliate', function () {
  //   it('should revert when lotteryStatus is not Completed', async function () {});
  //   it('should not transfer when total claim is zero', async function () {});
  //   it('should emit event ClaimedAffiliate when success', async function () {});
  // });
});
