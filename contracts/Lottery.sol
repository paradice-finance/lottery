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

    uint8 private prizeRatio_;

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
        TicketInfo winningTicket; // Winning Number of current lotto
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

    // Affiliate address => Lottery ID => Ticket Count
    mapping(address => mapping(uint256 => uint256)) internal allAffiliate_;

    event NewBatchMint(
        address indexed minter,
        uint256 lotteryId,
        uint256[] ticketIDs,
        uint256 totalCost
    );

    event RequestNumbers(uint256 lotteryId, uint256 requestId);

    event WinningTicket(
        uint256 lotteryId,
        uint256 ticketId,
        uint256 ticketNumber
    );

    event LotteryOpen(uint256 lotteryId);

    event LotteryClose(uint256 lotteryId);

    event Affiliate(
        address affiliateAddress,
        uint256 lotteryId,
        uint256 ticketCount
    );

    event ClaimedAffiliate(address affiliateAddress, uint256[] lotteryIds);

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
        ticketPrice_ = _ticketPrice * 10**18;
        ticketIdCounter_ = 1;
        lotteryIdCounter_ = 1;

        TicketInfo memory newTicket = TicketInfo(
            0,
            address(0),
            false,
            lotteryIdCounter_
        );

        // init first lotto
        LottoInfo memory newLottery = LottoInfo(
            lotteryIdCounter_,
            Status.Open,
            address(token_),
            sizeOfLottery_,
            ticketPrice_,
            newTicket
        );

        allLotteries_[lotteryIdCounter_] = newLottery;
        // Emitting important information around new lottery.
        emit LotteryOpen(lotteryIdCounter_);
    }

    function initialize(address _IRandomNumberGenerator)
        external
        initializer
        onlyOwner
    {
        require(
            _IRandomNumberGenerator != address(0),
            "Contracts cannot be 0 address"
        );
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

    function setPrizeRatio(uint8 _prizeRatio) public onlyOwner {
        prizeRatio_ = _prizeRatio;
    }

    function setLotterySize(uint8 _sizeOfLottery) public onlyOwner {
        sizeOfLottery_ = _sizeOfLottery;
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

    function getAvaliableTicketQty() public view returns (uint256) {
        return sizeOfLottery_ - currentTickets_.length;
    }

    function createNewLotto() external returns (uint256 lotteryId) {
        require(
            allLotteries_[lotteryIdCounter_].lotteryStatus == Status.Completed
        );
        // reset currentTickets_
        currentTickets_ = new uint256[](0);

        // Incrementing lottery ID
        lotteryIdCounter_ += 1;

        //Create empty ticket
        TicketInfo memory newTicket = TicketInfo(
            0,
            address(0),
            false,
            lotteryIdCounter_
        );

        // Saving data in struct
        LottoInfo memory newLottery = LottoInfo(
            lotteryIdCounter_,
            Status.Open,
            address(token_),
            sizeOfLottery_,
            ticketPrice_,
            newTicket
        );

        allLotteries_[lotteryId] = newLottery;
        // Emitting important information around new lottery.
        emit LotteryOpen(lotteryId);
    }

    /**
     * @param  _ticketQty: The quantity of the ticket
     * @param  _chosenNumbersForEachTicket: Number of each ticket
     */
    function batchBuyLottoTicket(
        uint8 _ticketQty,
        uint16[] calldata _chosenNumbersForEachTicket,
        address payable _affiliateAddress
    ) external payable notContract {
        require(
            allLotteries_[lotteryIdCounter_].lotteryStatus == Status.Open,
            "Lottery not in state for mint"
        );
        require(
            _ticketQty <=
                (allLotteries_[lotteryIdCounter_].sizeOfLottery -
                    currentTickets_.length),
            "Batch mint too large"
        );

        uint256 ticketPrice = allLotteries_[lotteryIdCounter_].ticketPrice;
        uint256 totalCost = ticketPrice * _ticketQty;
        // Transfers the required token to this contract
        token_.transferFrom(msg.sender, address(this), totalCost);
        // Batch mints the user their tickets
        uint256[] memory ticketIds = new uint256[](_ticketQty);
        for (uint8 i = 0; i < _ticketQty; i++) {
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
            // set affiliate address
            if (_affiliateAddress != address(0)) {
                allAffiliate_[_affiliateAddress][lotteryIdCounter_] += 1;
            }
        }

        // Emitting batch mint ticket with all information
        emit NewBatchMint(msg.sender, lotteryIdCounter_, ticketIds, msg.value);
        emit Affiliate(
            _affiliateAddress,
            lotteryIdCounter_,
            allAffiliate_[_affiliateAddress][lotteryIdCounter_]
        );

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

        allLotteries_[lotteryIdCounter_].winningTicket = allTickets_[
            currentTickets_[_randomIndex]
        ];

        allLotteries_[lotteryIdCounter_].lotteryStatus = Status.Completed;

        emit WinningTicket(
            lotteryIdCounter_,
            currentTickets_[_randomIndex],
            allLotteries_[lotteryIdCounter_].winningTicket.number
        );
    }

    /**
     * @param  _listOfLotterryId: all LotteryId that want to claim reward
     */
    function claimAffiliate(uint16[] calldata _listOfLotterryId)
        external
        payable
    {
        uint256[] memory claimedLotteryIds = new uint256[](
            _listOfLotterryId.length
        );
        for (uint256 i = 0; i < _listOfLotterryId.length; i++) {
            require(
                allLotteries_[_listOfLotterryId[i]].lotteryStatus ==
                    Status.Closed,
                "Can't claim reward from unfinish round"
            );

            // totalClaimed = ticket count * ticket price / 100
            uint256 totalClaimed = (allAffiliate_[msg.sender][
                _listOfLotterryId[i]
            ] * allLotteries_[_listOfLotterryId[i]].ticketPrice) / 100;

            token_ = IERC20(allLotteries_[_listOfLotterryId[i]].tokenAddress);
            token_.transferFrom(address(this), msg.sender, totalClaimed);

            allAffiliate_[msg.sender][_listOfLotterryId[i]] = 0;
            claimedLotteryIds[i] = _listOfLotterryId[i];
        }
        emit ClaimedAffiliate(msg.sender, claimedLotteryIds);
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

    function claimWinReward(uint256 _lotteryId, uint256 _ticketId) external {
        // Checks lottery numbers have not already been drawn

        require(
            allLotteries_[_lotteryId].lotteryStatus == Status.Completed,
            "Winning Numbers not chosen yet"
        );

        require(
            msg.sender != allTickets_[_ticketId].owner,
            "You are not ticket's owner."
        );

        require(
            allTickets_[_ticketId].claimed == false,
            "The reward was claimed."
        );

        for (
            uint8 i = 0;
            i < userTickets_[msg.sender][_lotteryId].length;
            i++
        ) {
            if (
                userTickets_[msg.sender][_lotteryId][i] ==
                allLotteries_[_lotteryId].winningTicket.number
            ) {
                token_.transferFrom(
                    address(this),
                    msg.sender,
                    (allLotteries_[_lotteryId].ticketPrice *
                        allLotteries_[_lotteryId].sizeOfLottery *
                        prizeRatio_) / 100
                );

                allTickets_[_ticketId].claimed = true;
            }
        }
    }
}
