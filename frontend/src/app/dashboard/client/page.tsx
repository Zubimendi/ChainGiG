"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { useAccount } from "wagmi";
import {
  useClientJobs,
  useJobDetails,
  useMilestones,
  useApproveMilestone,
  useRejectMilestone,
} from "@/hooks/useEscrowContract";
import {
  formatUSDC,
  JOB_STATUS_LABELS,
  MILESTONE_STATUS_LABELS,
  formatDate,
  shortenAddress,
} from "@/lib/utils";
import { TransactionStatus } from "@/components/TransactionStatus";
import {
  Briefcase,
  Lock,
  Banknote,
  Star,
  CheckCircle,
  XCircle,
  Eye,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";

const STATUS_BADGE: Record<number, { bg: string; text: string; dot: string }> = {
  0: { bg: "bg-blue-500/10", text: "text-blue-400", dot: "bg-blue-400" },
  1: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-400" },
  2: { bg: "bg-purple-500/10", text: "text-purple-400", dot: "bg-purple-400" },
  3: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
  4: { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400" },
  5: { bg: "bg-slate-500/10", text: "text-slate-400", dot: "bg-slate-400" },
};

interface JobReport {
  status: number;
  totalAmount: bigint;
}

/* ------------------------------------------------------------------ */
/*  Milestone Tracker — horizontal 4-step progress                     */
/* ------------------------------------------------------------------ */

function MilestoneTracker({
  jobStatus,
  milestones,
}: {
  jobStatus: number;
  milestones: readonly { status: bigint | number }[];
}) {
  const hasSubmitted = milestones.some((ms) => Number(ms.status) === 1);
  const allApproved =
    milestones.length > 0 && milestones.every((ms) => Number(ms.status) === 2);

  const steps = [
    { label: "Deposit", icon: CheckCircle, done: true, active: false },
    {
      label: "In Progress",
      icon: CheckCircle,
      done: jobStatus >= 1,
      active: jobStatus === 1 && !hasSubmitted,
    },
    {
      label: "Review",
      icon: Eye,
      done: allApproved,
      active: hasSubmitted && !allApproved,
    },
    { label: "Release", icon: Lock, done: jobStatus === 3, active: false },
  ];

  return (
    <div className="py-4">
      <div className="flex items-start">
        {steps.map((step, i) => {
          const Icon = step.icon;
          const isLast = i === steps.length - 1;
          return (
            <Fragment key={i}>
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                    step.done
                      ? "border-primary bg-primary/20 text-primary"
                      : step.active
                      ? "border-primary bg-primary/10 text-primary animate-pulse"
                      : "border-navy-border bg-navy-muted text-slate-500"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span
                  className={`text-xs font-medium whitespace-nowrap ${
                    step.done || step.active ? "text-white" : "text-slate-500"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={`mt-5 h-0.5 flex-1 transition-colors ${
                    step.done ? "bg-primary" : "bg-navy-border"
                  }`}
                />
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Client Job Card                                                    */
/* ------------------------------------------------------------------ */

function ClientJobCard({
  jobId,
  onReport,
}: {
  jobId: bigint;
  onReport: (id: string, data: JobReport) => void;
}) {
  const { data: job } = useJobDetails(jobId);
  const { data: milestones } = useMilestones(jobId);
  const {
    approve,
    isPending: approvePending,
    isConfirming: approveConfirming,
    isSuccess: approveSuccess,
    hash: approveHash,
  } = useApproveMilestone();
  const {
    reject,
    isPending: rejectPending,
    isConfirming: rejectConfirming,
    isSuccess: rejectSuccess,
    hash: rejectHash,
  } = useRejectMilestone();

  useEffect(() => {
    if (job) {
      onReport(jobId.toString(), {
        status: Number(job.status),
        totalAmount: job.totalAmount,
      });
    }
  }, [job, jobId, onReport]);

  if (!job) return null;

  const status = Number(job.status);
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE[0];
  const hasFreelancer =
    job.freelancer !== "0x0000000000000000000000000000000000000000";
  const submittedIndex =
    milestones?.findIndex((ms) => Number(ms.status) === 1) ?? -1;
  const submittedMilestone =
    submittedIndex >= 0 ? milestones![submittedIndex] : null;

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
    <div className="bg-navy-muted border border-navy-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <h3 className="text-xl font-bold text-white truncate">
              {job.title}
            </h3>
            <p className="text-sm text-slate-400">
              {hasFreelancer && (
                <>Freelancer: {shortenAddress(job.freelancer)} · </>
              )}
              Job #{jobId.toString()}
              {job.deadline > 0n && <> · Due {formatDate(job.deadline)}</>}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <p className="text-lg font-bold text-white">
                {formatUSDC(job.totalAmount)}
              </p>
              <p className="text-xs text-slate-400">USDC in escrow</p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
              {JOB_STATUS_LABELS[status]}
            </span>
          </div>
        </div>
      </div>

      {/* Milestone tracker + action area */}
      {hasFreelancer && milestones && milestones.length > 0 && (
        <div className="px-6 pb-6 space-y-4">
          <MilestoneTracker jobStatus={status} milestones={milestones} />

          {/* Submitted milestone — action area */}
          {submittedMilestone && submittedIndex >= 0 && (
            <div className="bg-navy-light border border-navy-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">
                    {submittedMilestone.title}
                  </p>
                  <p className="text-xs text-slate-400">
                    Milestone {submittedIndex + 1} of {milestones.length}
                    {submittedMilestone.deliverableHash && (
                      <>
                        {" "}
                        · CID:{" "}
                        {submittedMilestone.deliverableHash.slice(0, 16)}…
                      </>
                    )}
                  </p>
                </div>
                <span className="text-sm font-semibold text-white">
                  {formatUSDC(submittedMilestone.amount)} USDC
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleReject(submittedIndex)}
                  disabled={rejectPending || rejectConfirming}
                  className="flex items-center gap-1.5 border border-navy-border hover:border-red-500/50 text-slate-300 hover:text-red-400 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  <XCircle className="h-4 w-4" /> Request Revision
                </button>
                <button
                  onClick={() => handleApprove(submittedIndex)}
                  disabled={approvePending || approveConfirming}
                  className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  <CheckCircle className="h-4 w-4" /> Approve Milestone
                </button>
              </div>
            </div>
          )}

          {/* All milestones list */}
          <div className="space-y-1">
            {milestones.map((ms, i) => {
              const msStatus = Number(ms.status);
              const msBadge =
                {
                  0: "text-slate-400",
                  1: "text-amber-400",
                  2: "text-emerald-400",
                  3: "text-red-400",
                  4: "text-red-400",
                }[msStatus] ?? "text-slate-400";

              return (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-navy-light/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        msStatus === 2
                          ? "bg-emerald-500/20 text-emerald-400"
                          : msStatus === 1
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-navy-light text-slate-500"
                      }`}
                    >
                      {msStatus === 2 ? "✓" : i + 1}
                    </div>
                    <span className="text-sm text-slate-300">{ms.title}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${msBadge}`}>
                      {MILESTONE_STATUS_LABELS[msStatus]}
                    </span>
                    <span className="text-sm text-slate-400">
                      {formatUSDC(ms.amount)} USDC
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transaction feedback */}
      <div className="px-6 pb-2">
        <TransactionStatus
          isPending={approvePending}
          isConfirming={approveConfirming}
          isSuccess={approveSuccess}
          hash={approveHash}
          label="Approval"
        />
        <TransactionStatus
          isPending={rejectPending}
          isConfirming={rejectConfirming}
          isSuccess={rejectSuccess}
          hash={rejectHash}
          label="Rejection"
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ClientDashboard() {
  const { address, isConnected } = useAccount();
  const { data: jobIds, isLoading } = useClientJobs(address);
  const [activeTab, setActiveTab] = useState<
    "active" | "completed" | "cancelled"
  >("active");
  const [jobsMap, setJobsMap] = useState<Record<string, JobReport>>({});

  const handleReport = useCallback((id: string, data: JobReport) => {
    setJobsMap((prev) => {
      if (
        prev[id] &&
        prev[id].status === data.status &&
        prev[id].totalAmount === data.totalAmount
      )
        return prev;
      return { ...prev, [id]: data };
    });
  }, []);

  const allJobs = Object.values(jobsMap);
  const activeJobs = allJobs.filter(
    (j) => j.status === 0 || j.status === 1 || j.status === 2
  );
  const activeCount = activeJobs.length;
  const inEscrow = activeJobs.reduce((sum, j) => sum + j.totalAmount, 0n);
  const completedJobs = allJobs.filter((j) => j.status === 3);
  const totalPaid = completedJobs.reduce((sum, j) => sum + j.totalAmount, 0n);

  const filteredJobIds = jobIds
    ? [...jobIds].reverse().filter((id) => {
        const data = jobsMap[id.toString()];
        if (!data) return true;
        if (activeTab === "active")
          return data.status === 0 || data.status === 1 || data.status === 2;
        if (activeTab === "completed") return data.status === 3;
        if (activeTab === "cancelled") return data.status === 5;
        return true;
      })
    : [];

  if (!isConnected) {
    return (
      <div className="pt-28 pb-16 flex flex-col items-center justify-center text-center">
        <Briefcase className="h-12 w-12 text-slate-600 mb-4" />
        <h1 className="text-2xl font-bold mb-2 text-white">
          Client Dashboard
        </h1>
        <p className="text-slate-400">
          Connect your wallet to view your jobs.
        </p>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-16 max-w-[1100px] mx-auto px-6 space-y-8">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Active Jobs",
            value: isLoading ? "…" : activeCount.toString(),
            icon: Briefcase,
            iconColor: "text-primary",
          },
          {
            label: "In Escrow",
            value: isLoading ? "…" : formatUSDC(inEscrow),
            unit: "USDC",
            icon: Lock,
            iconColor: "text-amber-500",
          },
          {
            label: "Total Paid",
            value: isLoading ? "…" : formatUSDC(totalPaid),
            unit: "USDC",
            icon: Banknote,
            iconColor: "text-emerald-500",
          },
          {
            label: "Avg Rating",
            value: "—",
            icon: Star,
            iconColor: "text-yellow-400",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-navy-muted border border-navy-border rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">{stat.label}</span>
              <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
            </div>
            <p className="text-2xl font-bold text-white">
              {stat.value}
              {stat.unit && (
                <span className="text-sm font-normal text-slate-400 ml-1.5">
                  {stat.unit}
                </span>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-navy-border">
        {(["active", "completed", "cancelled"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-medium transition-colors capitalize ${
              activeTab === tab
                ? "border-b-2 border-primary text-primary"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Job cards */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-navy-muted border border-navy-border rounded-xl p-6 animate-pulse"
            >
              <div className="h-6 w-48 bg-navy-light rounded mb-3" />
              <div className="h-4 w-32 bg-navy-light rounded" />
            </div>
          ))}
        </div>
      ) : !jobIds || jobIds.length === 0 ? (
        <div className="text-center py-16">
          <Briefcase className="h-12 w-12 mx-auto mb-4 text-slate-600" />
          <p className="text-lg font-medium text-slate-400">
            No jobs posted yet
          </p>
          <p className="text-sm text-slate-500 mt-1">
            Create your first job to get started.
          </p>
        </div>
      ) : filteredJobIds.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-400">No {activeTab} jobs.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredJobIds.map((id) => (
            <ClientJobCard
              key={id.toString()}
              jobId={id}
              onReport={handleReport}
            />
          ))}
        </div>
      )}

      {/* Escrow Protection Banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">
            ChainGig Escrow Protection
          </p>
          <p className="text-sm text-slate-400">
            Funds are released only when you approve the milestones.
          </p>
        </div>
      </div>
    </div>
  );
}
