//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @dev THIS CONTRACT IS FOR TESTING PURPOSES ONLY.
 */
contract Mock_erc20 is ERC20 {
    constructor(uint256 _supply) ERC20("PaRaDice", "$PRD") {
        _mint(msg.sender, _supply * 10 ** 18);
    }

    function mint(address _to, uint256 _amount) public {
        _mint(_to, _amount);
    }

    /**
     * @dev This function is only here to accommodate nested Link token
     *      functionality required in mocking the random number calls.
     */
}
