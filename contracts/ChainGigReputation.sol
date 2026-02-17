// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ChainGigReputation
 * @notice ERC-5192 SoulBound Token — non-transferable work credential NFT
 * @dev Implements EIP-5192 minimal soulbound standard. Tokens are permanently
 *      locked (non-transferable) after minting. Only the escrow contract can
 *      issue credentials. Clients can set a 1-5 star rating after job completion.
 *
 *      OpenZeppelin 5.x adapted:
 *      - Manual token ID counter (Counters library removed in OZ 5.x)
 *      - Transfer blocking via _update() override (replaces _beforeTokenTransfer)
 */
contract ChainGigReputation is ERC721URIStorage, Ownable {
    // ════════════════════════════════════════════
    // CUSTOM ERRORS
    // ════════════════════════════════════════════

    error CG_OnlyEscrow();
    error CG_InvalidRating();
    error CG_NoCredentialForJob();
    error CG_AlreadyRated();
    error CG_NotClient();
    error CG_NonTransferable();
    error CG_ZeroAddress();

    // ════════════════════════════════════════════
    // EIP-5192 EVENT
    // ════════════════════════════════════════════

    /// @notice Emitted when a token is permanently locked (EIP-5192)
    event Locked(uint256 tokenId);

    // ════════════════════════════════════════════
    // STRUCTS
    // ════════════════════════════════════════════

    struct WorkCredential {
        uint256 jobId;
        address client;
        address freelancer;
        string jobTitle;
        uint256 amountEarned;  // USDC (6 decimals)
        string category;
        uint8 rating;          // 1-5 (set after review)
        uint256 issuedAt;
        bool ratingSet;
    }

    // ════════════════════════════════════════════
    // STATE VARIABLES
    // ════════════════════════════════════════════

    /// @notice Address of the escrow contract (only caller for issueCredential)
    address public escrowContract;

    /// @notice Manual token ID counter (OZ 5.x — Counters removed)
    uint256 private _nextTokenId;

    /// @notice Token ID => credential data
    mapping(uint256 => WorkCredential) public credentials;

    /// @notice Token ID => locked status (always true for SBTs)
    mapping(uint256 => bool) private _locked;

    /// @notice Wallet address => array of token IDs they own
    mapping(address => uint256[]) public userTokens;

    /// @notice Wallet address => weighted reputation score (rating * 100)
    mapping(address => uint256) public reputationScore;

    /// @notice Wallet address => number of completed jobs
    mapping(address => uint256) public completedJobs;

    /// @notice Wallet address => total USDC earned across all jobs
    mapping(address => uint256) public totalEarned;

    /// @notice Job ID => token ID mapping
    mapping(uint256 => uint256) public jobToToken;

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
     * @notice Deploy the reputation SBT contract
     * @param _escrow Address of the ChainGigEscrow contract
     */
    constructor(address _escrow) ERC721("ChainGig Credential", "CGC") Ownable(msg.sender) {
        escrowContract = _escrow;
    }

    // ════════════════════════════════════════════
    // ESCROW-ONLY FUNCTIONS
    // ════════════════════════════════════════════

    /**
     * @notice Issue a credential SBT to the freelancer on job completion
     * @dev Only callable by the escrow contract after all milestones are approved
     * @param _freelancer Address of the freelancer who completed the job
     * @param _client Address of the client who posted the job
     * @param _jobId The escrow job ID
     * @param _jobTitle Title of the completed job
     * @param _amountEarned Total USDC earned (6 decimals)
     * @param _category Job category string
     */
    function issueCredential(
        address _freelancer,
        address _client,
        uint256 _jobId,
        string calldata _jobTitle,
        uint256 _amountEarned,
        string calldata _category
    ) external onlyEscrow {
        uint256 newTokenId = ++_nextTokenId;

        credentials[newTokenId] = WorkCredential({
            jobId: _jobId,
            client: _client,
            freelancer: _freelancer,
            jobTitle: _jobTitle,
            amountEarned: _amountEarned,
            category: _category,
            rating: 0,
            issuedAt: block.timestamp,
            ratingSet: false
        });

        _locked[newTokenId] = true;
        userTokens[_freelancer].push(newTokenId);
        completedJobs[_freelancer]++;
        totalEarned[_freelancer] += _amountEarned;
        jobToToken[_jobId] = newTokenId;

        _safeMint(_freelancer, newTokenId);

        emit Locked(newTokenId);
    }

    // ════════════════════════════════════════════
    // CLIENT FUNCTIONS
    // ════════════════════════════════════════════

    /**
     * @notice Client rates the freelancer after job completion (1-5 stars, one-time)
     * @param _jobId The job ID to rate
     * @param _rating Rating from 1 to 5
     */
    function setRating(uint256 _jobId, uint8 _rating) external {
        if (_rating < 1 || _rating > 5) revert CG_InvalidRating();

        uint256 tokenId = jobToToken[_jobId];
        if (tokenId == 0) revert CG_NoCredentialForJob();

        WorkCredential storage cred = credentials[tokenId];
        if (msg.sender != cred.client) revert CG_NotClient();
        if (cred.ratingSet) revert CG_AlreadyRated();

        cred.rating = _rating;
        cred.ratingSet = true;

        // Update weighted average reputation score
        address freelancer = cred.freelancer;
        uint256 jobCount = completedJobs[freelancer];
        uint256 currentScore = reputationScore[freelancer];

        // Weighted average: ((oldScore * (n-1)) + (newRating * 100)) / n
        reputationScore[freelancer] =
            ((currentScore * (jobCount - 1)) + (uint256(_rating) * 100)) / jobCount;
    }

    // ════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ════════════════════════════════════════════

    /**
     * @notice Get all credentials for a wallet address
     * @param _user The wallet address to query
     * @return Array of WorkCredential structs
     */
    function getCredentials(address _user)
        external view returns (WorkCredential[] memory)
    {
        uint256[] memory tokenIds = userTokens[_user];
        WorkCredential[] memory creds = new WorkCredential[](tokenIds.length);
        for (uint256 i; i < tokenIds.length; ++i) {
            creds[i] = credentials[tokenIds[i]];
        }
        return creds;
    }

    /**
     * @notice EIP-5192: Check if a token is locked (always true for SBTs)
     * @param tokenId The token ID to check
     * @return True if the token is locked (non-transferable)
     */
    function locked(uint256 tokenId) public view returns (bool) {
        return _locked[tokenId];
    }

    /**
     * @notice Get token IDs owned by a user
     * @param _user The wallet address
     * @return Array of token IDs
     */
    function getUserTokens(address _user) external view returns (uint256[] memory) {
        return userTokens[_user];
    }

    // ════════════════════════════════════════════
    // SOULBOUND ENFORCEMENT (OZ 5.x)
    // ════════════════════════════════════════════

    /**
     * @notice Override _update to block all transfers (mint is allowed)
     * @dev In OZ 5.x, _update replaces _beforeTokenTransfer for transfer hooks.
     *      We allow minting (from == address(0)) but block all transfers.
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0)) revert CG_NonTransferable();
        return super._update(to, tokenId, auth);
    }

    // ════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ════════════════════════════════════════════

    /**
     * @notice Update the escrow contract address (owner only)
     * @param _escrow New escrow contract address
     */
    function setEscrowContract(address _escrow) external onlyOwner {
        if (_escrow == address(0)) revert CG_ZeroAddress();
        escrowContract = _escrow;
    }
}
