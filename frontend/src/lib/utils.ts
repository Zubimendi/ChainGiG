import { formatUnits, parseUnits } from "viem";
import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Format USDC amount (6 decimals) to human-readable string */
export function formatUSDC(amount: bigint): string {
  return formatUnits(amount, 6);
}

/** Parse human-readable USDC string to bigint (6 decimals) */
export function parseUSDC(amount: string): bigint {
  return parseUnits(amount, 6);
}

/** Format an address to short form: 0x1234...abcd */
export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/** Map numeric job status to label */
export const JOB_STATUS_LABELS: Record<number, string> = {
  0: "Open",
  1: "In Progress",
  2: "Under Review",
  3: "Completed",
  4: "Disputed",
  5: "Cancelled",
};

/** Map numeric milestone status to label */
export const MILESTONE_STATUS_LABELS: Record<number, string> = {
  0: "Pending",
  1: "Submitted",
  2: "Approved",
  3: "Rejected",
  4: "Disputed",
};

/** Job categories */
export const JOB_CATEGORIES = [
  "development",
  "design",
  "writing",
  "marketing",
  "data",
  "consulting",
  "other",
] as const;

/** Format Unix timestamp to readable date */
export function formatDate(timestamp: bigint): string {
  return new Date(Number(timestamp) * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
