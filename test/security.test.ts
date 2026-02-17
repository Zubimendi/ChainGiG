import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

describe("Security Tests", function () {
  async function deployFixture() {
    const [owner, client, freelancer, arb1, arb2, arb3, attacker] =
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
      owner, client, freelancer, attacker,
      arb1, arb2, arb3,
    };
  }

  // ═══════════════════════════════════════════
  // ACCESS CONTROL
  // ═══════════════════════════════════════════
  describe("Access Control", function () {
    it("Only client can approve milestones", async function () {
      const { escrow, client, freelancer, attacker } = await loadFixture(deployFixture);

      const deadline = (await time.latest()) + 7 * 24 * 60 * 60;
      await escrow.connect(client).createJob(
        "Job", "Qm", "dev", ["M1"], ["Qm"], [ethers.parseUnits("50", 6)], deadline
      );
      await escrow.connect(client).assignFreelancer(1n, freelancer.address);
      await escrow.connect(freelancer).submitMilestone(1n, 0n, "QmWork");

      await expect(
        escrow.connect(attacker).approveMilestone(1n, 0n)
      ).to.be.revertedWithCustomError(escrow, "CG_NotClient");

      await expect(
        escrow.connect(freelancer).approveMilestone(1n, 0n)
      ).to.be.revertedWithCustomError(escrow, "CG_NotClient");
    });

    it("Only freelancer can submit milestones", async function () {
      const { escrow, client, freelancer, attacker } = await loadFixture(deployFixture);

      const deadline = (await time.latest()) + 7 * 24 * 60 * 60;
      await escrow.connect(client).createJob(
        "Job", "Qm", "dev", ["M1"], ["Qm"], [ethers.parseUnits("50", 6)], deadline
      );
      await escrow.connect(client).assignFreelancer(1n, freelancer.address);

      await expect(
        escrow.connect(attacker).submitMilestone(1n, 0n, "QmFake")
      ).to.be.revertedWithCustomError(escrow, "CG_NotFreelancer");

      await expect(
        escrow.connect(client).submitMilestone(1n, 0n, "QmFake")
      ).to.be.revertedWithCustomError(escrow, "CG_NotFreelancer");
    });

    it("Only escrow can issue SBT credentials", async function () {
      const { reputation, attacker, freelancer, client } = await loadFixture(deployFixture);

      await expect(
        reputation.connect(attacker).issueCredential(
          freelancer.address, client.address, 1n,
          "Fake", ethers.parseUnits("1000", 6), "dev"
        )
      ).to.be.revertedWithCustomError(reputation, "CG_OnlyEscrow");
    });

    it("Only escrow can open disputes", async function () {
      const { dispute, attacker } = await loadFixture(deployFixture);

      await expect(
        dispute.connect(attacker).openDispute(1n, 0n, attacker.address)
      ).to.be.revertedWithCustomError(dispute, "CG_OnlyEscrow");
    });

    it("Only owner can change fee recipient", async function () {
      const { escrow, attacker } = await loadFixture(deployFixture);

      await expect(
        escrow.connect(attacker).setFeeRecipient(attacker.address)
      ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });

    it("Only owner can pause/unpause", async function () {
      const { escrow, attacker } = await loadFixture(deployFixture);

      await expect(
        escrow.connect(attacker).pause()
      ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");

      await expect(
        escrow.connect(attacker).unpause()
      ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });

    it("Only dispute contract can resolve disputes on escrow", async function () {
      const { escrow, attacker } = await loadFixture(deployFixture);

      await expect(
        escrow.connect(attacker).resolveDispute(1n, 0n, true)
      ).to.be.revertedWithCustomError(escrow, "CG_OnlyDisputeContract");
    });
  });

  // ═══════════════════════════════════════════
  // PAUSABLE CIRCUIT BREAKER
  // ═══════════════════════════════════════════
  describe("Pausable Circuit Breaker", function () {
    it("Pausing blocks createJob", async function () {
      const { escrow, client, owner } = await loadFixture(deployFixture);
      await escrow.connect(owner).pause();

      const deadline = (await time.latest()) + 7 * 24 * 60 * 60;
      await expect(
        escrow.connect(client).createJob(
          "Job", "Qm", "dev", ["M1"], ["Qm"],
          [ethers.parseUnits("10", 6)], deadline
        )
      ).to.be.revertedWithCustomError(escrow, "EnforcedPause");
    });

    it("Pausing blocks assignFreelancer", async function () {
      const { escrow, client, freelancer, owner } = await loadFixture(deployFixture);

      const deadline = (await time.latest()) + 7 * 24 * 60 * 60;
      await escrow.connect(client).createJob(
        "Job", "Qm", "dev", ["M1"], ["Qm"],
        [ethers.parseUnits("10", 6)], deadline
      );

      await escrow.connect(owner).pause();

      await expect(
        escrow.connect(client).assignFreelancer(1n, freelancer.address)
      ).to.be.revertedWithCustomError(escrow, "EnforcedPause");
    });

    it("Pausing blocks submitMilestone", async function () {
      const { escrow, client, freelancer, owner } = await loadFixture(deployFixture);

      const deadline = (await time.latest()) + 7 * 24 * 60 * 60;
      await escrow.connect(client).createJob(
        "Job", "Qm", "dev", ["M1"], ["Qm"],
        [ethers.parseUnits("10", 6)], deadline
      );
      await escrow.connect(client).assignFreelancer(1n, freelancer.address);

      await escrow.connect(owner).pause();

      await expect(
        escrow.connect(freelancer).submitMilestone(1n, 0n, "QmWork")
      ).to.be.revertedWithCustomError(escrow, "EnforcedPause");
    });

    it("Pausing blocks approveMilestone", async function () {
      const { escrow, client, freelancer, owner } = await loadFixture(deployFixture);

      const deadline = (await time.latest()) + 7 * 24 * 60 * 60;
      await escrow.connect(client).createJob(
        "Job", "Qm", "dev", ["M1"], ["Qm"],
        [ethers.parseUnits("10", 6)], deadline
      );
      await escrow.connect(client).assignFreelancer(1n, freelancer.address);
      await escrow.connect(freelancer).submitMilestone(1n, 0n, "QmWork");

      await escrow.connect(owner).pause();

      await expect(
        escrow.connect(client).approveMilestone(1n, 0n)
      ).to.be.revertedWithCustomError(escrow, "EnforcedPause");
    });

    it("CancelJob works even when paused (funds must be retrievable)", async function () {
      const { escrow, usdc, client, owner } = await loadFixture(deployFixture);

      const deadline = (await time.latest()) + 7 * 24 * 60 * 60;
      await escrow.connect(client).createJob(
        "Job", "Qm", "dev", ["M1"], ["Qm"],
        [ethers.parseUnits("100", 6)], deadline
      );

      await escrow.connect(owner).pause();

      // cancelJob does NOT have whenNotPaused — funds must be retrievable
      const balanceBefore = await usdc.balanceOf(client.address);
      await escrow.connect(client).cancelJob(1n);
      const balanceAfter = await usdc.balanceOf(client.address);
      expect(balanceAfter).to.be.greaterThan(balanceBefore);
    });
  });

  // ═══════════════════════════════════════════
  // CONSTRUCTOR VALIDATION
  // ═══════════════════════════════════════════
  describe("Constructor Validation", function () {
    it("Should revert with zero USDC address", async function () {
      const [owner] = await ethers.getSigners();
      const Escrow = await ethers.getContractFactory("ChainGigEscrow");

      await expect(
        Escrow.deploy(ethers.ZeroAddress, owner.address)
      ).to.be.revertedWithCustomError(Escrow, "CG_ZeroAddress");
    });

    it("Should revert with zero fee recipient", async function () {
      const [owner] = await ethers.getSigners();
      const MockUSDC = await ethers.getContractFactory("MockUSDC");
      const usdc = await MockUSDC.deploy();
      const Escrow = await ethers.getContractFactory("ChainGigEscrow");

      await expect(
        Escrow.deploy(await usdc.getAddress(), ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(Escrow, "CG_ZeroAddress");
    });
  });

  // ═══════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════
  describe("Edge Cases", function () {
    it("Cannot submit already-approved milestone", async function () {
      const { escrow, client, freelancer } = await loadFixture(deployFixture);

      const deadline = (await time.latest()) + 7 * 24 * 60 * 60;
      await escrow.connect(client).createJob(
        "Job", "Qm", "dev", ["M1", "M2"], ["Qm1", "Qm2"],
        [ethers.parseUnits("50", 6), ethers.parseUnits("50", 6)], deadline
      );
      await escrow.connect(client).assignFreelancer(1n, freelancer.address);
      await escrow.connect(freelancer).submitMilestone(1n, 0n, "QmWork1");
      await escrow.connect(client).approveMilestone(1n, 0n);

      await expect(
        escrow.connect(freelancer).submitMilestone(1n, 0n, "QmWork1Again")
      ).to.be.revertedWithCustomError(escrow, "CG_CannotResubmit");
    });

    it("Cannot approve already-approved milestone", async function () {
      const { escrow, client, freelancer } = await loadFixture(deployFixture);

      const deadline = (await time.latest()) + 7 * 24 * 60 * 60;
      await escrow.connect(client).createJob(
        "Job", "Qm", "dev", ["M1", "M2"], ["Qm1", "Qm2"],
        [ethers.parseUnits("50", 6), ethers.parseUnits("50", 6)], deadline
      );
      await escrow.connect(client).assignFreelancer(1n, freelancer.address);
      await escrow.connect(freelancer).submitMilestone(1n, 0n, "QmWork");
      await escrow.connect(client).approveMilestone(1n, 0n);

      await expect(
        escrow.connect(client).approveMilestone(1n, 0n)
      ).to.be.revertedWithCustomError(escrow, "CG_NotSubmitted");
    });

    it("Cannot cancel completed job", async function () {
      const { escrow, client, freelancer } = await loadFixture(deployFixture);

      const deadline = (await time.latest()) + 7 * 24 * 60 * 60;
      await escrow.connect(client).createJob(
        "Job", "Qm", "dev", ["M1"], ["Qm"],
        [ethers.parseUnits("50", 6)], deadline
      );
      await escrow.connect(client).assignFreelancer(1n, freelancer.address);
      await escrow.connect(freelancer).submitMilestone(1n, 0n, "QmWork");
      await escrow.connect(client).approveMilestone(1n, 0n);

      await expect(
        escrow.connect(client).cancelJob(1n)
      ).to.be.revertedWithCustomError(escrow, "CG_CannotCancelInProgress");
    });

    it("Minimum milestone amount is exactly 1 USDC", async function () {
      const { escrow, client } = await loadFixture(deployFixture);

      const deadline = (await time.latest()) + 7 * 24 * 60 * 60;

      // Exactly 1 USDC should work
      await expect(
        escrow.connect(client).createJob(
          "Min Job", "Qm", "dev", ["M1"], ["Qm"],
          [ethers.parseUnits("1", 6)], deadline
        )
      ).to.not.be.reverted;
    });

    it("Maximum 10 milestones works", async function () {
      const { escrow, client } = await loadFixture(deployFixture);

      const deadline = (await time.latest()) + 30 * 24 * 60 * 60;
      const amounts = Array(10).fill(ethers.parseUnits("10", 6));
      const titles = Array(10).fill("Milestone");
      const descs = Array(10).fill("QmDesc");

      await expect(
        escrow.connect(client).createJob(
          "Big Job", "Qm", "dev", titles, descs, amounts, deadline
        )
      ).to.not.be.reverted;
    });
  });
});
