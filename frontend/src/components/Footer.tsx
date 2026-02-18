"use client";

import Link from "next/link";
import { ShieldCheck, Globe, MessageCircle, Terminal, ArrowRight } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-background pt-20 pb-10 border-t border-navy-border">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-primary p-1 rounded flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">ChainGig</span>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">
              The decentralized infrastructure for milestone-based collaboration. Built for the
              modern freelancer.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h5 className="text-white font-bold text-sm mb-6 uppercase tracking-wider">
              Platform
            </h5>
            <ul className="space-y-4 text-slate-500 text-sm">
              <li>
                <Link href="/jobs" className="hover:text-primary transition-colors">
                  Find Work
                </Link>
              </li>
              <li>
                <Link href="/post-job" className="hover:text-primary transition-colors">
                  Post a Project
                </Link>
              </li>
              <li>
                <Link href="/profile" className="hover:text-primary transition-colors">
                  My Profile
                </Link>
              </li>
              <li>
                <span className="hover:text-primary transition-colors cursor-pointer">
                  Fee Structure
                </span>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h5 className="text-white font-bold text-sm mb-6 uppercase tracking-wider">
              Company
            </h5>
            <ul className="space-y-4 text-slate-500 text-sm">
              <li>
                <span className="hover:text-primary transition-colors cursor-pointer">
                  About Us
                </span>
              </li>
              <li>
                <span className="hover:text-primary transition-colors cursor-pointer">
                  Privacy Policy
                </span>
              </li>
              <li>
                <span className="hover:text-primary transition-colors cursor-pointer">
                  Terms of Service
                </span>
              </li>
              <li>
                <span className="hover:text-primary transition-colors cursor-pointer">
                  Brand Assets
                </span>
              </li>
            </ul>
          </div>

          {/* Stay Updated */}
          <div>
            <h5 className="text-white font-bold text-sm mb-6 uppercase tracking-wider">
              Stay Updated
            </h5>
            <div className="flex gap-2 mb-4">
              <input
                className="bg-navy-muted border border-navy-border rounded-lg text-sm w-full px-3 py-2 focus:ring-primary focus:border-primary text-white placeholder-slate-500 outline-none"
                placeholder="Email address"
                type="email"
              />
              <button className="bg-primary p-2 rounded-lg text-white hover:bg-primary-hover transition-colors shrink-0">
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
            <p className="text-slate-500 text-xs italic">
              Weekly updates on new high-budget on-chain projects.
            </p>
          </div>
        </div>

        <div className="pt-8 border-t border-navy-border flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-slate-500 text-xs">
            &copy; {new Date().getFullYear()} ChainGig Protocol. All rights reserved.
          </p>
          <div className="flex gap-6">
            <span className="text-slate-500 hover:text-white transition-colors cursor-pointer">
              <Globe className="h-5 w-5" />
            </span>
            <span className="text-slate-500 hover:text-white transition-colors cursor-pointer">
              <MessageCircle className="h-5 w-5" />
            </span>
            <span className="text-slate-500 hover:text-white transition-colors cursor-pointer">
              <Terminal className="h-5 w-5" />
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
