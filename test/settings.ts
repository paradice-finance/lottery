const { ethers } = require('ethers');
const { BigNumber } = require('@ethersproject/bignumber');

const lotto = {
  setup: {
    sizeOfLotteryNumbers: 5,
    ticketPrice: 1,
    treasuryRatio: 4,
    affiliateRatio: 1,
    winnerRatio: 95,
    chosenNumbersForEachTicket: [1, 2, 3, 4, 5]
  },
  chainLink: {
    keyHash:
      '0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4',
    fee: ethers.utils.parseUnits('1', 19)
  },
  event: {
    new: 'LotteryOpen',
    config: 'ConfigLottery',
    batchBuy: 'NewBatchBuy',
    affiliate: 'Affiliate',
    close: 'LotteryClose',
    requestWinningNumber: 'RequestWinningNumbers',
    fullfilWinningNumber: 'FullfilWinningNumber'
  },
  status: {
    open: 0,
    closed: 1,
    completed: 2
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
    invalid_random_generator: 'Only random generator',
    create_new_lottery_when_previous_lottery_not_finished:
      'Cannot be created if the current lotto are not finished.',
    config_new_lottery_when_previous_lottery_not_finished:
      'Cannot be config if the current lotto are not finished.'
  }
};

module.exports = {
  lotto,
  BigNumber
};
