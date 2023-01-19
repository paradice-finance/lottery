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
    // Treasury Address
    address private treasuryAddress_;
    // Storing of the randomness generator
    IRandomNumberGenerator internal randomGenerator_;
    // Counter for lottery IDs
    uint256 private lotteryIdCounter_;
    // Counter for ticket ids
    uint256 private ticketIdCounter_;
    // Lottery size
    uint8 private sizeOfLottery_;
    // maximum number of chosen number
    uint32 private maximumChosenNumber_;
    // ticket price
    uint256 private ticketPrice_;
    // winner percentage
    uint8 private winnerRatio_;
    // treasury percentage
    uint8 private treasuryRatio_;
    // affiliate percentage
    uint8 private affiliateRatio_;
    // all ticket in current round
    uint256[] private currentTickets_;
    // all affiliate in current round
    uint256 private sizeOfAffiliate_;

    // Represents the status of the lottery
    enum Status {
        Open, // The lottery is open for ticket purchases
        Closed, // The lottery is no longer open for ticket purchases
        Completed // The lottery has been closed and the numbers drawn
    }

    // All the needed info for lottery
    struct LotteryInfo {
        uint256 lotteryId; // ID for lotto
        Status lotteryStatus; // Status for lotto
        address tokenAddress; // $token in current round
        uint8 sizeOfLottery; // Show how many tickets there are in one prize round
        uint32 maximumChosenNumber; //  maximum number of chosen number
        uint256 ticketPrice; // Cost per ticket in $token
        uint256 winningTicketId; // Winning ticketId of current lotto
        PrizeDistributionRatio prizeDistributionRatio; // The distribution of pool
    }

    struct PrizeDistributionRatio {
        uint8 winner;
        uint8 treasury;
        uint8 affiliate;
    }

    struct Ticket {
        uint256 number;
        address owner;
        bool claimed;
        uint256 lotteryId;
        address affiliateAddress;
    }

    // Lottery ID's to info
    mapping(uint256 => LotteryInfo) internal allLotteries_;
    // Ticket ID's to info
    mapping(uint256 => Ticket) internal allTickets_;
    // User address => Lottery ID => Ticket IDs
    mapping(address => mapping(uint256 => uint256[])) internal userTickets_;
    // User address => Affiliate address
    mapping(address => address) internal userAffiliate_;
    // Affiliate address => Lottery ID => Ticket Count
    mapping(address => mapping(uint256 => uint256)) internal allAffiliate_;
    // Lottery ID's to treasury amount
    mapping(uint256 => uint256) internal allTreasuryAmount_;

    //-------------------------------------------------------------------------
    // EVENTS
    //-------------------------------------------------------------------------

    event BatchBuyTicket(
        address minter,
        uint256 lotteryId,
        uint256[] ticketIds,
        uint32[] chosenNumbers,
        uint256 totalCost
    );

    event BatchRefundTicket(
        address owner,
        uint256 lotteryId,
        uint256[] ticketIds,
        uint256 totalRefundAmount
    );

    event RequestWinningNumbers(uint256 lotteryId, uint256 requestId);

    event FullfilWinningNumber(
        uint256 lotteryId,
        uint256 ticketId,
        uint256 ticketNumber
    );

    event ConfigLottery(
        address token,
        uint8 sizeOfLottery,
        uint32 maximumChosenNumber,
        uint256 ticketPrice,
        uint8 winnerRatio,
        uint8 treasuryRatio,
        uint8 affiliateRatio
    );

    event LotteryOpen(
        uint256 lotteryId,
        address token,
        uint256 sizeOfLottery,
        uint256 ticketPrice,
        uint8 winnerRatio,
        uint8 treasuryRatio,
        uint8 affiliateRatio
    );

    event LotteryClose(uint256 lotteryId);

    event Affiliate(
        address affiliateAddress,
        uint256 lotteryId,
        uint256 ticketCount
    );

    event ClaimReward(
        address winnerAddress,
        uint256 ticketId,
        uint256 lotteryId
    );

    event ClaimAffiliate(address affiliateAddress, uint256[] lotteryIds);

    event ClaimTreasury(address treasuryAddress, uint256[] lotteryIds);

    //-------------------------------------------------------------------------
    // MODIFIERS
    //-------------------------------------------------------------------------

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

    //-------------------------------------------------------------------------
    // CONSTRUCTOR
    //-------------------------------------------------------------------------

    constructor(
        address _token,
        uint8 _sizeOfLotteryNumbers,
        uint32 _maximumChosenNumber,
        uint256 _ticketPrice,
        address _treasuryAddress,
        uint8 _treasuryRatio,
        uint8 _affiliateRatio,
        uint8 _winnerRatio
    ) {
        require(_token != address(0), "Contracts cannot be 0 address");
        require(_sizeOfLotteryNumbers != 0, "Lottery setup cannot be 0");
        require(
            _treasuryRatio + _affiliateRatio + _winnerRatio == 100,
            "Ratio must be 100"
        );

        require(
            _treasuryRatio + _affiliateRatio <= 5,
            "owner ratio can not exceed 5"
        );

        token_ = IERC20(_token);
        treasuryAddress_ = _treasuryAddress;
        sizeOfLottery_ = _sizeOfLotteryNumbers;
        maximumChosenNumber_ = _maximumChosenNumber;
        ticketPrice_ = _ticketPrice;
        ticketIdCounter_ = 1;
        lotteryIdCounter_ = 0;
        winnerRatio_ = _winnerRatio;
        treasuryRatio_ = _treasuryRatio;
        affiliateRatio_ = _affiliateRatio;

        PrizeDistributionRatio
            memory prizeDistributionRatio = PrizeDistributionRatio(
                winnerRatio_,
                treasuryRatio_,
                affiliateRatio_
            );

        // init first lotto
        LotteryInfo memory newLottery = LotteryInfo(
            lotteryIdCounter_,
            Status.Completed,
            address(token_),
            sizeOfLottery_,
            maximumChosenNumber_,
            ticketPrice_,
            0,
            prizeDistributionRatio
        );

        allLotteries_[lotteryIdCounter_] = newLottery;
        // Emitting important information around new lottery.
        emit LotteryOpen(
            lotteryIdCounter_,
            address(token_),
            sizeOfLottery_,
            ticketPrice_,
            winnerRatio_,
            treasuryRatio_,
            affiliateRatio_
        );
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

    function getCurrentLottery() external view returns (uint256) {
        return lotteryIdCounter_;
    }

    // get lottery information
    function getLottery(
        uint256 _lotteryId
    ) external view returns (LotteryInfo memory) {
        return (allLotteries_[_lotteryId]);
    }

    /**
     * @param   _ticketId: The unique ID of the ticket
     * @return  address: Owner of ticket
     */
    function getOwnerOfTicket(
        uint256 _ticketId
    ) external view returns (address) {
        return allTickets_[_ticketId].owner;
    }

    // get tickets for a specific user
    function getUserTickets(
        uint256 _lotteryId,
        address _user
    ) external view returns (uint256[] memory) {
        return userTickets_[_user][_lotteryId];
    }

    // get ticket information
    function getTickets(
        uint256[] memory _ticketIds
    ) external view returns (Ticket[] memory) {
        Ticket[] memory tickets = new Ticket[](_ticketIds.length);
        for (uint256 i = 0; i < _ticketIds.length; i++) {
            tickets[i] = allTickets_[_ticketIds[i]];
        }
        return tickets;
    }

    // check available tickets for current round
    function getAvailableTicketQty() public view returns (uint256) {
        return sizeOfLottery_ - currentTickets_.length;
    }

    function getTicketsInCurrentLottery()
        public
        view
        returns (uint256[] memory)
    {
        return currentTickets_;
    }

    // get quantity of tickets that are available for claim affiliate
    function getAffiliateTicketQty(
        uint256[] memory _lotteryIds
    ) external view returns (uint256[] memory, uint256[] memory) {
        uint256[] memory ticketCount = new uint256[](_lotteryIds.length);
        for (uint256 i = 0; i < _lotteryIds.length; i++) {
            ticketCount[i] = allAffiliate_[msg.sender][_lotteryIds[i]];
        }
        return (_lotteryIds, ticketCount);
    }

    // get amount of token that owner can claim for specific lotteryId
    function getUnclaimedTreasuryQty(
        uint256[] memory _lotteryId
    ) external view onlyOwner returns (uint256[] memory, uint256[] memory) {
        uint256[] memory lotteryIds = new uint256[](_lotteryId.length);
        uint256[] memory amounts = new uint256[](_lotteryId.length);
        for (uint256 i = 0; i < _lotteryId.length; i++) {
            lotteryIds[i] = _lotteryId[i];
            amounts[i] = allTreasuryAmount_[_lotteryId[i]];
        }
        return (lotteryIds, amounts);
    }

    function createNewLottery() external onlyOwner returns (uint256) {
        require(
            allLotteries_[lotteryIdCounter_].lotteryStatus == Status.Completed,
            "Cannot be created if the current lotto are not finished."
        );
        // reset currentTickets_
        currentTickets_ = new uint256[](0);

        // Incrementing lottery ID
        lotteryIdCounter_ += 1;

        PrizeDistributionRatio
            memory prizeDistributionRatio = PrizeDistributionRatio(
                winnerRatio_,
                treasuryRatio_,
                affiliateRatio_
            );

        // Saving data in struct
        LotteryInfo memory lottery = LotteryInfo(
            lotteryIdCounter_,
            Status.Open,
            address(token_),
            sizeOfLottery_,
            maximumChosenNumber_,
            ticketPrice_,
            0,
            prizeDistributionRatio
        );

        allLotteries_[lotteryIdCounter_] = lottery;
        // Emitting important information around new lottery.
        emit LotteryOpen(
            lotteryIdCounter_,
            address(token_),
            sizeOfLottery_,
            ticketPrice_,
            winnerRatio_,
            treasuryRatio_,
            affiliateRatio_
        );

        return lotteryIdCounter_;
    }

    function configNewLottery(
        address _token,
        uint8 _sizeOfLottery,
        uint32 _maximumChosenNumber,
        uint256 _ticketPrice,
        uint8 _winnerRatio,
        uint8 _treasuryRatio,
        uint8 _affiliateRatio
    ) external onlyOwner {
        require(
            allLotteries_[lotteryIdCounter_].lotteryStatus == Status.Completed,
            "Cannot be config if the current lotto are not finished."
        );

        require(_sizeOfLottery != 0, "Lottery size cannot be 0");
        require(_ticketPrice != 0, "Ticket price cannot be 0");
        require(_token != address(0), "Token address cannot be 0");
        require(
            _treasuryRatio + _affiliateRatio + _winnerRatio == 100,
            "Ratio must be 100"
        );
        require(
            _treasuryRatio + _affiliateRatio <= 5,
            "Owner ratio can not exceed 5"
        );

        token_ = IERC20(_token);
        sizeOfLottery_ = _sizeOfLottery;
        ticketPrice_ = _ticketPrice;
        winnerRatio_ = _winnerRatio;
        treasuryRatio_ = _treasuryRatio;
        affiliateRatio_ = _affiliateRatio;
        maximumChosenNumber_ = _maximumChosenNumber;

        emit ConfigLottery(
            _token,
            sizeOfLottery_,
            maximumChosenNumber_,
            ticketPrice_,
            winnerRatio_,
            treasuryRatio_,
            affiliateRatio_
        );
    }

    /**
     * @param  _ticketQty: The quantity of the ticket
     * @param  _chosenNumbersForEachTicket: Number of each ticket
     * @param  _affiliateAddress: will be use when _isAffiliate == true
     */
    function batchBuyTicket(
        uint8 _ticketQty,
        uint32[] calldata _chosenNumbersForEachTicket,
        address payable _affiliateAddress
    ) external notContract {
        require(
            allLotteries_[lotteryIdCounter_].lotteryStatus == Status.Open,
            "Lottery status incorrect for buy"
        );
        require(
            _ticketQty <=
                (allLotteries_[lotteryIdCounter_].sizeOfLottery -
                    currentTickets_.length),
            "Batch buy too large"
        );
        require(
            _chosenNumbersForEachTicket.length == _ticketQty,
            "The quantity of the _chosenNumbersForEachTicket is not equal with _ticketQty"
        );

        // Batch mints the user their tickets
        uint256[] memory ticketIds = new uint256[](_ticketQty);
        for (uint256 i = 0; i < _ticketQty; i++) {
            require(
                _chosenNumbersForEachTicket[i] <= maximumChosenNumber_,
                "Chosen number out of range"
            );
            currentTickets_.push(ticketIdCounter_);
            // Storing the ticket information
            ticketIds[i] = ticketIdCounter_;
            allTickets_[ticketIdCounter_] = Ticket(
                _chosenNumbersForEachTicket[i],
                msg.sender,
                false,
                lotteryIdCounter_,
                address(0)
            );
            userTickets_[msg.sender][lotteryIdCounter_].push(ticketIdCounter_);

            // registered user affiliate
            if (userAffiliate_[msg.sender] == address(0)) {
                userAffiliate_[msg.sender] = _affiliateAddress;
            }
            // update affiliate
            if (userAffiliate_[msg.sender] != address(0)) {
                allAffiliate_[userAffiliate_[msg.sender]][
                    lotteryIdCounter_
                ] += 1;
                allTickets_[ticketIdCounter_].affiliateAddress = userAffiliate_[
                    msg.sender
                ];
                // add affiliate size
                sizeOfAffiliate_ += 1;
                emit Affiliate(
                    _affiliateAddress,
                    lotteryIdCounter_,
                    allAffiliate_[userAffiliate_[msg.sender]][lotteryIdCounter_]
                );
            }
            // Incrementing the tokenId counter
            ticketIdCounter_ += 1;
        }
        uint256 totalCost = ticketPrice_ * _ticketQty;
        // Transfers the required token to this contract
        token_.transferFrom(msg.sender, address(this), totalCost);

        // Emitting batch buy ticket with all information
        emit BatchBuyTicket(
            msg.sender,
            lotteryIdCounter_,
            ticketIds,
            _chosenNumbersForEachTicket,
            totalCost
        );

        // check for drawing win ticket
        if (
            currentTickets_.length ==
            allLotteries_[lotteryIdCounter_].sizeOfLottery
        ) {
            allLotteries_[lotteryIdCounter_].lotteryStatus = Status.Closed;
            emit LotteryClose(lotteryIdCounter_);
            requestWinningNumber();
        }
    }

    function batchRefundTicket(
        uint256[] memory ticketIds
    ) external notContract {
        require(
            allLotteries_[lotteryIdCounter_].lotteryStatus == Status.Open,
            "Lottery status incorrect for refund"
        );

        for (uint256 i = 0; i < ticketIds.length; i++) {
            require(
                allTickets_[ticketIds[i]].owner == msg.sender,
                "You are not ticket's owner."
            );

            for (uint256 j = 0; j < currentTickets_.length; j++) {
                // delete from current ticket list in round
                if (currentTickets_[j] == ticketIds[i]) {
                    currentTickets_[j] = currentTickets_[
                        currentTickets_.length - 1
                    ];
                    currentTickets_.pop();
                }

                // delete ticket from user
                if (
                    userTickets_[msg.sender][lotteryIdCounter_][j] ==
                    ticketIds[i]
                ) {
                    userTickets_[msg.sender][lotteryIdCounter_][
                        j
                    ] = userTickets_[msg.sender][lotteryIdCounter_][
                        userTickets_[msg.sender][lotteryIdCounter_].length - 1
                    ];
                    userTickets_[msg.sender][lotteryIdCounter_].pop();
                }
            }

            // deduct affiliate amount
            if (allTickets_[ticketIds[i]].affiliateAddress != address(0)) {
                allAffiliate_[allTickets_[ticketIds[i]].affiliateAddress][
                    lotteryIdCounter_
                ] -= 1;
                // reduce affiliate size
                sizeOfAffiliate_ -= 1;
            }
        }

        uint256 totalRefund = ticketPrice_ * ticketIds.length;
        token_.transfer(address(msg.sender), totalRefund);

        emit BatchRefundTicket(
            msg.sender,
            lotteryIdCounter_,
            ticketIds,
            totalRefund
        );
    }

    /**
     * @param  _randomIndex: the index of winner's ticket
     */
    function fullfilWinningNumber(
        uint256 _lotteryId,
        uint256 _randomIndex
    ) external onlyRandomGenerator {
        allLotteries_[_lotteryId].winningTicketId = currentTickets_[
            _randomIndex
        ];

        allLotteries_[_lotteryId].lotteryStatus = Status.Completed;

        // Send token to treasury address (treasuryEquity = treasury equity + unowned affiliate)
        uint256 treasuryEquity = ((sizeOfLottery_ *
            ticketPrice_ *
            treasuryRatio_) +
            ((sizeOfLottery_ - sizeOfAffiliate_) *
                ticketPrice_ *
                affiliateRatio_)) / 100;
        sizeOfAffiliate_ = 0;
        allTreasuryAmount_[_lotteryId] = treasuryEquity;

        emit FullfilWinningNumber(
            _lotteryId,
            currentTickets_[_randomIndex],
            allTickets_[currentTickets_[_randomIndex]].number
        );
    }

    // For player to claim reward
    function claimReward(uint256 _lotteryId, uint256 _ticketId) external {
        require(allLotteries_[_lotteryId].lotteryId != 0, "Invalid lotteryId.");

        require(allTickets_[_ticketId].number != 0, "Invalid ticketId.");

        // Checks lottery numbers have not already been drawn
        require(
            allLotteries_[_lotteryId].lotteryStatus == Status.Completed,
            "Can't claim reward from unfinished round"
        );

        require(
            msg.sender == allTickets_[_ticketId].owner,
            "You are not ticket's owner."
        );

        require(
            allTickets_[_ticketId].claimed == false,
            "The reward was claimed."
        );
        allTickets_[_ticketId].claimed = true;

        IERC20 token = IERC20(allLotteries_[_lotteryId].tokenAddress);
        token.transfer(
            address(msg.sender),
            (allLotteries_[_lotteryId].ticketPrice *
                allLotteries_[_lotteryId].sizeOfLottery *
                winnerRatio_) / 100
        );

        emit ClaimReward(msg.sender, _ticketId, _lotteryId);
    }

    /**
     * @param  _listOfLotterryId: all LotteryId that want to claim reward
     */
    function claimAffiliate(uint16[] calldata _listOfLotterryId) external {
        uint256[] memory claimedLotteryIds = new uint256[](
            _listOfLotterryId.length
        );
        for (uint256 i = 0; i < _listOfLotterryId.length; i++) {
            require(
                allLotteries_[_listOfLotterryId[i]].lotteryStatus ==
                    Status.Completed,
                "Can't claim affiliate from unfinished round"
            );

            // totalClaimed = ticket count * ticket price * ratio / 100
            uint256 totalClaimed = ((allAffiliate_[msg.sender][
                _listOfLotterryId[i]
            ] * allLotteries_[_listOfLotterryId[i]].ticketPrice) *
                allLotteries_[_listOfLotterryId[i]]
                    .prizeDistributionRatio
                    .affiliate) / 100;

            if (totalClaimed > 0) {
                IERC20 token = IERC20(
                    allLotteries_[_listOfLotterryId[i]].tokenAddress
                );
                token.transfer(msg.sender, totalClaimed);
                // reset ticket count of lottery id index i to 0
                allAffiliate_[msg.sender][_listOfLotterryId[i]] = 0;
                claimedLotteryIds[i] = _listOfLotterryId[i];
            }
        }
        emit ClaimAffiliate(msg.sender, claimedLotteryIds);
    }

    /**
     * @param  _listOfLotterryId: all LotteryId that want to claim token
     */
    function claimTreasury(
        uint256[] calldata _listOfLotterryId
    ) external onlyOwner {
        uint256[] memory claimedLotteryIds = new uint256[](
            _listOfLotterryId.length
        );
        for (uint256 i = 0; i < _listOfLotterryId.length; i++) {
            require(
                allLotteries_[_listOfLotterryId[i]].lotteryStatus ==
                    Status.Completed,
                "Can't claim treasury from unfinished round"
            );

            if (allTreasuryAmount_[_listOfLotterryId[i]] > 0) {
                IERC20 token = IERC20(
                    allLotteries_[_listOfLotterryId[i]].tokenAddress
                );
                uint256 treasuryAmount = allTreasuryAmount_[
                    _listOfLotterryId[i]
                ];
                token.transfer(msg.sender, treasuryAmount);
                // reset treasuryAmount of  lottery id index i to 0
                allTreasuryAmount_[_listOfLotterryId[i]] = 0;
                // reset ticket count of lottery id index i to 0
                allAffiliate_[msg.sender][_listOfLotterryId[i]] = 0;
                claimedLotteryIds[i] = _listOfLotterryId[i];
            }
        }
        emit ClaimTreasury(msg.sender, claimedLotteryIds);
    }

    function requestWinningNumber() private returns (uint256 requestId) {
        // Requests a request number from the generator
        requestId = randomGenerator_.requestRandomNumber(
            lotteryIdCounter_,
            sizeOfLottery_
        );

        emit RequestWinningNumbers(lotteryIdCounter_, requestId);
    }
}
