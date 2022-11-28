//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface IRandomNumberGenerator {
    /**
     * Requests randomness from a user-provided seed
     */
    function requestRandomNumber(
        uint256 lotteryId,
        uint256 _round_size
    ) external returns (uint256 requestId);

    function getRandomResult(uint256 requestId) external view returns (uint256);
}
