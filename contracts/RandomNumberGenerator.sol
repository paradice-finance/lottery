//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./ILottery.sol";

contract RandomNumberGenerator  {
    bytes32 internal keyHash;
    uint256 internal fee;
    address internal requester;
    uint256 public randomResult;
    uint256 public currentLotteryId;

    address public lottery;

    modifier onlyLottery() {
        require(msg.sender == lottery, "Only Lottery can call function");
        _;
    }

    constructor(
        address _lottery
    )  {
        lottery = _lottery;
    }

    /**
     * Requests randomness from a user-provided seed
     */
    function getRandomNumber(uint256 lotteryId)
        public
        // onlyLottery
        returns (bytes32 requestId)
    {
        currentLotteryId = lotteryId;
        return keccak256(abi.encodePacked(msg.sender, block.timestamp));
    }
}