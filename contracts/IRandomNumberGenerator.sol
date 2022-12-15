//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface IRandomNumberGenerator {
    /**
     * Requests randomness from a user-provided seed
     */
    struct RandomInfo {
        uint256 lotteryId; // ID for lotto
        uint256 randomValue; // Status for lotto
        uint256 roundSize; // Number of players
    }

    function requestRandomNumber(
        uint256 lotteryId,
        uint256 _round_size
    ) external returns (uint256 requestId);

    function getRandomInfo(
        uint256 requestId
    ) external view returns (RandomInfo memory);
}
