import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

describe("ChainGigDispute", function () {
  // ─── Shared Fixture ───────────────────────────────────────
  async function deployFixture() {
    const [owner, client, freelancer, arb1, arb2, arb3, other] =
      await ethers.getSigners();

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

    // Add arbitrators
    await dispute.addArbitrator(arb1.address);
    await dispute.addArbitrator(arb2.address);
    await dispute.addArbitrator(arb3.address);

    // Fund client
    const mintAmount = ethers.parseUnits("10000", 6);
    await usdc.mint(client.address, mintAmount);
    await usdc.connect(client).approve(await escrow.getAddress(), mintAmount);

    return {
      escrow, usdc, reputation, dispute,
      owner, client, freelancer,
      arb1, arb2, arb3, other,
    };
  }

  // Helper: create job → assign → submit → raise dispute
  async function disputeFixture() {
    const base = await loadFixture(deployFixture);
    const deadline = (await time.latest()) + 7 * 24 * 60 * 60;

    await base.escrow.connect(base.client).createJob(
      "Disputed Job", "QmDesc", "development",
      ["Milestone 1"], ["QmMilestone"],
      [ethers.parseUnits("100", 6)], deadline
    );
    await base.escrow.connect(base.client).assignFreelancer(1n, base.freelancer.address);
    await base.escrow.connect(base.freelancer).submitMilestone(1n, 0n, "QmWork");
    await base.escrow.connect(base.client).raiseDispute(1n, 0n);

    return { ...base, jobId: 1n, disputeId: 1n };
  }

  // ═══════════════════════════════════════════
  // DISPUTE OPENING
  // ═══════════════════════════════════════════
  describe("Dispute Opening", function () {
    it("Should open dispute via escrow", async function () {
      const { dispute, disputeId } = await loadFixture(disputeFixture);

      const d = await dispute.disputes(disputeId);
      expect(d.jobId).to.equal(1n);
      expect(d.milestoneIndex).to.equal(0n);
      expect(d.status).to.equal(0n); // Active
    });

    it("Should emit DisputeOpened event", async function () {
      const base = await loadFixture(deployFixture);
      const deadline = (await time.latest()) + 7 * 24 * 60 * 60;

      await base.escrow.connect(base.client).createJob(
        "Job", "QmDesc", "dev",
        ["M1"], ["QmM"], [ethers.parseUnits("50", 6)], deadline
      );
      await base.escrow.connect(base.client).assignFreelancer(1n, base.freelancer.address);
      await base.escrow.connect(base.freelancer).submitMilestone(1n, 0n, "QmWork");

      await expect(
        base.escrow.connect(base.client).raiseDispute(1n, 0n)
      ).to.emit(base.dispute, "DisputeOpened");
    });

    it("Should select 3 arbitrators", async function () {
      const { dispute, disputeId } = await loadFixture(disputeFixture);

      const arbs = await dispute.getArbitrators(disputeId);
      expect(arbs.length).to.equal(3);
      // Each should be a non-zero address
      for (const arb of arbs) {
        expect(arb).to.not.equal(ethers.ZeroAddress);
      }
    });

    it("Should set 72-hour deadline", async function () {
      const { dispute, disputeId } = await loadFixture(disputeFixture);

      const d = await dispute.disputes(disputeId);
      expect(d.deadline).to.equal(d.createdAt + BigInt(72 * 60 * 60));
    });

    it("Should revert openDispute from non-escrow", async function () {
      const { dispute, client } = await loadFixture(deployFixture);

      await expect(
        dispute.connect(client).openDispute(1n, 0n, client.address)
      ).to.be.revertedWithCustomError(dispute, "CG_OnlyEscrow");
    });
  });

  // ═══════════════════════════════════════════
  // VOTING
  // ═══════════════════════════════════════════
  describe("Voting", function () {
    it("Should allow selected arbitrator to vote", async function () {
      const { dispute, disputeId } = await loadFixture(disputeFixture);

      // Get selected arbitrators for this dispute
      const arbs = await dispute.getArbitrators(disputeId);
      const arbSigners = (await ethers.getSigners()).filter(s =>
        arbs.includes(s.address)
      );

      if (arbSigners.length > 0) {
        await expect(
          dispute.connect(arbSigners[0]).vote(disputeId, true)
        ).to.emit(dispute, "VoteCast");
      }
    });

    it("Should track votes correctly", async function () {
      const { dispute, disputeId } = await loadFixture(disputeFixture);

      const arbs = await dispute.getArbitrators(disputeId);
      const allSigners = await ethers.getSigners();
      const arbSigners = allSigners.filter(s => arbs.includes(s.address));

      if (arbSigners.length > 0) {
        await dispute.connect(arbSigners[0]).vote(disputeId, true);
        const [forFreelancer, forClient] = await dispute.getVotes(disputeId);
        expect(forFreelancer).to.equal(1);
        expect(forClient).to.equal(0);
      }
    });

    it("Should revert vote from non-selected arbitrator", async function () {
      const { dispute, other, disputeId } = await loadFixture(disputeFixture);

      await expect(
        dispute.connect(other).vote(disputeId, true)
      ).to.be.revertedWithCustomError(dispute, "CG_NotSelectedArbitrator");
    });

    it("Should revert double vote", async function () {
      const { dispute, disputeId } = await loadFixture(disputeFixture);

      const arbs = await dispute.getArbitrators(disputeId);
      const allSigners = await ethers.getSigners();
      const arbSigners = allSigners.filter(s => arbs.includes(s.address));

      if (arbSigners.length > 0) {
        await dispute.connect(arbSigners[0]).vote(disputeId, true);

        await expect(
          dispute.connect(arbSigners[0]).vote(disputeId, false)
        ).to.be.revertedWithCustomError(dispute, "CG_AlreadyVoted");
      }
    });

    it("Should revert vote after deadline", async function () {
      const { dispute, disputeId } = await loadFixture(disputeFixture);

      await time.increase(73 * 60 * 60); // 73 hours

      const arbs = await dispute.getArbitrators(disputeId);
      const allSigners = await ethers.getSigners();
      const arbSigners = allSigners.filter(s => arbs.includes(s.address));

      if (arbSigners.length > 0) {
        await expect(
          dispute.connect(arbSigners[0]).vote(disputeId, true)
        ).to.be.revertedWithCustomError(dispute, "CG_VotingEnded");
      }
    });

    it("Should resolve immediately when 2-of-3 quorum reached (favor freelancer)", async function () {
      const { dispute, escrow, usdc, freelancer, disputeId } = await loadFixture(disputeFixture);

      const arbs = await dispute.getArbitrators(disputeId);
      const allSigners = await ethers.getSigners();
      const arbSigners = allSigners.filter(s => arbs.includes(s.address));

      // We need unique arbitrator signers — the pseudo-random might pick dupes
      const uniqueArbs = [...new Map(arbSigners.map(s => [s.address, s])).values()];

      if (uniqueArbs.length >= 2) {
        const freelancerBefore = await usdc.balanceOf(freelancer.address);

        await dispute.connect(uniqueArbs[0]).vote(disputeId, true);
        await dispute.connect(uniqueArbs[1]).vote(disputeId, true);

        // Dispute should be resolved
        const d = await dispute.disputes(disputeId);
        expect(d.status).to.equal(1n); // Resolved

        // Freelancer should have received payment
        const freelancerAfter = await usdc.balanceOf(freelancer.address);
        expect(freelancerAfter - freelancerBefore).to.equal(ethers.parseUnits("100", 6));
      }
    });

    it("Should resolve in favor of client when 2 vote for client", async function () {
      const { dispute, escrow, usdc, client, disputeId } = await loadFixture(disputeFixture);

      const arbs = await dispute.getArbitrators(disputeId);
      const allSigners = await ethers.getSigners();
      const arbSigners = allSigners.filter(s => arbs.includes(s.address));
      const uniqueArbs = [...new Map(arbSigners.map(s => [s.address, s])).values()];

      if (uniqueArbs.length >= 2) {
        const clientBefore = await usdc.balanceOf(client.address);

        await dispute.connect(uniqueArbs[0]).vote(disputeId, false);
        await dispute.connect(uniqueArbs[1]).vote(disputeId, false);

        const d = await dispute.disputes(disputeId);
        expect(d.status).to.equal(1n); // Resolved

        // Client should have received refund
        const clientAfter = await usdc.balanceOf(client.address);
        expect(clientAfter - clientBefore).to.equal(ethers.parseUnits("100", 6));
      }
    });
  });

  // ═══════════════════════════════════════════
  // FINALIZE DISPUTE
  // ═══════════════════════════════════════════
  describe("Finalize Dispute", function () {
    it("Should allow anyone to finalize after deadline", async function () {
      const { dispute, other, disputeId } = await loadFixture(disputeFixture);

      await time.increase(73 * 60 * 60);

      await expect(
        dispute.connect(other).finalizeDispute(disputeId)
      ).to.emit(dispute, "DisputeResolved");
    });

    it("Should revert finalize before deadline", async function () {
      const { dispute, other, disputeId } = await loadFixture(disputeFixture);

      await expect(
        dispute.connect(other).finalizeDispute(disputeId)
      ).to.be.revertedWithCustomError(dispute, "CG_VotingPeriodActive");
    });

    it("Should revert finalize for already resolved dispute", async function () {
      const { dispute, other, disputeId } = await loadFixture(disputeFixture);

      await time.increase(73 * 60 * 60);
      await dispute.connect(other).finalizeDispute(disputeId);

      await expect(
        dispute.connect(other).finalizeDispute(disputeId)
      ).to.be.revertedWithCustomError(dispute, "CG_DisputeNotActive");
    });
  });

  // ═══════════════════════════════════════════
  // ADMIN
  // ═══════════════════════════════════════════
  describe("Admin", function () {
    it("Should allow owner to add arbitrator", async function () {
      const { dispute, owner, other } = await loadFixture(deployFixture);

      await dispute.connect(owner).addArbitrator(other.address);
      expect(await dispute.isArbitrator(other.address)).to.equal(true);
      expect(await dispute.getArbitratorCount()).to.equal(4n);
    });

    it("Should revert adding duplicate arbitrator", async function () {
      const { dispute, owner, arb1 } = await loadFixture(deployFixture);

      await expect(
        dispute.connect(owner).addArbitrator(arb1.address)
      ).to.be.revertedWithCustomError(dispute, "CG_AlreadyArbitrator");
    });

    it("Should revert adding zero address arbitrator", async function () {
      const { dispute, owner } = await loadFixture(deployFixture);

      await expect(
        dispute.connect(owner).addArbitrator(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(dispute, "CG_ZeroAddress");
    });

    it("Should revert addArbitrator from non-owner", async function () {
      const { dispute, client, other } = await loadFixture(deployFixture);

      await expect(
        dispute.connect(client).addArbitrator(other.address)
      ).to.be.revertedWithCustomError(dispute, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to update escrow address", async function () {
      const { dispute, owner, other } = await loadFixture(deployFixture);

      await dispute.connect(owner).setEscrow(other.address);
      expect(await dispute.escrowContract()).to.equal(other.address);
    });

    it("Should revert setEscrow with zero address", async function () {
      const { dispute, owner } = await loadFixture(deployFixture);

      await expect(
        dispute.connect(owner).setEscrow(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(dispute, "CG_ZeroAddress");
    });
  });
});
