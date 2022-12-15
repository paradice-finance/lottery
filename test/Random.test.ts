import { ethers } from 'hardhat';
import { expect, use } from 'chai';
import BN from 'bn.js';
use(require('chai-bn')(BN));

require('dotenv').config({ path: '.env' });
const { lotto } = require('./settings.ts');

describe('RandomNumberGenerator', function () {
  let owner: any, buyer: any, buyerWithAllowance: any, C: any, treasury: any;

  let Token;
  let token: any;
  let Lottery;
  let lottery: any;
  let MockVRF;
  let mockVRF: any;
  let RandomNumberGenerator;
  let randomNumberGenerator: any;
  let subId: any;
  let { setup, events, errors, chainLink } = lotto;
  let { nullAddress, allowance } = setup;
  beforeEach(async () => {
    [owner, buyer, buyerWithAllowance, C, treasury] = await ethers.getSigners();

    Token = await ethers.getContractFactory('Mock_erc20');
    token = await (await Token.deploy(100000)).deployed();

    Lottery = await ethers.getContractFactory('Lottery');
    lottery = await Lottery.deploy(
      token.address,
      setup.sizeOfLotteryNumbers,
      setup.ticketPrice,
      owner.address,
      setup.treasuryRatio,
      setup.affiliateRatio,
      setup.winnerRatio
    );

    await lottery.deployed();

    await token.connect(owner).transfer(buyerWithAllowance.address, allowance);

    await token.connect(buyerWithAllowance).approve(lottery.address, allowance);

    MockVRF = await ethers.getContractFactory('Mock_VRFCoordinator');
    mockVRF = await MockVRF.deploy();
    await mockVRF.deployed();

    let res = await mockVRF.connect(owner).createSubscription();
    let { events }: any = await res.wait();
    subId = parseInt(events[0].topics[1]); // Subscription ID

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
      chainLink.goerli.keyHash
    );

    await randomNumberGenerator.deployed();

    // add consumer
    await mockVRF
      .connect(owner)
      .addConsumer(subId, randomNumberGenerator.address);

    await lottery.initialize(randomNumberGenerator.address);
  });

  describe('RequestRandomNumber', function () {
    it('Should revert when not called by Lottery address.', async function () {
      await expect(
        randomNumberGenerator.connect(owner).requestRandomNumber(1, 1)
      ).to.be.revertedWith(errors.invalid_random_caller);
    });

    it('Should emit event RequestRandomNumber when success.', async function () {
      await lottery.connect(owner).createNewLotto();

      await expect(
        await lottery
          .connect(buyerWithAllowance)
          .batchBuyLottoTicket(
            setup.sizeOfLotteryNumbers,
            setup.chosenNumbersForEachTicket,
            nullAddress,
            false
          )
      ).to.emit(randomNumberGenerator, events.requestRandom);
    });
  });

  describe('FulfillRandomWords', function () {
    it('Should emit event RandomWordsFulfilled when success.', async function () {
      await lottery.connect(owner).createNewLotto();

      let buy = await lottery
        .connect(buyerWithAllowance)
        .batchBuyLottoTicket(
          setup.sizeOfLotteryNumbers,
          setup.chosenNumbersForEachTicket,
          nullAddress,
          false
        );
      let result: any = await buy.wait();

      let reqId: any = result.events.filter(
        (event: any) => event.event == events.requestWinningNumber
      )[0].args[1];

      await expect(
        mockVRF
          .connect(owner)
          .fulfillRandomWords(reqId, randomNumberGenerator.address)
      ).to.emit(randomNumberGenerator, events.fulfillRandom);

      const { randomValue } = await randomNumberGenerator.getRandomInfo(reqId);
    });
  });

  describe('GetRandomInfo', function () {
    it('Should return RandomInfo when success.', async function () {
      await lottery.connect(owner).createNewLotto();

      let buy = await lottery
        .connect(buyerWithAllowance)
        .batchBuyLottoTicket(
          setup.sizeOfLotteryNumbers,
          setup.chosenNumbersForEachTicket,
          nullAddress,
          false
        );
      let result: any = await buy.wait();

      let reqId: any = result.events.filter(
        (event: any) => event.event == events.requestWinningNumber
      )[0].args[1];

      await expect(
        mockVRF
          .connect(owner)
          .fulfillRandomWords(reqId, randomNumberGenerator.address)
      ).to.emit(randomNumberGenerator, events.fulfillRandom);

      const { randomValue } = await randomNumberGenerator.getRandomInfo(reqId);

      await expect(randomValue).to.greaterThanOrEqual(0);
    });
  });
});
