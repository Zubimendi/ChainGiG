/**
 * Contract ABIs — extracted from Hardhat compilation artifacts.
 * Only includes the functions/events the frontend needs.
 */

export const ESCROW_ABI = [
  {
    inputs: [{ name: "_usdc", type: "address" }, { name: "_feeRecipient", type: "address" }],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  // View functions
  {
    inputs: [{ name: "_jobId", type: "uint256" }],
    name: "getJob",
    outputs: [{
      components: [
        { name: "id", type: "uint256" },
        { name: "client", type: "address" },
        { name: "freelancer", type: "address" },
        { name: "title", type: "string" },
        { name: "descriptionHash", type: "string" },
        { name: "category", type: "string" },
        { name: "totalAmount", type: "uint256" },
        { name: "platformFee", type: "uint256" },
        { name: "status", type: "uint8" },
        { name: "createdAt", type: "uint256" },
        { name: "deadline", type: "uint256" },
        { name: "milestoneCount", type: "uint256" },
      ],
      name: "",
      type: "tuple",
    }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_jobId", type: "uint256" }],
    name: "getMilestones",
    outputs: [{
      components: [
        { name: "title", type: "string" },
        { name: "descriptionHash", type: "string" },
        { name: "amount", type: "uint256" },
        { name: "status", type: "uint8" },
        { name: "submittedAt", type: "uint256" },
        { name: "approvedAt", type: "uint256" },
        { name: "deliverableHash", type: "string" },
        { name: "revision", type: "uint8" },
      ],
      name: "",
      type: "tuple[]",
    }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_client", type: "address" }],
    name: "getClientJobs",
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_freelancer", type: "address" }],
    name: "getFreelancerJobs",
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  { inputs: [], name: "jobCounter", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "PLATFORM_FEE_BPS", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  // Write functions
  {
    inputs: [
      { name: "_title", type: "string" },
      { name: "_descriptionHash", type: "string" },
      { name: "_category", type: "string" },
      { name: "_milestoneTitles", type: "string[]" },
      { name: "_milestoneDescriptions", type: "string[]" },
      { name: "_milestoneAmounts", type: "uint256[]" },
      { name: "_deadline", type: "uint256" },
    ],
    name: "createJob",
    outputs: [{ name: "jobId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "_jobId", type: "uint256" }, { name: "_freelancer", type: "address" }],
    name: "assignFreelancer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "_jobId", type: "uint256" },
      { name: "_milestoneIndex", type: "uint256" },
      { name: "_deliverableHash", type: "string" },
    ],
    name: "submitMilestone",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "_jobId", type: "uint256" }, { name: "_milestoneIndex", type: "uint256" }],
    name: "approveMilestone",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "_jobId", type: "uint256" }, { name: "_milestoneIndex", type: "uint256" }],
    name: "rejectMilestone",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "_jobId", type: "uint256" }],
    name: "cancelJob",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "_jobId", type: "uint256" }, { name: "_milestoneIndex", type: "uint256" }],
    name: "raiseDispute",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "_jobId", type: "uint256" }, { name: "_milestoneIndex", type: "uint256" }],
    name: "autoApproveMilestone",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "jobId", type: "uint256" },
      { indexed: true, name: "client", type: "address" },
      { indexed: false, name: "totalAmount", type: "uint256" },
      { indexed: false, name: "category", type: "string" },
    ],
    name: "JobCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "jobId", type: "uint256" },
      { indexed: true, name: "freelancer", type: "address" },
    ],
    name: "FreelancerAssigned",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "jobId", type: "uint256" },
      { indexed: false, name: "milestoneIndex", type: "uint256" },
      { indexed: false, name: "deliverableHash", type: "string" },
    ],
    name: "MilestoneSubmitted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "jobId", type: "uint256" },
      { indexed: false, name: "milestoneIndex", type: "uint256" },
      { indexed: false, name: "amountReleased", type: "uint256" },
    ],
    name: "MilestoneApproved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "jobId", type: "uint256" },
      { indexed: true, name: "freelancer", type: "address" },
    ],
    name: "JobCompleted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "jobId", type: "uint256" },
      { indexed: false, name: "refundAmount", type: "uint256" },
    ],
    name: "JobCancelled",
    type: "event",
  },
] as const;

export const REPUTATION_ABI = [
  {
    inputs: [{ name: "_user", type: "address" }],
    name: "getCredentials",
    outputs: [{
      components: [
        { name: "jobId", type: "uint256" },
        { name: "client", type: "address" },
        { name: "freelancer", type: "address" },
        { name: "jobTitle", type: "string" },
        { name: "amountEarned", type: "uint256" },
        { name: "category", type: "string" },
        { name: "rating", type: "uint8" },
        { name: "issuedAt", type: "uint256" },
        { name: "ratingSet", type: "bool" },
      ],
      name: "",
      type: "tuple[]",
    }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "", type: "address" }],
    name: "reputationScore",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "", type: "address" }],
    name: "completedJobs",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "", type: "address" }],
    name: "totalEarned",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_jobId", type: "uint256" }, { name: "_rating", type: "uint8" }],
    name: "setRating",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "_user", type: "address" }],
    name: "getUserTokens",
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const USDC_ABI = [
  {
    inputs: [{ name: "spender", type: "address" }, { name: "value", type: "uint256" }],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "faucet",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
