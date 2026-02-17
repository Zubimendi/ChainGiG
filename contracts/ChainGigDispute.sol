// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IChainGigEscrow.sol";

/**
 * @title ChainGigDispute
 * @notice Community arbitration — 3 arbitrators vote on disputed milestones
 * @dev Arbitrators are selected pseudo-randomly from a pool managed by the owner.
 *      Voting period is 72 hours. 2-of-3 majority resolves the dispute.
 *      If no quorum by deadline, anyone can call finalizeDispute to resolve
 *      based on current votes (ties favor freelancer).
 *
 * PRODUCTION NOTE: Replace _selectArbitrators with Chainlink VRF for
 *                  truly random selection in production.
 */
contract ChainGigDispute is Ownable {
    // ════════════════════════════════════════════
    // CUSTOM ERRORS
    // ════════════════════════════════════════════

    error CG_OnlyEscrow();
    error CG_NeedThreeArbitrators();
    error CG_DisputeNotActive();
    error CG_VotingEnded();
    error CG_AlreadyVoted();
    error CG_NotSelectedArbitrator();
    error CG_AlreadyArbitrator();
    error CG_VotingPeriodActive();
    error CG_ZeroAddress();

    // ════════════════════════════════════════════
    // ENUMS
    // ════════════════════════════════════════════

    enum DisputeStatus {
        Active,   // Voting in progress
        Resolved, // Decided by arbitrators
        Expired   // No quorum reached (auto-split)
    }

    // ════════════════════════════════════════════
    // STRUCTS
    // ════════════════════════════════════════════

    struct Dispute {
        uint256 jobId;
        uint256 milestoneIndex;
        address raisedBy;
        address[3] arbitrators;
        uint8 votesForFreelancer;
        uint8 votesForClient;
        DisputeStatus status;
        uint256 createdAt;
        uint256 deadline;        // 72 hours from creation
    }

    // ════════════════════════════════════════════
    // STATE VARIABLES
    // ════════════════════════════════════════════

    /// @notice Auto-incrementing dispute counter
    uint256 public disputeCounter;

    /// @notice Voting window duration (72 hours)
    uint256 public constant VOTING_PERIOD = 72 hours;

    /// @notice Address of the escrow contract
    address public escrowContract;

    /// @notice Dispute ID => Dispute struct
    mapping(uint256 => Dispute) public disputes;

    /// @notice Dispute ID => arbitrator address => has voted
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    /// @notice Job ID => Dispute ID mapping
    mapping(uint256 => uint256) public jobToDispute;

    /// @notice Pool of eligible arbitrator addresses
    address[] public arbitratorPool;

    /// @notice Address => is registered as arbitrator
    mapping(address => bool) public isArbitrator;

    // ════════════════════════════════════════════
    // EVENTS
    // ════════════════════════════════════════════

    event DisputeOpened(uint256 indexed disputeId, uint256 indexed jobId);
    event VoteCast(uint256 indexed disputeId, address indexed arbitrator, bool favorFreelancer);
    event DisputeResolved(uint256 indexed disputeId, bool favorFreelancer);

    // ════════════════════════════════════════════
    // MODIFIERS
    // ════════════════════════════════════════════

    modifier onlyEscrow() {
        if (msg.sender != escrowContract) revert CG_OnlyEscrow();
        _;
    }

    // ════════════════════════════════════════════
    // CONSTRUCTOR
    // ════════════════════════════════════════════

    /**
     * @notice Deploy the dispute contract
     * @param _escrow Address of the ChainGigEscrow contract
     */
    constructor(address _escrow) Ownable(msg.sender) {
        escrowContract = _escrow;
    }

    // ════════════════════════════════════════════
    // ESCROW-ONLY FUNCTIONS
    // ════════════════════════════════════════════

    /**
     * @notice Opens a dispute — called by escrow contract when a party raises a dispute
     * @param _jobId The job ID from the escrow contract
     * @param _milestoneIndex Index of the disputed milestone
     * @param _raisedBy Address of the party raising the dispute
     */
    function openDispute(
        uint256 _jobId,
        uint256 _milestoneIndex,
        address _raisedBy
    ) external onlyEscrow {
        if (arbitratorPool.length < 3) revert CG_NeedThreeArbitrators();

        uint256 disputeId = ++disputeCounter;
        Dispute storage d = disputes[disputeId];

        d.jobId = _jobId;
        d.milestoneIndex = _milestoneIndex;
        d.raisedBy = _raisedBy;
        d.status = DisputeStatus.Active;
        d.createdAt = block.timestamp;
        d.deadline = block.timestamp + VOTING_PERIOD;

        // Pseudo-random selection of 3 arbitrators
        // NOTE: Use Chainlink VRF in production for true randomness
        address[3] memory selected = _selectArbitrators(_jobId);
        d.arbitrators = selected;

        jobToDispute[_jobId] = disputeId;

        emit DisputeOpened(disputeId, _jobId);
    }

    // ════════════════════════════════════════════
    // ARBITRATOR FUNCTIONS
    // ════════════════════════════════════════════

    /**
     * @notice Selected arbitrator casts their vote
     * @param _disputeId The dispute ID to vote on
     * @param _favorFreelancer True = freelancer wins, False = client wins
     */
    function vote(uint256 _disputeId, bool _favorFreelancer) external {
        Dispute storage d = disputes[_disputeId];

        // --- Checks ---
        if (d.status != DisputeStatus.Active) revert CG_DisputeNotActive();
        if (block.timestamp > d.deadline) revert CG_VotingEnded();
        if (hasVoted[_disputeId][msg.sender]) revert CG_AlreadyVoted();

        bool isSelectedArbitrator;
        for (uint256 i; i < 3; ++i) {
            if (d.arbitrators[i] == msg.sender) {
                isSelectedArbitrator = true;
                break;
            }
        }
        if (!isSelectedArbitrator) revert CG_NotSelectedArbitrator();

        // --- Effects ---
        hasVoted[_disputeId][msg.sender] = true;

        if (_favorFreelancer) {
            d.votesForFreelancer++;
        } else {
            d.votesForClient++;
        }

        emit VoteCast(_disputeId, msg.sender, _favorFreelancer);

        // If 2-of-3 quorum reached, resolve immediately
        if (d.votesForFreelancer >= 2 || d.votesForClient >= 2) {
            _resolve(_disputeId);
        }
    }

    // ════════════════════════════════════════════
    // PUBLIC FUNCTIONS
    // ════════════════════════════════════════════

    /**
     * @notice Anyone can trigger resolution after the voting period expires
     * @dev Resolves based on current vote tally. Ties favor freelancer.
     * @param _disputeId The dispute ID to finalize
     */
    function finalizeDispute(uint256 _disputeId) external {
        Dispute storage d = disputes[_disputeId];

        if (d.status != DisputeStatus.Active) revert CG_DisputeNotActive();
        if (block.timestamp <= d.deadline) revert CG_VotingPeriodActive();

        _resolve(_disputeId);
    }

    // ════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ════════════════════════════════════════════

    /**
     * @notice Resolve the dispute and callback to escrow
     * @param _disputeId The dispute ID to resolve
     */
    function _resolve(uint256 _disputeId) internal {
        Dispute storage d = disputes[_disputeId];
        d.status = DisputeStatus.Resolved;

        // Ties favor freelancer (>=)
        bool favorFreelancer = d.votesForFreelancer >= d.votesForClient;

        IChainGigEscrow(escrowContract).resolveDispute(
            d.jobId,
            d.milestoneIndex,
            favorFreelancer
        );

        emit DisputeResolved(_disputeId, favorFreelancer);
    }

    /**
     * @notice Pseudo-random selection of 3 arbitrators from the pool
     * @dev NOT cryptographically secure. Replace with Chainlink VRF for production.
     * @param _seed Additional entropy seed (job ID)
     * @return selected Array of 3 selected arbitrator addresses
     */
    function _selectArbitrators(uint256 _seed)
        internal view returns (address[3] memory selected)
    {
        uint256 len = arbitratorPool.length;
        for (uint256 i; i < 3; ++i) {
            uint256 idx = uint256(
                keccak256(abi.encodePacked(block.timestamp, _seed, i))
            ) % len;
            selected[i] = arbitratorPool[idx];
        }
    }

    // ════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ════════════════════════════════════════════

    /**
     * @notice Get the selected arbitrators for a dispute
     * @param _disputeId The dispute ID
     * @return Array of 3 arbitrator addresses
     */
    function getArbitrators(uint256 _disputeId) external view returns (address[3] memory) {
        return disputes[_disputeId].arbitrators;
    }

    /**
     * @notice Get the current vote tally for a dispute
     * @param _disputeId The dispute ID
     * @return votesForFreelancer Number of votes favoring freelancer
     * @return votesForClient Number of votes favoring client
     */
    function getVotes(uint256 _disputeId) external view returns (uint8 votesForFreelancer, uint8 votesForClient) {
        Dispute storage d = disputes[_disputeId];
        return (d.votesForFreelancer, d.votesForClient);
    }

    /**
     * @notice Get the total number of arbitrators in the pool
     * @return Number of registered arbitrators
     */
    function getArbitratorCount() external view returns (uint256) {
        return arbitratorPool.length;
    }

    // ════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ════════════════════════════════════════════

    /**
     * @notice Add an arbitrator to the pool (owner only)
     * @param _arb Address of the new arbitrator
     */
    function addArbitrator(address _arb) external onlyOwner {
        if (_arb == address(0)) revert CG_ZeroAddress();
        if (isArbitrator[_arb]) revert CG_AlreadyArbitrator();
        isArbitrator[_arb] = true;
        arbitratorPool.push(_arb);
    }

    /**
     * @notice Update the escrow contract address (owner only)
     * @param _escrow New escrow contract address
     */
    function setEscrow(address _escrow) external onlyOwner {
        if (_escrow == address(0)) revert CG_ZeroAddress();
        escrowContract = _escrow;
    }
}
