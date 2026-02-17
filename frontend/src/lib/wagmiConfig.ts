"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { baseSepolia, hardhat } from "wagmi/chains";

/**
 * Wagmi + RainbowKit configuration.
 * TESTNET ONLY — Base Sepolia + local Hardhat node.
 * Mainnet chain intentionally excluded until contracts are audited.
 */
export const config = getDefaultConfig({
  appName: "ChainGig",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "demo",
  chains: [baseSepolia, hardhat],
  ssr: true,
});
