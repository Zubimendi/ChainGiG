import { run, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * ChainGig Contract Verification Script
 *
 * Reads deployed addresses from deployments/[network].json
 * and verifies each contract on Basescan.
 *
 * Usage: npx hardhat run scripts/verify.ts --network baseSepolia
 */
async function main() {
  const filePath = path.join(__dirname, "..", "deployments", `${network.name}.json`);

  if (!fs.existsSync(filePath)) {
    console.error(`No deployment file found at ${filePath}`);
    console.error("Run the deploy script first: npm run deploy:sepolia");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const contracts = deployment.contracts;

  console.log("=".repeat(60));
  console.log("ChainGig Contract Verification");
  console.log("Network:", network.name);
  console.log("=".repeat(60));

  // ────────────────────────────────────────────
  // Verify MockUSDC (testnet only)
  // ────────────────────────────────────────────
  if (network.name !== "base") {
    console.log("\n[1/4] Verifying MockUSDC...");
    try {
      await run("verify:verify", {
        address: contracts.MockUSDC,
        constructorArguments: [],
      });
      console.log("  MockUSDC verified");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("Already Verified")) {
        console.log("  MockUSDC already verified");
      } else {
        console.error("  MockUSDC verification failed:", message);
      }
    }
  }

  // ────────────────────────────────────────────
  // Verify ChainGigEscrow
  // ────────────────────────────────────────────
  console.log("\n[2/4] Verifying ChainGigEscrow...");
  try {
    await run("verify:verify", {
      address: contracts.ChainGigEscrow,
      constructorArguments: [contracts.MockUSDC, deployment.deployer],
    });
    console.log("  ChainGigEscrow verified");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Already Verified")) {
      console.log("  ChainGigEscrow already verified");
    } else {
      console.error("  ChainGigEscrow verification failed:", message);
    }
  }

  // ────────────────────────────────────────────
  // Verify ChainGigReputation
  // ────────────────────────────────────────────
  console.log("\n[3/4] Verifying ChainGigReputation...");
  try {
    await run("verify:verify", {
      address: contracts.ChainGigReputation,
      constructorArguments: [contracts.ChainGigEscrow],
    });
    console.log("  ChainGigReputation verified");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Already Verified")) {
      console.log("  ChainGigReputation already verified");
    } else {
      console.error("  ChainGigReputation verification failed:", message);
    }
  }

  // ────────────────────────────────────────────
  // Verify ChainGigDispute
  // ────────────────────────────────────────────
  console.log("\n[4/4] Verifying ChainGigDispute...");
  try {
    await run("verify:verify", {
      address: contracts.ChainGigDispute,
      constructorArguments: [contracts.ChainGigEscrow],
    });
    console.log("  ChainGigDispute verified");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Already Verified")) {
      console.log("  ChainGigDispute already verified");
    } else {
      console.error("  ChainGigDispute verification failed:", message);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("VERIFICATION COMPLETE");
  console.log("=".repeat(60));
  console.log("\nCheck contracts on Basescan:");
  if (network.name === "baseSepolia") {
    console.log(`  https://sepolia.basescan.org/address/${contracts.ChainGigEscrow}`);
    console.log(`  https://sepolia.basescan.org/address/${contracts.ChainGigReputation}`);
    console.log(`  https://sepolia.basescan.org/address/${contracts.ChainGigDispute}`);
  } else {
    console.log(`  https://basescan.org/address/${contracts.ChainGigEscrow}`);
    console.log(`  https://basescan.org/address/${contracts.ChainGigReputation}`);
    console.log(`  https://basescan.org/address/${contracts.ChainGigDispute}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
