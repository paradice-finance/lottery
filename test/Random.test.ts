import { ethers } from "hardhat";
import * as chai from "chai";
import BN from "bn.js";
chai.use(require("chai-bn")(BN));

require("dotenv").config({ path: ".env" });
const { lotto } = require("./settings.ts");

describe("RandomGenerator", function () {
  let owner: any, buyer: any, buyerWithAllowance: any, C: any, treasury: any;
  let nullAddress = "0x0000000000000000000000000000000000000000";
  let allowance = 10000000000000000000000n;
  let Token;
  let token: any;
  let Lottery;
  let lottery;
  let MockVRF;
  let mockVRF;
  let RandomNumberGenerator;
  let randomNumberGenerator;
  let round_size;
  let ticket_price;

  beforeEach(async () => {
    [owner, buyer, buyerWithAllowance, C, treasury] = await ethers.getSigners();

    Token = await ethers.getContractFactory("Mock_erc20");
    token = await (await Token.deploy(100000)).deployed();

    Lottery = await ethers.getContractFactory("Lottery");
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

    await token.connect(owner).transfer(buyerWithAllowance.address, allowance);

    await token.connect(buyerWithAllowance).approve(lottery.address, allowance);

    MockVRF = await ethers.getContractFactory("Mock_VRFCoordinator");
    mockVRF = await MockVRF.deploy();
    await mockVRF.deployed();

    let res = await mockVRF.connect(owner).createSubscription();
    let { events } = await res.wait();
    const subId = parseInt(events[0].topics[1]); // Subscription ID

    await mockVRF
      .connect(owner)
      .fundSubscription(subId, ethers.utils.parseUnits("3", 18)); // add Link to Subscription ID

    RandomNumberGenerator = await ethers.getContractFactory(
      "RandomNumberGenerator"
    );
    randomNumberGenerator = await RandomNumberGenerator.deploy(
      subId,
      lottery.address,
      mockVRF.address
    );

    await randomNumberGenerator.deployed();

    let addconsumer = await mockVRF
      .connect(owner)
      .addConsumer(subId, randomNumberGenerator.address);
    addconsumer = await addconsumer.wait();

    console.log(
      "consumer added : id ",
      subId,
      "random address",
      randomNumberGenerator.address
    ); // consumer added.

    await lottery.initialize(randomNumberGenerator.address);

    await lottery.connect(owner).createNewLotto();

    let buy = await lottery
      .connect(buyerWithAllowance)
      .batchBuyLottoTicket(5, [1, 2, 3, 4, 5], nullAddress, false);
    let result = await buy.wait();

    let reqId = result.events
      .filter((x) => x.event == "RequestNumbers")[0]
      .args[1].toNumber();

    console.log(
      "requestId : ",
      result.events
        .filter((x) => x.event == "RequestNumbers")[0]
        .args[1].toNumber()
    );

    //fulfill
    let final = await mockVRF
      .connect(owner)
      .fulfillRandomWords(reqId, randomNumberGenerator.address);
    let final2 = await final.wait();
    // console.log(final2.events);

    console.log(
      "random result",
      (await randomNumberGenerator.getRandomResult(reqId)).toNumber()
    );

    // console.log(res3.events);
    // MockVRF = await ethers.getContractFactory("Mock_VRFCoordinator");
    // mockVRF = await MockVRF.deploy();
  });

  describe("RequestRandomNumber", function () {
    it("Should revert when send invalid lotteryId.", async function () {
      // await lottery.connect(owner).createNewLotto();
      // await chai
      //   .expect(
      //     lottery
      //       .connect(buyerWithAllowance)
      //       .batchBuyLottoTicket(5, [1, 2, 3, 4, 5], nullAddress, false)
      //   )
      //   .to.emit(lottery, lotto.event.batchBuy)
      //   .to.emit(lottery, lotto.event.affiliate);
    });
    // it("Should revert when send invalid roundSize input.", async function () {});
    // it("Should revert when not called by Lottery address.", async function () {});
    // it("Should emit event requestRandomNumber when success.", async function () {});
  });

  // describe("FulfillRandomWords", function () {
  //   it("Should revert when not called by LINK SmartContract.", async function () {});
  //   it("Should revert when random value greater than or equal round size.", async function () {});
  //   it("Should emit event fulfillRandomWords when success.", async function () {});
  // });
});
