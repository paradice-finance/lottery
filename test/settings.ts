const { ethers } = require('ethers');
const { BigNumber } = require('@ethersproject/bignumber');

const lotto = {
  setup: {
    balance: 10000000000000000000000n,
    balanceAfterBuy: 9995000000000000000000n,
    balanceAfterClaimReward: 9999750000000000000000n,
    sellerBalanceAfterClaim: 50000000000000000n,
    sizeOfLotteryNumbers: 5,
    ticketPrice: 1,
    treasuryRatio: 4,
    affiliateRatio: 1,
    winnerRatio: 95,
    chosenNumbersForEachTicket: [1, 2, 3, 4, 5]
  },
  chainLink: {
    goerli: {
      keyHash:
        '0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15',
      fee: ethers.utils.parseUnits('1', 19)
    }
  },
  events: {
    new: 'LotteryOpen',
    config: 'ConfigLottery',
    batchBuy: 'NewBatchBuy',
    affiliate: 'Affiliate',
    close: 'LotteryClose',
    requestRandom: 'RequestRandomNumber',
    fulfillRandom: 'FulfillRandomWords',
    requestWinningNumber: 'RequestWinningNumbers',
    fullfilWinningNumber: 'FullfilWinningNumber',
    claimWinReward: 'ClaimWinReward',
    claimedAffiliate: 'ClaimedAffiliate'
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
    invalid_lottery_id: 'Invalid lotteryId.',
    invalid_ticket_id: 'Invalid ticketId.',
    invalid_claim_not_complete: "Can't claim reward from unfinished round",
    invalid_ticket_owner: "You are not ticket's owner.",
    invalid_claim_twice: 'The reward was claimed.',
    invalid_claim_aff_not_complete:
      "Can't claim affiliate from unfinished round",
    create_new_lottery_when_previous_lottery_not_finished:
      'Cannot be created if the current lotto are not finished.',
    config_new_lottery_when_previous_lottery_not_finished:
      'Cannot be config if the current lotto are not finished.',
    invalid_random_caller: 'Only Lottery can call function'
  }
};

module.exports = {
  lotto,
  BigNumber
};
