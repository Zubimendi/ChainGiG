"use client";

import Link from "next/link";
import { ConnectWalletButton } from "./ConnectWalletButton";
import { ShieldCheck } from "lucide-react";

export function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 glass-nav">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-1.5 rounded-lg flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <Link href="/" className="text-xl font-bold tracking-tight text-white">
            ChainGig
          </Link>
        </div>
        <div className="hidden md:flex items-center gap-10">
          <Link
            href="/jobs"
            className="text-sm font-medium text-slate-400 hover:text-primary transition-colors"
          >
            Browse Jobs
          </Link>
          <Link
            href="/post-job"
            className="text-sm font-medium text-slate-400 hover:text-primary transition-colors"
          >
            Post a Job
          </Link>
          <Link
            href="/dashboard/client"
            className="text-sm font-medium text-slate-400 hover:text-primary transition-colors"
          >
            Client Dashboard
          </Link>
          <Link
            href="/dashboard/freelancer"
            className="text-sm font-medium text-slate-400 hover:text-primary transition-colors"
          >
            Freelancer Dashboard
          </Link>
        </div>
        <ConnectWalletButton />
      </div>
    </nav>
  );
}
