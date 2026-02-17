import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ChainGigEscrow, ChainGigReputation, MockUSDC } from "../typechain-types";

describe("ChainGigReputation (SBT)", function () {
  // ─── Shared Fixture ───────────────────────────────────────
  async function deployFixture() {
    const [owner, client, freelancer, other] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();

    const Reputation = await ethers.getContractFactory("ChainGigReputation");
    const reputation = await Reputation.deploy(ethers.ZeroAddress);

    const Dispute = await ethers.getContractFactory("ChainGigDispute");
    const dispute = await Dispute.deploy(ethers.ZeroAddress);

    const Escrow = await ethers.getContractFactory("ChainGigEscrow");
    const escrow = await Escrow.deploy(await usdc.getAddress(), owner.address);

    // Wire
    await escrow.setReputationContract(await reputation.getAddress());
    await escrow.setDisputeContract(await dispute.getAddress());
    await reputation.setEscrowContract(await escrow.getAddress());
    await dispute.setEscrow(await escrow.getAddress());
    await dispute.addArbitrator(owner.address);
    await dispute.addArbitrator(client.address);
    await dispute.addArbitrator(freelancer.address);

    // Fund client
    const mintAmount = ethers.parseUnits("50000", 6);
    await usdc.mint(client.address, mintAmount);
    await usdc.connect(client).approve(await escrow.getAddress(), mintAmount);

    return { escrow, usdc, reputation, dispute, owner, client, freelancer, other };
  }

  // Helper: complete a full job from creation to SBT issuance
  async function completeJob(
    escrow: ChainGigEscrow,
    client: HardhatEthersSigner,
    freelancer: HardhatEthersSigner,
    amount: bigint = ethers.parseUnits("100", 6),
    title: string = "Build DApp"
  ) {
    const deadline = (await time.latest()) + 7 * 24 * 60 * 60;
    await escrow.connect(client).createJob(
      title, "QmDesc", "development",
      ["Milestone 1"], ["QmMilestone"],
      [amount], deadline
    );
    const jobId = await escrow.jobCounter();
    await escrow.connect(client).assignFreelancer(jobId, freelancer.address);
    await escrow.connect(freelancer).submitMilestone(jobId, 0n, "QmDeliverable");
    await escrow.connect(client).approveMilestone(jobId, 0n);
    return jobId;
  }

  // ═══════════════════════════════════════════
  // SBT ISSUANCE
  // ═══════════════════════════════════════════
  describe("Credential Issuance", function () {
    it("Should issue SBT to freelancer on job completion", async function () {
      const { escrow, reputation, client, freelancer } = await loadFixture(deployFixture);

      await completeJob(escrow, client, freelancer);

      const creds = await reputation.getCredentials(freelancer.address);
      expect(creds.length).to.equal(1);
      expect(creds[0].jobTitle).to.equal("Build DApp");
      expect(creds[0].client).to.equal(client.address);
      expect(creds[0].freelancer).to.equal(freelancer.address);
      expect(creds[0].amountEarned).to.equal(ethers.parseUnits("100", 6));
      expect(creds[0].category).to.equal("development");
      expect(creds[0].ratingSet).to.equal(false);
    });

    it("Should track completedJobs counter", async function () {
      const { escrow, reputation, client, freelancer } = await loadFixture(deployFixture);

      await completeJob(escrow, client, freelancer, ethers.parseUnits("50", 6), "Job 1");
      await completeJob(escrow, client, freelancer, ethers.parseUnits("75", 6), "Job 2");

      expect(await reputation.completedJobs(freelancer.address)).to.equal(2n);
    });

    it("Should track totalEarned", async function () {
      const { escrow, reputation, client, freelancer } = await loadFixture(deployFixture);

      await completeJob(escrow, client, freelancer, ethers.parseUnits("50", 6), "Job 1");
      await completeJob(escrow, client, freelancer, ethers.parseUnits("75", 6), "Job 2");

      const total = ethers.parseUnits("50", 6) + ethers.parseUnits("75", 6);
      expect(await reputation.totalEarned(freelancer.address)).to.equal(total);
    });

    it("Should emit Locked event on issuance", async function () {
      const { escrow, reputation, client, freelancer } = await loadFixture(deployFixture);
      const deadline = (await time.latest()) + 7 * 24 * 60 * 60;

      await escrow.connect(client).createJob(
        "Test", "QmDesc", "dev",
        ["M1"], ["QmM"], [ethers.parseUnits("10", 6)], deadline
      );
      await escrow.connect(client).assignFreelancer(1n, freelancer.address);
      await escrow.connect(freelancer).submitMilestone(1n, 0n, "QmWork");

      await expect(
        escrow.connect(client).approveMilestone(1n, 0n)
      ).to.emit(reputation, "Locked");
    });

    it("Should revert issueCredential from non-escrow address", async function () {
      const { reputation, client, freelancer } = await loadFixture(deployFixture);

      await expect(
        reputation.connect(client).issueCredential(
          freelancer.address, client.address, 1n,
          "Fake Job", ethers.parseUnits("100", 6), "dev"
        )
      ).to.be.revertedWithCustomError(reputation, "CG_OnlyEscrow");
    });
  });

  // ═══════════════════════════════════════════
  // NON-TRANSFERABLE (SOULBOUND)
  // ═══════════════════════════════════════════
  describe("SoulBound Enforcement", function () {
    it("Should revert on transferFrom", async function () {
      const { escrow, reputation, client, freelancer } = await loadFixture(deployFixture);

      await completeJob(escrow, client, freelancer);

      await expect(
        reputation.connect(freelancer).transferFrom(
          freelancer.address, client.address, 1n
        )
      ).to.be.revertedWithCustomError(reputation, "CG_NonTransferable");
    });

    it("Should revert on safeTransferFrom", async function () {
      const { escrow, reputation, client, freelancer } = await loadFixture(deployFixture);

      await completeJob(escrow, client, freelancer);

      await expect(
        reputation.connect(freelancer)["safeTransferFrom(address,address,uint256)"](
          freelancer.address, client.address, 1n
        )
      ).to.be.revertedWithCustomError(reputation, "CG_NonTransferable");
    });

    it("Should report token as locked (EIP-5192)", async function () {
      const { escrow, reputation, client, freelancer } = await loadFixture(deployFixture);

      await completeJob(escrow, client, freelancer);

      expect(await reputation.locked(1n)).to.equal(true);
    });
  });

  // ═══════════════════════════════════════════
  // RATING SYSTEM
  // ═══════════════════════════════════════════
  describe("Rating", function () {
    it("Should allow client to rate freelancer 1-5", async function () {
      const { escrow, reputation, client, freelancer } = await loadFixture(deployFixture);

      const jobId = await completeJob(escrow, client, freelancer);
      await reputation.connect(client).setRating(jobId, 5);

      const creds = await reputation.getCredentials(freelancer.address);
      expect(creds[0].rating).to.equal(5);
      expect(creds[0].ratingSet).to.equal(true);
    });

    it("Should calculate reputation score correctly (single job)", async function () {
      const { escrow, reputation, client, freelancer } = await loadFixture(deployFixture);

      const jobId = await completeJob(escrow, client, freelancer);
      await reputation.connect(client).setRating(jobId, 4);

      // 4 * 100 = 400
      expect(await reputation.reputationScore(freelancer.address)).to.equal(400n);
    });

    it("Should calculate weighted average reputation (multiple jobs)", async function () {
      const { escrow, reputation, client, freelancer } = await loadFixture(deployFixture);

      const jobId1 = await completeJob(escrow, client, freelancer, ethers.parseUnits("50", 6), "Job 1");
      await reputation.connect(client).setRating(jobId1, 5);

      const jobId2 = await completeJob(escrow, client, freelancer, ethers.parseUnits("75", 6), "Job 2");
      await reputation.connect(client).setRating(jobId2, 3);

      // Weighted avg: ((500 * 1) + (300)) / 2 = 400
      expect(await reputation.reputationScore(freelancer.address)).to.equal(400n);
    });

    it("Should revert rating below 1", async function () {
      const { escrow, reputation, client, freelancer } = await loadFixture(deployFixture);

      const jobId = await completeJob(escrow, client, freelancer);

      await expect(
        reputation.connect(client).setRating(jobId, 0)
      ).to.be.revertedWithCustomError(reputation, "CG_InvalidRating");
    });

    it("Should revert rating above 5", async function () {
      const { escrow, reputation, client, freelancer } = await loadFixture(deployFixture);

      const jobId = await completeJob(escrow, client, freelancer);

      await expect(
        reputation.connect(client).setRating(jobId, 6)
      ).to.be.revertedWithCustomError(reputation, "CG_InvalidRating");
    });

    it("Should revert double rating", async function () {
      const { escrow, reputation, client, freelancer } = await loadFixture(deployFixture);

      const jobId = await completeJob(escrow, client, freelancer);
      await reputation.connect(client).setRating(jobId, 5);

      await expect(
        reputation.connect(client).setRating(jobId, 3)
      ).to.be.revertedWithCustomError(reputation, "CG_AlreadyRated");
    });

    it("Should revert rating from non-client", async function () {
      const { escrow, reputation, client, freelancer, other } = await loadFixture(deployFixture);

      const jobId = await completeJob(escrow, client, freelancer);

      await expect(
        reputation.connect(other).setRating(jobId, 5)
      ).to.be.revertedWithCustomError(reputation, "CG_NotClient");
    });

    it("Should revert rating for non-existent credential", async function () {
      const { reputation, client } = await loadFixture(deployFixture);

      await expect(
        reputation.connect(client).setRating(999n, 5)
      ).to.be.revertedWithCustomError(reputation, "CG_NoCredentialForJob");
    });
  });

  // ═══════════════════════════════════════════
  // VIEW FUNCTIONS
  // ═══════════════════════════════════════════
  describe("View Functions", function () {
    it("Should return user token IDs", async function () {
      const { escrow, reputation, client, freelancer } = await loadFixture(deployFixture);

      await completeJob(escrow, client, freelancer, ethers.parseUnits("50", 6), "Job 1");
      await completeJob(escrow, client, freelancer, ethers.parseUnits("75", 6), "Job 2");

      const tokens = await reputation.getUserTokens(freelancer.address);
      expect(tokens.length).to.equal(2);
      expect(tokens[0]).to.equal(1n);
      expect(tokens[1]).to.equal(2n);
    });

    it("Should map jobId to tokenId", async function () {
      const { escrow, reputation, client, freelancer } = await loadFixture(deployFixture);

      const jobId = await completeJob(escrow, client, freelancer);

      expect(await reputation.jobToToken(jobId)).to.equal(1n);
    });
  });

  // ═══════════════════════════════════════════
  // ADMIN
  // ═══════════════════════════════════════════
  describe("Admin", function () {
    it("Should allow owner to update escrow contract", async function () {
      const { reputation, owner, other } = await loadFixture(deployFixture);
      await reputation.connect(owner).setEscrowContract(other.address);
      expect(await reputation.escrowContract()).to.equal(other.address);
    });

    it("Should revert setEscrowContract from non-owner", async function () {
      const { reputation, client, other } = await loadFixture(deployFixture);

      await expect(
        reputation.connect(client).setEscrowContract(other.address)
      ).to.be.revertedWithCustomError(reputation, "OwnableUnauthorizedAccount");
    });

    it("Should revert setEscrowContract with zero address", async function () {
      const { reputation, owner } = await loadFixture(deployFixture);

      await expect(
        reputation.connect(owner).setEscrowContract(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(reputation, "CG_ZeroAddress");
    });
  });
});
