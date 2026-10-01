import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();

  const [deployer] = await ethers.getSigners();

  console.log("Deploying from:");
  console.log(deployer.address);

  const balance =
    await ethers.provider.getBalance(
      deployer.address
    );

  console.log("Deployer balance:");
  console.log(
    ethers.formatEther(balance),
    "ETH"
  );

  console.log("\nDeploying EscrowFactory...");

  const factory =
    await ethers.deployContract(
      "EscrowFactory"
    );

  await factory.waitForDeployment();

  const factoryAddress =
    await factory.getAddress();

  console.log("\nEscrowFactory deployed!");
  console.log("Factory address:");
  console.log(factoryAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});