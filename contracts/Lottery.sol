//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./Testable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// Random number
import "./IRandomNumberGenerator.sol";
// Interface for Lottery NFT to mint tokens
import "./ILotteryNFT.sol";

contract Lottery is Ownable, Testable {
    using Address for address;

    // State variables
    // Instance of xx token (collateral currency for lotto)
    IERC20 internal token_;
    // Storing of the NFT
    ILotteryNFT internal nft_;
    // Storing of the randomness generator
    IRandomNumberGenerator internal randomGenerator_;
    // Request ID for random number
    bytes32 internal requestId_;
    // Counter for lottery IDs
    uint256 private lotteryIdCounter_;
    // Lottery size
    uint8 public sizeOfLottery_;
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
        uint256 prizePoolInToken; // The amount of $token for prize money
        uint256 costPerTicket; // Cost per ticket in $token
        uint256 winningTicket; // The winning ticket number
    }

    // Lottery ID's to info
    mapping(uint256 => LottoInfo) internal allLotteries_;

    event NewBatchMint(
        address indexed minter,
        uint256[] ticketIDs,
        uint16[] numbers,
        uint256 totalCost
    );

    event DrawWinnigTicket(uint256 lotteryId, uint256 winningTicket);

    event LotteryOpen(uint256 lotteryId, uint256 ticketSupply);

    event LotteryClose(uint256 lotteryId, uint256 ticketSupply);

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
        address _timer,
        uint8 _sizeOfLotteryNumbers
    ) Testable(_timer) {
        require(_token != address(0), "Contracts cannot be 0 address");
        require(_sizeOfLotteryNumbers != 0, "Lottery setup cannot be 0");
        token_ = IERC20(_token);
        sizeOfLottery_ = _sizeOfLotteryNumbers;
        // set max ticket to tickets array
        currentTickets_ = new uint256[](sizeOfLottery_);
    }

    function initialize(address _lotteryNFT, address _IRandomNumberGenerator)
        external
        onlyOwner
    {
        require(
            _lotteryNFT != address(0) && _IRandomNumberGenerator != address(0),
            "Contracts cannot be 0 address"
        );
        nft_ = ILotteryNFT(_lotteryNFT);
        randomGenerator_ = IRandomNumberGenerator(_IRandomNumberGenerator);
    }

    function costToBuyTickets(uint256 _lotteryId, uint256 _numberOfTickets)
        external
        view
        returns (uint256 totalCost)
    {
        uint256 pricePer = allLotteries_[_lotteryId].costPerTicket;
        totalCost = pricePer * _numberOfTickets;
    }

    function getBasicLottoInfo(uint256 _lotteryId)
        external
        view
        returns (LottoInfo memory)
    {
        return (allLotteries_[_lotteryId]);
    }

    function createNewLotto(uint256 _costPerTicket)
        external
        returns (uint256 lotteryId)
    {
        require(
            allLotteries_[lotteryIdCounter_].lotteryStatus == Status.Completed
        );

        uint8 winningNumbers = sizeOfLottery_;
        // Incrementing lottery ID
        lotteryIdCounter_ += 1;
        lotteryId = lotteryIdCounter_;
        // Saving data in struct
        LottoInfo memory newLottery = LottoInfo(
            lotteryId,
            Status.Open,
            address(token_),
            _costPerTicket * sizeOfLottery_,
            _costPerTicket,
            winningNumbers
        );

        allLotteries_[lotteryId] = newLottery;

        // Emitting important information around new lottery.
        emit LotteryOpen(lotteryId, nft_.getTotalSupply());
    }

    function drawWinningTicket() external onlyOwner {
        // Checks lottery numbers have not already been drawn
        require(
            allLotteries_[lotteryIdCounter_].lotteryStatus == Status.Closed,
            "Lottery State incorrect for draw"
        );
        // Requests a random number from the generator
        requestId_ = randomGenerator_.getRandomNumber(lotteryIdCounter_);
        // Find winner from requestId_
        uint256 index = uint256(requestId_) % sizeOfLottery_;
        allLotteries_[lotteryIdCounter_].winningTicket = currentTickets_[index];
        allLotteries_[lotteryIdCounter_].lotteryStatus = Status.Completed;
        // Emits that winning ticket number
        emit DrawWinnigTicket(lotteryIdCounter_, currentTickets_[index]);
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
            _numberOfTickets <= (sizeOfLottery_ - currentTickets_.length),
            "Batch mint too large"
        );
        // Temporary storage for the check of the chosen numbers array
        require(
            msg.value ==
                allLotteries_[lotteryIdCounter_].costPerTicket *
                    _numberOfTickets,
            "invalid amount"
        );

        // Transfers the required cake to this contract
        token_.transferFrom(msg.sender, address(this), msg.value);
        // Batch mints the user their tickets
        uint256[] memory ticketIds = nft_.batchMint(
            msg.sender,
            lotteryIdCounter_,
            _numberOfTickets,
            _chosenNumbersForEachTicket,
            sizeOfLottery_
        );
        // Emitting batch mint ticket with all information
        emit NewBatchMint(
            msg.sender,
            ticketIds,
            _chosenNumbersForEachTicket,
            msg.value
        );

        for (uint8 i = 0; i <= ticketIds.length; i++) {
            currentTickets_.push(ticketIds[i]);
        }
        if (currentTickets_.length == sizeOfLottery_) {
            allLotteries_[lotteryIdCounter_].lotteryStatus = Status.Closed;
            emit LotteryClose(lotteryIdCounter_, nft_.getTotalSupply());
        }
    }
}
