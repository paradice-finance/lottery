//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface ILottery {
    //-------------------------------------------------------------------------
    // VIEW FUNCTIONS
    //-------------------------------------------------------------------------

    function getMaxRange() external view returns (uint32);

    //-------------------------------------------------------------------------
    // STATE MODIFYING FUNCTIONS
    //-------------------------------------------------------------------------

    function drawWinningTicket(uint256 _lotteryId) external;
}
