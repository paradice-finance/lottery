//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@chainlink/contracts/src/v0.8/mocks/VRFCoordinatorV2Mock.sol";

/**
 * @dev THIS CONTRACT IS FOR TESTING PURPOSES ONLY.
 */
contract Mock_VRFCoordinator is VRFCoordinatorV2Mock {
    bytes32 internal keyHash;
    uint256 internal fee;
    address internal requester;
    uint256 public randomResult;
    uint256 public currentLotteryId;

    constructor(
        address _linkToken,
        bytes32 _keyHash,
        uint256 _fee
    ) public VRFCoordinatorMock(_linkToken) {
        keyHash = _keyHash;
        fee = _fee;
    }
}
