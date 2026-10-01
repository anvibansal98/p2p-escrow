// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "./Escrow.sol";

contract EscrowFactory {
    address[] public escrows;

    event EscrowCreated(
        address indexed escrow,
        address indexed buyer,
        address indexed seller,
        address arbitrator
    );

    function createEscrow(
        address seller,
        address arbitrator,
        uint256 refundAfterBlocks
    ) external returns (address) {
        require(
            seller != address(0),
            "Invalid seller"
        );

        require(
            arbitrator != address(0),
            "Invalid arbitrator"
        );

        Escrow escrow = new Escrow(
            msg.sender,
            seller,
            arbitrator,
            refundAfterBlocks
        );

        escrows.push(address(escrow));

        emit EscrowCreated(
            address(escrow),
            msg.sender,
            seller,
            arbitrator
        );

        return address(escrow);
    }

    function getEscrowCount()
        external
        view
        returns (uint256)
    {
        return escrows.length;
    }

    function getEscrow(uint256 index)
        external
        view
        returns (address)
    {
        return escrows[index];
    }

    function getAllEscrows()
        external
        view
        returns (address[] memory)
    {
        return escrows;
    }
}