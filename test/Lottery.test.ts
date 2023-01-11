import { expect, assert, use as chaiUse } from 'chai';
import BN from 'bn.js';
chaiUse(require('chai-bn')(BN));

import { ethers } from 'hardhat';
require('dotenv').config({ path: '.env' });
const { lotto } = require('./settings.ts');

describe('Lottery Contract', () => {
  let owner: any, buyer: any, buyerWithAllowance: any, seller: any, D: any;
  let Token;
  let token: any;
  let Lottery;
  let lottery: any;
  let RandomNumberGenerator;
  let randomNumberGenerator: any;
  let MockVRF: any;
  let mockVRF: any;

  let { setup, events, errors, status, expectedResponse } = lotto;
  let { nullAddress } = setup;

  beforeEach(async () => {
    [owner, buyer, buyerWithAllowance, seller] = await ethers.getSigners();

    Token = await ethers.getContractFactory('Mock_erc20');
    token = await (await Token.deploy(100000)).deployed();
    await token
      .connect(owner)
      .transfer(buyerWithAllowance.address, setup.balance);

    Lottery = await ethers.getContractFactory('Lottery');
    lottery = await Lottery.deploy(
      token.address,
      setup.sizeOfLotteryNumbers,
      setup.maximumChosenNumber,
      setup.ticketPrice,
      owner.address,
      setup.treasuryRatio,
      setup.affiliateRatio,
      setup.winnerRatio
    );
    await lottery.deployed();

    await token
      .connect(buyerWithAllowance)
      .approve(lottery.address, setup.balance);

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

  describe('Mock token contract', () => {
    it('should get balance properly.', async () => {
      expect(await token.balanceOf(owner.address)).not.be.equal(0);
      expect(await token.balanceOf(buyer.address)).to.be.equal(0);
    });
  });

  describe('Creating a new lottery', () => {
    it('should revert when not owner', async () => {
      await expect(
        lottery.connect(buyer).createNewLottery()
      ).to.be.revertedWith(errors.invalid_admin);
    });
    it('should revert when invalid current lotto status', async () => {
      await lottery.connect(owner).createNewLottery();
      await expect(
        lottery.connect(owner).createNewLottery()
      ).to.be.revertedWith(
        errors.create_new_lottery_when_previous_lottery_not_finished
      );
    });
    it('should emit event LotteryOpen when success', async () => {
      await expect(lottery.connect(owner).createNewLottery()).to.emit(
        lottery,
        events.new
      );
    });
  });

  describe('Config new lottery', () => {
    it('should revert when not owners', async () => {
      await expect(
        lottery
          .connect(buyer)
          .configNewLottery(
            token.address,
            setup.sizeOfLotteryNumbers,
            setup.maximumChosenNumber,
            setup.ticketPrice,
            setup.winnerRatio,
            setup.treasuryRatio,
            setup.affiliateRatio
          )
      ).to.be.revertedWith(errors.invalid_admin);
    });
    it('should revert when previous lotteryStatus is not Completed', async () => {
      await lottery.connect(owner).createNewLottery();
      await expect(
        lottery
          .connect(owner)
          .configNewLottery(
            token.address,
            setup.sizeOfLotteryNumbers,
            setup.maximumChosenNumber,
            setup.ticketPrice,
            setup.winnerRatio,
            setup.treasuryRatio,
            setup.affiliateRatio
          )
      ).to.be.revertedWith(
        errors.config_new_lottery_when_previous_lottery_not_finished
      );
    });
    it('should revert when invalid _token address', async () => {
      await expect(
        lottery
          .connect(owner)
          .configNewLottery(
            nullAddress,
            setup.sizeOfLotteryNumbers,
            setup.maximumChosenNumber,
            setup.ticketPrice,
            setup.winnerRatio,
            setup.treasuryRatio,
            setup.affiliateRatio
          )
      ).to.be.revertedWith(errors.invalid_token_address);
    });
    it('should revert when invalid _sizeOfLottery', async () => {
      await expect(
        lottery
          .connect(owner)
          .configNewLottery(
            token.address,
            0,
            setup.maximumChosenNumber,
            setup.ticketPrice,
            setup.winnerRatio,
            setup.treasuryRatio,
            setup.affiliateRatio
          )
      ).to.be.revertedWith(errors.invalid_lottery_size);
    });
    it('should revert when invalid _ticketPrice', async () => {
      await expect(
        lottery
          .connect(owner)
          .configNewLottery(
            token.address,
            setup.sizeOfLotteryNumbers,
            setup.maximumChosenNumber,
            0,
            setup.winnerRatio,
            setup.treasuryRatio,
            setup.affiliateRatio
          )
      ).to.be.revertedWith(errors.invalid_ticket_price);
    });
    it('should revert when invalid ratio', async () => {
      await expect(
        lottery
          .connect(owner)
          .configNewLottery(
            token.address,
            setup.sizeOfLotteryNumbers,
            setup.maximumChosenNumber,
            setup.ticketPrice,
            setup.winnerRatio + 1,
            setup.treasuryRatio,
            setup.affiliateRatio
          )
      ).to.be.revertedWith(errors.invalid_ratio);
    });
    it('should emit event ConfigLottery when success', async () => {
      await expect(
        lottery
          .connect(owner)
          .configNewLottery(
            token.address,
            setup.sizeOfLotteryNumbers,
            setup.maximumChosenNumber,
            setup.ticketPrice,
            setup.winnerRatio,
            setup.treasuryRatio,
            setup.affiliateRatio
          )
      ).to.emit(lottery, events.config);
    });
  });

  describe('Batch buy tickets', () => {
    it('should revert when current lotteryStatus is not Open', async () => {
      await expect(
        lottery.connect(buyer).batchBuyTicket(1, [1], nullAddress, false)
      ).to.be.revertedWith(errors.invalid_buy_not_open);
    });
    it('should revert when buying ticket quantity > available tickets ', async () => {
      await lottery.connect(owner).createNewLottery();
      await expect(
        lottery
          .connect(buyer)
          .batchBuyTicket(
            setup.sizeOfLotteryNumbers + 1,
            setup.chosenNumbersForEachTicket,
            nullAddress,
            false
          )
      ).to.be.revertedWith(errors.invalid_buy_to_large);
    });
    it('should revert when invalid _chosenNumbersForEachTicket', async () => {
      await lottery.connect(owner).createNewLottery();
      await expect(
        lottery.connect(buyer).batchBuyTicket(3, [1, 2], nullAddress, false)
      ).to.be.revertedWith(errors.invalid_buy_chosen_number);
    });
    it('should revert when chosen number out of range', async () => {
      await lottery.connect(owner).createNewLottery();
      await expect(
        lottery
          .connect(buyer)
          .batchBuyTicket(3, [1, 2, 100000000], nullAddress, false)
      ).to.be.revertedWith(errors.invalid_buy_chosen_number_length);
    });
    it("should revert when buyer don't have enough token for transfer", async () => {
      await lottery.connect(owner).createNewLottery();
      await expect(
        lottery.connect(buyer).batchBuyTicket(1, [1], nullAddress, false)
      ).to.be.revertedWith(errors.invalid_buy_approve);
    });
    it('should emit event NewBatchMint when success', async () => {
      await lottery.connect(owner).createNewLottery();
      await expect(
        lottery
          .connect(buyerWithAllowance)
          .batchBuyTicket(1, [1], nullAddress, false)
      ).to.emit(lottery, events.batchBuy);
    });
    it('should emit event Affiliate when success batch buy with affiliate address', async () => {
      await lottery.connect(owner).createNewLottery();
      await expect(
        lottery
          .connect(buyerWithAllowance)
          .batchBuyTicket(1, [1], seller.address, true)
      ).to.emit(lottery, events.affiliate);
    });
    it('should emit event LotteryClose when fully sell tickets', async () => {
      await lottery.connect(owner).createNewLottery();
      await expect(
        lottery
          .connect(buyerWithAllowance)
          .batchBuyTicket(
            setup.sizeOfLotteryNumbers,
            setup.chosenNumbersForEachTicket,
            nullAddress,
            false
          )
      ).to.emit(lottery, events.close);

      assert.equal(
        await token.balanceOf(buyerWithAllowance.address),
        expectedResponse.balanceAfterBuy
      );
    });
  });

  describe('Batch refund tickets', () => {
    it('should revert when current lotteryStatus is not Open', async () => {
      await lottery.connect(owner).createNewLottery();
      lottery
        .connect(buyerWithAllowance)
        .batchBuyTicket(
          setup.sizeOfLotteryNumbers,
          setup.chosenNumbersForEachTicket,
          nullAddress,
          false
        );

      await expect(
        lottery.connect(buyerWithAllowance).batchRefundTicket([1, 2])
      ).to.be.revertedWith(errors.invalid_refund_not_open_status);
    });
    it('should revert when not owner of ticket', async () => {
      await lottery.connect(owner).createNewLottery();
      lottery
        .connect(buyerWithAllowance)
        .batchBuyTicket(1, [1], nullAddress, false);

      await expect(
        lottery.connect(buyer).batchRefundTicket([1])
      ).to.be.revertedWith(errors.invalid_ticket_owner);
    });
    it('should return token back to buyer', async () => {
      await lottery.connect(owner).createNewLottery();
      let balanceBeforeBuy = await token.balanceOf(buyerWithAllowance.address);
      await lottery
        .connect(buyerWithAllowance)
        .batchBuyTicket(1, [1], seller.address, true);
      await lottery.connect(buyerWithAllowance).batchRefundTicket([1]);

      let balanceAfterRefund = await token.balanceOf(
        buyerWithAllowance.address
      );

      assert.equal(Number(balanceBeforeBuy), Number(balanceAfterRefund));
    });
    it('should deduct affiliate count after refund', async () => {
      await lottery.connect(owner).createNewLottery();
      await lottery
        .connect(buyerWithAllowance)
        .batchBuyTicket(1, [1], seller.address, true);
      await lottery.connect(buyerWithAllowance).batchRefundTicket([1]);

      let resp = await lottery.connect(seller).getAffiliateTicketQty([1]);
      // resp[1][0] = aff count of lotteryIds[0]
      expect(Number(resp[1][0])).to.equal(0);
    });
    it('should have available ticket equal to before buy', async () => {
      await lottery.connect(owner).createNewLottery();
      await lottery
        .connect(buyerWithAllowance)
        .batchBuyTicket(2, [1, 2], seller.address, true);
      await lottery.connect(buyerWithAllowance).batchRefundTicket([1]);

      expect(await lottery.getAvailableTicketQty()).to.equal(
        setup.sizeOfLotteryNumbers - 1 // buy 2 tickets but refund only 1 ticket
      );

      expect(
        Number(
          await lottery.connect(buyerWithAllowance).getTicketsInCurrentLottery()
        )
      ).to.equal(2); // should have only ticket id 2 in current lottery after refund
    });
    it('should emit event BatchRefundTicket when success', async () => {
      await lottery.connect(owner).createNewLottery();
      await lottery
        .connect(buyerWithAllowance)
        .batchBuyTicket(1, [1], seller.address, true);

      await expect(
        lottery.connect(buyerWithAllowance).batchRefundTicket([1])
      ).to.emit(lottery, events.batchRefundTicket);
    });
  });

  describe('Request winning number', () => {
    it('should emit event RequestNumbers when success', async () => {
      await lottery.connect(owner).createNewLottery();
      await expect(
        lottery
          .connect(buyerWithAllowance)
          .batchBuyTicket(
            setup.sizeOfLotteryNumbers,
            setup.chosenNumbersForEachTicket,
            nullAddress,
            false
          )
      ).to.emit(lottery, events.requestWinningNumber);
    });
  });

  describe('Fullfil winning number', () => {
    it('should revert when caller is not RandomNumberGenerator', async () => {
      await expect(
        lottery.connect(owner).fullfilWinningNumber(1, 1)
      ).to.be.revertedWith(errors.invalid_random_generator);
    });
    it('should emit event winning number and change lottery status to completed when success', async () => {
      await lottery.connect(owner).createNewLottery();
      let allEvent = await (
        await lottery
          .connect(buyerWithAllowance)
          .batchBuyTicket(
            setup.sizeOfLotteryNumbers,
            setup.chosenNumbersForEachTicket,
            nullAddress,
            false
          )
      ).wait();

      let eventWinningNumber = allEvent.events.filter(
        (x: any) => x.event == events.requestWinningNumber
      );
      let lotteryId = eventWinningNumber[0].args[0].toNumber();
      let requestId = eventWinningNumber[0].args[1].toNumber();

      await expect(
        await mockVRF
          .connect(owner)
          .fulfillRandomWords(requestId, randomNumberGenerator.address)
      ).to.emit(lottery, events.fullfilWinningNumber);

      let lotteryInfoAfter = await lottery.getLottery(lotteryId);
      assert.equal(lotteryInfoAfter.lotteryStatus, status.completed);
    });
  });

  describe('Claim reward', () => {
    beforeEach(async () => {
      await lottery.connect(owner).createNewLottery();
      await lottery
        .connect(buyerWithAllowance)
        .batchBuyTicket(
          setup.sizeOfLotteryNumbers,
          setup.chosenNumbersForEachTicket,
          nullAddress,
          false
        );
      await mockVRF
        .connect(owner)
        .fulfillRandomWords(1, randomNumberGenerator.address);
    });
    it('should revert when send invalid lotteryId', async () => {
      await expect(
        lottery.connect(buyerWithAllowance).claimReward(0, 0)
      ).to.be.revertedWith(errors.invalid_lottery_id);
    });
    it('should revert when send invalid ticketId', async () => {
      await expect(
        lottery.connect(buyerWithAllowance).claimReward(1, 0)
      ).to.be.revertedWith(errors.invalid_ticket_id);
    });
    it('should revert when lotto status is not "completed"', async () => {
      await lottery.connect(owner).createNewLottery();
      await expect(
        lottery.connect(buyerWithAllowance).claimReward(2, 1)
      ).to.be.revertedWith(errors.invalid_claim_not_complete);
    });
    it('should revert when sender is not ticket owner', async () => {
      await expect(lottery.connect(buyer).claimReward(1, 1)).to.be.revertedWith(
        errors.invalid_ticket_owner
      );
    });
    it('should revert when winner claim twice', async () => {
      await lottery.connect(buyerWithAllowance).claimReward(1, 2);
      await expect(
        lottery.connect(buyerWithAllowance).claimReward(1, 2)
      ).to.be.revertedWith(errors.invalid_claim_twice);
    });
    it('should emit event ClaimReward when success', async () => {
      await expect(
        await lottery.connect(buyerWithAllowance).claimReward(1, 2)
      ).to.emit(lottery, events.claimReward);
      assert.equal(
        await token.balanceOf(buyerWithAllowance.address),
        expectedResponse.balanceAfterClaimReward
      );
    });
  });

  describe('Get affiliate ticket quantity', async () => {
    it('should return correct ticket quantity when success', async () => {
      await lottery.connect(owner).createNewLottery();
      await lottery
        .connect(buyerWithAllowance)
        .batchBuyTicket(
          setup.sizeOfLotteryNumbers,
          setup.chosenNumbersForEachTicket,
          seller.address,
          true
        );
      await mockVRF
        .connect(owner)
        .fulfillRandomWords(1, randomNumberGenerator.address);
      const [_, ticketCount] = await lottery
        .connect(seller)
        .getAffiliateTicketQty([1]);

      assert.equal(ticketCount, setup.sizeOfLotteryNumbers);
    });
  });

  describe('Claim affiliate', () => {
    beforeEach(async () => {
      await lottery.connect(owner).createNewLottery();
      await lottery
        .connect(buyerWithAllowance)
        .batchBuyTicket(
          setup.sizeOfLotteryNumbers,
          setup.chosenNumbersForEachTicket,
          seller.address,
          true
        );
      await mockVRF
        .connect(owner)
        .fulfillRandomWords(1, randomNumberGenerator.address);
    });
    it('should revert when lotteryStatus is not Completed', async () => {
      await lottery.connect(owner).createNewLottery();
      await expect(
        lottery.connect(buyerWithAllowance).claimAffiliate([2])
      ).to.be.revertedWith(errors.invalid_claim_aff_not_complete);
    });
    it('should not transfer when total claim is zero', async () => {
      // first claim
      await lottery.connect(seller).claimAffiliate([1]);
      let lotteryBalanceAfterFirstClaim = await token.balanceOf(
        lottery.address
      );
      // second claim
      await lottery.connect(seller).claimAffiliate([1]);
      let lotteryBalanceAfterSecondClaim = await token.balanceOf(
        lottery.address
      );
      assert.equal(
        lotteryBalanceAfterFirstClaim.value,
        lotteryBalanceAfterSecondClaim.value
      );
    });
    it('should emit event ClaimAffiliate when success', async () => {
      await expect(await lottery.connect(seller).claimAffiliate([1])).to.emit(
        lottery,
        events.claimAffiliate
      );
      let balanceAfter = await token.balanceOf(seller.address);
      assert.equal(balanceAfter, expectedResponse.sellerBalanceAfterClaim);
    });
    it('should reset ticket count to zero when success', async () => {
      await lottery.connect(seller).claimAffiliate([1]);

      const [_, ticketCount] = await lottery
        .connect(seller)
        .getAffiliateTicketQty([1]);

      assert.equal(ticketCount, 0);
    });
  });

  describe('Get unclaimed treasury amount', async () => {
    it('should revert when not owner', async () => {
      await expect(
        lottery.connect(buyer).getUnclaimedTreasuryQty([1])
      ).to.be.revertedWith(errors.invalid_admin);
    });
    it('should return correct amount when success', async () => {
      await lottery.connect(owner).createNewLottery();
      await lottery
        .connect(buyerWithAllowance)
        .batchBuyTicket(
          setup.sizeOfLotteryNumbers,
          setup.chosenNumbersForEachTicket,
          seller.address,
          true
        );
      await mockVRF
        .connect(owner)
        .fulfillRandomWords(1, randomNumberGenerator.address);
      const [_, amount] = await lottery
        .connect(owner)
        .getUnclaimedTreasuryQty([1]);
      assert.equal(amount, expectedResponse.treasuryAmount);
    });
  });

  describe('Claim Treasury', () => {
    beforeEach(async () => {
      await lottery.connect(owner).createNewLottery();
      await lottery
        .connect(buyerWithAllowance)
        .batchBuyTicket(
          setup.sizeOfLotteryNumbers,
          setup.chosenNumbersForEachTicket,
          seller.address,
          true
        );
      await mockVRF
        .connect(owner)
        .fulfillRandomWords(1, randomNumberGenerator.address);
    });
    it('should revert when not owner', async () => {
      await expect(
        lottery.connect(buyer).claimTreasury([1])
      ).to.be.revertedWith(errors.invalid_admin);
    });
    it('should revert when lotteryStatus is not Completed', async () => {
      await lottery.connect(owner).createNewLottery();
      await expect(
        lottery.connect(owner).claimTreasury([2])
      ).to.be.revertedWith(errors.invalid_claim_treasury_not_complete);
    });
    it('should not transfer when total claim is zero', async () => {
      // first claim
      await lottery.connect(owner).claimTreasury([1]);
      let lotteryBalanceAfterFirstClaim = await token.balanceOf(
        lottery.address
      );
      let ownerBalanceAfterFirstClaim = await token.balanceOf(owner.address);
      // second claim
      await lottery.connect(owner).claimTreasury([1]);
      let lotteryBalanceAfterSecondClaim = await token.balanceOf(
        lottery.address
      );
      let ownerBalanceAfterSecondClaim = await token.balanceOf(owner.address);

      // lottery and owner should have same amount for before claimed and after claimed
      assert.equal(
        lotteryBalanceAfterFirstClaim.value,
        lotteryBalanceAfterSecondClaim.value
      );
      assert.equal(
        ownerBalanceAfterFirstClaim.value,
        ownerBalanceAfterSecondClaim.value
      );
    });
    it('should emit event ClaimTreasury when success', async () => {
      await expect(await lottery.connect(owner).claimTreasury([1])).to.emit(
        lottery,
        events.claimTreasury
      );
      let balanceAfter = await token.balanceOf(owner.address);
      assert.equal(
        balanceAfter,
        setup.ownerBalance + expectedResponse.treasuryAmount
      );
    });
    it('should reset ticket count to zero when success', async () => {
      await lottery.connect(owner).claimTreasury([1]);

      const [_, amount] = await lottery
        .connect(owner)
        .getUnclaimedTreasuryQty([1]);
      assert.equal(amount, 0);
    });
  });

  describe('Cost to buy tickets', () => {
    beforeEach(async () => {
      await lottery.connect(owner).createNewLottery();
    });
    it('should return correct cost when success', async () => {
      let cost = await lottery
        .connect(buyerWithAllowance)
        .costToBuyTickets(1, 5);

      assert.equal(cost, expectedResponse.costToBuyFiveTickets);
    });
  });

  describe('Get current lottery', () => {
    beforeEach(async () => {
      await lottery.connect(owner).createNewLottery();
    });
    it('should return current lottery when success', async () => {
      let lotteryId = await lottery
        .connect(buyerWithAllowance)
        .getCurrentLottery();
      assert.equal(lotteryId, 1);
    });
  });

  describe('Get owner of ticket', () => {
    beforeEach(async () => {
      await lottery.connect(owner).createNewLottery();
      await lottery
        .connect(buyerWithAllowance)
        .batchBuyTicket(
          setup.sizeOfLotteryNumbers,
          setup.chosenNumbersForEachTicket,
          seller.address,
          true
        );
    });
    it('should return ticket info when success', async () => {
      let ownerOfTicketAddress = await lottery
        .connect(buyerWithAllowance)
        .getOwnerOfTicket(1);
      assert.equal(ownerOfTicketAddress, buyerWithAllowance.address);
    });
  });

  describe('Get ticket info', () => {
    beforeEach(async () => {
      await lottery.connect(owner).createNewLottery();
      await lottery
        .connect(buyerWithAllowance)
        .batchBuyTicket(
          setup.sizeOfLotteryNumbers,
          setup.chosenNumbersForEachTicket,
          seller.address,
          true
        );
    });
    it('should return ticket info when success', async () => {
      let ticketInfo = await lottery.connect(owner).getTicket(1);
      assert.equal(ticketInfo.number, expectedResponse.ticketInfo.number);
      assert.equal(ticketInfo.owner, expectedResponse.ticketInfo.owner);
      assert.equal(ticketInfo.claimed, expectedResponse.ticketInfo.claimed);
      assert.equal(ticketInfo.lotteryId, expectedResponse.ticketInfo.lotteryId);
    });
  });

  describe('Get user ticket', () => {
    beforeEach(async () => {
      await lottery.connect(owner).createNewLottery();
      await lottery
        .connect(buyerWithAllowance)
        .batchBuyTicket(
          setup.sizeOfLotteryNumbers,
          setup.chosenNumbersForEachTicket,
          seller.address,
          true
        );
    });
    it('should return user tickets when success', async () => {
      let tickets = await lottery
        .connect(owner)
        .getUserTickets(1, buyerWithAllowance.address);
      tickets = tickets.map((x: any, i: any) =>
        assert.equal(x.toNumber(), expectedResponse.ticketIds[i])
      );
    });
  });

  describe('Get Available ticket', () => {
    beforeEach(async () => {
      await lottery.connect(owner).createNewLottery();
      await lottery
        .connect(buyerWithAllowance)
        .batchBuyTicket(1, [1], seller.address, true);
    });
    it('should return user tickets when success', async () => {
      let availableTicket = await lottery
        .connect(owner)
        .getAvailableTicketQty();
      assert.equal(availableTicket, 4);
    });
  });

  describe('Get tickets in current lottery', () => {
    it('should return tickets when success', async () => {
      await lottery.connect(owner).createNewLottery();
      await lottery
        .connect(buyerWithAllowance)
        .batchBuyTicket(1, [1], seller.address, true);

      expect(
        Number(
          await lottery.connect(buyerWithAllowance).getTicketsInCurrentLottery()
        )
      ).to.equal(1);
    });
  });
});
