import { expect } from 'chai';
require('dotenv').config({ path: '.env' });

describe('Lottery', function () {
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

  it('RandomNumberGenerator', async function () {
    expect(2).to.be.equal(2);
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
  /  - Should emit event NewBatchMint and Affiliate when success
  /  - Should emit event LotteryClose when fully sell tickets
  /  - Should emit event RequestNumbers when fully sell tickets and call drawWinningTicket()
  */

  /* Drawing winning ticket
  /  - Should revert when current lotteryStatus is not Closed
  /  - Should transfer to treasury address equal to pool - aff - winner
  */

  /* Numbers draw 
  /  - Should revert when current lotteryStatus is not Closed
  /  - Should revert when invalid _requestId
  /  - Should update lottery status to "Completed" when success
  /  - Should emit event WinningTicket when success
  */

  /* Claim Affiliate
  /  - Should revert when lotteryStatus is not Completed
  /  - should not transfer when total claim is zero
  /  - Should emit event ClaimedAffiliate when success
  */
});
