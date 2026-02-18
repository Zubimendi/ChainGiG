"use client";

import Link from "next/link";
import {
  Lock,
  PackageCheck,
  Banknote,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Globe,
  Bot,
  UserSearch,
  Briefcase,
  Hexagon,
  Wallet,
  CircleDollarSign,
} from "lucide-react";

export default function Home() {
  return (
    <div className="pt-20">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden hero-gradient pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-8 uppercase tracking-widest">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            Live on Base L2
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.1] mb-6 tracking-tight">
            Get paid fairly.
            <br />
            <span className="text-primary">Build trust on-chain.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 mb-10 leading-relaxed">
            Milestone-based escrow for African freelancers.
            <br className="hidden md:block" />
            No middlemen. No payment delays. Just secure code.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/post-job"
              className="w-full sm:w-auto px-8 py-4 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover transition-all text-lg flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              Post a Job <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/jobs"
              className="w-full sm:w-auto px-8 py-4 bg-transparent border border-navy-border text-white font-bold rounded-lg hover:bg-white/5 transition-all text-lg"
            >
              Browse Work
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-y border-navy-border bg-navy-muted/30">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="flex flex-col items-center md:items-start">
              <span className="text-slate-500 text-sm font-medium mb-1">USDC Secured</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">$124,500</span>
                <span className="text-primary text-xs font-bold">+12% this week</span>
              </div>
            </div>
            <div className="flex flex-col items-center md:items-start md:border-l border-navy-border md:pl-8">
              <span className="text-slate-500 text-sm font-medium mb-1">Jobs Completed</span>
              <span className="text-3xl font-bold text-white">89</span>
            </div>
            <div className="flex flex-col items-center md:items-start lg:border-l border-navy-border lg:pl-8">
              <span className="text-slate-500 text-sm font-medium mb-1">Avg. Payout Time</span>
              <span className="text-3xl font-bold text-white">4.2m</span>
            </div>
            <div className="flex flex-col items-center md:items-start lg:border-l border-navy-border lg:pl-8">
              <span className="text-slate-500 text-sm font-medium mb-1">Active Freelancers</span>
              <span className="text-3xl font-bold text-white">1.2k</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How it Works</h2>
            <p className="text-slate-400">
              Secure, milestone-driven workflow powered by smart contracts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Lock className="h-8 w-8" />,
                title: "1. Lock USDC",
                desc: "Clients deposit project funds into a secure smart contract escrow. Funds are visible but locked until milestones are met.",
              },
              {
                icon: <PackageCheck className="h-8 w-8" />,
                title: "2. Deliver",
                desc: "Freelancers submit work based on agreed milestones. Proof of work is recorded on-chain for transparent verification.",
              },
              {
                icon: <Banknote className="h-8 w-8" />,
                title: "3. Get Paid",
                desc: "Once milestones are approved, funds are released instantly. No waiting for bank transfers or manual processing.",
              },
            ].map((step) => (
              <div
                key={step.title}
                className="relative p-8 rounded-xl bg-navy-muted border border-navy-border hover:border-primary/50 transition-all group"
              >
                <div className="size-14 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                  {step.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section className="py-32 bg-navy-muted/20 border-t border-navy-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* For Freelancers */}
            <div className="bg-gradient-to-br from-navy-muted to-background p-10 rounded-2xl border border-navy-border">
              <div className="flex items-center gap-3 mb-8">
                <UserSearch className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold text-white italic">For Freelancers</h2>
              </div>
              <ul className="space-y-6">
                {[
                  {
                    title: "Guaranteed Payments",
                    desc: "Know the money is in escrow before you even start the first line of code.",
                  },
                  {
                    title: "On-Chain Reputation",
                    desc: "Build a verifiable history of successful projects that belongs to you, not a platform.",
                  },
                  {
                    title: "Ultra-Low Fees",
                    desc: "Keep 97.5% of what you earn. We only take a 2.5% protocol fee to maintain the network.",
                  },
                ].map((item) => (
                  <li key={item.title} className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-white font-bold mb-1">{item.title}</h4>
                      <p className="text-slate-400 text-sm">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* For Clients */}
            <div className="bg-gradient-to-br from-navy-muted to-background p-10 rounded-2xl border border-navy-border">
              <div className="flex items-center gap-3 mb-8">
                <Briefcase className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold text-white italic">For Clients</h2>
              </div>
              <ul className="space-y-6">
                {[
                  {
                    title: "Zero-Risk Hiring",
                    desc: "Funds only leave your wallet if the milestone requirements are fully met.",
                  },
                  {
                    title: "Global Talent Pool",
                    desc: "Access top-tier African engineering and design talent without international wire headaches.",
                  },
                  {
                    title: "Automated Escrow",
                    desc: "Programmable payments that trigger automatically upon approval, reducing admin overhead.",
                  },
                ].map((item) => (
                  <li key={item.title} className="flex gap-4">
                    <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-white font-bold mb-1">{item.title}</h4>
                      <p className="text-slate-400 text-sm">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust Indicators ── */}
      <section className="py-20 border-t border-navy-border">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-10">
            Powering the future of work on
          </p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
            <div className="flex items-center gap-2 text-white text-2xl font-bold">
              <Hexagon className="h-7 w-7" /> Base
            </div>
            <div className="flex items-center gap-2 text-white text-2xl font-bold">
              <Globe className="h-7 w-7" /> Ethereum
            </div>
            <div className="flex items-center gap-2 text-white text-2xl font-bold">
              <Wallet className="h-7 w-7" /> MetaMask
            </div>
            <div className="flex items-center gap-2 text-white text-2xl font-bold">
              <CircleDollarSign className="h-7 w-7" /> USDC
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
