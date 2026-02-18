"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  useJobDetails,
  useMilestones,
  useAssignFreelancer,
} from "@/hooks/useEscrowContract";
import {
  formatUSDC,
  JOB_STATUS_LABELS,
  MILESTONE_STATUS_LABELS,
  formatDate,
  shortenAddress,
} from "@/lib/utils";
import { useAccount } from "wagmi";
import { TransactionStatus } from "@/components/TransactionStatus";
import { useState } from "react";
import toast from "react-hot-toast";
import {
  ChevronRight,
  Share2,
  Lock,
  HelpCircle,
  Gavel,
  Wallet,
} from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  development: "bg-green-900/40 text-green-400 border-green-700/50",
  design: "bg-purple-900/40 text-purple-400 border-purple-700/50",
  writing: "bg-amber-900/40 text-amber-400 border-amber-700/50",
  marketing: "bg-rose-900/40 text-rose-400 border-rose-700/50",
  data: "bg-cyan-900/40 text-cyan-400 border-cyan-700/50",
  consulting: "bg-indigo-900/40 text-indigo-400 border-indigo-700/50",
  other: "bg-slate-900/40 text-slate-400 border-slate-700/50",
};

function DetailSkeleton() {
  return (
    <div className="pt-28 pb-16">
      <div className="max-w-7xl mx-auto px-6 animate-pulse space-y-6">
        <div className="h-4 bg-navy-light rounded w-48" />
        <div className="h-10 bg-navy-light rounded w-2/3" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <div className="h-24 bg-navy-muted rounded-xl border border-navy-border" />
            <div className="h-48 bg-navy-muted rounded-xl border border-navy-border" />
            <div className="h-64 bg-navy-muted rounded-xl border border-navy-border" />
          </div>
          <div className="lg:col-span-4 space-y-6">
            <div className="h-72 bg-navy-muted rounded-xl border border-navy-border" />
            <div className="h-36 bg-navy-muted rounded-xl border border-navy-border" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JobDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { address } = useAccount();
  const [freelancerAddr, setFreelancerAddr] = useState("");

  const { data: job, isLoading: jobLoading } = useJobDetails(BigInt(id || "0"));
  const { data: milestones, isLoading: milestonesLoading } = useMilestones(
    BigInt(id || "0")
  );
  const {
    assign,
    isPending: assignPending,
    isConfirming: assignConfirming,
    isSuccess: assignSuccess,
    hash: assignHash,
  } = useAssignFreelancer();

  if (jobLoading || milestonesLoading) return <DetailSkeleton />;

  if (!job) {
    return (
      <div className="pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-6 text-center py-24">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-navy-muted border border-navy-border mb-5">
            <HelpCircle className="h-7 w-7 text-slate-600" />
          </div>
          <p className="text-lg font-semibold text-slate-400">
            Job not found.
          </p>
          <p className="text-sm text-slate-600 mt-1 mb-6">
            This job may have been removed or doesn&apos;t exist.
          </p>
          <Link
            href="/jobs"
            className="text-sm text-primary hover:text-primary-hover font-medium transition-colors"
          >
            &larr; Back to Browse Jobs
          </Link>
        </div>
      </div>
    );
  }

  const j = job as any;
  const category = j.category?.toLowerCase() ?? "other";
  const catColor = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other;
  const statusNum = Number(j.status);
  const isClient =
    address?.toLowerCase() === j.client?.toLowerCase();
  const milestoneArr = (milestones as any[]) ?? [];

  const deadlineMs = Number(j.deadline) * 1000;
  const daysLeft = Math.ceil((deadlineMs - Date.now()) / 86_400_000);
  const deadlineLabel = daysLeft > 0 ? `In ${daysLeft} days` : "Expired";

  async function handleAssign() {
    if (!freelancerAddr.startsWith("0x") || freelancerAddr.length !== 42) {
      toast.error("Enter a valid Ethereum address");
      return;
    }
    try {
      await assign(BigInt(id), freelancerAddr as `0x${string}`);
      toast.success("Freelancer assigned!");
    } catch {
      toast.error("Failed to assign freelancer");
    }
  }

  return (
    <div className="pt-28 pb-16">
      <div className="max-w-7xl mx-auto px-6">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-6">
          <Link
            href="/jobs"
            className="hover:text-primary transition-colors"
          >
            Jobs
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="capitalize">{category}</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-400">Job Details</span>
        </nav>

        {/* Title row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div className="space-y-3">
            <h1 className="text-3xl font-black text-white tracking-tight">
              {j.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5 text-xs">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                <span className="text-slate-300">
                  {JOB_STATUS_LABELS[statusNum]}
                </span>
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-slate-500">
                Posted {formatDate(j.createdAt)}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-white border border-navy-border rounded-lg px-3 py-2 transition-colors self-start"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left column */}
          <div className="lg:col-span-8 space-y-8">
            {/* Metadata grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Deadline", value: deadlineLabel },
                {
                  label: "Budget",
                  value: `${formatUSDC(j.totalAmount)} USDC`,
                },
                { label: "Category", value: category, capitalize: true },
                {
                  label: "Milestones",
                  value: Number(j.milestoneCount).toString(),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-navy-muted border border-navy-border rounded-xl p-4"
                >
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                    {item.label}
                  </span>
                  <p
                    className={`text-sm font-bold text-white mt-1 ${
                      item.capitalize ? "capitalize" : ""
                    }`}
                  >
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            {/* About */}
            <div className="bg-navy-muted border border-navy-border rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">
                About this Job
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">
                {j.descriptionHash}
              </p>
            </div>

            {/* Milestones */}
            <div className="bg-navy-muted border border-navy-border rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-5">
                Project Milestones
              </h2>
              <div className="space-y-4">
                {milestoneArr.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No milestones found.
                  </p>
                ) : (
                  milestoneArr.map((m: any, i: number) => (
                    <div
                      key={i}
                      className="flex gap-4 p-4 rounded-lg bg-[#0f172a]/50 border border-navy-border/60"
                    >
                      <span className="flex-shrink-0 h-8 w-8 rounded-lg bg-primary/15 text-primary text-xs font-bold flex items-center justify-center border border-primary/25">
                        M{i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-white truncate">
                            {m.title || `Milestone ${i + 1}`}
                          </h3>
                          <span className="text-xs text-slate-500">
                            {MILESTONE_STATUS_LABELS[Number(m.status)] ??
                              "Unknown"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {m.description || "No description"}
                        </p>
                        <p className="text-sm font-bold text-primary mt-2">
                          {formatUSDC(m.amount)} USDC
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Client info */}
            <div className="bg-navy-muted border border-navy-border rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">
                Client Information
              </h2>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {shortenAddress(j.client)}
                  </p>
                  <p className="text-xs text-slate-500">Client Wallet</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-4 space-y-6">
            {/* Apply / Assign panel */}
            <div className="bg-navy-muted border border-navy-border rounded-xl p-6 lg:sticky lg:top-28">
              {isClient ? (
                <>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
                    Assign Freelancer
                  </h3>
                  <input
                    type="text"
                    placeholder="0x freelancer address..."
                    value={freelancerAddr}
                    onChange={(e) => setFreelancerAddr(e.target.value)}
                    className="w-full bg-[#0f172a]/50 border border-navy-border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors mb-3"
                  />
                  <button
                    type="button"
                    onClick={handleAssign}
                    disabled={assignPending || assignConfirming}
                    className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-bold text-sm py-3 rounded-lg transition-colors shadow-lg shadow-primary/20"
                  >
                    {assignPending
                      ? "Confirming..."
                      : assignConfirming
                        ? "Assigning..."
                        : "Assign Freelancer"}
                  </button>
                  <TransactionStatus
                    isPending={assignPending}
                    isConfirming={assignConfirming}
                    isSuccess={assignSuccess}
                    hash={assignHash}
                    label="Assign Freelancer"
                  />
                </>
              ) : (
                <>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-5">
                    Apply for this Job
                  </h3>

                  <div className="space-y-4 mb-6">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                        Total Escrow Value
                      </span>
                      <p className="text-2xl font-black text-primary mt-1">
                        {formatUSDC(j.totalAmount)}{" "}
                        <span className="text-sm font-semibold text-slate-400">
                          USDC
                        </span>
                      </p>
                    </div>

                    <div className="border-t border-navy-border pt-4 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">
                          Service Fee (2.5%)
                        </span>
                        <span className="text-slate-300">
                          {formatUSDC(j.platformFee)} USDC
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">
                          You&apos;ll Receive
                        </span>
                        <span className="text-green-400 font-semibold">
                          {formatUSDC(j.totalAmount)} USDC
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="w-full bg-primary hover:bg-primary-hover text-white font-bold text-sm py-3 rounded-lg transition-colors shadow-lg shadow-primary/20 mb-4"
                  >
                    Apply Now
                  </button>

                  <div className="flex items-center gap-2 justify-center text-[11px] text-slate-500">
                    <Lock className="h-3.5 w-3.5" />
                    <span>Funds are locked in escrow until approved</span>
                  </div>
                </>
              )}
            </div>

            {/* Help box */}
            <div className="border-2 border-dashed border-navy-border rounded-xl p-5 space-y-3">
              <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-slate-500" />
                Need help?
              </h4>
              <div className="space-y-2 text-xs">
                <Link
                  href="#"
                  className="flex items-center gap-2 text-slate-400 hover:text-primary transition-colors"
                >
                  <Gavel className="h-3.5 w-3.5" />
                  Dispute Resolution Guide
                </Link>
                <Link
                  href="#"
                  className="flex items-center gap-2 text-slate-400 hover:text-primary transition-colors"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  How Escrow Works
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
