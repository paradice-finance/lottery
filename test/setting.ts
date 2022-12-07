const { ethers } = require("ethers");
const { BigNumber } = require("@ethersproject/bignumber");

const lotto = {
  chainLink: {
    keyHash:
      "0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4",
    fee: ethers.utils.parseUnits("1", 19),
  },
};

module.exports = {
  lotto,
  BigNumber,
};
