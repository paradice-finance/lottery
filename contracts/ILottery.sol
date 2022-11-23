//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface ILottery {
    //-------------------------------------------------------------------------
    // STATE MODIFYING FUNCTIONS
    //-------------------------------------------------------------------------

    function drawWinningTicket(uint256 _lotteryId) external;
}
