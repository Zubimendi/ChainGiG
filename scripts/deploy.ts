import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * ChainGig Deployment Script
 *
 * Deploys all 3 contracts in correct dependency order:
 * 1. MockUSDC (testnet only) OR uses mainnet USDC address
 * 2. ChainGigEscrow (depends on USDC address)
 * 3. ChainGigReputation (depends on Escrow address)
 * 4. ChainGigDispute (depends on Escrow address)
 * 5. Wires contracts together
 * 6. Saves addresses to deployments/[network].json
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("=".repeat(60));
  console.log("ChainGig Contract Deployment");
  console.log("=".repeat(60));
  console.log("Network:", network.name);
  console.log("Deployer:", deployer.address);
  console.log(
    "Balance:",
    ethers.formatEther(await deployer.provider.getBalance(deployer.address)),
    "ETH"
  );
  console.log("=".repeat(60));

  // ────────────────────────────────────────────
  // 1. USDC Address
  // ────────────────────────────────────────────
  let usdcAddress: string;

  if (network.name === "base") {
    // Base Mainnet — use real USDC
    usdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    console.log("\n[1/5] Using Base Mainnet USDC:", usdcAddress);
  } else {
    // Testnet or local — deploy MockUSDC
    console.log("\n[1/5] Deploying MockUSDC...");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();
    usdcAddress = await usdc.getAddress();
    console.log("  MockUSDC deployed:", usdcAddress);
  }

  // ────────────────────────────────────────────
  // 2. ChainGigEscrow
  // ────────────────────────────────────────────
  console.log("\n[2/5] Deploying ChainGigEscrow...");
  const ChainGigEscrow = await ethers.getContractFactory("ChainGigEscrow");
  const escrow = await ChainGigEscrow.deploy(usdcAddress, deployer.address);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log("  ChainGigEscrow deployed:", escrowAddress);

  // ────────────────────────────────────────────
  // 3. ChainGigReputation (SBT)
  // ────────────────────────────────────────────
  console.log("\n[3/5] Deploying ChainGigReputation...");
  const ChainGigReputation = await ethers.getContractFactory("ChainGigReputation");
  const reputation = await ChainGigReputation.deploy(escrowAddress);
  await reputation.waitForDeployment();
  const reputationAddress = await reputation.getAddress();
  console.log("  ChainGigReputation deployed:", reputationAddress);

  // ────────────────────────────────────────────
  // 4. ChainGigDispute
  // ────────────────────────────────────────────
  console.log("\n[4/5] Deploying ChainGigDispute...");
  const ChainGigDispute = await ethers.getContractFactory("ChainGigDispute");
  const dispute = await ChainGigDispute.deploy(escrowAddress);
  await dispute.waitForDeployment();
  const disputeAddress = await dispute.getAddress();
  console.log("  ChainGigDispute deployed:", disputeAddress);

  // ────────────────────────────────────────────
  // 5. Wire contracts together
  // ────────────────────────────────────────────
  console.log("\n[5/5] Wiring contracts together...");

  const txRep = await escrow.setReputationContract(reputationAddress);
  await txRep.wait();
  console.log("  Escrow -> Reputation: linked");

  const txDisp = await escrow.setDisputeContract(disputeAddress);
  await txDisp.wait();
  console.log("  Escrow -> Dispute: linked");

  console.log("  Contracts wired successfully");

  // ────────────────────────────────────────────
  // 6. Save deployment addresses
  // ────────────────────────────────────────────
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentData = {
    network: network.name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    contracts: {
      MockUSDC: usdcAddress,
      ChainGigEscrow: escrowAddress,
      ChainGigReputation: reputationAddress,
      ChainGigDispute: disputeAddress,
    },
    deployedAt: new Date().toISOString(),
  };

  const filePath = path.join(deploymentsDir, `${network.name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(deploymentData, null, 2));

  // ────────────────────────────────────────────
  // Summary
  // ────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log("\nContract Addresses:");
  console.log("  USDC:       ", usdcAddress);
  console.log("  Escrow:     ", escrowAddress);
  console.log("  Reputation: ", reputationAddress);
  console.log("  Dispute:    ", disputeAddress);
  console.log("\nAddresses saved to:", filePath);
  console.log("\nNext steps:");
  console.log("  1. Verify contracts: npm run verify:sepolia");
  console.log("  2. Update frontend/constants/addresses.ts");
  if (network.name !== "base") {
    console.log("  3. Mint test USDC: call MockUSDC.faucet() from each wallet");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
