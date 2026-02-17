"use client";

import Link from "next/link";
import { ConnectWalletButton } from "./ConnectWalletButton";
import { Briefcase } from "lucide-react";

export function Navbar() {
  return (
    <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-white">
              <Briefcase className="h-6 w-6 text-indigo-400" />
              ChainGig
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/jobs" className="text-gray-400 hover:text-white transition-colors text-sm">
                Browse Jobs
              </Link>
              <Link href="/post-job" className="text-gray-400 hover:text-white transition-colors text-sm">
                Post a Job
              </Link>
              <Link href="/dashboard/client" className="text-gray-400 hover:text-white transition-colors text-sm">
                Client Dashboard
              </Link>
              <Link href="/dashboard/freelancer" className="text-gray-400 hover:text-white transition-colors text-sm">
                Freelancer Dashboard
              </Link>
            </div>
          </div>
          <ConnectWalletButton />
        </div>
      </div>
    </nav>
  );
}
