"use client";

import { useAccount } from "wagmi";
import { useClientJobs, useFreelancerJobs } from "@/hooks/useEscrowContract";
import { useReputationScore, useTotalEarned, useCompletedJobs } from "@/hooks/useReputationContract";
import Link from "next/link";
import { formatUSDC, shortenAddress } from "@/lib/utils";
import {
  Briefcase,
  UserSearch,
  ArrowRight,
  ShieldCheck,
  Wallet,
  Lock,
  Banknote,
  Star,
  Award,
} from "lucide-react";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { data: clientJobs, isLoading: clientLoading } = useClientJobs(address);
  const { data: freelancerJobs, isLoading: freelancerLoading } = useFreelancerJobs(address);
  const { data: reputationScore } = useReputationScore(address);
  const { data: totalEarned } = useTotalEarned(address);
  const { data: completedCount } = useCompletedJobs(address);

  const hasClientJobs = clientJobs && clientJobs.length > 0;
  const hasFreelancerJobs = freelancerJobs && freelancerJobs.length > 0;
  const isLoading = clientLoading || freelancerLoading;

  if (!isConnected) {
    return (
      <div className="pt-28 pb-16 max-w-2xl mx-auto px-6 text-center space-y-6">
        <div className="size-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Wallet className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-white">Connect Your Wallet</h1>
        <p className="text-slate-400 leading-relaxed">
          Connect your wallet to access your dashboard. In ChainGig, your wallet address is your
          identity — you can be a client, a freelancer, or both.
        </p>
        <div className="bg-navy-muted border border-navy-border rounded-xl p-6 text-left space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">How roles work</h3>
          <div className="flex gap-4 items-start">
            <Briefcase className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white">Client</p>
              <p className="text-xs text-slate-400">You become a client when you post a job. Your dashboard shows jobs you&apos;ve created, milestone approvals, and payment tracking.</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <UserSearch className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white">Freelancer</p>
              <p className="text-xs text-slate-400">You become a freelancer when a client assigns you to their job. Your dashboard shows assigned work, deliverable submission, and earnings.</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white">Both</p>
              <p className="text-xs text-slate-400">The same wallet can post jobs AND work on other people&apos;s jobs. You&apos;ll see both dashboards when applicable.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="pt-28 pb-16 max-w-4xl mx-auto px-6 space-y-6">
        <div className="h-8 bg-navy-muted rounded-lg w-64 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-navy-muted border border-navy-border rounded-xl p-8 animate-pulse h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (!hasClientJobs && !hasFreelancerJobs) {
    return (
      <div className="pt-28 pb-16 max-w-3xl mx-auto px-6 text-center space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">My Dashboard</h1>
          <p className="text-slate-400 font-mono text-sm">{address ? shortenAddress(address) : ""}</p>
        </div>
        <p className="text-slate-400 max-w-lg mx-auto">
          You don&apos;t have any jobs yet. Get started by posting a job as a client or browsing open jobs to get hired as a freelancer.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Link
            href="/post-job"
            className="bg-navy-muted border border-navy-border rounded-xl p-8 hover:border-primary/50 transition-all group text-center space-y-4"
          >
            <div className="size-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
              <Briefcase className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-white">I want to hire</h3>
            <p className="text-sm text-slate-400">Post a job, lock USDC in escrow, and hire a freelancer to deliver milestones.</p>
            <span className="inline-flex items-center gap-1 text-primary text-sm font-semibold">
              Post a Job <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
          <Link
            href="/jobs"
            className="bg-navy-muted border border-navy-border rounded-xl p-8 hover:border-primary/50 transition-all group text-center space-y-4"
          >
            <div className="size-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
              <UserSearch className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-white">I want to work</h3>
            <p className="text-sm text-slate-400">Browse open jobs. Once a client assigns you, your freelancer dashboard appears here.</p>
            <span className="inline-flex items-center gap-1 text-primary text-sm font-semibold">
              Browse Jobs <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </div>
    );
  }

  const repScore = reputationScore ? (Number(reputationScore) / 100).toFixed(1) : null;

  return (
    <div className="pt-28 pb-16 max-w-4xl mx-auto px-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-1">My Dashboard</h1>
        <p className="text-slate-400 font-mono text-sm">{address ? shortenAddress(address) : ""}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Client Role Card */}
        {hasClientJobs ? (
          <Link
            href="/dashboard/client"
            className="bg-navy-muted border border-navy-border rounded-xl p-6 hover:border-primary/50 transition-all group space-y-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Client Dashboard</h2>
                  <p className="text-xs text-slate-400">Manage your posted jobs</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-navy-light rounded-lg p-3 text-center">
                <Lock className="h-4 w-4 text-amber-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-white">{clientJobs.length}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Jobs</p>
              </div>
              <div className="bg-navy-light rounded-lg p-3 text-center">
                <Banknote className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-5">View Details</p>
              </div>
              <div className="bg-navy-light rounded-lg p-3 text-center">
                <Star className="h-4 w-4 text-yellow-400 mx-auto mb-1" />
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-5">Milestones</p>
              </div>
            </div>
          </Link>
        ) : (
          <div className="bg-navy-muted border border-navy-border rounded-xl p-6 space-y-4 opacity-60">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-navy-light flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-500">Client Dashboard</h2>
                <p className="text-xs text-slate-500">Post a job to unlock this dashboard</p>
              </div>
            </div>
            <Link href="/post-job" className="inline-flex items-center gap-1 text-primary text-sm font-semibold hover:underline">
              Post your first job <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {/* Freelancer Role Card */}
        {hasFreelancerJobs ? (
          <Link
            href="/dashboard/freelancer"
            className="bg-navy-muted border border-navy-border rounded-xl p-6 hover:border-primary/50 transition-all group space-y-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <UserSearch className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Freelancer Dashboard</h2>
                  <p className="text-xs text-slate-400">Manage your assigned work</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-navy-light rounded-lg p-3 text-center">
                <Briefcase className="h-4 w-4 text-primary mx-auto mb-1" />
                <p className="text-lg font-bold text-white">{freelancerJobs.length}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Active</p>
              </div>
              <div className="bg-navy-light rounded-lg p-3 text-center">
                <Banknote className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-white">{totalEarned ? formatUSDC(totalEarned) : "0"}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Earned</p>
              </div>
              <div className="bg-navy-light rounded-lg p-3 text-center">
                <Award className="h-4 w-4 text-yellow-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-white">{repScore ?? "—"}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Rating</p>
              </div>
            </div>
          </Link>
        ) : (
          <div className="bg-navy-muted border border-navy-border rounded-xl p-6 space-y-4 opacity-60">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-navy-light flex items-center justify-center">
                <UserSearch className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-500">Freelancer Dashboard</h2>
                <p className="text-xs text-slate-500">Get assigned to a job to unlock this</p>
              </div>
            </div>
            <Link href="/jobs" className="inline-flex items-center gap-1 text-primary text-sm font-semibold hover:underline">
              Browse open jobs <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>

      {/* Role Explanation */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex items-start gap-4">
        <ShieldCheck className="h-6 w-6 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-white mb-1">How roles work in ChainGig</p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your wallet address can hold both roles simultaneously. You are a <strong className="text-white">client</strong> for
            jobs you post, and a <strong className="text-white">freelancer</strong> for jobs you&apos;re assigned to. Each
            dashboard only shows when you have activity in that role. All funds are secured by smart contracts regardless of your role.
          </p>
        </div>
      </div>
    </div>
  );
}
