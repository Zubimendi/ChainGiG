import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

describe("Integration: Full Flow Tests", function () {
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

    await escrow.setReputationContract(await reputation.getAddress());
    await escrow.setDisputeContract(await dispute.getAddress());
    await reputation.setEscrowContract(await escrow.getAddress());
    await dispute.setEscrow(await escrow.getAddress());

    await dispute.addArbitrator(arb1.address);
    await dispute.addArbitrator(arb2.address);
    await dispute.addArbitrator(arb3.address);

    const mintAmount = ethers.parseUnits("50000", 6);
    await usdc.mint(client.address, mintAmount);
    await usdc.connect(client).approve(await escrow.getAddress(), mintAmount);

    return {
      escrow, usdc, reputation, dispute,
      owner, client, freelancer,
      arb1, arb2, arb3, other,
    };
  }

  // ═══════════════════════════════════════════
  // SCENARIO 1: Happy Path — Single Milestone
  // ═══════════════════════════════════════════
  describe("Scenario 1: Happy Path — Single Milestone", function () {
    it("Full flow: create → assign → submit → approve → SBT + fee", async function () {
      const { escrow, usdc, reputation, client, freelancer, owner } =
        await loadFixture(deployFixture);

      const amount = ethers.parseUnits("100", 6);
      const fee = (amount * 250n) / 10000n;
      const deadline = (await time.latest()) + 7 * 24 * 60 * 60;

      // Step 1: Create job
      await escrow.connect(client).createJob(
        "Build Landing Page", "QmJobDesc", "development",
        ["Complete Design"], ["QmDesignSpec"],
        [amount], deadline
      );

      const job1 = await escrow.getJob(1n);
      expect(job1.status).to.equal(0n); // Open

      // Step 2: Assign freelancer
      await escrow.connect(client).assignFreelancer(1n, freelancer.address);

      const job2 = await escrow.getJob(1n);
      expect(job2.status).to.equal(1n); // InProgress

      // Step 3: Submit milestone
      await escrow.connect(freelancer).submitMilestone(1n, 0n, "QmDeliverable");

      const job3 = await escrow.getJob(1n);
      expect(job3.status).to.equal(2n); // UnderReview

      // Step 4: Approve milestone
      const freelancerBefore = await usdc.balanceOf(freelancer.address);
      const feeRecipientBefore = await usdc.balanceOf(owner.address);

      await escrow.connect(client).approveMilestone(1n, 0n);

      // Verify: Freelancer received payment
      const freelancerAfter = await usdc.balanceOf(freelancer.address);
      expect(freelancerAfter - freelancerBefore).to.equal(amount);

      // Verify: Fee recipient received platform fee
      const feeRecipientAfter = await usdc.balanceOf(owner.address);
      expect(feeRecipientAfter - feeRecipientBefore).to.equal(fee);

      // Verify: Job completed
      const job4 = await escrow.getJob(1n);
      expect(job4.status).to.equal(3n); // Completed

      // Verify: SBT minted
      const creds = await reputation.getCredentials(freelancer.address);
      expect(creds.length).to.equal(1);
      expect(creds[0].jobTitle).to.equal("Build Landing Page");
      expect(creds[0].amountEarned).to.equal(amount);

      // Verify: Escrow balance is 0
      const escrowBalance = await usdc.balanceOf(await escrow.getAddress());
      expect(escrowBalance).to.equal(0n);
    });
  });

  // ═══════════════════════════════════════════
  // SCENARIO 2: Happy Path — Multi Milestone
  // ═══════════════════════════════════════════
  describe("Scenario 2: Happy Path — Multi Milestone (3)", function () {
    it("Full flow with 3 milestones releasing payment incrementally", async function () {
      const { escrow, usdc, reputation, client, freelancer, owner } =
        await loadFixture(deployFixture);

      const amounts = [
        ethers.parseUnits("50", 6),
        ethers.parseUnits("75", 6),
        ethers.parseUnits("100", 6),
      ];
      const total = amounts.reduce((a, b) => a + b, 0n);
      const fee = (total * 250n) / 10000n;
      const deadline = (await time.latest()) + 14 * 24 * 60 * 60;

      // Create job
      await escrow.connect(client).createJob(
        "Full Stack DApp", "QmJobDesc", "development",
        ["Frontend", "Backend", "Integration"],
        ["QmFE", "QmBE", "QmInteg"],
        amounts, deadline
      );
      await escrow.connect(client).assignFreelancer(1n, freelancer.address);

      // Milestone 1
      await escrow.connect(freelancer).submitMilestone(1n, 0n, "QmFrontend");
      await escrow.connect(client).approveMilestone(1n, 0n);

      let job = await escrow.getJob(1n);
      expect(job.status).to.equal(1n); // Still InProgress

      const afterM1 = await usdc.balanceOf(freelancer.address);
      expect(afterM1).to.equal(amounts[0]);

      // Milestone 2
      await escrow.connect(freelancer).submitMilestone(1n, 1n, "QmBackend");
      await escrow.connect(client).approveMilestone(1n, 1n);

      const afterM2 = await usdc.balanceOf(freelancer.address);
      expect(afterM2).to.equal(amounts[0] + amounts[1]);

      // Milestone 3 (final)
      await escrow.connect(freelancer).submitMilestone(1n, 2n, "QmIntegration");
      await escrow.connect(client).approveMilestone(1n, 2n);

      const afterM3 = await usdc.balanceOf(freelancer.address);
      expect(afterM3).to.equal(total);

      // Job should be completed
      job = await escrow.getJob(1n);
      expect(job.status).to.equal(3n); // Completed

      // SBT issued
      const creds = await reputation.getCredentials(freelancer.address);
      expect(creds.length).to.equal(1);

      // Fee collected
      const feeBalance = await usdc.balanceOf(owner.address);
      expect(feeBalance).to.equal(fee);
    });
  });

  // ═══════════════════════════════════════════
  // SCENARIO 3: Rejection + Revision
  // ═══════════════════════════════════════════
  describe("Scenario 3: Milestone Rejection + Revision", function () {
    it("Reject → resubmit → approve flow", async function () {
      const { escrow, usdc, client, freelancer } = await loadFixture(deployFixture);

      const amount = ethers.parseUnits("100", 6);
      const deadline = (await time.latest()) + 7 * 24 * 60 * 60;

      await escrow.connect(client).createJob(
        "Logo Design", "QmDesc", "design",
        ["Logo V1"], ["QmLogoSpec"], [amount], deadline
      );
      await escrow.connect(client).assignFreelancer(1n, freelancer.address);

      // First submission
      await escrow.connect(freelancer).submitMilestone(1n, 0n, "QmLogoV1");

      // Client rejects
      await escrow.connect(client).rejectMilestone(1n, 0n);

      let milestones = await escrow.getMilestones(1n);
      expect(milestones[0].status).to.equal(3n); // Rejected
      expect(milestones[0].revision).to.equal(1);

      // Freelancer resubmits
      await escrow.connect(freelancer).submitMilestone(1n, 0n, "QmLogoV2");

      // Client approves
      const balanceBefore = await usdc.balanceOf(freelancer.address);
      await escrow.connect(client).approveMilestone(1n, 0n);
      const balanceAfter = await usdc.balanceOf(freelancer.address);

      expect(balanceAfter - balanceBefore).to.equal(amount);
    });
  });

  // ═══════════════════════════════════════════
  // SCENARIO 4: Auto-Approve (7-day timeout)
  // ═══════════════════════════════════════════
  describe("Scenario 4: Auto-Approve (7-day timeout)", function () {
    it("Auto-approve releases funds after 7 days of client inaction", async function () {
      const { escrow, usdc, reputation, client, freelancer } =
        await loadFixture(deployFixture);

      const amount = ethers.parseUnits("200", 6);
      const deadline = (await time.latest()) + 30 * 24 * 60 * 60;

      await escrow.connect(client).createJob(
        "Smart Contract Audit", "QmDesc", "development",
        ["Audit Report"], ["QmSpec"], [amount], deadline
      );
      await escrow.connect(client).assignFreelancer(1n, freelancer.address);
      await escrow.connect(freelancer).submitMilestone(1n, 0n, "QmAuditReport");

      // Client doesn't respond...
      await time.increase(7 * 24 * 60 * 60 + 1);

      // Anyone can trigger auto-approve
      const balanceBefore = await usdc.balanceOf(freelancer.address);
      await escrow.autoApproveMilestone(1n, 0n);
      const balanceAfter = await usdc.balanceOf(freelancer.address);

      expect(balanceAfter - balanceBefore).to.equal(amount);

      // Job should be completed, SBT issued
      const job = await escrow.getJob(1n);
      expect(job.status).to.equal(3n); // Completed

      const creds = await reputation.getCredentials(freelancer.address);
      expect(creds.length).to.equal(1);
    });
  });

  // ═══════════════════════════════════════════
  // SCENARIO 5: Full Cancellation
  // ═══════════════════════════════════════════
  describe("Scenario 5: Cancellation (No Freelancer)", function () {
    it("Full refund to client on cancel", async function () {
      const { escrow, usdc, client } = await loadFixture(deployFixture);

      const amount = ethers.parseUnits("500", 6);
      const fee = (amount * 250n) / 10000n;
      const deadline = (await time.latest()) + 7 * 24 * 60 * 60;

      const balanceBefore = await usdc.balanceOf(client.address);

      await escrow.connect(client).createJob(
        "Cancelled Project", "QmDesc", "design",
        ["Design"], ["QmSpec"], [amount], deadline
      );

      // Client decides to cancel before assigning
      await escrow.connect(client).cancelJob(1n);

      const balanceAfter = await usdc.balanceOf(client.address);
      expect(balanceAfter).to.equal(balanceBefore);

      const job = await escrow.getJob(1n);
      expect(job.status).to.equal(5n); // Cancelled
    });
  });

  // ═══════════════════════════════════════════
  // SCENARIO 6: Dispute Resolution
  // ═══════════════════════════════════════════
  describe("Scenario 6: Dispute Resolution", function () {
    it("Dispute → arbitrator vote → funds released to winner", async function () {
      const { escrow, usdc, dispute, client, freelancer, arb1, arb2, arb3 } =
        await loadFixture(deployFixture);

      const amount = ethers.parseUnits("100", 6);
      const deadline = (await time.latest()) + 7 * 24 * 60 * 60;

      // Setup: Create → Assign → Submit
      await escrow.connect(client).createJob(
        "Disputed Work", "QmDesc", "development",
        ["Feature"], ["QmSpec"], [amount], deadline
      );
      await escrow.connect(client).assignFreelancer(1n, freelancer.address);
      await escrow.connect(freelancer).submitMilestone(1n, 0n, "QmWork");

      // Raise dispute
      await escrow.connect(client).raiseDispute(1n, 0n);

      // Get selected arbitrators
      const selected = await dispute.getArbitrators(1n);
      const allSigners = await ethers.getSigners();
      const arbSigners = allSigners.filter(s => selected.includes(s.address));
      const uniqueArbs = [...new Map(arbSigners.map(s => [s.address, s])).values()];

      if (uniqueArbs.length >= 2) {
        const freelancerBefore = await usdc.balanceOf(freelancer.address);

        // 2 arbitrators vote for freelancer
        await dispute.connect(uniqueArbs[0]).vote(1n, true);
        await dispute.connect(uniqueArbs[1]).vote(1n, true);

        const freelancerAfter = await usdc.balanceOf(freelancer.address);
        expect(freelancerAfter - freelancerBefore).to.equal(amount);

        // Job should resume (InProgress) since other milestones may remain
        const job = await escrow.getJob(1n);
        // With single milestone, job completes
        expect(job.status).to.equal(3n); // Completed
      }
    });
  });
});
