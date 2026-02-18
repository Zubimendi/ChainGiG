"use client";

import { useState } from "react";
import { useCreateJob } from "@/hooks/useEscrowContract";
import { useAccount } from "wagmi";
import { TransactionStatus } from "@/components/TransactionStatus";
import { JOB_CATEGORIES } from "@/lib/utils";
import { Plus, Minus } from "lucide-react";
import toast from "react-hot-toast";

interface MilestoneInput {
  title: string;
  description: string;
  amount: string;
}

export default function PostJobPage() {
  const { isConnected } = useAccount();
  const { createJob, isPending, isConfirming, isSuccess, hash } = useCreateJob();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("development");
  const [deadline, setDeadline] = useState("");
  const [milestones, setMilestones] = useState<MilestoneInput[]>([
    { title: "", description: "", amount: "" },
  ]);

  function addMilestone() {
    if (milestones.length >= 10) return;
    setMilestones([...milestones, { title: "", description: "", amount: "" }]);
  }

  function removeMilestone(index: number) {
    if (milestones.length <= 1) return;
    setMilestones(milestones.filter((_, i) => i !== index));
  }

  function updateMilestone(index: number, field: keyof MilestoneInput, value: string) {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    setMilestones(updated);
  }

  const totalAmount = milestones.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0);
  const platformFee = totalAmount * 0.025;
  const totalRequired = totalAmount + platformFee;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      await createJob({
        title,
        descriptionHash: description,
        category,
        milestoneTitles: milestones.map((m) => m.title),
        milestoneDescriptions: milestones.map((m) => m.description || "N/A"),
        milestoneAmounts: milestones.map((m) => parseFloat(m.amount)),
        deadline: new Date(deadline),
      });
      toast.success("Job created successfully!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      toast.error(message);
    }
  }

  if (!isConnected) {
    return (
      <div className="pt-28 pb-16 text-center">
        <h1 className="text-3xl font-bold mb-4 text-white">Post a Job</h1>
        <p className="text-slate-400">Connect your wallet to post a job.</p>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-16 max-w-2xl mx-auto px-6 space-y-6">
      <h1 className="text-3xl font-bold text-white">Post a Job</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Job Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g., Build DApp Frontend"
            className="w-full bg-navy-muted border border-navy-border rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:border-primary focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            placeholder="Describe the job requirements..."
            className="w-full bg-navy-muted border border-navy-border rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:border-primary focus:outline-none resize-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-navy-muted border border-navy-border rounded-lg px-4 py-2.5 text-white focus:border-primary focus:outline-none transition-colors"
          >
            {JOB_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Deadline</label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            required
            min={new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0]}
            className="w-full bg-navy-muted border border-navy-border rounded-lg px-4 py-2.5 text-white focus:border-primary focus:outline-none transition-colors"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-300">
              Milestones ({milestones.length}/10)
            </label>
            <button
              type="button"
              onClick={addMilestone}
              disabled={milestones.length >= 10}
              className="flex items-center gap-1 text-primary hover:text-primary-hover text-sm font-medium disabled:opacity-50 transition-colors"
            >
              <Plus className="h-4 w-4" /> Add Milestone
            </button>
          </div>

          {milestones.map((ms, i) => (
            <div key={i} className="bg-navy-muted border border-navy-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-400">Milestone {i + 1}</span>
                {milestones.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMilestone(i)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                )}
              </div>
              <input
                type="text"
                value={ms.title}
                onChange={(e) => updateMilestone(i, "title", e.target.value)}
                required
                placeholder="Milestone title"
                className="w-full bg-navy-light border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-primary focus:outline-none transition-colors"
              />
              <input
                type="text"
                value={ms.description}
                onChange={(e) => updateMilestone(i, "description", e.target.value)}
                placeholder="Description (optional)"
                className="w-full bg-navy-light border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-primary focus:outline-none transition-colors"
              />
              <div className="relative">
                <input
                  type="number"
                  value={ms.amount}
                  onChange={(e) => updateMilestone(i, "amount", e.target.value)}
                  required
                  min="1"
                  step="0.01"
                  placeholder="Amount in USDC"
                  className="w-full bg-navy-light border border-navy-border rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-primary focus:outline-none pr-16 transition-colors"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                  USDC
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-navy-muted border border-navy-border rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Total Milestones</span>
            <span className="text-white">{totalAmount.toFixed(2)} USDC</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Platform Fee (2.5%)</span>
            <span className="text-white">{platformFee.toFixed(2)} USDC</span>
          </div>
          <div className="border-t border-navy-border pt-2 flex justify-between text-sm font-semibold">
            <span className="text-slate-300">Total Required</span>
            <span className="text-primary">{totalRequired.toFixed(2)} USDC</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending || isConfirming}
          className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-bold transition-colors shadow-lg shadow-primary/20"
        >
          {isPending
            ? "Confirm in Wallet..."
            : isConfirming
              ? "Creating Job..."
              : "Create Job & Lock USDC"}
        </button>

        <TransactionStatus
          isPending={isPending}
          isConfirming={isConfirming}
          isSuccess={isSuccess}
          hash={hash}
          label="Job creation"
        />
      </form>
    </div>
  );
}
