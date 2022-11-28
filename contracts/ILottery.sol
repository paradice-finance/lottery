//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface ILottery {
    //-------------------------------------------------------------------------
    // STATE MODIFYING FUNCTIONS
    //-------------------------------------------------------------------------
    function numbersDrawn(
        uint256 _lotteryId,
        uint256 _requestId,
        uint256 _randomIndex
    ) external;
}
