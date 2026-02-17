"use client";

import Link from "next/link";
import { Shield, Coins, Award, Scale, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="space-y-24 py-12">
      {/* Hero */}
      <section className="text-center space-y-6">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
          Get Paid Fairly.{" "}
          <span className="text-indigo-400">Build Trust On-Chain.</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Milestone-based USDC escrow with tamper-proof SoulBound credentials.
          Built for freelancers on Base L2.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Browse Jobs <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/post-job"
            className="inline-flex items-center gap-2 border border-gray-600 hover:border-gray-400 text-gray-200 px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Post a Job
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="space-y-10">
        <h2 className="text-3xl font-bold text-center">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { step: "1", title: "Post Job", desc: "Client locks USDC in escrow with defined milestones." },
            { step: "2", title: "Do Work", desc: "Freelancer submits deliverables to IPFS per milestone." },
            { step: "3", title: "Get Paid", desc: "Client approves — USDC released instantly to freelancer." },
            { step: "4", title: "Build Reputation", desc: "SoulBound Token credential minted on completion." },
          ].map((item) => (
            <div
              key={item.step}
              className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center space-y-3"
            >
              <div className="w-10 h-10 bg-indigo-600/20 text-indigo-400 rounded-full flex items-center justify-center mx-auto font-bold">
                {item.step}
              </div>
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="text-gray-400 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="space-y-10">
        <h2 className="text-3xl font-bold text-center">Why ChainGig?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              icon: <Shield className="h-6 w-6 text-indigo-400" />,
              title: "Escrow Protection",
              desc: "USDC locked in audited smart contracts. Funds release only when milestones are approved.",
            },
            {
              icon: <Coins className="h-6 w-6 text-green-400" />,
              title: "USDC Payments",
              desc: "Stable, instant payments. No forex volatility. No 5-10% bank transfer fees.",
            },
            {
              icon: <Award className="h-6 w-6 text-yellow-400" />,
              title: "SoulBound Credentials",
              desc: "Non-transferable on-chain work history. Prove you built X for client Y.",
            },
            {
              icon: <Scale className="h-6 w-6 text-purple-400" />,
              title: "Community Arbitration",
              desc: "Disputes resolved by community arbitrators. 2-of-3 majority vote. Fair and decentralized.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex gap-4"
            >
              <div className="flex-shrink-0 mt-1">{feature.icon}</div>
              <div>
                <h3 className="text-lg font-semibold mb-1">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="text-center space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <p className="text-3xl font-bold text-indigo-400">2.5%</p>
            <p className="text-gray-400 text-sm mt-1">Platform Fee</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <p className="text-3xl font-bold text-green-400">&lt;$0.01</p>
            <p className="text-gray-400 text-sm mt-1">Transaction Cost (Base L2)</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <p className="text-3xl font-bold text-yellow-400">7 days</p>
            <p className="text-gray-400 text-sm mt-1">Auto-Approve Timeout</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="text-center bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-800/50 rounded-2xl p-12 space-y-4">
        <h2 className="text-3xl font-bold">Ready to get started?</h2>
        <p className="text-gray-400">Connect your wallet and start building your on-chain reputation today.</p>
        <Link
          href="/jobs"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
        >
          Explore Jobs <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
