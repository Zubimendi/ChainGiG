"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useChainId } from "wagmi";
import { REPUTATION_ABI } from "@/constants/abis";
import { getAddresses } from "@/constants/addresses";

export function useCredentials(address: `0x${string}` | undefined) {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  return useReadContract({
    address: addresses.reputation,
    abi: REPUTATION_ABI,
    functionName: "getCredentials",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

export function useReputationScore(address: `0x${string}` | undefined) {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  return useReadContract({
    address: addresses.reputation,
    abi: REPUTATION_ABI,
    functionName: "reputationScore",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

export function useCompletedJobs(address: `0x${string}` | undefined) {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  return useReadContract({
    address: addresses.reputation,
    abi: REPUTATION_ABI,
    functionName: "completedJobs",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

export function useTotalEarned(address: `0x${string}` | undefined) {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  return useReadContract({
    address: addresses.reputation,
    abi: REPUTATION_ABI,
    functionName: "totalEarned",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

export function useSetRating() {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const { isPending: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  async function setRating(jobId: bigint, rating: number) {
    return writeContractAsync({
      address: addresses.reputation,
      abi: REPUTATION_ABI,
      functionName: "setRating",
      args: [jobId, rating],
    });
  }

  return { setRating, isPending, isConfirming, isSuccess, hash };
}
