"use client";

import { useAccount } from "wagmi";
import { useClientJobs, useJobDetails, useMilestones, useApproveMilestone, useRejectMilestone } from "@/hooks/useEscrowContract";
import { formatUSDC, JOB_STATUS_LABELS, MILESTONE_STATUS_LABELS, formatDate } from "@/lib/utils";
import { TransactionStatus } from "@/components/TransactionStatus";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import toast from "react-hot-toast";

function ClientJobCard({ jobId }: { jobId: bigint }) {
  const { data: job } = useJobDetails(jobId);
  const { data: milestones } = useMilestones(jobId);
  const { approve, isPending: approvePending, isConfirming: approveConfirming, isSuccess: approveSuccess, hash: approveHash } = useApproveMilestone();
  const { reject, isPending: rejectPending, isConfirming: rejectConfirming, isSuccess: rejectSuccess, hash: rejectHash } = useRejectMilestone();

  if (!job) return null;

  async function handleApprove(milestoneIndex: number) {
    try {
      await approve(jobId, BigInt(milestoneIndex));
      toast.success("Milestone approved! Payment released.");
    } catch {
      toast.error("Failed to approve milestone");
    }
  }

  async function handleReject(milestoneIndex: number) {
    try {
      await reject(jobId, BigInt(milestoneIndex));
      toast.success("Milestone rejected. Freelancer can revise.");
    } catch {
      toast.error("Failed to reject milestone");
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
          {milestones.map((ms, i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{ms.title}</span>
                <span className="text-xs text-gray-400">
                  {MILESTONE_STATUS_LABELS[Number(ms.status)]} | {formatUSDC(ms.amount)} USDC
                </span>
              </div>

              {ms.deliverableHash && (
                <p className="text-xs text-gray-500">
                  Deliverable: {ms.deliverableHash}
                </p>
              )}

              {Number(ms.status) === 1 && (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleApprove(i)}
                    disabled={approvePending || approveConfirming}
                    className="flex items-center gap-1 bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50"
                  >
                    <CheckCircle className="h-3.5 w-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => handleReject(i)}
                    disabled={rejectPending || rejectConfirming}
                    className="flex items-center gap-1 bg-red-700 hover:bg-red-600 text-white px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <TransactionStatus isPending={approvePending} isConfirming={approveConfirming} isSuccess={approveSuccess} hash={approveHash} label="Approval" />
      <TransactionStatus isPending={rejectPending} isConfirming={rejectConfirming} isSuccess={rejectSuccess} hash={rejectHash} label="Rejection" />
    </div>
  );
}

export default function ClientDashboard() {
  const { address, isConnected } = useAccount();
  const { data: jobIds, isLoading } = useClientJobs(address);

  if (!isConnected) {
    return (
      <div className="text-center py-20">
        <h1 className="text-3xl font-bold mb-4">Client Dashboard</h1>
        <p className="text-gray-400">Connect your wallet to view your jobs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Client Dashboard</h1>

      {isLoading ? (
        <p className="text-gray-400">Loading your jobs...</p>
      ) : !jobIds || jobIds.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Clock className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>No jobs posted yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {[...jobIds].reverse().map((id) => (
            <ClientJobCard key={id.toString()} jobId={id} />
          ))}
        </div>
      )}
    </div>
  );
}
