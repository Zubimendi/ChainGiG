// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MockReentrancyAttacker
 * @notice Test contract that attempts reentrancy on ChainGigEscrow
 * @dev Used exclusively in security tests to verify ReentrancyGuard works
 */
interface IChainGigEscrowAttack {
    function approveMilestone(uint256 _jobId, uint256 _milestoneIndex) external;
    function autoApproveMilestone(uint256 _jobId, uint256 _milestoneIndex) external;
}

contract MockReentrancyAttacker {
    IChainGigEscrowAttack public escrow;
    uint256 public attackJobId;
    uint256 public attackMilestoneIndex;
    bool public attacking;

    constructor(address _escrow) {
        escrow = IChainGigEscrowAttack(_escrow);
    }

    /**
     * @notice Attempt reentrancy on approveMilestone
     * @param _jobId The job ID to attack
     * @param _milestoneIndex The milestone index to attack
     */
    function attack(uint256 _jobId, uint256 _milestoneIndex) external {
        attackJobId = _jobId;
        attackMilestoneIndex = _milestoneIndex;
        attacking = true;
        escrow.approveMilestone(_jobId, _milestoneIndex);
    }

    /**
     * @notice Attempt reentrancy on autoApproveMilestone
     * @param _jobId The job ID to attack
     * @param _milestoneIndex The milestone index to attack
     */
    function attackAutoApprove(uint256 _jobId, uint256 _milestoneIndex) external {
        attackJobId = _jobId;
        attackMilestoneIndex = _milestoneIndex;
        attacking = true;
        escrow.autoApproveMilestone(_jobId, _milestoneIndex);
    }

    /**
     * @notice ERC-20 token receive callback — attempts reentry
     * @dev This gets called when the escrow transfers USDC to this contract.
     *      If ReentrancyGuard is working, the re-entrant call will revert.
     */
    fallback() external {
        if (attacking) {
            attacking = false;
            escrow.approveMilestone(attackJobId, attackMilestoneIndex);
        }
    }
}
