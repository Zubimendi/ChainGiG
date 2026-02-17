/**
 * Contract addresses per network.
 * Update after each deployment from deployments/[network].json
 */

export const CHAIN_IDS = {
  BASE_SEPOLIA: 84532,
  BASE_MAINNET: 8453,
  HARDHAT: 31337,
} as const;

export const ADDRESSES: Record<
  number,
  {
    escrow: `0x${string}`;
    reputation: `0x${string}`;
    dispute: `0x${string}`;
    usdc: `0x${string}`;
  }
> = {
  // Base Sepolia — update after deployment
  [CHAIN_IDS.BASE_SEPOLIA]: {
    escrow: (process.env.NEXT_PUBLIC_ESCROW_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
    reputation: (process.env.NEXT_PUBLIC_REPUTATION_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
    dispute: (process.env.NEXT_PUBLIC_DISPUTE_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
    usdc: (process.env.NEXT_PUBLIC_USDC_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  },
  // Base Mainnet
  [CHAIN_IDS.BASE_MAINNET]: {
    escrow: "0x0000000000000000000000000000000000000000",
    reputation: "0x0000000000000000000000000000000000000000",
    dispute: "0x0000000000000000000000000000000000000000",
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  },
  // Hardhat local — reads same env vars as Sepolia (set in .env.local after local deploy)
  [CHAIN_IDS.HARDHAT]: {
    escrow: (process.env.NEXT_PUBLIC_ESCROW_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
    reputation: (process.env.NEXT_PUBLIC_REPUTATION_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
    dispute: (process.env.NEXT_PUBLIC_DISPUTE_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
    usdc: (process.env.NEXT_PUBLIC_USDC_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  },
};

export function getAddresses(chainId: number) {
  return ADDRESSES[chainId] ?? ADDRESSES[CHAIN_IDS.BASE_SEPOLIA];
}
