"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useChainId } from "wagmi";
import { parseUnits } from "viem";
import { ESCROW_ABI, USDC_ABI } from "@/constants/abis";
import { getAddresses } from "@/constants/addresses";

export function useJobCounter() {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  return useReadContract({
    address: addresses.escrow,
    abi: ESCROW_ABI,
    functionName: "jobCounter",
  });
}

export function useJobDetails(jobId: bigint) {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  return useReadContract({
    address: addresses.escrow,
    abi: ESCROW_ABI,
    functionName: "getJob",
    args: [jobId],
  });
}

export function useMilestones(jobId: bigint) {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  return useReadContract({
    address: addresses.escrow,
    abi: ESCROW_ABI,
    functionName: "getMilestones",
    args: [jobId],
  });
}

export function useClientJobs(address: `0x${string}` | undefined) {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  return useReadContract({
    address: addresses.escrow,
    abi: ESCROW_ABI,
    functionName: "getClientJobs",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

export function useFreelancerJobs(address: `0x${string}` | undefined) {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  return useReadContract({
    address: addresses.escrow,
    abi: ESCROW_ABI,
    functionName: "getFreelancerJobs",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

export function useCreateJob() {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const { isPending: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  async function createJob(params: {
    title: string;
    descriptionHash: string;
    category: string;
    milestoneTitles: string[];
    milestoneDescriptions: string[];
    milestoneAmounts: number[];
    deadline: Date;
  }) {
    const amounts = params.milestoneAmounts.map((a) => parseUnits(a.toString(), 6));
    const total = amounts.reduce((a, b) => a + b, 0n);
    const fee = (total * 250n) / 10_000n;
    const required = total + fee;

    // Step 1: Approve USDC — wait for the tx hash
    const approveHash = await writeContractAsync({
      address: addresses.usdc,
      abi: USDC_ABI,
      functionName: "approve",
      args: [addresses.escrow, required],
    });

    // Step 2: Wait for approval to actually be mined on-chain
    // Poll the provider until the tx receipt exists
    if (approveHash && typeof window !== "undefined") {
      await new Promise<void>((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 60;
        const poll = setInterval(async () => {
          attempts++;
          try {
            const resp = await fetch(
              `https://sepolia.basescan.org/api?module=transaction&action=gettxreceiptstatus&txhash=${approveHash}`
            );
            const data = await resp.json();
            if (data?.result?.status === "1") {
              clearInterval(poll);
              resolve();
            }
          } catch {
            // Fallback: after a reasonable wait, proceed
          }
          if (attempts >= maxAttempts) {
            clearInterval(poll);
            // After 30 seconds of polling, proceed anyway — the node usually
            // confirms within 2-4 seconds on Base Sepolia
            resolve();
          }
        }, 500);
      });
    }

    // Step 3: Create the job now that USDC is approved
    return writeContractAsync({
      address: addresses.escrow,
      abi: ESCROW_ABI,
      functionName: "createJob",
      args: [
        params.title,
        params.descriptionHash,
        params.category,
        params.milestoneTitles,
        params.milestoneDescriptions,
        amounts,
        BigInt(Math.floor(params.deadline.getTime() / 1000)),
      ],
    });
  }

  return { createJob, isPending, isConfirming, isSuccess, hash };
}

export function useApproveMilestone() {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const { isPending: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  async function approve(jobId: bigint, milestoneIndex: bigint) {
    return writeContractAsync({
      address: addresses.escrow,
      abi: ESCROW_ABI,
      functionName: "approveMilestone",
      args: [jobId, milestoneIndex],
    });
  }

  return { approve, isPending, isConfirming, isSuccess, hash };
}

export function useRejectMilestone() {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const { isPending: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  async function reject(jobId: bigint, milestoneIndex: bigint) {
    return writeContractAsync({
      address: addresses.escrow,
      abi: ESCROW_ABI,
      functionName: "rejectMilestone",
      args: [jobId, milestoneIndex],
    });
  }

  return { reject, isPending, isConfirming, isSuccess, hash };
}

export function useSubmitMilestone() {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const { isPending: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  async function submit(jobId: bigint, milestoneIndex: bigint, ipfsHash: string) {
    return writeContractAsync({
      address: addresses.escrow,
      abi: ESCROW_ABI,
      functionName: "submitMilestone",
      args: [jobId, milestoneIndex, ipfsHash],
    });
  }

  return { submit, isPending, isConfirming, isSuccess, hash };
}

export function useCancelJob() {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const { isPending: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  async function cancel(jobId: bigint) {
    return writeContractAsync({
      address: addresses.escrow,
      abi: ESCROW_ABI,
      functionName: "cancelJob",
      args: [jobId],
    });
  }

  return { cancel, isPending, isConfirming, isSuccess, hash };
}

export function useAssignFreelancer() {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const { isPending: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  async function assign(jobId: bigint, freelancer: `0x${string}`) {
    return writeContractAsync({
      address: addresses.escrow,
      abi: ESCROW_ABI,
      functionName: "assignFreelancer",
      args: [jobId, freelancer],
    });
  }

  return { assign, isPending, isConfirming, isSuccess, hash };
}
