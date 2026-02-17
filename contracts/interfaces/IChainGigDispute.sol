// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @title IChainGigDispute
 * @notice Interface for the ChainGig dispute arbitration contract
 */
interface IChainGigDispute {
    /**
     * @notice Open a dispute for a specific milestone
     * @param jobId The job ID in the escrow contract
     * @param milestoneIndex Index of the disputed milestone
     * @param raisedBy Address of the party raising the dispute
     */
    function openDispute(
        uint256 jobId,
        uint256 milestoneIndex,
        address raisedBy
    ) external;
}
