import { expect } from "chai";
import { network } from "hardhat";

describe("Escrow", function () {
  async function deployEscrow() {
    const { ethers } = await network.connect();

    const [buyer, seller, arbitrator] =
      await ethers.getSigners();

    const escrow = await ethers.deployContract(
      "Escrow",
      [
        buyer.address,
        seller.address,
        arbitrator.address,
        100
      ]
    );

    await escrow.waitForDeployment();

    return {
      escrow,
      buyer,
      seller,
      arbitrator,
      ethers
    };
  }

  it("should deploy with the correct participants", async function () {
    const {
      escrow,
      buyer,
      seller,
      arbitrator
    } = await deployEscrow();

    expect(await escrow.buyer()).to.equal(buyer.address);
    expect(await escrow.seller()).to.equal(seller.address);
    expect(await escrow.arbitrator()).to.equal(arbitrator.address);
  });
  
  it("should allow the buyer to deposit ETH", async function () {
  const {
    escrow,
    buyer
  } = await deployEscrow();

  const { ethers } = await network.connect();

  const depositAmount = ethers.parseEther("1");

  await escrow.connect(buyer).deposit({
    value: depositAmount
  });

  expect(await escrow.getBalance()).to.equal(depositAmount);

  expect(await escrow.depositedAmount()).to.equal(
    depositAmount
  );

  expect(await escrow.state()).to.equal(1n);
});

it("should not allow anyone except the buyer to deposit", async function () {
  const {
    escrow,
    seller
  } = await deployEscrow();

  const { ethers } = await network.connect();

  const depositAmount = ethers.parseEther("1");

  await expect(
    escrow.connect(seller).deposit({
      value: depositAmount
    })
  ).to.be.revertedWith("Only buyer");
});

it("should release the funds to the seller", async function () {
  const {
    escrow,
    buyer,
    seller,
    ethers
  } = await deployEscrow();

  const depositAmount = ethers.parseEther("1");

  // Buyer deposits 1 ETH
  await escrow.connect(buyer).deposit({
    value: depositAmount
  });

  // Seller's balance before release
  const sellerBalanceBefore =
    await ethers.provider.getBalance(seller.address);

  // Buyer releases the funds
  await escrow.connect(buyer).release();

  // Escrow should now have 0 ETH
  expect(await escrow.getBalance()).to.equal(0n);

  // State should be Released
  expect(await escrow.state()).to.equal(2n);

  // depositedAmount should be 0
  expect(await escrow.depositedAmount()).to.equal(0n);

  // Seller should have received 1 ETH
  const sellerBalanceAfter =
    await ethers.provider.getBalance(seller.address);

  expect(
    sellerBalanceAfter - sellerBalanceBefore
  ).to.equal(depositAmount);
});

it("should not allow anyone except the buyer to release", async function () {
  const {
    escrow,
    buyer,
    seller
  } = await deployEscrow();

  const { ethers } = await network.connect();

  const depositAmount = ethers.parseEther("1");

  // Buyer deposits 1 ETH
  await escrow.connect(buyer).deposit({
    value: depositAmount
  });

  // Seller tries to release the funds
  await expect(
    escrow.connect(seller).release()
  ).to.be.revertedWith("Only buyer");

  // Funds should still be in the escrow
  expect(await escrow.getBalance()).to.equal(depositAmount);

  // State should still be Funded
  expect(await escrow.state()).to.equal(1n);
});

it("should not allow the funds to be released twice", async function () {
  const {
    escrow,
    buyer,
    seller,
    ethers
  } = await deployEscrow();

  const depositAmount = ethers.parseEther("1");

  // Buyer deposits 1 ETH
  await escrow.connect(buyer).deposit({
    value: depositAmount
  });

  // First release succeeds
  await escrow.connect(buyer).release();

  // Second release must fail
  await expect(
    escrow.connect(buyer).release()
  ).to.be.revertedWith("Invalid state");

  // Escrow should still have 0 ETH
  expect(await escrow.getBalance()).to.equal(0n);

  // State should remain Released
  expect(await escrow.state()).to.equal(2n);
});

it("should allow the buyer to raise a dispute", async function () {
  const {
    escrow,
    buyer,
    ethers
  } = await deployEscrow();

  const depositAmount = ethers.parseEther("1");

  // Buyer deposits 1 ETH
  await escrow.connect(buyer).deposit({
    value: depositAmount
  });

  // Buyer raises a dispute
  await escrow.connect(buyer).dispute();

  // State should now be Disputed
  expect(await escrow.state()).to.equal(4n);

  // Funds should still be inside the escrow
  expect(await escrow.getBalance()).to.equal(depositAmount);
});

it("should not allow the seller to raise a dispute", async function () {
  const {
    escrow,
    buyer,
    seller,
    ethers
  } = await deployEscrow();

  const depositAmount = ethers.parseEther("1");

  // Buyer deposits 1 ETH
  await escrow.connect(buyer).deposit({
    value: depositAmount
  });

  // Seller tries to raise a dispute
  await expect(
    escrow.connect(seller).dispute()
  ).to.be.revertedWith("Only buyer");

  // State should still be Funded
  expect(await escrow.state()).to.equal(1n);

  // Funds should still be in the escrow
  expect(await escrow.getBalance()).to.equal(depositAmount);
});

it("should allow the arbitrator to resolve the dispute in favor of the seller", async function () {
  const {
    escrow,
    buyer,
    seller,
    arbitrator,
    ethers
  } = await deployEscrow();

  const depositAmount = ethers.parseEther("1");

  // Buyer deposits 1 ETH
  await escrow.connect(buyer).deposit({
    value: depositAmount
  });

  // Buyer raises a dispute
  await escrow.connect(buyer).dispute();

  // Record seller's balance before resolution
  const sellerBalanceBefore =
    await ethers.provider.getBalance(seller.address);

  // Arbitrator decides that the seller wins
  await escrow.connect(arbitrator).resolveDispute(true);

  // Escrow should now have 0 ETH
  expect(await escrow.getBalance()).to.equal(0n);

  // State should be Resolved
  expect(await escrow.state()).to.equal(5n);

  // depositedAmount should be 0
  expect(await escrow.depositedAmount()).to.equal(0n);

  // Seller should have received the 1 ETH
  const sellerBalanceAfter =
    await ethers.provider.getBalance(seller.address);

  expect(
    sellerBalanceAfter - sellerBalanceBefore
  ).to.equal(depositAmount);
});

it("should allow the arbitrator to resolve the dispute in favor of the buyer", async function () {
  const {
    escrow,
    buyer,
    seller,
    arbitrator,
    ethers
  } = await deployEscrow();

  const depositAmount = ethers.parseEther("1");

  // Buyer deposits 1 ETH
  await escrow.connect(buyer).deposit({
    value: depositAmount
  });

  // Buyer raises a dispute
  await escrow.connect(buyer).dispute();

  // Buyer's balance before resolution
  const buyerBalanceBefore =
    await ethers.provider.getBalance(buyer.address);

  // Arbitrator decides that the buyer wins
  await escrow.connect(arbitrator).resolveDispute(false);

  // Escrow should now have 0 ETH
  expect(await escrow.getBalance()).to.equal(0n);

  // State should be Resolved
  expect(await escrow.state()).to.equal(5n);

  // depositedAmount should be 0
  expect(await escrow.depositedAmount()).to.equal(0n);

  // Buyer should receive the 1 ETH
  const buyerBalanceAfter =
    await ethers.provider.getBalance(buyer.address);

  // Buyer does not receive exactly 1 ETH because
  // the buyer pays gas for the resolveDispute transaction.
  expect(buyerBalanceAfter).to.be.greaterThan(
    buyerBalanceBefore
  );
});

it("should not allow anyone except the arbitrator to resolve a dispute", async function () {
  const {
    escrow,
    buyer,
    seller,
    arbitrator,
    ethers
  } = await deployEscrow();

  const depositAmount = ethers.parseEther("1");

  // Buyer deposits 1 ETH
  await escrow.connect(buyer).deposit({
    value: depositAmount
  });

  // Buyer raises a dispute
  await escrow.connect(buyer).dispute();

  // Seller tries to resolve the dispute
  await expect(
    escrow.connect(seller).resolveDispute(true)
  ).to.be.revertedWith("Only arbitrator");

  // Buyer also should not be able to resolve it
  await expect(
    escrow.connect(buyer).resolveDispute(true)
  ).to.be.revertedWith("Only arbitrator");

  // State should still be Disputed
  expect(await escrow.state()).to.equal(4n);

  // Funds should still be in escrow
  expect(await escrow.getBalance()).to.equal(depositAmount);
});

it("should not allow a refund before the deadline", async function () {
  const {
    escrow,
    buyer,
    ethers
  } = await deployEscrow();

  const depositAmount = ethers.parseEther("1");

  // Buyer deposits 1 ETH
  await escrow.connect(buyer).deposit({
    value: depositAmount
  });

  // Try to refund immediately
  await expect(
    escrow.connect(buyer).refundAfterDeadline()
  ).to.be.revertedWith("Refund deadline not reached");

  // State should still be Funded
  expect(await escrow.state()).to.equal(1n);

  // Funds should still be in escrow
  expect(await escrow.getBalance()).to.equal(depositAmount);
});

it("should allow the buyer to refund after the deadline", async function () {
  const {
    escrow,
    buyer,
    ethers
  } = await deployEscrow();

  const depositAmount = ethers.parseEther("1");

  // Buyer deposits 1 ETH
  await escrow.connect(buyer).deposit({
    value: depositAmount
  });

  // Record buyer's balance before refund
  const buyerBalanceBefore =
    await ethers.provider.getBalance(buyer.address);

  // Move the blockchain forward by 101 blocks
  await ethers.provider.send(
    "hardhat_mine",
    ["0x65"]
  );

  // Refund after the deadline
  const tx = await escrow
    .connect(buyer)
    .refundAfterDeadline();

  const receipt = await tx.wait();

  // Escrow should now have 0 ETH
  expect(await escrow.getBalance()).to.equal(0n);

  // State should be Refunded
  expect(await escrow.state()).to.equal(3n);

  // depositedAmount should be 0
  expect(await escrow.depositedAmount()).to.equal(0n);

  // Buyer should have received the refund,
  // minus the gas cost of the refund transaction
  const buyerBalanceAfter =
    await ethers.provider.getBalance(buyer.address);

  const gasCost =
    receipt!.gasUsed * receipt!.gasPrice;

  expect(
    buyerBalanceAfter + gasCost - buyerBalanceBefore
  ).to.equal(depositAmount);
});

it("should not allow a refund after the funds have been released", async function () {
  const {
    escrow,
    buyer,
    ethers
  } = await deployEscrow();

  const depositAmount = ethers.parseEther("1");

  // Buyer deposits 1 ETH
  await escrow.connect(buyer).deposit({
    value: depositAmount
  });

  // Buyer releases the funds
  await escrow.connect(buyer).release();

  // Move forward past the refund deadline
  await ethers.provider.send(
    "hardhat_mine",
    ["0x65"]
  );

  // Try to refund after the funds were already released
  await expect(
    escrow.connect(buyer).refundAfterDeadline()
  ).to.be.revertedWith("Invalid state");

  // State should remain Released
  expect(await escrow.state()).to.equal(2n);

  // Escrow should still have 0 ETH
  expect(await escrow.getBalance()).to.equal(0n);
});

it("should not allow release after the escrow has been refunded", async function () {
  const {
    escrow,
    buyer,
    ethers
  } = await deployEscrow();

  const depositAmount = ethers.parseEther("1");

  // Buyer deposits 1 ETH
  await escrow.connect(buyer).deposit({
    value: depositAmount
  });

  // Move past the refund deadline
  await ethers.provider.send(
    "hardhat_mine",
    ["0x65"]
  );

  // Buyer gets a refund
  await escrow.connect(buyer).refundAfterDeadline();

  // Try to release the already-refunded escrow
  await expect(
    escrow.connect(buyer).release()
  ).to.be.revertedWith("Invalid state");

  // State should remain Refunded
  expect(await escrow.state()).to.equal(3n);

  // Escrow should still have 0 ETH
  expect(await escrow.getBalance()).to.equal(0n);
});

it("should not allow dispute resolution when there is no active dispute", async function () {
  const {
    escrow,
    buyer,
    arbitrator,
    ethers
  } = await deployEscrow();

  const depositAmount = ethers.parseEther("1");

  // Buyer deposits 1 ETH
  await escrow.connect(buyer).deposit({
    value: depositAmount
  });

  // No dispute has been raised.
  // Arbitrator tries to resolve anyway.
  await expect(
    escrow.connect(arbitrator).resolveDispute(true)
  ).to.be.revertedWith("No active dispute");

  // State should still be Funded
  expect(await escrow.state()).to.equal(1n);

  // Funds should still be in escrow
  expect(await escrow.getBalance()).to.equal(depositAmount);
});

it("should not allow a dispute after the funds have been released", async function () {
  const {
    escrow,
    buyer,
    seller,
    ethers
  } = await deployEscrow();

  const depositAmount = ethers.parseEther("1");

  // Buyer deposits 1 ETH
  await escrow.connect(buyer).deposit({
    value: depositAmount
  });

  // Buyer releases the funds
  await escrow.connect(buyer).release();

  // Buyer tries to raise a dispute after release
  await expect(
    escrow.connect(buyer).dispute()
  ).to.be.revertedWith("Invalid state");

  // State should remain Released
  expect(await escrow.state()).to.equal(2n);

  // Escrow should have 0 ETH
  expect(await escrow.getBalance()).to.equal(0n);
});

it("should not allow a dispute after the escrow has been refunded", async function () {
  const {
    escrow,
    buyer,
    ethers
  } = await deployEscrow();

  const depositAmount = ethers.parseEther("1");

  // Buyer deposits 1 ETH
  await escrow.connect(buyer).deposit({
    value: depositAmount
  });

  // Move past the refund deadline
  await ethers.provider.send(
    "hardhat_mine",
    ["0x65"]
  );

  // Buyer gets a refund
  await escrow.connect(buyer).refundAfterDeadline();

  // Buyer tries to raise a dispute after refund
  await expect(
    escrow.connect(buyer).dispute()
  ).to.be.revertedWith("Invalid state");

  // State should remain Refunded
  expect(await escrow.state()).to.equal(3n);

  // Escrow should have 0 ETH
  expect(await escrow.getBalance()).to.equal(0n);
});

it("should not allow a resolved dispute to be resolved again", async function () {
  const {
    escrow,
    buyer,
    arbitrator,
    ethers
  } = await deployEscrow();

  const depositAmount = ethers.parseEther("1");

  // Buyer deposits
  await escrow.connect(buyer).deposit({
    value: depositAmount
  });

  // Buyer raises dispute
  await escrow.connect(buyer).dispute();

  // Arbitrator resolves it
  await escrow.connect(arbitrator).resolveDispute(true);

  // Arbitrator tries to resolve it again
  await expect(
    escrow.connect(arbitrator).resolveDispute(true)
  ).to.be.revertedWith("No active dispute");

  // State should remain Resolved
  expect(await escrow.state()).to.equal(5n);

  // Escrow should have no funds
  expect(await escrow.getBalance()).to.equal(0n);
});

it("should not allow release after a dispute has been raised", async function () {
  const {
    escrow,
    buyer,
    ethers
  } = await deployEscrow();

  const depositAmount = ethers.parseEther("1");

  // Buyer deposits
  await escrow.connect(buyer).deposit({
    value: depositAmount
  });

  // Buyer raises dispute
  await escrow.connect(buyer).dispute();

  // Buyer tries to release while dispute is active
  await expect(
    escrow.connect(buyer).release()
  ).to.be.revertedWith("Invalid state");

  // State should remain Disputed
  expect(await escrow.state()).to.equal(4n);

  // Money should remain in escrow
  expect(await escrow.getBalance()).to.equal(depositAmount);
});

it("should not allow a refund after a dispute has been raised", async function () {
  const {
    escrow,
    buyer,
    ethers
  } = await deployEscrow();

  const depositAmount = ethers.parseEther("1");

  // Buyer deposits
  await escrow.connect(buyer).deposit({
    value: depositAmount
  });

  // Buyer raises dispute
  await escrow.connect(buyer).dispute();

  // Move past refund deadline
  await ethers.provider.send(
    "hardhat_mine",
    ["0x65"]
  );

  // Buyer tries to refund
  await expect(
    escrow.connect(buyer).refundAfterDeadline()
  ).to.be.revertedWith("Invalid state");

  // State should remain Disputed
  expect(await escrow.state()).to.equal(4n);

  // Money remains in escrow
  expect(await escrow.getBalance()).to.equal(depositAmount);
});

it("should not allow a zero ETH deposit", async function () {
  const {
    escrow,
    buyer
  } = await deployEscrow();

  await expect(
    escrow.connect(buyer).deposit({
      value: 0
    })
  ).to.be.revertedWith("Zero deposit");

  // State should remain Created
  expect(await escrow.state()).to.equal(0n);

  // No ETH should be in escrow
  expect(await escrow.getBalance()).to.equal(0n);
});

it("should not allow the buyer to deposit twice", async function () {
  const {
    escrow,
    buyer,
    ethers
  } = await deployEscrow();

  const depositAmount = ethers.parseEther("1");

  // First deposit
  await escrow.connect(buyer).deposit({
    value: depositAmount
  });

  // Second deposit
  await expect(
    escrow.connect(buyer).deposit({
      value: depositAmount
    })
  ).to.be.revertedWith("Invalid state");

  // Original deposit should remain
  expect(await escrow.getBalance()).to.equal(depositAmount);

  expect(await escrow.depositedAmount()).to.equal(
    depositAmount
  );

  expect(await escrow.state()).to.equal(1n);
});

it("should reject invalid participant addresses", async function () {
  const {
    ethers
  } = await network.connect();

  const [buyer, seller, arbitrator] =
    await ethers.getSigners();

  // Invalid buyer
  await expect(
    ethers.deployContract(
      "Escrow",
      [
        ethers.ZeroAddress,
        seller.address,
        arbitrator.address,
        100
      ]
    )
  ).to.be.revertedWith("Invalid buyer");

  // Invalid seller
  await expect(
    ethers.deployContract(
      "Escrow",
      [
        buyer.address,
        ethers.ZeroAddress,
        arbitrator.address,
        100
      ]
    )
  ).to.be.revertedWith("Invalid seller");

  // Invalid arbitrator
  await expect(
    ethers.deployContract(
      "Escrow",
      [
        buyer.address,
        seller.address,
        ethers.ZeroAddress,
        100
      ]
    )
  ).to.be.revertedWith("Invalid arbitrator");
});

it("should reject a zero refund period", async function () {
  const {
    ethers
  } = await network.connect();

  const [buyer, seller, arbitrator] =
    await ethers.getSigners();

  await expect(
    ethers.deployContract(
      "Escrow",
      [
        buyer.address,
        seller.address,
        arbitrator.address,
        0
      ]
    )
  ).to.be.revertedWith("Invalid refund period");
});

it("should emit EscrowFunded event when buyer deposits", async function () {
  const {
    escrow,
    buyer,
    ethers
  } = await deployEscrow();

  const depositAmount = ethers.parseEther("1");

  await expect(
    escrow.connect(buyer).deposit({
      value: depositAmount
    })
  ).to.emit(escrow, "EscrowFunded")
    .withArgs(
      buyer.address,
      depositAmount
    );
});

it("should emit FundsReleased event when buyer releases funds", async function () {
  const {
    escrow,
    buyer,
    seller,
    ethers
  } = await deployEscrow();

  const depositAmount = ethers.parseEther("1");

  await escrow.connect(buyer).deposit({
    value: depositAmount
  });

  await expect(
    escrow.connect(buyer).release()
  ).to.emit(escrow, "FundsReleased")
    .withArgs(
      seller.address,
      depositAmount
    );
});

it("should emit DisputeRaised event when buyer raises a dispute", async function () {
  const {
    escrow,
    buyer
  } = await deployEscrow();

  await escrow.connect(buyer).deposit({
    value: 1n
  });

  await expect(
    escrow.connect(buyer).dispute()
  ).to.emit(escrow, "DisputeRaised")
    .withArgs(
      buyer.address
    );
});

it("should emit FundsRefunded event when buyer gets a refund", async function () {
  const {
    escrow,
    buyer,
    ethers
  } = await deployEscrow();

  const depositAmount = ethers.parseEther("1");

  await escrow.connect(buyer).deposit({
    value: depositAmount
  });

  // Move forward by 101 blocks.
  await ethers.provider.send(
    "hardhat_mine",
    ["0x65"]
  );

  await expect(
    escrow.connect(buyer).refundAfterDeadline()
  ).to.emit(escrow, "FundsRefunded")
    .withArgs(
      buyer.address,
      depositAmount
    );
});

it("should emit DisputeResolved event when arbitrator resolves a dispute", async function () {
  const {
    escrow,
    buyer,
    seller,
    arbitrator,
    ethers
  } = await deployEscrow();

  const depositAmount = ethers.parseEther("1");

  await escrow.connect(buyer).deposit({
    value: depositAmount
  });

  await escrow.connect(buyer).dispute();

  await expect(
    escrow.connect(arbitrator).resolveDispute(true)
  ).to.emit(escrow, "DisputeResolved")
    .withArgs(
      seller.address,
      depositAmount
    );
});

it("should prevent reentrancy during release", async function () {
  const {
    arbitrator,
    ethers
  } = await deployEscrow();

  // Deploy attacker contract.
  const attacker =
    await ethers.deployContract(
      "ReentrancyAttacker"
    );

  await attacker.waitForDeployment();

  const attackerAddress =
    await attacker.getAddress();

  // Deploy a new Escrow where the attacker
  // is both buyer and seller.
  const escrow =
    await ethers.deployContract(
      "Escrow",
      [
        attackerAddress,
        attackerAddress,
        arbitrator.address,
        100
      ]
    );

  await escrow.waitForDeployment();

  // Tell attacker which escrow to attack.
  await attacker.setEscrow(
    await escrow.getAddress()
  );

  const depositAmount =
    ethers.parseEther("1");

  // Deposit through the attacker contract.
  await attacker.deposit({
    value: depositAmount
  });

  // The attacker calls release().
  //
  // Escrow sends ETH to attacker.
  // attacker.receive() tries to call release()
  // again.
  //
  // ReentrancyGuard should block the second call.
  await expect(attacker.release())
  .to.be.revertedWith("Transfer failed");

  // Because the entire transaction reverted,
  // the funds must still be inside the escrow.
  expect(
    await escrow.getBalance()
  ).to.equal(depositAmount);

  // State should still be Funded.
  expect(
    await escrow.state()
  ).to.equal(1n);
});
});