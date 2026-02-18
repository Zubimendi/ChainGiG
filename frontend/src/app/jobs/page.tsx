"use client";

import { useJobCounter, useJobDetails } from "@/hooks/useEscrowContract";
import {
  formatUSDC,
  JOB_STATUS_LABELS,
  shortenAddress,
  JOB_CATEGORIES,
} from "@/lib/utils";
import Link from "next/link";
import { Search, Plus, Star, Wallet, ChevronDown } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  development: "bg-green-900/40 text-green-400 border-green-700/50",
  design: "bg-purple-900/40 text-purple-400 border-purple-700/50",
  writing: "bg-amber-900/40 text-amber-400 border-amber-700/50",
  marketing: "bg-rose-900/40 text-rose-400 border-rose-700/50",
  data: "bg-cyan-900/40 text-cyan-400 border-cyan-700/50",
  consulting: "bg-indigo-900/40 text-indigo-400 border-indigo-700/50",
  other: "bg-slate-900/40 text-slate-400 border-slate-700/50",
};

const STATUS_DOT: Record<number, string> = {
  0: "bg-green-400",
  1: "bg-blue-400",
  2: "bg-yellow-400",
  3: "bg-slate-400",
  4: "bg-red-400",
  5: "bg-slate-600",
};

function JobCardSkeleton() {
  return (
    <div className="bg-navy-muted border border-navy-border rounded-xl p-6 animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-5 bg-navy-light rounded-full w-24" />
        <div className="h-5 bg-navy-light rounded-full w-16" />
      </div>
      <div className="h-6 bg-navy-light rounded w-3/4" />
      <div className="space-y-2">
        <div className="h-4 bg-navy-light rounded w-full" />
        <div className="h-4 bg-navy-light rounded w-2/3" />
      </div>
      <div className="flex gap-6">
        <div className="h-4 bg-navy-light rounded w-28" />
        <div className="h-4 bg-navy-light rounded w-24" />
      </div>
      <div className="flex gap-2">
        <div className="h-6 bg-navy-light rounded-full w-8" />
        <div className="h-6 bg-navy-light rounded-full w-8" />
        <div className="h-6 bg-navy-light rounded-full w-8" />
      </div>
      <div className="h-px bg-navy-border" />
      <div className="flex items-center justify-between">
        <div className="h-4 bg-navy-light rounded w-32" />
        <div className="h-4 bg-navy-light rounded w-8" />
      </div>
    </div>
  );
}

function JobCard({ jobId }: { jobId: bigint }) {
  const { data: job, isLoading } = useJobDetails(jobId);

  if (isLoading) return <JobCardSkeleton />;
  if (!job) return null;

  const category = (job as any).category?.toLowerCase() ?? "other";
  const catColor = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other;
  const statusNum = Number((job as any).status);
  const dotColor = STATUS_DOT[statusNum] ?? "bg-slate-600";

  const deadlineMs = Number((job as any).deadline) * 1000;
  const daysLeft = Math.ceil((deadlineMs - Date.now()) / 86_400_000);
  const deadlineLabel = daysLeft > 0 ? `In ${daysLeft} days` : "Expired";

  const milestoneCount = Number((job as any).milestoneCount);

  return (
    <Link href={`/jobs/${jobId.toString()}`} className="block group">
      <div className="bg-navy-muted border border-navy-border rounded-xl p-6 hover:border-primary/50 transition-all duration-200 space-y-4">
        {/* Category + Status */}
        <div className="flex items-center justify-between">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${catColor}`}
          >
            {category}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className={`h-2 w-2 rounded-full ${dotColor}`} />
            {JOB_STATUS_LABELS[statusNum]}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors leading-tight">
          {(job as any).title}
        </h3>

        {/* Description snippet */}
        <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">
          {(job as any).descriptionHash}
        </p>

        {/* Stats row */}
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs">
          <div>
            <span className="uppercase tracking-wider text-slate-500 font-medium">
              Est. Budget
            </span>
            <p className="text-white font-semibold mt-0.5">
              {formatUSDC((job as any).totalAmount)} USDC
            </p>
          </div>
          <div>
            <span className="uppercase tracking-wider text-slate-500 font-medium">
              Deadline
            </span>
            <p className="text-white font-semibold mt-0.5">{deadlineLabel}</p>
          </div>
        </div>

        {/* Milestone badges */}
        {milestoneCount > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: milestoneCount }, (_, i) => (
              <span
                key={i}
                className="text-[10px] font-bold bg-primary/15 text-primary border border-primary/25 rounded-full px-2 py-0.5"
              >
                M{i + 1}
              </span>
            ))}
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-800/60 text-slate-400 border border-slate-700/40 capitalize">
            {category}
          </span>
        </div>

        {/* Divider + Footer */}
        <div className="border-t border-navy-border pt-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Wallet className="h-3.5 w-3.5" />
            <span>{shortenAddress((job as any).client)}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <Star className="h-3.5 w-3.5" />
            <span>&mdash;</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function FilterDropdown({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="flex items-center gap-2 bg-navy-muted border border-navy-border rounded-lg px-4 py-2.5 text-sm text-slate-300 hover:border-primary/40 transition-colors whitespace-nowrap"
    >
      {label}
      <ChevronDown className="h-4 w-4 text-slate-500" />
    </button>
  );
}

export default function JobsPage() {
  const { data: jobCount, isLoading } = useJobCounter();

  const jobIds: bigint[] = [];
  if (jobCount) {
    for (let i = Number(jobCount); i >= 1; i--) {
      jobIds.push(BigInt(i));
    }
  }

  return (
    <div className="pt-28 pb-16">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black text-white tracking-tight">
            Browse Open Jobs
          </h1>
          <Link
            href="/post-job"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-primary/20"
          >
            <Plus className="h-4 w-4" />
            Post a Job
          </Link>
        </div>

        {/* Search / Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search jobs by title or keyword..."
              className="w-full bg-navy-muted border border-navy-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors"
            />
          </div>
          <FilterDropdown label="All Categories" />
          <FilterDropdown label="Budget: Any" />
          <FilterDropdown label="Sort: Newest" />
        </div>

        {/* Job Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <JobCardSkeleton key={i} />
            ))}
          </div>
        ) : jobIds.length === 0 ? (
          <div className="text-center py-24">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-navy-muted border border-navy-border mb-5">
              <Search className="h-7 w-7 text-slate-600" />
            </div>
            <p className="text-lg font-semibold text-slate-400">
              No jobs posted yet.
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Be the first to post a job on ChainGig!
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {jobIds.map((id) => (
                <JobCard key={id.toString()} jobId={id} />
              ))}
            </div>

            {/* Load More */}
            <div className="flex justify-center mt-10">
              <button
                type="button"
                className="px-8 py-3 rounded-lg border border-navy-border bg-navy-muted text-sm font-semibold text-slate-300 hover:border-primary/40 hover:text-white transition-colors"
              >
                Load More Jobs
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
