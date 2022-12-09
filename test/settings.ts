const { ethers } = require('ethers');
const { BigNumber } = require('@ethersproject/bignumber');

const lotto = {
  setup: {
    sizeOfLotteryNumbers: 5,
    ticketPrice: 1,
    treasuryRatio: 4,
    affiliateRatio: 1,
    winnerRatio: 95,
    chosenNumbersForEachTicket: [1, 2, 3, 4, 5],
  },
  chainLink: {
    goerli: {
      keyHash:
        '0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15',
      fee: ethers.utils.parseUnits('1', 19),
    },
  },
  event: {
    new: 'LotteryOpen',
    config: 'ConfigLottery',
    batchBuy: 'NewBatchBuy',
    affiliate: 'Affiliate',
    close: 'LotteryClose',
    requestRandom: 'RequestRandomNumber',
    requestWinning: 'RequestWinningNumbers',
    fulfillRandom: 'FulfillRandomWords',
  },
  errors: {
    invalid_admin: 'Ownable: caller is not the owner',
    invalid_token_address: 'Token address cannot be 0',
    invalid_lottery_size: 'Lottery size cannot be 0',
    invalid_ticket_price: 'Ticket price cannot be 0',
    invalid_ratio: 'Ratio must be 100',
    invalid_buy_not_open: 'Lottery status incorrect for buy',
    invalid_buy_to_large: 'Batch buy too large',
    invalid_buy_chosen_number:
      'The quantity of the _chosenNumbersForEachTicket is not equal with _ticketQty',
    invalid_buy_approve: 'ERC20: insufficient allowance',
    create_new_lottery_when_previous_lottery_not_finished:
      'Cannot be created if the current lotto are not finished.',
    config_new_lottery_when_previous_lottery_not_finished:
      'Cannot be config if the current lotto are not finished.',
    invalid_random_caller: 'Only Lottery can call function',
  },
};

module.exports = {
  lotto,
  BigNumber,
};
