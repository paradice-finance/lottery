//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@chainlink/contracts/src/v0.8/mocks/VRFCoordinatorV2Mock.sol";

/**
 * @dev THIS CONTRACT IS FOR TESTING PURPOSES ONLY.
 */
contract Mock_VRFCoordinator is VRFCoordinatorV2Mock {
    constructor() public VRFCoordinatorV2Mock(25000000000000000, 1000000000) {}
}
