import { expect } from "chai";
import { network } from "hardhat";

describe("EscrowFactory", function () {

  async function deployFactory() {
    const { ethers } = await network.connect();

    const [buyer, seller, arbitrator, other] =
      await ethers.getSigners();

    const factory = await ethers.deployContract(
      "EscrowFactory"
    );

    await factory.waitForDeployment();

    return {
      factory,
      buyer,
      seller,
      arbitrator,
      other,
      ethers
    };
  }

  // 26
  it("should deploy the factory", async function () {
    const {
      factory
    } = await deployFactory();

    expect(await factory.getEscrowCount())
      .to.equal(0n);
  });


  // 27
  it("should create an escrow with the correct participants", async function () {
    const {
      factory,
      buyer,
      seller,
      arbitrator,
      ethers
    } = await deployFactory();

    const refundBlocks = 100;

    await factory.connect(buyer).createEscrow(
      seller.address,
      arbitrator.address,
      refundBlocks
    );

    const escrowAddress =
      await factory.getEscrow(0);

    const escrow =
      await ethers.getContractAt(
        "Escrow",
        escrowAddress
      );

    expect(await escrow.buyer())
      .to.equal(buyer.address);

    expect(await escrow.seller())
      .to.equal(seller.address);

    expect(await escrow.arbitrator())
      .to.equal(arbitrator.address);
  });


  // 28
  it("should set the correct refund period", async function () {
    const {
      factory,
      buyer,
      seller,
      arbitrator,
      ethers
    } = await deployFactory();

    const refundBlocks = 100;

    await factory.connect(buyer).createEscrow(
      seller.address,
      arbitrator.address,
      refundBlocks
    );

    const escrowAddress =
      await factory.getEscrow(0);

    const escrow =
      await ethers.getContractAt(
        "Escrow",
        escrowAddress
      );

    expect(await escrow.refundAfterBlocks())
      .to.equal(BigInt(refundBlocks));
  });


  // 29
  it("should track the number of escrows", async function () {
    const {
      factory,
      buyer,
      seller,
      arbitrator
    } = await deployFactory();

    expect(await factory.getEscrowCount())
      .to.equal(0n);

    await factory.connect(buyer).createEscrow(
      seller.address,
      arbitrator.address,
      100
    );

    expect(await factory.getEscrowCount())
      .to.equal(1n);

    await factory.connect(buyer).createEscrow(
      seller.address,
      arbitrator.address,
      200
    );

    expect(await factory.getEscrowCount())
      .to.equal(2n);
  });


  // 30
  it("should return the correct escrow address using getEscrow", async function () {
    const {
      factory,
      buyer,
      seller,
      arbitrator
    } = await deployFactory();

    await factory.connect(buyer).createEscrow(
      seller.address,
      arbitrator.address,
      100
    );

    const escrowAddress =
      await factory.getEscrow(0);

    expect(escrowAddress)
      .to.not.equal("0x0000000000000000000000000000000000000000");
  });


  // 31
  it("should return all escrow addresses", async function () {
    const {
      factory,
      buyer,
      seller,
      arbitrator
    } = await deployFactory();

    await factory.connect(buyer).createEscrow(
      seller.address,
      arbitrator.address,
      100
    );

    await factory.connect(buyer).createEscrow(
      seller.address,
      arbitrator.address,
      200
    );

    const escrows =
      await factory.getAllEscrows();

    expect(escrows.length)
      .to.equal(2);

    expect(escrows[0])
      .to.equal(await factory.getEscrow(0));

    expect(escrows[1])
      .to.equal(await factory.getEscrow(1));
  });


  // 32
  it("should create different escrow contracts for different trades", async function () {
    const {
      factory,
      buyer,
      seller,
      arbitrator
    } = await deployFactory();

    await factory.connect(buyer).createEscrow(
      seller.address,
      arbitrator.address,
      100
    );

    await factory.connect(buyer).createEscrow(
      seller.address,
      arbitrator.address,
      100
    );

    const escrow1 =
      await factory.getEscrow(0);

    const escrow2 =
      await factory.getEscrow(1);

    expect(escrow1)
      .to.not.equal(escrow2);
  });


  // 33
  it("should reject a zero seller address", async function () {
    const {
      factory,
      buyer,
      arbitrator,
      ethers
    } = await deployFactory();

    await expect(
      factory.connect(buyer).createEscrow(
        ethers.ZeroAddress,
        arbitrator.address,
        100
      )
    ).to.be.revertedWith("Invalid seller");
  });


  // 34
  it("should reject a zero arbitrator address", async function () {
    const {
      factory,
      buyer,
      seller,
      ethers
    } = await deployFactory();

    await expect(
      factory.connect(buyer).createEscrow(
        seller.address,
        ethers.ZeroAddress,
        100
      )
    ).to.be.revertedWith("Invalid arbitrator");
  });


  // 35
  it("should emit EscrowCreated event", async function () {
    const {
      factory,
      buyer,
      seller,
      arbitrator
    } = await deployFactory();

    const escrowAddressBefore =
      await factory.getEscrowCount();

    await expect(
      factory.connect(buyer).createEscrow(
        seller.address,
        arbitrator.address,
        100
      )
    ).to.emit(factory, "EscrowCreated");

    expect(await factory.getEscrowCount())
      .to.equal(escrowAddressBefore + 1n);
  });

});