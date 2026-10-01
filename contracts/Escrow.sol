// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Escrow is ReentrancyGuard {
    address public immutable buyer;
    address public immutable seller;
    address public immutable arbitrator;

    uint256 public depositedAmount;

    uint256 public immutable refundAfterBlocks;
    uint256 public refundDeadlineBlock;

    enum State {
        Created,
        Funded,
        Released,
        Refunded,
        Disputed,
        Resolved
    }

    State public state;

    event EscrowFunded(
        address indexed buyer,
        uint256 amount
    );

    event FundsReleased(
        address indexed seller,
        uint256 amount
    );

    event DisputeRaised(
        address indexed buyer
    );

    event FundsRefunded(
        address indexed buyer,
        uint256 amount
    );

    event DisputeResolved(
        address indexed recipient,
        uint256 amount
    );

    constructor(
        address _buyer,
        address _seller,
        address _arbitrator,
        uint256 _refundAfterBlocks
    ) {
        require(
            _buyer != address(0),
            "Invalid buyer"
        );

        require(
            _seller != address(0),
            "Invalid seller"
        );

        require(
            _arbitrator != address(0),
            "Invalid arbitrator"
        );

        require(
            _refundAfterBlocks > 0,
            "Invalid refund period"
        );

        buyer = _buyer;
        seller = _seller;
        arbitrator = _arbitrator;
        refundAfterBlocks = _refundAfterBlocks;

        state = State.Created;
    }

    function deposit() external payable {
        require(
            msg.sender == buyer,
            "Only buyer"
        );

        require(
            state == State.Created,
            "Invalid state"
        );

        require(
            msg.value > 0,
            "Zero deposit"
        );

        depositedAmount = msg.value;

        refundDeadlineBlock =
            block.number + refundAfterBlocks;

        state = State.Funded;

        emit EscrowFunded(
            buyer,
            msg.value
        );
    }

    function release() external nonReentrant {
        require(
            msg.sender == buyer,
            "Only buyer"
        );

        require(
            state == State.Funded,
            "Invalid state"
        );

        uint256 amount =
            address(this).balance;

        // Effects BEFORE interaction
        state = State.Released;
        depositedAmount = 0;

        // Interaction
        (bool success, ) = payable(seller).call{
            value: amount
        }("");

        require(
            success,
            "Transfer failed"
        );

        emit FundsReleased(
            seller,
            amount
        );
    }

    function dispute() external {
        require(
            msg.sender == buyer,
            "Only buyer"
        );

        require(
            state == State.Funded,
            "Invalid state"
        );

        state = State.Disputed;

        emit DisputeRaised(buyer);
    }

    function resolveDispute(
        bool sellerWins
    ) external nonReentrant {
        require(
            msg.sender == arbitrator,
            "Only arbitrator"
        );

        require(
            state == State.Disputed,
            "No active dispute"
        );

        uint256 amount =
            address(this).balance;

        address recipient;

        if (sellerWins) {
            recipient = seller;
        } else {
            recipient = buyer;
        }

        // Effects BEFORE interaction
        state = State.Resolved;
        depositedAmount = 0;

        // Interaction
        (bool success, ) = payable(recipient).call{
            value: amount
        }("");

        require(
            success,
            "Transfer failed"
        );

        emit DisputeResolved(
            recipient,
            amount
        );
    }

    function refundAfterDeadline()
        external
        nonReentrant
    {
        require(
            msg.sender == buyer,
            "Only buyer"
        );

        require(
            state == State.Funded,
            "Invalid state"
        );

        require(
            block.number >= refundDeadlineBlock,
            "Refund deadline not reached"
        );

        uint256 amount =
            address(this).balance;

        // Effects BEFORE interaction
        state = State.Refunded;
        depositedAmount = 0;

        // Interaction
        (bool success, ) = payable(buyer).call{
            value: amount
        }("");

        require(
            success,
            "Refund failed"
        );

        emit FundsRefunded(
            buyer,
            amount
        );
    }

    function getBalance()
        external
        view
        returns (uint256)
    {
        return address(this).balance;
    }
}