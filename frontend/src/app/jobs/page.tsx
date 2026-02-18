"use client";

import { useJobCounter, useJobDetails } from "@/hooks/useEscrowContract";
import { formatUSDC, JOB_STATUS_LABELS, formatDate } from "@/lib/utils";
import Link from "next/link";
import { Briefcase, Clock, DollarSign, Tag } from "lucide-react";

function JobCard({ jobId }: { jobId: bigint }) {
  const { data: job, isLoading } = useJobDetails(jobId);

  if (isLoading) {
    return (
      <div className="bg-navy-muted border border-navy-border rounded-xl p-6 animate-pulse">
        <div className="h-6 bg-navy-light rounded w-3/4 mb-4" />
        <div className="h-4 bg-navy-light rounded w-1/2 mb-2" />
        <div className="h-4 bg-navy-light rounded w-1/3" />
      </div>
    );
  }

  if (!job) return null;

  const statusColor: Record<number, string> = {
    0: "bg-green-900/50 text-green-400 border-green-700",
    1: "bg-blue-900/50 text-blue-400 border-blue-700",
    2: "bg-yellow-900/50 text-yellow-400 border-yellow-700",
    3: "bg-gray-900/50 text-gray-400 border-gray-700",
    4: "bg-red-900/50 text-red-400 border-red-700",
    5: "bg-gray-900/50 text-gray-500 border-gray-700",
  };

  return (
    <Link href={`/jobs/${jobId.toString()}`}>
      <div className="bg-navy-muted border border-navy-border rounded-xl p-6 hover:border-primary/50 transition-colors cursor-pointer space-y-4">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-white">{job.title}</h3>
          <span
            className={`text-xs px-2 py-1 rounded-full border ${statusColor[Number(job.status)] ?? ""}`}
          >
            {JOB_STATUS_LABELS[Number(job.status)]}
          </span>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-slate-400">
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            <span>{formatUSDC(job.totalAmount)} USDC</span>
          </div>
          <div className="flex items-center gap-1">
            <Tag className="h-4 w-4" />
            <span className="capitalize">{job.category}</span>
          </div>
          <div className="flex items-center gap-1">
            <Briefcase className="h-4 w-4" />
            <span>{job.milestoneCount.toString()} milestones</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>Due {formatDate(job.deadline)}</span>
          </div>
        </div>
      </div>
    </Link>
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
    <div className="pt-28 pb-16 max-w-7xl mx-auto px-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Browse Jobs</h1>
        <Link
          href="/post-job"
          className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-primary/20"
        >
          Post a Job
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-navy-muted border border-navy-border rounded-xl p-6 animate-pulse">
              <div className="h-6 bg-navy-light rounded w-3/4 mb-4" />
              <div className="h-4 bg-navy-light rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : jobIds.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No jobs posted yet.</p>
          <p className="text-sm">Be the first to post a job!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobIds.map((id) => (
            <JobCard key={id.toString()} jobId={id} />
          ))}
        </div>
      )}
    </div>
  );
}
