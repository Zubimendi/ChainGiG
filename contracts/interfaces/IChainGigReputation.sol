// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @title IChainGigReputation
 * @notice Interface for the ChainGig SoulBound Token reputation contract
 */
interface IChainGigReputation {
    /**
     * @notice Issue a work credential SBT to the freelancer on job completion
     * @param freelancer Address of the freelancer
     * @param client Address of the client
     * @param jobId On-chain job ID from escrow
     * @param jobTitle Title of the completed job
     * @param amountEarned Total USDC earned (6 decimals)
     * @param category Job category string
     */
    function issueCredential(
        address freelancer,
        address client,
        uint256 jobId,
        string calldata jobTitle,
        uint256 amountEarned,
        string calldata category
    ) external;
}
