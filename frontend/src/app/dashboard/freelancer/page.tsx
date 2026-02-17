"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useFreelancerJobs, useJobDetails, useMilestones, useSubmitMilestone } from "@/hooks/useEscrowContract";
import { formatUSDC, JOB_STATUS_LABELS, MILESTONE_STATUS_LABELS } from "@/lib/utils";
import { TransactionStatus } from "@/components/TransactionStatus";
import { Upload, Clock } from "lucide-react";
import toast from "react-hot-toast";

function FreelancerJobCard({ jobId }: { jobId: bigint }) {
  const { data: job } = useJobDetails(jobId);
  const { data: milestones } = useMilestones(jobId);
  const { submit, isPending, isConfirming, isSuccess, hash } = useSubmitMilestone();
  const [ipfsHash, setIpfsHash] = useState("");
  const [selectedMilestone, setSelectedMilestone] = useState<number | null>(null);

  if (!job) return null;

  async function handleSubmit(milestoneIndex: number) {
    if (!ipfsHash.trim()) {
      toast.error("Please enter an IPFS hash");
      return;
    }
    try {
      await submit(jobId, BigInt(milestoneIndex), ipfsHash);
      toast.success("Milestone submitted!");
      setIpfsHash("");
      setSelectedMilestone(null);
    } catch {
      toast.error("Failed to submit milestone");
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">{job.title}</h3>
          <p className="text-sm text-gray-400">
            {formatUSDC(job.totalAmount)} USDC | {JOB_STATUS_LABELS[Number(job.status)]}
          </p>
        </div>
        <span className="text-xs text-gray-500">Job #{jobId.toString()}</span>
      </div>

      {milestones && milestones.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-300">Milestones</h4>
          {milestones.map((ms, i) => {
            const canSubmit = Number(ms.status) === 0 || Number(ms.status) === 3;

            return (
              <div key={i} className="bg-gray-800 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{ms.title}</span>
                  <span className="text-xs text-gray-400">
                    {MILESTONE_STATUS_LABELS[Number(ms.status)]} | {formatUSDC(ms.amount)} USDC
                  </span>
                </div>

                {Number(ms.revision) > 0 && (
                  <p className="text-xs text-yellow-500">
                    Revision {ms.revision.toString()} of 3
                  </p>
                )}

                {canSubmit && (
                  <div className="space-y-2 pt-1">
                    {selectedMilestone === i ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={ipfsHash}
                          onChange={(e) => setIpfsHash(e.target.value)}
                          placeholder="IPFS CID (e.g., QmXyz...)"
                          className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                        />
                        <button
                          onClick={() => handleSubmit(i)}
                          disabled={isPending || isConfirming}
                          className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50"
                        >
                          <Upload className="h-3.5 w-3.5" /> Submit
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedMilestone(i)}
                        className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-xs"
                      >
                        <Upload className="h-3.5 w-3.5" /> Submit Deliverable
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <TransactionStatus isPending={isPending} isConfirming={isConfirming} isSuccess={isSuccess} hash={hash} label="Submission" />
    </div>
  );
}

export default function FreelancerDashboard() {
  const { address, isConnected } = useAccount();
  const { data: jobIds, isLoading } = useFreelancerJobs(address);

  if (!isConnected) {
    return (
      <div className="text-center py-20">
        <h1 className="text-3xl font-bold mb-4">Freelancer Dashboard</h1>
        <p className="text-gray-400">Connect your wallet to view your jobs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Freelancer Dashboard</h1>

      {isLoading ? (
        <p className="text-gray-400">Loading your jobs...</p>
      ) : !jobIds || jobIds.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Clock className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>No assigned jobs yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {[...jobIds].reverse().map((id) => (
            <FreelancerJobCard key={id.toString()} jobId={id} />
          ))}
        </div>
      )}
    </div>
  );
}
