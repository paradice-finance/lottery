//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "./ILottery.sol";

contract RandomNumberGenerator is VRFConsumerBaseV2 {
    uint256 private constant ROLL_IN_PROGRESS = 9999;

    VRFCoordinatorV2Interface public COORDINATOR;

    // Your subscription ID.
    uint64 s_subscriptionId;

    // Goerli coordinator. For other networks,
    // see https://docs.chain.link/docs/vrf-contracts/#configurations

    // The gas lane to use, which specifies the maximum gas price to bump to.
    // For a list of available gas lanes on each network,
    // see https://docs.chain.link/docs/vrf-contracts/#configurations
    bytes32 s_keyHash =
        0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15;
    uint32 callbackGasLimit = 250000;
    uint16 requestConfirmations = 3;
    uint32 numWords = 1;
    address s_owner;

    mapping(uint256 => uint256) private requestRandom;
    mapping(uint256 => uint256) public round_result;
    uint256 internal round_size;

    event RequestRandomNumber(uint256 lotteryId, uint256 requestId);
    event FulfillRandomWords(uint256 indexed requestId, uint256 indexed result);

    uint256 internal fee;
    uint256 public randomResult;
    uint256 public currentLotteryId;

    address public lottery;

    modifier onlyLottery() {
        require(msg.sender == lottery, "Only Lottery can call function");
        _;
    }

    constructor(
        uint64 subscriptionId,
        address _lottery,
        address _vrfCoordinator
    ) VRFConsumerBaseV2(_vrfCoordinator) {
        lottery = _lottery;
        COORDINATOR = VRFCoordinatorV2Interface(_vrfCoordinator);
        s_owner = msg.sender;
        s_subscriptionId = subscriptionId;
    }

    /**
     * Requests randomness from a user-provided seed
     */
    function requestRandomNumber(
        uint256 lotteryId_,
        uint256 _round_size
    ) public onlyLottery returns (uint256 requestId) {
        requestId = COORDINATOR.requestRandomWords(
            s_keyHash,
            s_subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
        currentLotteryId = lotteryId_;
        round_result[requestId] = ROLL_IN_PROGRESS;
        round_size = _round_size;

        emit RequestRandomNumber(lotteryId_, requestId);
    }

    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        uint256 randomValue = (randomWords[0] / (block.timestamp)) % round_size;
        round_result[requestId] = randomValue;
        // ILottery(lottery).fullfilWinningNumber(
        //     currentLotteryId,
        //     requestId,
        //     randomValue
        // );

        emit FulfillRandomWords(requestId, randomValue);
    }

    function getRandomResult(uint256 requestId) public view returns (uint256) {
        require(
            round_result[requestId] != ROLL_IN_PROGRESS,
            "Draw In Progress."
        );

        return round_result[requestId];
    }
}
