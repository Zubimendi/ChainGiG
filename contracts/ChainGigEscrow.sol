// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IChainGigReputation.sol";
import "./interfaces/IChainGigDispute.sol";

/**
 * @title ChainGigEscrow
 * @notice Core escrow contract — handles USDC deposits, milestone-based payments,
 *         freelancer assignment, dispute integration, and auto-approve timeout.
 * @dev Follows Checks-Effects-Interactions pattern. All fund-transfer functions
 *      are protected by ReentrancyGuard. Pausable circuit breaker for emergencies.
 *
 * SECURITY: This contract holds real user funds in USDC.
 * - ReentrancyGuard on all external functions that transfer funds
 * - State changes BEFORE external calls (CEI pattern)
 * - All inputs validated with custom errors
 * - Pausable by owner for emergency circuit breaker
 */
contract ChainGigEscrow is ReentrancyGuard, Ownable, Pausable {
    // ════════════════════════════════════════════
    // CUSTOM ERRORS
    // ════════════════════════════════════════════

    error CG_NoMilestones();
    error CG_MaxMilestones();
    error CG_MismatchTitles();
    error CG_MismatchDescriptions();
    error CG_DeadlineTooSoon();
    error CG_MinOneUSDC();
    error CG_USDCTransferFailed();
    error CG_NotClient();
    error CG_NotFreelancer();
    error CG_NotOpen();
    error CG_ZeroAddress();
    error CG_ClientCannotBeFreelancer();
    error CG_InvalidStatus();
    error CG_NotSubmitted();
    error CG_NotInProgress();
    error CG_PastDeadline();
    error CG_CannotResubmit();
    error CG_EmptyDeliverable();
    error CG_NotAParty();
    error CG_CannotDispute();
    error CG_OnlyDisputeContract();
    error CG_MaxRevisionsReached();
    error CG_CannotCancelInProgress();
    error CG_AutoApproveNotReady();

    // ════════════════════════════════════════════
    // ENUMS
    // ════════════════════════════════════════════

    enum JobStatus {
        Open,        // Posted, awaiting freelancer
        InProgress,  // Freelancer assigned, work in progress
        UnderReview, // Milestone submitted, awaiting client review
        Completed,   // All milestones approved
        Disputed,    // Active dispute in arbitration
        Cancelled    // Cancelled, funds returned to client
    }

    enum MilestoneStatus {
        Pending,   // Not yet started
        Submitted, // Freelancer submitted deliverable
        Approved,  // Client approved, payment released
        Rejected,  // Client rejected, freelancer must resubmit
        Disputed   // Under arbitration
    }

    // ════════════════════════════════════════════
    // STRUCTS
    // ════════════════════════════════════════════

    struct Milestone {
        string title;
        string descriptionHash;   // IPFS CID
        uint256 amount;            // USDC amount (6 decimals)
        MilestoneStatus status;
        uint256 submittedAt;
        uint256 approvedAt;
        string deliverableHash;    // IPFS CID of submitted work
        uint8 revision;            // Revision count (max 3)
    }

    struct Job {
        uint256 id;
        address client;
        address freelancer;
        string title;
        string descriptionHash;    // IPFS CID
        string category;           // "development", "design", "writing", etc.
        uint256 totalAmount;       // Total USDC in escrow
        uint256 platformFee;       // 2.5% platform fee (held in escrow)
        JobStatus status;
        uint256 createdAt;
        uint256 deadline;
        uint256 milestoneCount;
    }

    // ════════════════════════════════════════════
    // STATE VARIABLES
    // ════════════════════════════════════════════

    /// @notice The USDC token contract (immutable after deployment)
    IERC20 public immutable usdc;

    /// @notice Reference to the SBT reputation contract
    IChainGigReputation public reputationContract;

    /// @notice Reference to the dispute arbitration contract
    IChainGigDispute public disputeContract;

    /// @notice Auto-incrementing job counter
    uint256 public jobCounter;

    /// @notice Platform fee in basis points (2.5% = 250 bps)
    uint256 public constant PLATFORM_FEE_BPS = 250;

    /// @notice Maximum revision attempts per milestone
    uint256 public constant MAX_REVISIONS = 3;

    /// @notice Time after submission before auto-approve is allowed (7 days)
    uint256 public constant AUTO_APPROVE_DELAY = 7 days;

    /// @notice Address that receives platform fees
    address public feeRecipient;

    /// @notice Job ID => Job struct
    mapping(uint256 => Job) public jobs;

    /// @notice Job ID => array of Milestones
    mapping(uint256 => Milestone[]) public jobMilestones;

    /// @notice Client address => array of their job IDs
    mapping(address => uint256[]) public clientJobs;

    /// @notice Freelancer address => array of their job IDs
    mapping(address => uint256[]) public freelancerJobs;

    // ════════════════════════════════════════════
    // EVENTS
    // ════════════════════════════════════════════

    event JobCreated(
        uint256 indexed jobId,
        address indexed client,
        uint256 totalAmount,
        string category
    );
    event FreelancerAssigned(uint256 indexed jobId, address indexed freelancer);
    event MilestoneSubmitted(
        uint256 indexed jobId,
        uint256 milestoneIndex,
        string deliverableHash
    );
    event MilestoneApproved(
        uint256 indexed jobId,
        uint256 milestoneIndex,
        uint256 amountReleased
    );
    event MilestoneRejected(
        uint256 indexed jobId,
        uint256 milestoneIndex,
        uint8 revisionNumber
    );
    event DisputeRaised(
        uint256 indexed jobId,
        uint256 milestoneIndex,
        address indexed raisedBy
    );
    event JobCompleted(uint256 indexed jobId, address indexed freelancer);
    event JobCancelled(uint256 indexed jobId, uint256 refundAmount);
    event AutoApproved(uint256 indexed jobId, uint256 milestoneIndex);

    // ════════════════════════════════════════════
    // CONSTRUCTOR
    // ════════════════════════════════════════════

    /**
     * @notice Deploy the escrow contract
     * @param _usdc Address of the USDC token contract
     * @param _feeRecipient Address that receives platform fees
     */
    constructor(
        address _usdc,
        address _feeRecipient
    ) Ownable(msg.sender) {
        if (_usdc == address(0)) revert CG_ZeroAddress();
        if (_feeRecipient == address(0)) revert CG_ZeroAddress();
        usdc = IERC20(_usdc);
        feeRecipient = _feeRecipient;
    }

    // ════════════════════════════════════════════
    // CLIENT FUNCTIONS
    // ════════════════════════════════════════════

    /**
     * @notice Client creates a job and deposits USDC into escrow
     * @param _title Job title
     * @param _descriptionHash IPFS CID of job description
     * @param _category Job category (e.g., "development", "design")
     * @param _milestoneTitles Array of milestone titles
     * @param _milestoneDescriptions Array of IPFS CIDs for milestone details
     * @param _milestoneAmounts Array of USDC amounts per milestone (6 decimals)
     * @param _deadline Unix timestamp for job deadline
     * @return jobId The newly created job ID
     */
    function createJob(
        string calldata _title,
        string calldata _descriptionHash,
        string calldata _category,
        string[] calldata _milestoneTitles,
        string[] calldata _milestoneDescriptions,
        uint256[] calldata _milestoneAmounts,
        uint256 _deadline
    ) external nonReentrant whenNotPaused returns (uint256 jobId) {
        // --- Checks ---
        if (_milestoneAmounts.length == 0) revert CG_NoMilestones();
        if (_milestoneAmounts.length > 10) revert CG_MaxMilestones();
        if (_milestoneAmounts.length != _milestoneTitles.length) revert CG_MismatchTitles();
        if (_milestoneAmounts.length != _milestoneDescriptions.length) revert CG_MismatchDescriptions();
        if (_deadline <= block.timestamp + 1 days) revert CG_DeadlineTooSoon();

        uint256 total;
        for (uint256 i; i < _milestoneAmounts.length; ++i) {
            if (_milestoneAmounts[i] < 1e6) revert CG_MinOneUSDC();
            total += _milestoneAmounts[i];
        }

        uint256 fee = (total * PLATFORM_FEE_BPS) / 10_000;
        uint256 required = total + fee;

        // --- Effects ---
        jobId = ++jobCounter;

        jobs[jobId] = Job({
            id: jobId,
            client: msg.sender,
            freelancer: address(0),
            title: _title,
            descriptionHash: _descriptionHash,
            category: _category,
            totalAmount: total,
            platformFee: fee,
            status: JobStatus.Open,
            createdAt: block.timestamp,
            deadline: _deadline,
            milestoneCount: _milestoneAmounts.length
        });

        for (uint256 i; i < _milestoneAmounts.length; ++i) {
            jobMilestones[jobId].push(Milestone({
                title: _milestoneTitles[i],
                descriptionHash: _milestoneDescriptions[i],
                amount: _milestoneAmounts[i],
                status: MilestoneStatus.Pending,
                submittedAt: 0,
                approvedAt: 0,
                deliverableHash: "",
                revision: 0
            }));
        }

        clientJobs[msg.sender].push(jobId);

        // --- Interactions ---
        bool success = usdc.transferFrom(msg.sender, address(this), required);
        if (!success) revert CG_USDCTransferFailed();

        emit JobCreated(jobId, msg.sender, total, _category);
    }

    /**
     * @notice Client selects a freelancer for their job
     * @param _jobId The job to assign
     * @param _freelancer Address of the chosen freelancer
     */
    function assignFreelancer(
        uint256 _jobId,
        address _freelancer
    ) external whenNotPaused {
        Job storage job = jobs[_jobId];

        // --- Checks ---
        if (msg.sender != job.client) revert CG_NotClient();
        if (job.status != JobStatus.Open) revert CG_NotOpen();
        if (_freelancer == address(0)) revert CG_ZeroAddress();
        if (_freelancer == job.client) revert CG_ClientCannotBeFreelancer();

        // --- Effects ---
        job.freelancer = _freelancer;
        job.status = JobStatus.InProgress;
        freelancerJobs[_freelancer].push(_jobId);

        emit FreelancerAssigned(_jobId, _freelancer);
    }

    /**
     * @notice Client approves a submitted milestone — releases USDC to freelancer
     * @param _jobId The job ID
     * @param _milestoneIndex Index of the milestone to approve
     */
    function approveMilestone(
        uint256 _jobId,
        uint256 _milestoneIndex
    ) external nonReentrant whenNotPaused {
        Job storage job = jobs[_jobId];

        // --- Checks ---
        if (msg.sender != job.client) revert CG_NotClient();
        if (job.status != JobStatus.InProgress && job.status != JobStatus.UnderReview)
            revert CG_InvalidStatus();

        Milestone storage ms = jobMilestones[_jobId][_milestoneIndex];
        if (ms.status != MilestoneStatus.Submitted) revert CG_NotSubmitted();

        // --- Effects ---
        ms.status = MilestoneStatus.Approved;
        ms.approvedAt = block.timestamp;
        job.status = JobStatus.InProgress;

        // --- Interactions ---
        bool success = usdc.transfer(job.freelancer, ms.amount);
        if (!success) revert CG_USDCTransferFailed();

        emit MilestoneApproved(_jobId, _milestoneIndex, ms.amount);

        if (_allMilestonesApproved(_jobId)) {
            _completeJob(_jobId);
        }
    }

    /**
     * @notice Client rejects a milestone — freelancer must revise (max 3 revisions)
     * @param _jobId The job ID
     * @param _milestoneIndex Index of the milestone to reject
     */
    function rejectMilestone(
        uint256 _jobId,
        uint256 _milestoneIndex
    ) external whenNotPaused {
        Job storage job = jobs[_jobId];

        // --- Checks ---
        if (msg.sender != job.client) revert CG_NotClient();

        Milestone storage ms = jobMilestones[_jobId][_milestoneIndex];
        if (ms.status != MilestoneStatus.Submitted) revert CG_NotSubmitted();
        if (ms.revision >= MAX_REVISIONS) revert CG_MaxRevisionsReached();

        // --- Effects ---
        ms.status = MilestoneStatus.Rejected;
        ms.revision++;
        job.status = JobStatus.InProgress;

        emit MilestoneRejected(_jobId, _milestoneIndex, ms.revision);
    }

    /**
     * @notice Client cancels job BEFORE freelancer is assigned — full refund
     * @param _jobId The job to cancel
     */
    function cancelJob(uint256 _jobId) external nonReentrant {
        Job storage job = jobs[_jobId];

        // --- Checks ---
        if (msg.sender != job.client) revert CG_NotClient();
        if (job.status != JobStatus.Open) revert CG_CannotCancelInProgress();

        // --- Effects ---
        job.status = JobStatus.Cancelled;
        uint256 refund = job.totalAmount + job.platformFee;

        // --- Interactions ---
        bool success = usdc.transfer(job.client, refund);
        if (!success) revert CG_USDCTransferFailed();

        emit JobCancelled(_jobId, refund);
    }

    // ════════════════════════════════════════════
    // FREELANCER FUNCTIONS
    // ════════════════════════════════════════════

    /**
     * @notice Freelancer submits a milestone deliverable
     * @param _jobId The job ID
     * @param _milestoneIndex Index of the milestone to submit
     * @param _deliverableHash IPFS CID of the submitted work
     */
    function submitMilestone(
        uint256 _jobId,
        uint256 _milestoneIndex,
        string calldata _deliverableHash
    ) external whenNotPaused {
        Job storage job = jobs[_jobId];

        // --- Checks ---
        if (msg.sender != job.freelancer) revert CG_NotFreelancer();
        if (job.status != JobStatus.InProgress) revert CG_NotInProgress();
        if (block.timestamp > job.deadline) revert CG_PastDeadline();

        Milestone storage ms = jobMilestones[_jobId][_milestoneIndex];
        if (ms.status != MilestoneStatus.Pending && ms.status != MilestoneStatus.Rejected)
            revert CG_CannotResubmit();
        if (bytes(_deliverableHash).length == 0) revert CG_EmptyDeliverable();

        // --- Effects ---
        ms.status = MilestoneStatus.Submitted;
        ms.submittedAt = block.timestamp;
        ms.deliverableHash = _deliverableHash;
        job.status = JobStatus.UnderReview;

        emit MilestoneSubmitted(_jobId, _milestoneIndex, _deliverableHash);
    }

    // ════════════════════════════════════════════
    // DISPUTE FUNCTIONS
    // ════════════════════════════════════════════

    /**
     * @notice Either party raises a dispute on a submitted milestone
     * @param _jobId The job ID
     * @param _milestoneIndex Index of the milestone in dispute
     */
    function raiseDispute(
        uint256 _jobId,
        uint256 _milestoneIndex
    ) external whenNotPaused {
        Job storage job = jobs[_jobId];

        // --- Checks ---
        if (msg.sender != job.client && msg.sender != job.freelancer)
            revert CG_NotAParty();
        if (job.status != JobStatus.InProgress && job.status != JobStatus.UnderReview)
            revert CG_CannotDispute();

        // --- Effects ---
        Milestone storage ms = jobMilestones[_jobId][_milestoneIndex];
        ms.status = MilestoneStatus.Disputed;
        job.status = JobStatus.Disputed;

        // --- Interactions ---
        disputeContract.openDispute(_jobId, _milestoneIndex, msg.sender);

        emit DisputeRaised(_jobId, _milestoneIndex, msg.sender);
    }

    /**
     * @notice Called by dispute contract after arbitrators reach a resolution
     * @dev Only callable by the dispute contract address
     * @param _jobId The job ID
     * @param _milestoneIndex Index of the resolved milestone
     * @param _favorFreelancer True = release to freelancer, False = refund client
     */
    function resolveDispute(
        uint256 _jobId,
        uint256 _milestoneIndex,
        bool _favorFreelancer
    ) external nonReentrant {
        // --- Checks ---
        if (msg.sender != address(disputeContract)) revert CG_OnlyDisputeContract();

        Job storage job = jobs[_jobId];
        Milestone storage ms = jobMilestones[_jobId][_milestoneIndex];

        // --- Effects ---
        if (_favorFreelancer) {
            ms.status = MilestoneStatus.Approved;
            ms.approvedAt = block.timestamp;

            // --- Interactions ---
            bool success = usdc.transfer(job.freelancer, ms.amount);
            if (!success) revert CG_USDCTransferFailed();

            emit MilestoneApproved(_jobId, _milestoneIndex, ms.amount);
        } else {
            ms.status = MilestoneStatus.Rejected;

            // --- Interactions ---
            bool success = usdc.transfer(job.client, ms.amount);
            if (!success) revert CG_USDCTransferFailed();
        }

        job.status = JobStatus.InProgress;

        if (_allMilestonesApproved(_jobId)) {
            _completeJob(_jobId);
        }
    }

    // ════════════════════════════════════════════
    // AUTO-APPROVE (Keeper / Anyone)
    // ════════════════════════════════════════════

    /**
     * @notice If client does not respond in 7 days, milestone auto-approves
     * @dev Can be called by anyone after the 7-day window passes
     * @param _jobId The job ID
     * @param _milestoneIndex Index of the milestone to auto-approve
     */
    function autoApproveMilestone(
        uint256 _jobId,
        uint256 _milestoneIndex
    ) external nonReentrant {
        Milestone storage ms = jobMilestones[_jobId][_milestoneIndex];

        // --- Checks ---
        if (ms.status != MilestoneStatus.Submitted) revert CG_NotSubmitted();
        if (block.timestamp < ms.submittedAt + AUTO_APPROVE_DELAY) revert CG_AutoApproveNotReady();

        Job storage job = jobs[_jobId];

        // --- Effects ---
        ms.status = MilestoneStatus.Approved;
        ms.approvedAt = block.timestamp;

        // --- Interactions ---
        bool success = usdc.transfer(job.freelancer, ms.amount);
        if (!success) revert CG_USDCTransferFailed();

        emit AutoApproved(_jobId, _milestoneIndex);
        emit MilestoneApproved(_jobId, _milestoneIndex, ms.amount);

        if (_allMilestonesApproved(_jobId)) {
            _completeJob(_jobId);
        }
    }

    // ════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ════════════════════════════════════════════

    /**
     * @notice Check if all milestones for a job are approved
     * @param _jobId The job ID to check
     * @return True if every milestone has Approved status
     */
    function _allMilestonesApproved(uint256 _jobId) internal view returns (bool) {
        Milestone[] storage mss = jobMilestones[_jobId];
        for (uint256 i; i < mss.length; ++i) {
            if (mss[i].status != MilestoneStatus.Approved) return false;
        }
        return true;
    }

    /**
     * @notice Finalize a completed job — release platform fee and issue SBT
     * @param _jobId The job ID to complete
     */
    function _completeJob(uint256 _jobId) internal {
        Job storage job = jobs[_jobId];
        job.status = JobStatus.Completed;

        // Release platform fee to fee recipient
        bool success = usdc.transfer(feeRecipient, job.platformFee);
        if (!success) revert CG_USDCTransferFailed();

        // Issue SBT credentials to freelancer
        reputationContract.issueCredential(
            job.freelancer,
            job.client,
            _jobId,
            job.title,
            job.totalAmount,
            job.category
        );

        emit JobCompleted(_jobId, job.freelancer);
    }

    // ════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ════════════════════════════════════════════

    /**
     * @notice Get full job details
     * @param _jobId The job ID
     * @return The Job struct
     */
    function getJob(uint256 _jobId) external view returns (Job memory) {
        return jobs[_jobId];
    }

    /**
     * @notice Get all milestones for a job
     * @param _jobId The job ID
     * @return Array of Milestone structs
     */
    function getMilestones(uint256 _jobId) external view returns (Milestone[] memory) {
        return jobMilestones[_jobId];
    }

    /**
     * @notice Get all job IDs for a client
     * @param _client The client address
     * @return Array of job IDs
     */
    function getClientJobs(address _client) external view returns (uint256[] memory) {
        return clientJobs[_client];
    }

    /**
     * @notice Get all job IDs for a freelancer
     * @param _freelancer The freelancer address
     * @return Array of job IDs
     */
    function getFreelancerJobs(address _freelancer) external view returns (uint256[] memory) {
        return freelancerJobs[_freelancer];
    }

    // ════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ════════════════════════════════════════════

    /**
     * @notice Set the reputation contract address (owner only)
     * @param _rep Address of the ChainGigReputation contract
     */
    function setReputationContract(address _rep) external onlyOwner {
        if (_rep == address(0)) revert CG_ZeroAddress();
        reputationContract = IChainGigReputation(_rep);
    }

    /**
     * @notice Set the dispute contract address (owner only)
     * @param _dispute Address of the ChainGigDispute contract
     */
    function setDisputeContract(address _dispute) external onlyOwner {
        if (_dispute == address(0)) revert CG_ZeroAddress();
        disputeContract = IChainGigDispute(_dispute);
    }

    /**
     * @notice Change the fee recipient address (owner only)
     * @param _newRecipient New fee recipient address
     */
    function setFeeRecipient(address _newRecipient) external onlyOwner {
        if (_newRecipient == address(0)) revert CG_ZeroAddress();
        feeRecipient = _newRecipient;
    }

    /**
     * @notice Pause the contract — blocks job creation, assignments, submissions, approvals
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract — resume normal operations
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
