//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// Random number
import "./IRandomNumberGenerator.sol";

contract Lottery is Ownable {
    using Address for address;

    // State variables
    // Instance of xx token (collateral currency for lotto)
    IERC20 internal token_;
    // Storing of the randomness generator
    IRandomNumberGenerator internal randomGenerator_;
    // Request ID for random number
    bytes32 internal requestId_;
    // Counter for lottery IDs
    uint256 private lotteryIdCounter_;
    // Counter for ticket ids
    uint256 private ticketIdCounter_;
    // Lottery size
    uint8 public sizeOfLottery_;
    // ticket price
    uint256 private ticketPrice_;
    // all ticket in current round
    uint256[] public currentTickets_;

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
        uint256 prizePoolInToken; // The amount of $token for prize money
        uint256 ticketPrice; // Cost per ticket in $token
        TicketInfo winningTicket; // The winning ticket number
    }

    struct TicketInfo {
        uint256 ticketId;
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
        uint256[] ticketIDs,
        uint16[] numbers,
        uint256 totalCost
    );

    event DrawWinnigTicket(uint256 lotteryId, uint256 winningTicket);

    event LotteryOpen(uint256 lotteryId);

    event LotteryClose(uint256 lotteryId);

    event InfoBatchMint(
        address indexed receiving,
        uint256 lotteryId,
        uint256 amountOfTokens,
        uint256[] tokenIds
    );

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
        uint256 _ticketPrice,
        address _IRandomNumberGenerator
    ) {
        require(_token != address(0), "Contracts cannot be 0 address");
        require(_sizeOfLotteryNumbers != 0, "Lottery setup cannot be 0");
        require(
            _IRandomNumberGenerator != address(0),
            "Contracts cannot be 0 address"
        );
        token_ = IERC20(_token);
        sizeOfLottery_ = _sizeOfLotteryNumbers;
        ticketPrice_ = _ticketPrice;
        ticketIdCounter_ = 1;
        randomGenerator_ = IRandomNumberGenerator(_IRandomNumberGenerator);
    }

    function costToBuyTickets(uint256 _lotteryId, uint256 _numberOfTickets)
        external
        view
        returns (uint256 totalCost)
    {
        uint256 ticketPrice = allLotteries_[_lotteryId].ticketPrice;
        totalCost = ticketPrice * _numberOfTickets;
    }

    function getBasicLottoInfo(uint256 _lotteryId)
        external
        view
        returns (LottoInfo memory)
    {
        return (allLotteries_[_lotteryId]);
    }

    /**
     * @param   _ticketID: The unique ID of the ticket
     * @return  address: Owner of ticket
     */
    function getOwnerOfTicket(uint256 _ticketID)
        external
        view
        returns (address)
    {
        return allTickets_[_ticketID].owner;
    }

    function getUserTickets(uint256 _lotteryId, address _user)
        external
        view
        returns (uint256[] memory)
    {
        return userTickets_[_user][_lotteryId];
    }

    function createNewLotto() external returns (uint256 lotteryId) {
        require(
            allLotteries_[lotteryIdCounter_].lotteryStatus == Status.Completed
        );

        // Incrementing lottery ID
        lotteryIdCounter_ += 1;

        // prepare data
        uint256 prizePoolInToken = ticketPrice_ * sizeOfLottery_;

        TicketInfo memory emptyWinningTicket = TicketInfo(
            ticketIdCounter_,
            address(this),
            false,
            lotteryIdCounter_
        );

        // Saving data in struct
        LottoInfo memory newLottery = LottoInfo(
            lotteryIdCounter_,
            Status.Open,
            address(token_),
            sizeOfLottery_,
            prizePoolInToken,
            ticketPrice_,
            emptyWinningTicket
        );

        allLotteries_[lotteryId] = newLottery;
        // Emitting important information around new lottery.
        emit LotteryOpen(lotteryId);
    }

    function batchBuyLottoTicket(
        uint8 _numberOfTickets,
        uint16[] calldata _chosenNumbersForEachTicket
    ) external payable notContract {
        require(
            allLotteries_[lotteryIdCounter_].lotteryStatus == Status.Open,
            "Lottery not in state for mint"
        );
        require(
            _numberOfTickets <=
                (allLotteries_[lotteryIdCounter_].sizeOfLottery -
                    currentTickets_.length),
            "Batch mint too large"
        );
        // Temporary storage for the check of the chosen numbers array
        require(
            msg.value ==
                allLotteries_[lotteryIdCounter_].ticketPrice * _numberOfTickets,
            "invalid amount"
        );

        // Transfers the required cake to this contract
        token_.transferFrom(msg.sender, address(this), msg.value);
        // Batch mints the user their tickets
        uint256[] memory ticketIds = batchMint(msg.sender, _numberOfTickets);
        // Emitting batch mint ticket with all information
        emit NewBatchMint(
            msg.sender,
            ticketIds,
            _chosenNumbersForEachTicket,
            msg.value
        );

        // check for drawing win ticket
        if (currentTickets_.length == sizeOfLottery_) {
            allLotteries_[lotteryIdCounter_].lotteryStatus = Status.Closed;
            emit LotteryClose(lotteryIdCounter_);
            drawWinningTicket();
        }
    }

    function drawWinningTicket() private {
        // Checks lottery numbers have not already been drawn
        require(
            allLotteries_[lotteryIdCounter_].lotteryStatus == Status.Closed,
            "Lottery State incorrect for draw"
        );
        // Requests a random number from the generator
        requestId_ = randomGenerator_.getRandomNumber(lotteryIdCounter_);
        // Find winner from requestId_
        uint256 index = uint256(requestId_) % sizeOfLottery_;
        allLotteries_[lotteryIdCounter_].winningTicket = allTickets_[
            currentTickets_[index]
        ];
        allLotteries_[lotteryIdCounter_].lotteryStatus = Status.Completed;
        // Emits that winning ticket number
        emit DrawWinnigTicket(lotteryIdCounter_, currentTickets_[index]);
    }

    /**
     * @param   _to The address being minted to
     * @param   _numberOfTickets The number of NFT's to mint
     */
    function batchMint(address _to, uint8 _numberOfTickets)
        private
        returns (uint256[] memory)
    {
        // Storage for the ticket IDs
        uint256[] memory ticketIds = new uint256[](_numberOfTickets);
        for (uint8 i = 0; i < _numberOfTickets; i++) {
            currentTickets_.push(ticketIdCounter_);
            // Storing the ticket information
            ticketIds[i] = ticketIdCounter_;
            allTickets_[ticketIdCounter_] = TicketInfo(
                ticketIdCounter_,
                _to,
                false,
                lotteryIdCounter_
            );
            userTickets_[_to][lotteryIdCounter_].push(ticketIdCounter_);
            // Incrementing the tokenId counter
            ticketIdCounter_ += 1;
        }
        // Emitting relevant info
        emit InfoBatchMint(_to, ticketIdCounter_, _numberOfTickets, ticketIds);
        // Returns the token IDs of minted tokens
        return ticketIds;
    }
}
