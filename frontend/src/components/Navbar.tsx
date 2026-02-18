"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectWalletButton } from "./ConnectWalletButton";
import { useAccount } from "wagmi";
import { useClientJobs, useFreelancerJobs } from "@/hooks/useEscrowContract";
import { ShieldCheck, Menu, X } from "lucide-react";
import { useState } from "react";

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`text-sm font-medium transition-colors ${
        isActive ? "text-primary" : "text-slate-400 hover:text-primary"
      }`}
    >
      {label}
    </Link>
  );
}

export function Navbar() {
  const { address, isConnected } = useAccount();
  const { data: clientJobs } = useClientJobs(address);
  const { data: freelancerJobs } = useFreelancerJobs(address);
  const [mobileOpen, setMobileOpen] = useState(false);

  const hasClientJobs = clientJobs && clientJobs.length > 0;
  const hasFreelancerJobs = freelancerJobs && freelancerJobs.length > 0;
  const hasDashboard = hasClientJobs || hasFreelancerJobs;

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

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-10">
          <NavLink href="/jobs" label="Find Work" />
          <NavLink href="/post-job" label="Post a Job" />
          {isConnected && hasDashboard && (
            <NavLink href="/dashboard" label="My Dashboard" />
          )}
          {isConnected && (
            <NavLink href="/profile" label="Profile" />
          )}
        </div>

        <div className="flex items-center gap-4">
          <ConnectWalletButton />
          <button
            className="md:hidden text-slate-400 hover:text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-navy-border bg-background px-6 py-4 space-y-4">
          <Link href="/jobs" className="block text-sm font-medium text-slate-400 hover:text-primary" onClick={() => setMobileOpen(false)}>
            Find Work
          </Link>
          <Link href="/post-job" className="block text-sm font-medium text-slate-400 hover:text-primary" onClick={() => setMobileOpen(false)}>
            Post a Job
          </Link>
          {isConnected && hasDashboard && (
            <Link href="/dashboard" className="block text-sm font-medium text-slate-400 hover:text-primary" onClick={() => setMobileOpen(false)}>
              My Dashboard
            </Link>
          )}
          {isConnected && (
            <Link href="/profile" className="block text-sm font-medium text-slate-400 hover:text-primary" onClick={() => setMobileOpen(false)}>
              Profile
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
