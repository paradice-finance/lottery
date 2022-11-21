// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
// Allows for time manipulation. Set to 0x address on test/mainnet deploy
import "./Testable.sol";

contract Lottery is Ownable, Testable {
    using Address for address;

    address payable[] public players;
    uint256 public lotteryId;

    mapping(uint256 => uint256) public priceHistory;

    enum Status {
        NotStarted, // The lottery has not started yet
        Open, // The lottery is open for ticket purchases
        Closed, // The lottery is no longer open for ticket purchases
        Completed // The lottery has been closed and the numbers drawn
    }

    struct LottoInfo {
        uint256 lotteryID; // ID for lotto
        Status lotteryStatus; // Status for lotto
        uint256 prizePoolInETH; // The amount of cake for prize money
        uint256 costPerTicket; // Cost per ticket in $cake
        uint8[] prizeDistribution; // The distribution for prize money
        uint256 startingTimestamp; // Block timestamp for star of lotto
        uint256 closingTimestamp; // Block timestamp for end of entries
        uint16[] winningAddress; // The winning address
    }
    // Lottery ID's to info
    mapping(uint256 => LottoInfo) internal allLotteries_;

    modifier notContract() {
        require(!address(msg.sender).isContract(), "contract not allowed");
        require(msg.sender == tx.origin, "proxy contract not allowed");
        _;
    }

    constructor(address _timer) Testable(_timer) {
        lotteryId = 1;
    }

    function costToBuyTickets()
        external
        view
        returns (uint256 _currentTicketPrice)
    {
        _currentTicketPrice = priceHistory[lotteryId];
    }

    function getBasicLottoInfo(uint256 _lotteryId)
        external
        view
        returns (LottoInfo memory)
    {
        return (allLotteries_[_lotteryId]);
    }

    function getPoolReward() public view returns (uint256) {
        // return balance of the pool
        return address(this).balance;
    }

    function getPlayers() public view returns (address payable[] memory) {
        return players;
    }

    function buyTicket(uint256 ticket) public payable {
        require(msg.value == 660);
        // address of player entering lottery
        players.push(payable(msg.sender));
    }

    function getRandomNumber() public view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(owner(), block.timestamp)));
    }

    function drawWinningNumbers() external onlyOwner {
        // Checks that the lottery is past the closing block
        require(
            allLotteries_[lotteryId].closingTimestamp <= getCurrentTime(),
            "Cannot set winning numbers during lottery"
        );
        // Checks lottery numbers have not already been drawn
        require(
            allLotteries_[lotteryId].lotteryStatus == Status.Open,
            "Lottery State incorrect for draw"
        );
        // Sets lottery status to closed
        allLotteries_[lotteryId].lotteryStatus = Status.Closed;

        uint256 index = getRandomNumber() % players.length;

        // TODO: update amount to transfer to be percent of
        players[index].transfer(address(this).balance);
        lotteryId++;

        players = new address payable[](0);
    }
}
