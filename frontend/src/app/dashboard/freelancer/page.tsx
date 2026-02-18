"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";
import {
  useFreelancerJobs,
  useJobDetails,
  useMilestones,
  useSubmitMilestone,
} from "@/hooks/useEscrowContract";
import {
  useReputationScore,
  useTotalEarned,
  useCompletedJobs,
} from "@/hooks/useReputationContract";
import {
  formatUSDC,
  JOB_STATUS_LABELS,
  MILESTONE_STATUS_LABELS,
  shortenAddress,
} from "@/lib/utils";
import { TransactionStatus } from "@/components/TransactionStatus";
import {
  Briefcase,
  Clock,
  Upload,
  ShieldCheck,
  Info,
  ChevronRight,
  Wallet,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";

const STATUS_BADGE: Record<number, { bg: string; text: string; dot: string }> =
  {
    0: { bg: "bg-blue-500/10", text: "text-blue-400", dot: "bg-blue-400" },
    1: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-400" },
    2: {
      bg: "bg-purple-500/10",
      text: "text-purple-400",
      dot: "bg-purple-400",
    },
    3: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      dot: "bg-emerald-400",
    },
    4: { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400" },
    5: { bg: "bg-slate-500/10", text: "text-slate-400", dot: "bg-slate-400" },
  };

interface JobReport {
  status: number;
  totalAmount: bigint;
  pendingAmount: bigint;
  category: string;
}

/* ------------------------------------------------------------------ */
/*  Freelancer Job Card                                                */
/* ------------------------------------------------------------------ */

function FreelancerJobCard({
  jobId,
  onReport,
}: {
  jobId: bigint;
  onReport: (id: string, data: JobReport) => void;
}) {
  const { data: job } = useJobDetails(jobId);
  const { data: milestones } = useMilestones(jobId);
  const { submit, isPending, isConfirming, isSuccess, hash } =
    useSubmitMilestone();
  const [ipfsHash, setIpfsHash] = useState("");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (job && milestones) {
      const pending = milestones
        .filter((ms) => Number(ms.status) === 1)
        .reduce((sum, ms) => sum + ms.amount, 0n);
      onReport(jobId.toString(), {
        status: Number(job.status),
        totalAmount: job.totalAmount,
        pendingAmount: pending,
        category: job.category,
      });
    }
  }, [job, milestones, jobId, onReport]);

  if (!job) return null;

  const status = Number(job.status);
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE[0];
  const isActive = status === 0 || status === 1 || status === 2;

  const nextMilestoneIndex =
    milestones?.findIndex(
      (ms) => Number(ms.status) === 0 || Number(ms.status) === 3
    ) ?? -1;

  async function handleSubmit(milestoneIndex: number) {
    if (!ipfsHash.trim()) {
      toast.error("Please enter an IPFS CID");
      return;
    }
    try {
      await submit(jobId, BigInt(milestoneIndex), ipfsHash);
      toast.success("Milestone submitted!");
      setIpfsHash("");
    } catch {
      toast.error("Failed to submit milestone");
    }
  }

  return (
    <div
      className={`bg-navy-muted rounded-xl overflow-hidden transition-colors ${
        expanded
          ? "border-2 border-primary/30"
          : "border border-navy-border hover:border-navy-border/80"
      }`}
    >
      {/* Card header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 flex items-start justify-between gap-4 text-left"
      >
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white truncate">
              {job.title}
            </h3>
            <ChevronRight
              className={`h-4 w-4 text-slate-500 shrink-0 transition-transform ${
                expanded ? "rotate-90" : ""
              }`}
            />
          </div>
          <p className="text-sm text-slate-400">
            Client: {shortenAddress(job.client)} · {formatUSDC(job.totalAmount)}{" "}
            USDC
          </p>
          {job.category && (
            <span className="inline-block mt-1 px-2.5 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
              {job.category}
            </span>
          )}
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium shrink-0 ${badge.bg} ${badge.text}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
          {JOB_STATUS_LABELS[status]}
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          {/* Milestones overview */}
          {milestones && milestones.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Milestones
              </p>
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
                      <span className="text-sm text-slate-300">
                        {ms.title}
                      </span>
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
          )}

          {/* Submit Deliverable area */}
          {isActive && nextMilestoneIndex >= 0 && milestones && (
            <div className="bg-navy-light border border-navy-border rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-white">
                Submit Deliverable — {milestones[nextMilestoneIndex].title}
              </p>

              {/* Visual-only file upload zone */}
              <div className="border-2 border-dashed border-navy-border rounded-lg p-6 flex flex-col items-center gap-2 text-slate-500 hover:border-primary/30 hover:text-slate-400 transition-colors cursor-pointer">
                <Upload className="h-8 w-8" />
                <p className="text-sm">
                  Drag & drop files or click to browse
                </p>
                <p className="text-xs">Visual only — use IPFS CID below</p>
              </div>

              {/* IPFS CID input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ipfsHash}
                  onChange={(e) => setIpfsHash(e.target.value)}
                  placeholder="IPFS CID (e.g., QmXyz...)"
                  className="flex-1 bg-navy-light border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-primary focus:outline-none"
                />
                <button
                  onClick={() => handleSubmit(nextMilestoneIndex)}
                  disabled={isPending || isConfirming}
                  className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  <Upload className="h-4 w-4" /> Submit to Escrow
                </button>
              </div>

              {/* Auto-approval info */}
              <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-2">
                <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300/80">
                  Auto-approval in 7 days if client doesn&apos;t respond
                </p>
              </div>
            </div>
          )}

          {/* Transaction feedback */}
          <TransactionStatus
            isPending={isPending}
            isConfirming={isConfirming}
            isSuccess={isSuccess}
            hash={hash}
            label="Submission"
          />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function FreelancerDashboard() {
  const { address, isConnected } = useAccount();
  const { data: jobIds, isLoading } = useFreelancerJobs(address);
  const { data: reputationScore } = useReputationScore(address);
  const { data: totalEarned } = useTotalEarned(address);
  const { data: completedJobsCount } = useCompletedJobs(address);
  const [jobsMap, setJobsMap] = useState<Record<string, JobReport>>({});

  const handleReport = useCallback((id: string, data: JobReport) => {
    setJobsMap((prev) => {
      if (
        prev[id] &&
        prev[id].status === data.status &&
        prev[id].pendingAmount === data.pendingAmount
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
  const pendingUSDC = allJobs.reduce((sum, j) => sum + j.pendingAmount, 0n);

  const repScore =
    reputationScore !== undefined ? Number(reputationScore) : null;
  const earned = totalEarned ?? 0n;

  if (!isConnected) {
    return (
      <div className="pt-28 pb-16 flex flex-col items-center justify-center text-center">
        <Briefcase className="h-12 w-12 text-slate-600 mb-4" />
        <h1 className="text-2xl font-bold mb-2 text-white">
          Freelancer Dashboard
        </h1>
        <p className="text-slate-400">
          Connect your wallet to view your jobs.
        </p>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-16 max-w-[1400px] mx-auto px-6 space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard" className="hover:text-primary transition-colors">My Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-white font-medium">Freelancer</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Freelancer Dashboard
        </h1>
        <p className="text-slate-400 mt-1">
          Welcome back.{" "}
          {activeCount > 0
            ? `You have ${activeCount} active job${activeCount > 1 ? "s" : ""}.`
            : "No active deliverables right now."}
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-navy-muted border border-navy-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">Active Jobs</span>
            <Briefcase className="h-5 w-5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-white">
            {isLoading ? "…" : activeCount}
          </p>
        </div>

        <div className="bg-navy-muted border border-navy-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">Pending</span>
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-white">
            {isLoading ? "…" : formatUSDC(pendingUSDC)}
            <span className="text-sm font-normal text-slate-400 ml-1.5">
              USDC
            </span>
          </p>
        </div>

        <div className="bg-navy-muted border border-navy-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">Total Earned</span>
            <Wallet className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-white">
            {formatUSDC(earned)}
            <span className="text-sm font-normal text-slate-400 ml-1.5">
              USDC
            </span>
          </p>
        </div>

        <div className="bg-navy-muted border border-navy-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">Reputation</span>
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-white">
            {repScore !== null ? repScore : "—"}
          </p>
        </div>
      </div>

      {/* Main content: 3-column grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* LEFT — Active Jobs (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">Active Jobs</h2>
            {jobIds && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/20 px-1.5 text-xs font-bold text-primary">
                {jobIds.length}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-navy-muted border border-navy-border rounded-xl p-6 animate-pulse"
                >
                  <div className="h-5 w-48 bg-navy-light rounded mb-3" />
                  <div className="h-4 w-32 bg-navy-light rounded" />
                </div>
              ))}
            </div>
          ) : !jobIds || jobIds.length === 0 ? (
            <div className="bg-navy-muted border border-navy-border rounded-xl text-center py-16">
              <Briefcase className="h-12 w-12 mx-auto mb-4 text-slate-600" />
              <p className="text-lg font-medium text-slate-400">
                No assigned jobs yet
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Browse the marketplace to find opportunities.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...jobIds].reverse().map((id) => (
                <FreelancerJobCard
                  key={id.toString()}
                  jobId={id}
                  onReport={handleReport}
                />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT — Sidebar (1 col) */}
        <div className="space-y-4">
          {/* Trust Profile */}
          <div className="bg-navy-muted border border-navy-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Trust Profile
            </h3>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  {address ? shortenAddress(address) : "—"}
                </p>
                <p className="text-xs text-slate-400">
                  {completedJobsCount !== undefined
                    ? `${Number(completedJobsCount)} jobs completed`
                    : "No history yet"}
                </p>
              </div>
            </div>

            {/* Reputation bars */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400">Success Rate</span>
                  <span className="text-xs font-medium text-white">
                    {repScore !== null && repScore > 0
                      ? `${Math.min(repScore, 100)}%`
                      : "—"}
                  </span>
                </div>
                <div className="h-1.5 bg-navy-light rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{
                      width:
                        repScore !== null && repScore > 0
                          ? `${Math.min(repScore, 100)}%`
                          : "0%",
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400">
                    On-time Delivery
                  </span>
                  <span className="text-xs font-medium text-white">—</span>
                </div>
                <div className="h-1.5 bg-navy-light rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: "0%" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Trustless Escrow Info */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold text-white">
                Trustless Escrow
              </h3>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              All payments are held in a smart contract escrow. Once you submit
              a deliverable, the client has 7 days to approve or request
              revisions. If they don&apos;t respond, funds are auto-released to
              your wallet.
            </p>
            <div className="flex items-center gap-2 text-xs text-primary font-medium">
              <ShieldCheck className="h-3.5 w-3.5" />
              Protected by ChainGig Escrow
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
