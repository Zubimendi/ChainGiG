"use client";

import { useAccount } from "wagmi";
import { useCredentials, useReputationScore, useCompletedJobs, useTotalEarned } from "@/hooks/useReputationContract";
import { formatUSDC, shortenAddress, formatDate } from "@/lib/utils";
import { Award, Star, Briefcase, DollarSign } from "lucide-react";

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const { data: credentials } = useCredentials(address);
  const { data: score } = useReputationScore(address);
  const { data: completedCount } = useCompletedJobs(address);
  const { data: totalEarned } = useTotalEarned(address);

  if (!isConnected) {
    return (
      <div className="text-center py-20">
        <h1 className="text-3xl font-bold mb-4">Profile</h1>
        <p className="text-gray-400">Connect your wallet to view your profile.</p>
      </div>
    );
  }

  const reputationDisplay = score ? (Number(score) / 100).toFixed(1) : "N/A";

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-gray-400 font-mono">{address ? shortenAddress(address) : ""}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
          <Star className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
          <p className="text-2xl font-bold">{reputationDisplay}</p>
          <p className="text-xs text-gray-400 mt-1">Reputation Score</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
          <Briefcase className="h-6 w-6 text-indigo-400 mx-auto mb-2" />
          <p className="text-2xl font-bold">{completedCount?.toString() ?? "0"}</p>
          <p className="text-xs text-gray-400 mt-1">Jobs Completed</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
          <DollarSign className="h-6 w-6 text-green-400 mx-auto mb-2" />
          <p className="text-2xl font-bold">{totalEarned ? formatUSDC(totalEarned) : "0"}</p>
          <p className="text-xs text-gray-400 mt-1">Total Earned (USDC)</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
          <Award className="h-6 w-6 text-purple-400 mx-auto mb-2" />
          <p className="text-2xl font-bold">{credentials?.length ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">SBT Credentials</p>
        </div>
      </div>

      {/* Credentials */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">SoulBound Credentials</h2>

        {!credentials || credentials.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Award className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No credentials yet. Complete a job to earn your first SBT.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {credentials.map((cred, i) => (
              <div
                key={i}
                className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{cred.jobTitle}</h3>
                    <p className="text-xs text-gray-400 capitalize">{cred.category}</p>
                  </div>
                  <div className="bg-indigo-600/20 text-indigo-400 px-2 py-1 rounded text-xs font-medium">
                    SBT
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">Earned</p>
                    <p className="text-green-400">{formatUSDC(cred.amountEarned)} USDC</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Rating</p>
                    <p className="text-yellow-400">
                      {cred.ratingSet ? `${cred.rating}/5` : "Pending"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Issued</p>
                    <p className="text-gray-300">{formatDate(cred.issuedAt)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Client</p>
                    <p className="text-gray-300 font-mono text-xs">{shortenAddress(cred.client)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
