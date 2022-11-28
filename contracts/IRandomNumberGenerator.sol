//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface IRandomNumberGenerator {
    /**
     * Requests randomness from a user-provided seed
     */
    function requestRandomNumber() external returns (uint256 requestId);

    function getRandomResult(uint256 requestId) external view returns (uint256);
}
