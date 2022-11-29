//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// Random number
import "./IRandomNumberGenerator.sol";

contract Lottery is Ownable, Initializable {
    using Address for address;

    // State variables
    // Instance of xx token (collateral currency for lotto)
    IERC20 internal token_;
    // Storing of the randomness generator
    IRandomNumberGenerator internal randomGenerator_;
    // Request ID for random number
    uint256 internal requestId_;
    // Counter for lottery IDs
    uint256 private lotteryIdCounter_;
    // Counter for ticket ids
    uint256 private ticketIdCounter_;
    // Lottery size
    uint8 private sizeOfLottery_;
    // ticket price
    uint256 private ticketPrice_;
    // all ticket in current round
    uint256[] private currentTickets_;

    // Represents the status of the lottery
    enum Status {
        NotStarted, // The lottery has not started yet
        Open, // The lottery is open for ticket purchases
        Closed, // The lottery is no longer open for ticket purchases
        Completed // The lottery has been closed and the numbers drawn
    }

    // All the needed info around a lottery
    struct LottoInfo {
        uint256 lotteryID; // ID for lotto
        Status lotteryStatus; // Status for lotto
        address tokenAddress; // $token in current round
        uint8 sizeOfLottery; // Show how many tickets there are in one prize round
        uint256 ticketPrice; // Cost per ticket in $token
        uint256 winningNumber; // Winning Number of current lotto
    }

    struct TicketInfo {
        uint256 number;
        address owner;
        bool claimed;
        uint256 lotteryId;
    }

    // Lottery ID's to info
    mapping(uint256 => LottoInfo) internal allLotteries_;
    // Ticket ID's to info
    mapping(uint256 => TicketInfo) internal allTickets_;
    // User address => Lottery ID => Ticket IDs
    mapping(address => mapping(uint256 => uint256[])) internal userTickets_;

    event NewBatchMint(
        address indexed minter,
        uint256 lotteryId,
        uint256[] ticketIDs,
        uint256 totalCost
    );

    event RequestNumbers(uint256 lotteryId, uint256 requestId);

    event WinnigTicket(uint256 lotteryId, uint256 winningTicket);

    event LotteryOpen(uint256 lotteryId);

    event LotteryClose(uint256 lotteryId);

    modifier notContract() {
        require(!address(msg.sender).isContract(), "contract not allowed");
        require(msg.sender == tx.origin, "proxy contract not allowed");
        _;
    }

    modifier onlyRandomGenerator() {
        require(
            msg.sender == address(randomGenerator_),
            "Only random generator"
        );
        _;
    }

    constructor(
        address _token,
        uint8 _sizeOfLotteryNumbers,
        uint256 _ticketPrice
    ) {
        require(_token != address(0), "Contracts cannot be 0 address");
        require(_sizeOfLotteryNumbers != 0, "Lottery setup cannot be 0");

        token_ = IERC20(_token);
        sizeOfLottery_ = _sizeOfLotteryNumbers;
        ticketPrice_ = _ticketPrice * 10 ** 18;
        ticketIdCounter_ = 1;
        lotteryIdCounter_ = 1;

        // init first lotto
        LottoInfo memory newLottery = LottoInfo(
            lotteryIdCounter_,
            Status.Open,
            address(token_),
            sizeOfLottery_,
            ticketPrice_,
            0
        );

        allLotteries_[lotteryIdCounter_] = newLottery;
        // Emitting important information around new lottery.
        emit LotteryOpen(lotteryIdCounter_);
    }

    function initialize(
        address _IRandomNumberGenerator
    ) external initializer onlyOwner {
        require(
            _IRandomNumberGenerator != address(0),
            "Contracts cannot be 0 address"
        );
        randomGenerator_ = IRandomNumberGenerator(_IRandomNumberGenerator);
    }

    function costToBuyTickets(
        uint256 _lotteryId,
        uint256 _numberOfTickets
    ) external view returns (uint256 totalCost) {
        uint256 ticketPrice = allLotteries_[_lotteryId].ticketPrice;
        totalCost = ticketPrice * _numberOfTickets;
    }

    function getBasicLottoInfo(
        uint256 _lotteryId
    ) external view returns (LottoInfo memory) {
        return (allLotteries_[_lotteryId]);
    }

    /**
     * @param   _ticketID: The unique ID of the ticket
     * @return  address: Owner of ticket
     */
    function getOwnerOfTicket(
        uint256 _ticketID
    ) external view returns (address) {
        return allTickets_[_ticketID].owner;
    }

    function getUserTickets(
        uint256 _lotteryId,
        address _user
    ) external view returns (uint256[] memory) {
        return userTickets_[_user][_lotteryId];
    }

    function createNewLotto() external returns (uint256 lotteryId) {
        require(
            allLotteries_[lotteryIdCounter_].lotteryStatus == Status.Completed
        );
        // reset currentTickets_
        currentTickets_ = new uint256[](0);

        // Incrementing lottery ID
        lotteryIdCounter_ += 1;

        // Saving data in struct
        LottoInfo memory newLottery = LottoInfo(
            lotteryIdCounter_,
            Status.Open,
            address(token_),
            sizeOfLottery_,
            ticketPrice_,
            0
        );

        allLotteries_[lotteryId] = newLottery;
        // Emitting important information around new lottery.
        emit LotteryOpen(lotteryId);
    }

    function batchBuyLottoTicket(
        uint8 _ticketAmount,
        uint16[] calldata _chosenNumbersForEachTicket
    ) external payable notContract {
        require(
            allLotteries_[lotteryIdCounter_].lotteryStatus == Status.Open,
            "Lottery not in state for mint"
        );
        require(
            _ticketAmount <=
                (allLotteries_[lotteryIdCounter_].sizeOfLottery -
                    currentTickets_.length),
            "Batch mint too large"
        );

        uint256 ticketPrice = allLotteries_[lotteryIdCounter_].ticketPrice;
        uint256 totalCost = ticketPrice * _ticketAmount;
        // Transfers the required token to this contract
        token_.transferFrom(msg.sender, address(this), totalCost);
        // Batch mints the user their tickets
        uint256[] memory ticketIds = new uint256[](_ticketAmount);
        for (uint8 i = 0; i < _ticketAmount; i++) {
            currentTickets_.push(ticketIdCounter_);
            // Storing the ticket information
            ticketIds[i] = ticketIdCounter_;
            allTickets_[ticketIdCounter_] = TicketInfo(
                _chosenNumbersForEachTicket[i],
                msg.sender,
                false,
                lotteryIdCounter_
            );
            userTickets_[msg.sender][lotteryIdCounter_].push(ticketIdCounter_);
            // Incrementing the tokenId counter
            ticketIdCounter_ += 1;
        }

        // Emitting batch mint ticket with all information
        emit NewBatchMint(msg.sender, lotteryIdCounter_, ticketIds, msg.value);

        // check for drawing win ticket
        if (
            currentTickets_.length ==
            allLotteries_[lotteryIdCounter_].sizeOfLottery
        ) {
            allLotteries_[lotteryIdCounter_].lotteryStatus = Status.Closed;
            emit LotteryClose(lotteryIdCounter_);
            drawWinningTicket();
        }
    }

    function numbersDrawn(
        uint256 _lotteryId,
        uint256 _requestId,
        uint256 _randomIndex
    ) external onlyRandomGenerator {
        require(
            allLotteries_[_lotteryId].lotteryStatus == Status.Closed,
            "Draw numbers first"
        );
        require(requestId_ == _requestId, "invalid request id");

        allLotteries_[lotteryIdCounter_].winningNumber = allTickets_[
            currentTickets_[_randomIndex]
        ].number;

        allLotteries_[lotteryIdCounter_].lotteryStatus = Status.Completed;

        emit WinnigTicket(lotteryIdCounter_, currentTickets_[_randomIndex]);
    }

    receive() external payable {}

    function drawWinningTicket() private {
        // Checks lottery numbers have not already been drawn
        require(
            allLotteries_[lotteryIdCounter_].lotteryStatus == Status.Closed,
            "Lottery State incorrect for draw"
        );
        // Requests a request number from the generator
        requestId_ = randomGenerator_.requestRandomNumber(
            lotteryIdCounter_,
            allLotteries_[lotteryIdCounter_].sizeOfLottery
        );

        emit RequestNumbers(lotteryIdCounter_, requestId_);
    }
}
