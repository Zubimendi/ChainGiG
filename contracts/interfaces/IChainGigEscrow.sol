// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @title IChainGigEscrow
 * @notice Interface for the ChainGig escrow contract (used by Dispute contract callback)
 */
interface IChainGigEscrow {
    /**
     * @notice Called by the dispute contract after arbitrators reach a resolution
     * @param jobId The job ID
     * @param milestoneIndex Index of the disputed milestone
     * @param favorFreelancer True = release funds to freelancer, False = refund client
     */
    function resolveDispute(
        uint256 jobId,
        uint256 milestoneIndex,
        bool favorFreelancer
    ) external;
}
