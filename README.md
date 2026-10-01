# P2P escrow Smart Contract

A blockchain-based peer-to-peer escrow system implemented in Solidity using Hardhat 3 and Ethers.js.

The system allows a buyer to deposit ETH into an escrow contract, release the funds to the seller after successful delivery, raise a dispute, and use an arbitrator to resolve the dispute. A refund mechanism is also provided if the seller does not deliver within the specified block period.

## Project Overview

The project consists of:

- Escrow.sol — handles the escrow lifecycle and ETH transfers.
- EscrowFactory.sol — creates and tracks independent escrow contracts.
- ReentrancyAttacker.sol — test contract used to verify reentrancy protection.
- scripts/deploy.ts — deploys the EscrowFactory.
- scripts/interact.ts — demonstrates the escrow transaction flow.
- test/Escrow.ts — tests escrow functionality and security.
- test/EscrowFactory.ts — tests factory functionality.

## Architecture

The system uses a factory-based multi-contract architecture.

```text
Buyer
  |
  | createEscrow()
  v
EscrowFactory
  |
  | deploys
  v
Escrow Contract
  |
  +---- Buyer
  |
  +---- Seller
  |
  +---- Arbitrator

  Each createEscrow() call creates a separate escrow contract with its own buyer, seller, arbitrator, balance, deadline, and state.

## Escrow States

| State | Value | Meaning |
|---|---:|---|
| Created | 0 | Escrow created |
| Funded | 1 | Buyer deposited ETH |
| Released | 2 | Funds sent to seller |
| Refunded | 3 | Funds returned to buyer |
| Disputed | 4 | Buyer raised a dispute |
| Resolved | 5 | Arbitrator resolved dispute |

## Security
The contract uses OpenZeppelin's ReentrancyGuard and the Checks-Effects-Interactions pattern.

The functions release(), resolveDispute(), and refundAfterDeadline() use nonReentrant. State variables are updated before external ETH transfers, preventing recursive calls and double-spending.

Access control is also implemented:

| Action | Authorized Account |
|---|---|
| Deposit | Buyer |
| Release | Buyer |
| Dispute | Buyer |
| Resolve dispute | Arbitrator |
| Refund | Buyer |

## Testing

The test suite covers escrow creation, deposits, releases, disputes, refunds, access control, invalid state transitions, double release, factory deployment, multiple escrows, and reentrancy protection.

41 tests pass successfully.

## Sepolia Deployment

EscrowFactory: 0x5C0E86501B195d2a400bC3f29f5f0361b329DFd9

Sample Escrow:
0x51d74F9A1CbE0801644C230e1d810f3F7C0dd13D

### Demonstrated Flow

```text
createEscrow
     ↓
deposit 0.001 ETH
     ↓
release

After deposit:

Balance = 0.001 ETH
State   = Funded (1)

After release:

Balance = 0 ETH
State   = Released (2)

### Transaction Hashes

Create Escow:
0xd49dbb2a20caca92b9e8f56ed5d61ff3ef54bddfa9ca531db0e511bd18bedc25

Deposit:
0xaa4ca477159fc03db86a1af7c219f73193235a3e4a12f8bc546b7572c8f281f3

Release:
0xeea72cc02fffefbe6dca06e6e51a007ff0ce2dad94ca704b07fed3a853b3a6f1

## Project Structure

p2p-escrow/
├── contracts/
│   ├── Escrow.sol
│   ├── EscrowFactory.sol
│   └── ReentrancyAttacker.sol
├── scripts/
│   ├── deploy.ts
│   ├── interact.ts
│   └── send-op-tx.ts
├── test/
│   ├── Escrow.ts
│   └── EscrowFactory.ts
├── screenshots/
│   ├── 01-factory-deployment.png
│   ├── 02-escrow-creation.png
│   ├── 03-create-transaction.png
│   ├── 04-deposit.png
│   ├── 05-release.png
│   ├── 06-terminal_factory-deployment.png
│   ├── 07-terminal-deposit-and-release.png
│   └── 08-tests.png
├── hardhat.config.ts
├── package.json
├── package-lock.json
├── tsconfig.json
├── .gitignore
└── README.md

## Technologies

- Solidity 0.8.34
- Hardhat 3
- TypeScript
- Ethers.js
- OpenZeppelin
- Sepolia Testnet
- Etherscan
- GitHub

## Conclusion

This project demonstrates a secure P2P escrow system with factory-based multi-contract deployment, access control, dispute resolution, refunds, reentrancy protection, and a successful Sepolia transaction flow.

The implementation passes all 41 tests.


