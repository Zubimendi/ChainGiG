import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import {
  ChainGigEscrow,
  ChainGigReputation,
  ChainGigDispute,
  MockUSDC,
} from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("ChainGigEscrow", function () {
  // ─── Shared Fixture ───────────────────────────────────────
  async function deployFixture() {
    const [owner, client, freelancer, arbitrator1, arbitrator2, arbitrator3, other] =
      await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();

    // Deploy Reputation (with zero address, will wire later)
    const Reputation = await ethers.getContractFactory("ChainGigReputation");
    const reputation = await Reputation.deploy(ethers.ZeroAddress);

    // Deploy Dispute (with zero address, will wire later)
    const Dispute = await ethers.getContractFactory("ChainGigDispute");
    const dispute = await Dispute.deploy(ethers.ZeroAddress);

    // Deploy Escrow
    const Escrow = await ethers.getContractFactory("ChainGigEscrow");
    const escrow = await Escrow.deploy(await usdc.getAddress(), owner.address);

    // Wire contracts together
    await escrow.setReputationContract(await reputation.getAddress());
    await escrow.setDisputeContract(await dispute.getAddress());
    await reputation.setEscrowContract(await escrow.getAddress());
    await dispute.setEscrow(await escrow.getAddress());

    // Add arbitrators
    await dispute.addArbitrator(arbitrator1.address);
    await dispute.addArbitrator(arbitrator2.address);
    await dispute.addArbitrator(arbitrator3.address);

    // Mint USDC to client (10,000 USDC)
    const mintAmount = ethers.parseUnits("10000", 6);
    await usdc.mint(client.address, mintAmount);

    // Approve escrow to spend client's USDC
    await usdc.connect(client).approve(await escrow.getAddress(), mintAmount);

    return {
      escrow, usdc, reputation, dispute,
      owner, client, freelancer, other,
      arbitrator1, arbitrator2, arbitrator3,
    };
  }

  // Helper: create a standard job
  async function createStandardJob(
    escrow: ChainGigEscrow,
    client: HardhatEthersSigner,
    amounts: bigint[] = [ethers.parseUnits("100", 6)]
  ) {
    const deadline = (await time.latest()) + 7 * 24 * 60 * 60;
    const titles = amounts.map((_, i) => `Milestone ${i + 1}`);
    const descs = amounts.map((_, i) => `QmDesc${i + 1}`);

    await escrow.connect(client).createJob(
      "Build DApp Frontend",
      "QmJobDescription",
      "development",
      titles,
      descs,
      amounts,
      deadline
    );
  }

  // ═══════════════════════════════════════════
  // JOB CREATION TESTS
  // ═══════════════════════════════════════════
  describe("Job Creation", function () {
    it("Should create a job and lock USDC in escrow", async function () {
      const { escrow, usdc, client } = await loadFixture(deployFixture);

      const amounts = [
        ethers.parseUnits("50", 6),
        ethers.parseUnits("100", 6),
      ];
      const total = amounts.reduce((a, b) => a + b, 0n);
      const fee = (total * 250n) / 10000n;

      const clientBalanceBefore = await usdc.balanceOf(client.address);

      await createStandardJob(escrow, client, amounts);

      // USDC locked in escrow
      const escrowBalance = await usdc.balanceOf(await escrow.getAddress());
      expect(escrowBalance).to.equal(total + fee);

      // Client balance decreased
      const clientBalanceAfter = await usdc.balanceOf(client.address);
      expect(clientBalanceBefore - clientBalanceAfter).to.equal(total + fee);

      // Job state
      const job = await escrow.getJob(1n);
      expect(job.client).to.equal(client.address);
      expect(job.totalAmount).to.equal(total);
      expect(job.status).to.equal(0n); // Open
      expect(job.milestoneCount).to.equal(2n);
    });

    it("Should emit JobCreated event", async function () {
      const { escrow, client } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("100", 6);
      const deadline = (await time.latest()) + 7 * 24 * 60 * 60;

      await expect(
        escrow.connect(client).createJob(
          "Test Job", "QmHash", "development",
          ["M1"], ["QmDesc"], [amount], deadline
        )
      ).to.emit(escrow, "JobCreated")
        .withArgs(1n, client.address, amount, "development");
    });

    it("Should revert if no milestones provided", async function () {
      const { escrow, client } = await loadFixture(deployFixture);
      const deadline = (await time.latest()) + 7 * 24 * 60 * 60;

      await expect(
        escrow.connect(client).createJob(
          "Test", "Qm", "dev", [], [], [], deadline
        )
      ).to.be.revertedWithCustomError(escrow, "CG_NoMilestones");
    });

    it("Should revert if more than 10 milestones", async function () {
      const { escrow, client } = await loadFixture(deployFixture);
      const deadline = (await time.latest()) + 7 * 24 * 60 * 60;
      const amounts = Array(11).fill(ethers.parseUnits("10", 6));
      const titles = Array(11).fill("M");
      const descs = Array(11).fill("Qm");

      await expect(
        escrow.connect(client).createJob(
          "Test", "Qm", "dev", titles, descs, amounts, deadline
        )
      ).to.be.revertedWithCustomError(escrow, "CG_MaxMilestones");
    });

    it("Should revert if milestone arrays mismatch (titles)", async function () {
      const { escrow, client } = await loadFixture(deployFixture);
      const deadline = (await time.latest()) + 7 * 24 * 60 * 60;

      await expect(
        escrow.connect(client).createJob(
          "Test", "Qm", "dev",
          ["M1", "M2"], ["QmDesc"],
          [ethers.parseUnits("10", 6)], deadline
        )
      ).to.be.revertedWithCustomError(escrow, "CG_MismatchTitles");
    });

    it("Should revert if milestone arrays mismatch (descriptions)", async function () {
      const { escrow, client } = await loadFixture(deployFixture);
      const deadline = (await time.latest()) + 7 * 24 * 60 * 60;

      await expect(
        escrow.connect(client).createJob(
          "Test", "Qm", "dev",
          ["M1"], ["QmDesc1", "QmDesc2"],
          [ethers.parseUnits("10", 6)], deadline
        )
      ).to.be.revertedWithCustomError(escrow, "CG_MismatchDescriptions");
    });

    it("Should revert if deadline is less than 1 day", async function () {
      const { escrow, client } = await loadFixture(deployFixture);
      const badDeadline = (await time.latest()) + 3600;

      await expect(
        escrow.connect(client).createJob(
          "Test", "Qm", "dev",
          ["M1"], ["Qm"], [ethers.parseUnits("10", 6)], badDeadline
        )
      ).to.be.revertedWithCustomError(escrow, "CG_DeadlineTooSoon");
    });

    it("Should revert if milestone amount below 1 USDC", async function () {
      const { escrow, client } = await loadFixture(deployFixture);
      const deadline = (await time.latest()) + 7 * 24 * 60 * 60;

      await expect(
        escrow.connect(client).createJob(
          "Test", "Qm", "dev",
          ["M1"], ["Qm"], [ethers.parseUnits("0.5", 6)], deadline
        )
      ).to.be.revertedWithCustomError(escrow, "CG_MinOneUSDC");
    });

    it("Should store milestones correctly", async function () {
      const { escrow, client } = await loadFixture(deployFixture);
      const amounts = [
        ethers.parseUnits("50", 6),
        ethers.parseUnits("75", 6),
      ];
      await createStandardJob(escrow, client, amounts);

      const milestones = await escrow.getMilestones(1n);
      expect(milestones.length).to.equal(2);
      expect(milestones[0].amount).to.equal(amounts[0]);
      expect(milestones[1].amount).to.equal(amounts[1]);
      expect(milestones[0].status).to.equal(0n); // Pending
    });

    it("Should track client jobs", async function () {
      const { escrow, client } = await loadFixture(deployFixture);
      await createStandardJob(escrow, client);
      await createStandardJob(escrow, client);

      const jobs = await escrow.getClientJobs(client.address);
      expect(jobs.length).to.equal(2);
      expect(jobs[0]).to.equal(1n);
      expect(jobs[1]).to.equal(2n);
    });
  });

  // ═══════════════════════════════════════════
  // FREELANCER ASSIGNMENT TESTS
  // ═══════════════════════════════════════════
  describe("Freelancer Assignment", function () {
    async function jobCreatedFixture() {
      const base = await loadFixture(deployFixture);
      await createStandardJob(base.escrow, base.client);
      return { ...base, jobId: 1n };
    }

    it("Should allow client to assign freelancer", async function () {
      const { escrow, client, freelancer, jobId } = await loadFixture(jobCreatedFixture);

      await escrow.connect(client).assignFreelancer(jobId, freelancer.address);

      const job = await escrow.getJob(jobId);
      expect(job.freelancer).to.equal(freelancer.address);
      expect(job.status).to.equal(1n); // InProgress
    });

    it("Should emit FreelancerAssigned event", async function () {
      const { escrow, client, freelancer, jobId } = await loadFixture(jobCreatedFixture);

      await expect(
        escrow.connect(client).assignFreelancer(jobId, freelancer.address)
      ).to.emit(escrow, "FreelancerAssigned")
        .withArgs(jobId, freelancer.address);
    });

    it("Should track freelancer jobs", async function () {
      const { escrow, client, freelancer, jobId } = await loadFixture(jobCreatedFixture);
      await escrow.connect(client).assignFreelancer(jobId, freelancer.address);

      const jobs = await escrow.getFreelancerJobs(freelancer.address);
      expect(jobs.length).to.equal(1);
      expect(jobs[0]).to.equal(jobId);
    });

    it("Should revert if non-client tries to assign", async function () {
      const { escrow, freelancer, jobId } = await loadFixture(jobCreatedFixture);

      await expect(
        escrow.connect(freelancer).assignFreelancer(jobId, freelancer.address)
      ).to.be.revertedWithCustomError(escrow, "CG_NotClient");
    });

    it("Should revert if client tries to assign themselves", async function () {
      const { escrow, client, jobId } = await loadFixture(jobCreatedFixture);

      await expect(
        escrow.connect(client).assignFreelancer(jobId, client.address)
      ).to.be.revertedWithCustomError(escrow, "CG_ClientCannotBeFreelancer");
    });

    it("Should revert if assigning zero address", async function () {
      const { escrow, client, jobId } = await loadFixture(jobCreatedFixture);

      await expect(
        escrow.connect(client).assignFreelancer(jobId, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(escrow, "CG_ZeroAddress");
    });

    it("Should revert if job is not open", async function () {
      const { escrow, client, freelancer, other, jobId } = await loadFixture(jobCreatedFixture);
      await escrow.connect(client).assignFreelancer(jobId, freelancer.address);

      await expect(
        escrow.connect(client).assignFreelancer(jobId, other.address)
      ).to.be.revertedWithCustomError(escrow, "CG_NotOpen");
    });
  });

  // ═══════════════════════════════════════════
  // MILESTONE FLOW TESTS
  // ═══════════════════════════════════════════
  describe("Milestone Flow", function () {
    async function inProgressFixture() {
      const base = await loadFixture(deployFixture);
      await createStandardJob(base.escrow, base.client);
      await base.escrow.connect(base.client).assignFreelancer(1n, base.freelancer.address);
      return { ...base, jobId: 1n };
    }

    it("Should allow freelancer to submit milestone", async function () {
      const { escrow, freelancer, jobId } = await loadFixture(inProgressFixture);

      await escrow.connect(freelancer).submitMilestone(jobId, 0n, "QmDeliverable123");

      const milestones = await escrow.getMilestones(jobId);
      expect(milestones[0].status).to.equal(1n); // Submitted
      expect(milestones[0].deliverableHash).to.equal("QmDeliverable123");
    });

    it("Should emit MilestoneSubmitted event", async function () {
      const { escrow, freelancer, jobId } = await loadFixture(inProgressFixture);

      await expect(
        escrow.connect(freelancer).submitMilestone(jobId, 0n, "QmDeliverable")
      ).to.emit(escrow, "MilestoneSubmitted")
        .withArgs(jobId, 0n, "QmDeliverable");
    });

    it("Should update job status to UnderReview on submission", async function () {
      const { escrow, freelancer, jobId } = await loadFixture(inProgressFixture);

      await escrow.connect(freelancer).submitMilestone(jobId, 0n, "QmDeliverable");

      const job = await escrow.getJob(jobId);
      expect(job.status).to.equal(2n); // UnderReview
    });

    it("Should release USDC to freelancer when milestone approved", async function () {
      const { escrow, usdc, client, freelancer, jobId } = await loadFixture(inProgressFixture);

      await escrow.connect(freelancer).submitMilestone(jobId, 0n, "QmDeliverable");

      const freelancerBefore = await usdc.balanceOf(freelancer.address);
      await escrow.connect(client).approveMilestone(jobId, 0n);
      const freelancerAfter = await usdc.balanceOf(freelancer.address);

      expect(freelancerAfter - freelancerBefore).to.equal(ethers.parseUnits("100", 6));
    });

    it("Should complete job and issue SBT after all milestones approved", async function () {
      const { escrow, reputation, client, freelancer, jobId } = await loadFixture(inProgressFixture);

      await escrow.connect(freelancer).submitMilestone(jobId, 0n, "QmDeliverable");
      await escrow.connect(client).approveMilestone(jobId, 0n);

      const job = await escrow.getJob(jobId);
      expect(job.status).to.equal(3n); // Completed

      // Check SBT was issued
      const creds = await reputation.getCredentials(freelancer.address);
      expect(creds.length).to.equal(1);
      expect(creds[0].jobTitle).to.equal("Build DApp Frontend");
    });

    it("Should transfer platform fee to feeRecipient on job completion", async function () {
      const { escrow, usdc, client, freelancer, owner, jobId } = await loadFixture(inProgressFixture);

      const feeRecipientBefore = await usdc.balanceOf(owner.address);

      await escrow.connect(freelancer).submitMilestone(jobId, 0n, "QmDeliverable");
      await escrow.connect(client).approveMilestone(jobId, 0n);

      const feeRecipientAfter = await usdc.balanceOf(owner.address);
      const expectedFee = (ethers.parseUnits("100", 6) * 250n) / 10000n;
      expect(feeRecipientAfter - feeRecipientBefore).to.equal(expectedFee);
    });

    it("Should revert submission from non-freelancer", async function () {
      const { escrow, client, jobId } = await loadFixture(inProgressFixture);

      await expect(
        escrow.connect(client).submitMilestone(jobId, 0n, "QmDeliverable")
      ).to.be.revertedWithCustomError(escrow, "CG_NotFreelancer");
    });

    it("Should revert submission with empty deliverable hash", async function () {
      const { escrow, freelancer, jobId } = await loadFixture(inProgressFixture);

      await expect(
        escrow.connect(freelancer).submitMilestone(jobId, 0n, "")
      ).to.be.revertedWithCustomError(escrow, "CG_EmptyDeliverable");
    });

    it("Should revert submission past deadline", async function () {
      const { escrow, freelancer, jobId } = await loadFixture(inProgressFixture);

      // Fast forward past the 7-day deadline
      await time.increase(8 * 24 * 60 * 60);

      await expect(
        escrow.connect(freelancer).submitMilestone(jobId, 0n, "QmDeliverable")
      ).to.be.revertedWithCustomError(escrow, "CG_PastDeadline");
    });

    it("Should revert approval from non-client", async function () {
      const { escrow, freelancer, jobId } = await loadFixture(inProgressFixture);

      await escrow.connect(freelancer).submitMilestone(jobId, 0n, "QmDeliverable");

      await expect(
        escrow.connect(freelancer).approveMilestone(jobId, 0n)
      ).to.be.revertedWithCustomError(escrow, "CG_NotClient");
    });

    it("Should revert approval of non-submitted milestone", async function () {
      const { escrow, client, jobId } = await loadFixture(inProgressFixture);

      await expect(
        escrow.connect(client).approveMilestone(jobId, 0n)
      ).to.be.revertedWithCustomError(escrow, "CG_NotSubmitted");
    });
  });

  // ═══════════════════════════════════════════
  // MILESTONE REJECTION TESTS
  // ═══════════════════════════════════════════
  describe("Milestone Rejection", function () {
    async function submittedFixture() {
      const base = await loadFixture(deployFixture);
      await createStandardJob(base.escrow, base.client);
      await base.escrow.connect(base.client).assignFreelancer(1n, base.freelancer.address);
      await base.escrow.connect(base.freelancer).submitMilestone(1n, 0n, "QmWork");
      return { ...base, jobId: 1n };
    }

    it("Should allow client to reject milestone", async function () {
      const { escrow, client, jobId } = await loadFixture(submittedFixture);

      await escrow.connect(client).rejectMilestone(jobId, 0n);

      const milestones = await escrow.getMilestones(jobId);
      expect(milestones[0].status).to.equal(3n); // Rejected
      expect(milestones[0].revision).to.equal(1);
    });

    it("Should emit MilestoneRejected event", async function () {
      const { escrow, client, jobId } = await loadFixture(submittedFixture);

      await expect(
        escrow.connect(client).rejectMilestone(jobId, 0n)
      ).to.emit(escrow, "MilestoneRejected")
        .withArgs(jobId, 0n, 1);
    });

    it("Should allow freelancer to resubmit after rejection", async function () {
      const { escrow, client, freelancer, jobId } = await loadFixture(submittedFixture);

      await escrow.connect(client).rejectMilestone(jobId, 0n);
      await escrow.connect(freelancer).submitMilestone(jobId, 0n, "QmRevised");

      const milestones = await escrow.getMilestones(jobId);
      expect(milestones[0].status).to.equal(1n); // Submitted
      expect(milestones[0].deliverableHash).to.equal("QmRevised");
    });

    it("Should revert rejection after max revisions (3)", async function () {
      const { escrow, client, freelancer, jobId } = await loadFixture(submittedFixture);

      // Reject → resubmit 3 times
      for (let i = 0; i < 3; i++) {
        await escrow.connect(client).rejectMilestone(jobId, 0n);
        if (i < 2) {
          await escrow.connect(freelancer).submitMilestone(jobId, 0n, `QmRev${i}`);
        }
      }

      // Resubmit for the 3rd rejection
      await escrow.connect(freelancer).submitMilestone(jobId, 0n, "QmRev3");

      // 4th rejection should fail
      await expect(
        escrow.connect(client).rejectMilestone(jobId, 0n)
      ).to.be.revertedWithCustomError(escrow, "CG_MaxRevisionsReached");
    });

    it("Should revert rejection from non-client", async function () {
      const { escrow, freelancer, jobId } = await loadFixture(submittedFixture);

      await expect(
        escrow.connect(freelancer).rejectMilestone(jobId, 0n)
      ).to.be.revertedWithCustomError(escrow, "CG_NotClient");
    });
  });

  // ═══════════════════════════════════════════
  // AUTO-APPROVE TESTS
  // ═══════════════════════════════════════════
  describe("Auto-Approve", function () {
    async function submittedFixture() {
      const base = await loadFixture(deployFixture);
      await createStandardJob(base.escrow, base.client);
      await base.escrow.connect(base.client).assignFreelancer(1n, base.freelancer.address);
      await base.escrow.connect(base.freelancer).submitMilestone(1n, 0n, "QmWork");
      return { ...base, jobId: 1n };
    }

    it("Should auto-approve after 7 days", async function () {
      const { escrow, usdc, freelancer, jobId } = await loadFixture(submittedFixture);

      await time.increase(7 * 24 * 60 * 60 + 1);

      const balanceBefore = await usdc.balanceOf(freelancer.address);
      await escrow.autoApproveMilestone(jobId, 0n);
      const balanceAfter = await usdc.balanceOf(freelancer.address);

      expect(balanceAfter - balanceBefore).to.equal(ethers.parseUnits("100", 6));
    });

    it("Should emit AutoApproved and MilestoneApproved events", async function () {
      const { escrow, jobId } = await loadFixture(submittedFixture);
      await time.increase(7 * 24 * 60 * 60 + 1);

      const tx = escrow.autoApproveMilestone(jobId, 0n);
      await expect(tx).to.emit(escrow, "AutoApproved").withArgs(jobId, 0n);
      await expect(tx).to.emit(escrow, "MilestoneApproved");
    });

    it("Should revert auto-approve before 7 days", async function () {
      const { escrow, jobId } = await loadFixture(submittedFixture);

      await time.increase(6 * 24 * 60 * 60);

      await expect(
        escrow.autoApproveMilestone(jobId, 0n)
      ).to.be.revertedWithCustomError(escrow, "CG_AutoApproveNotReady");
    });

    it("Should revert auto-approve for non-submitted milestone", async function () {
      const { escrow } = await loadFixture(submittedFixture);

      // Milestone index 1 doesn't exist for this single-milestone job
      // but we test with a pending milestone from a multi-milestone job
      const base = await loadFixture(deployFixture);
      const amounts = [ethers.parseUnits("50", 6), ethers.parseUnits("50", 6)];
      await createStandardJob(base.escrow, base.client, amounts);
      await base.escrow.connect(base.client).assignFreelancer(1n, base.freelancer.address);

      // Only submit milestone 0, not milestone 1
      await base.escrow.connect(base.freelancer).submitMilestone(1n, 0n, "QmWork");
      await time.increase(7 * 24 * 60 * 60 + 1);

      await expect(
        base.escrow.autoApproveMilestone(1n, 1n)
      ).to.be.revertedWithCustomError(base.escrow, "CG_NotSubmitted");
    });
  });

  // ═══════════════════════════════════════════
  // CANCELLATION TESTS
  // ═══════════════════════════════════════════
  describe("Job Cancellation", function () {
    it("Should refund client on cancellation before assignment", async function () {
      const { escrow, usdc, client } = await loadFixture(deployFixture);

      const balanceBefore = await usdc.balanceOf(client.address);
      await createStandardJob(escrow, client);
      await escrow.connect(client).cancelJob(1n);
      const balanceAfter = await usdc.balanceOf(client.address);

      expect(balanceAfter).to.equal(balanceBefore);
    });

    it("Should emit JobCancelled event with correct refund amount", async function () {
      const { escrow, client } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("100", 6);
      const fee = (amount * 250n) / 10000n;
      await createStandardJob(escrow, client);

      await expect(
        escrow.connect(client).cancelJob(1n)
      ).to.emit(escrow, "JobCancelled")
        .withArgs(1n, amount + fee);
    });

    it("Should set job status to Cancelled", async function () {
      const { escrow, client } = await loadFixture(deployFixture);
      await createStandardJob(escrow, client);
      await escrow.connect(client).cancelJob(1n);

      const job = await escrow.getJob(1n);
      expect(job.status).to.equal(5n); // Cancelled
    });

    it("Should revert cancel if freelancer already assigned", async function () {
      const { escrow, client, freelancer } = await loadFixture(deployFixture);
      await createStandardJob(escrow, client);
      await escrow.connect(client).assignFreelancer(1n, freelancer.address);

      await expect(
        escrow.connect(client).cancelJob(1n)
      ).to.be.revertedWithCustomError(escrow, "CG_CannotCancelInProgress");
    });

    it("Should revert cancel from non-client", async function () {
      const { escrow, client, freelancer } = await loadFixture(deployFixture);
      await createStandardJob(escrow, client);

      await expect(
        escrow.connect(freelancer).cancelJob(1n)
      ).to.be.revertedWithCustomError(escrow, "CG_NotClient");
    });
  });

  // ═══════════════════════════════════════════
  // DISPUTE TESTS (via Escrow)
  // ═══════════════════════════════════════════
  describe("Dispute Raising", function () {
    async function submittedFixture() {
      const base = await loadFixture(deployFixture);
      await createStandardJob(base.escrow, base.client);
      await base.escrow.connect(base.client).assignFreelancer(1n, base.freelancer.address);
      await base.escrow.connect(base.freelancer).submitMilestone(1n, 0n, "QmWork");
      return { ...base, jobId: 1n };
    }

    it("Should allow client to raise dispute", async function () {
      const { escrow, client, jobId } = await loadFixture(submittedFixture);

      await escrow.connect(client).raiseDispute(jobId, 0n);

      const job = await escrow.getJob(jobId);
      expect(job.status).to.equal(4n); // Disputed
    });

    it("Should allow freelancer to raise dispute", async function () {
      const { escrow, freelancer, jobId } = await loadFixture(submittedFixture);

      await escrow.connect(freelancer).raiseDispute(jobId, 0n);

      const job = await escrow.getJob(jobId);
      expect(job.status).to.equal(4n); // Disputed
    });

    it("Should emit DisputeRaised event", async function () {
      const { escrow, client, jobId } = await loadFixture(submittedFixture);

      await expect(
        escrow.connect(client).raiseDispute(jobId, 0n)
      ).to.emit(escrow, "DisputeRaised")
        .withArgs(jobId, 0n, client.address);
    });

    it("Should revert dispute from non-party", async function () {
      const { escrow, other, jobId } = await loadFixture(submittedFixture);

      await expect(
        escrow.connect(other).raiseDispute(jobId, 0n)
      ).to.be.revertedWithCustomError(escrow, "CG_NotAParty");
    });

    it("Should revert resolveDispute from non-dispute-contract", async function () {
      const { escrow, client, jobId } = await loadFixture(submittedFixture);

      await expect(
        escrow.connect(client).resolveDispute(jobId, 0n, true)
      ).to.be.revertedWithCustomError(escrow, "CG_OnlyDisputeContract");
    });
  });

  // ═══════════════════════════════════════════
  // ADMIN FUNCTION TESTS
  // ═══════════════════════════════════════════
  describe("Admin Functions", function () {
    it("Should allow owner to set fee recipient", async function () {
      const { escrow, owner, other } = await loadFixture(deployFixture);
      await escrow.connect(owner).setFeeRecipient(other.address);
      expect(await escrow.feeRecipient()).to.equal(other.address);
    });

    it("Should revert setFeeRecipient from non-owner", async function () {
      const { escrow, client } = await loadFixture(deployFixture);

      await expect(
        escrow.connect(client).setFeeRecipient(client.address)
      ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });

    it("Should revert setFeeRecipient with zero address", async function () {
      const { escrow, owner } = await loadFixture(deployFixture);

      await expect(
        escrow.connect(owner).setFeeRecipient(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(escrow, "CG_ZeroAddress");
    });

    it("Should allow owner to set reputation contract", async function () {
      const { escrow, owner, other } = await loadFixture(deployFixture);
      await escrow.connect(owner).setReputationContract(other.address);
    });

    it("Should allow owner to set dispute contract", async function () {
      const { escrow, owner, other } = await loadFixture(deployFixture);
      await escrow.connect(owner).setDisputeContract(other.address);
    });
  });

  // ═══════════════════════════════════════════
  // PAUSE TESTS
  // ═══════════════════════════════════════════
  describe("Pausable", function () {
    it("Should revert createJob when paused", async function () {
      const { escrow, client, owner } = await loadFixture(deployFixture);
      const deadline = (await time.latest()) + 7 * 24 * 60 * 60;

      await escrow.connect(owner).pause();

      await expect(
        escrow.connect(client).createJob(
          "Test", "Qm", "dev",
          ["M1"], ["Qm"], [ethers.parseUnits("10", 6)], deadline
        )
      ).to.be.revertedWithCustomError(escrow, "EnforcedPause");
    });

    it("Should allow operations after unpause", async function () {
      const { escrow, client, owner } = await loadFixture(deployFixture);

      await escrow.connect(owner).pause();
      await escrow.connect(owner).unpause();

      await createStandardJob(escrow, client);

      const job = await escrow.getJob(1n);
      expect(job.status).to.equal(0n); // Open
    });

    it("Only owner can pause", async function () {
      const { escrow, client } = await loadFixture(deployFixture);

      await expect(
        escrow.connect(client).pause()
      ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });
  });
});
