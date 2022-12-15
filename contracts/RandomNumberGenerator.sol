//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "./ILottery.sol";

contract RandomNumberGenerator is VRFConsumerBaseV2 {
    uint32 private constant ROLL_IN_PROGRESS = 999999999;

    VRFCoordinatorV2Interface public COORDINATOR;

    // Your subscription ID.
    uint64 s_subscriptionId;

    // Goerli coordinator. For other networks,
    // see https://docs.chain.link/docs/vrf-contracts/#configurations

    // The gas lane to use, which specifies the maximum gas price to bump to.
    // For a list of available gas lanes on each network,
    // see https://docs.chain.link/docs/vrf-contracts/#configurations
    bytes32 s_keyHash;
    uint32 callbackGasLimit = 250000;
    uint16 requestConfirmations = 3;
    uint32 numWords = 1;
    address s_owner;

    event RequestRandomNumber(uint256 lotteryId, uint256 requestId);
    event FulfillRandomWords(uint256 indexed requestId, uint256 indexed result);

    struct RandomInfo {
        uint256 lotteryId; // ID for lotto
        uint256 randomValue; // Status for lotto
        uint256 roundSize; // Number of players
    }

    // requestId to RandomInfo
    mapping(uint256 => RandomInfo) private allRandomInfo_;

    address public lottery;

    modifier onlyLottery() {
        require(msg.sender == lottery, "Only Lottery can call function");
        _;
    }

    constructor(
        uint64 subscriptionId,
        address _lottery,
        address _vrfCoordinator,
        bytes32 _s_keyHash
    ) VRFConsumerBaseV2(_vrfCoordinator) {
        lottery = _lottery;
        COORDINATOR = VRFCoordinatorV2Interface(_vrfCoordinator);
        s_owner = msg.sender;
        s_subscriptionId = subscriptionId;
        s_keyHash = _s_keyHash;
    }

    /**
     * Requests randomness from a user-provided seed
     */
    function requestRandomNumber(
        uint256 _lotteryId,
        uint256 _round_size
    ) public onlyLottery returns (uint256 requestId) {
        requestId = COORDINATOR.requestRandomWords(
            s_keyHash,
            s_subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
        allRandomInfo_[requestId].lotteryId = _lotteryId;
        allRandomInfo_[requestId].randomValue = ROLL_IN_PROGRESS;
        allRandomInfo_[requestId].roundSize = _round_size;

        emit RequestRandomNumber(_lotteryId, requestId);
    }

    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        uint256 randomValue = randomWords[0] %
            allRandomInfo_[requestId].roundSize;
        allRandomInfo_[requestId].randomValue = randomValue;
        ILottery(lottery).fullfilWinningNumber(
            allRandomInfo_[requestId].lotteryId,
            randomValue
        );

        emit FulfillRandomWords(requestId, randomValue);
    }

    function getRandomInfo(
        uint256 requestId
    ) public view returns (RandomInfo memory) {
        return allRandomInfo_[requestId];
    }
}
