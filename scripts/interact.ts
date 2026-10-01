import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();

  // Your Sepolia wallet = buyer
  const [buyer] = await ethers.getSigners();

  // Public addresses used only as seller/arbitrator.
  // They do NOT need to send transactions in this demo.
  const seller =
    "0x1111111111111111111111111111111111111111";

  const arbitrator =
    "0x2222222222222222222222222222222222222222";

  const factoryAddress =
    "0x5C0E86501B195d2a400bC3f29f5f0361b329DFd9";

  console.log("Buyer:");
  console.log(buyer.address);

  console.log("\nSeller:");
  console.log(seller);

  console.log("\nArbitrator:");
  console.log(arbitrator);

  const factory =
    await ethers.getContractAt(
      "EscrowFactory",
      factoryAddress
    );

  console.log("\nFactory connected:");
  console.log(await factory.getAddress());

  // STEP 1: CREATE ESCROW

  console.log("\nCreating escrow...");

  const refundAfterBlocks = 100;

  const createTx =
    await factory.createEscrow(
      seller,
      arbitrator,
      refundAfterBlocks
    );

  const createReceipt =
    await createTx.wait();

  console.log("Escrow creation transaction:");
  console.log(createReceipt?.hash);

  const escrowCount =
    await factory.getEscrowCount();

  const escrowAddress =
    await factory.getEscrow(
      escrowCount - 1n
    );

  console.log("\nEscrow created!");
  console.log("Escrow address:");
  console.log(escrowAddress);

  const escrow =
    await ethers.getContractAt(
      "Escrow",
      escrowAddress
    );

  // STEP 2: DEPOSIT

  const depositAmount =
    ethers.parseEther("0.001");

  console.log("\nDepositing:");
  console.log(
    ethers.formatEther(depositAmount),
    "ETH"
  );

  const depositTx =
    await escrow.deposit({
      value: depositAmount
    });

  const depositReceipt =
    await depositTx.wait();

  console.log("Deposit transaction:");
  console.log(depositReceipt?.hash);

  const escrowBalanceAfterDeposit =
    await ethers.provider.getBalance(
      escrowAddress
    );

  console.log("\nEscrow balance:");
  console.log(
    ethers.formatEther(
      escrowBalanceAfterDeposit
    ),
    "ETH"
  );

  console.log("Escrow state:");
  console.log(
    await escrow.state()
  );

  // STEP 3: RELEASE

  console.log("\nReleasing funds to seller...");

  const releaseTx =
    await escrow.release();

  const releaseReceipt =
    await releaseTx.wait();

  console.log("Release transaction:");
  console.log(releaseReceipt?.hash);

  const escrowBalanceAfterRelease =
    await ethers.provider.getBalance(
      escrowAddress
    );

  console.log("\nEscrow balance after release:");
  console.log(
    ethers.formatEther(
      escrowBalanceAfterRelease
    ),
    "ETH"
  );

  console.log("Final escrow state:");
  console.log(
    await escrow.state()
  );

  console.log("\nInteraction completed successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});