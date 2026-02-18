"use client";

import { useState } from "react";
import { useCreateJob } from "@/hooks/useEscrowContract";
import { useAccount } from "wagmi";
import { TransactionStatus } from "@/components/TransactionStatus";
import { JOB_CATEGORIES } from "@/lib/utils";
import { Plus, Trash2, ArrowLeft, ArrowRight, Wallet, ShieldCheck, Lightbulb, Info } from "lucide-react";
import toast from "react-hot-toast";

interface MilestoneInput {
  title: string;
  description: string;
  amount: string;
}

const STEPS = ["Details", "Milestones", "Review", "Success"] as const;

export default function PostJobPage() {
  const { isConnected } = useAccount();
  const { createJob, isPending, isConfirming, isSuccess, hash } = useCreateJob();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("development");
  const [deadline, setDeadline] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(true);
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
      <div className="pt-28 pb-16 flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="bg-navy-muted border border-navy-border rounded-2xl p-12 max-w-md w-full">
          <Wallet className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Post a Job</h1>
          <p className="text-slate-400">Connect your wallet to post a job.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-16 max-w-7xl mx-auto px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Post a New Job</h1>
          <p className="text-sm text-slate-400 mt-1">Step 2 of 4: Milestone Builder</p>
        </div>
        <div className="flex items-center gap-3 min-w-[180px]">
          <span className="text-xs font-medium text-slate-400 whitespace-nowrap">50% Complete</span>
          <div className="flex-1 h-2 bg-navy-muted rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-primary rounded-full transition-all" />
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-0 mb-10 overflow-x-auto pb-2">
        {STEPS.map((step, i) => {
          const isCompleted = i === 0;
          const isActive = i === 1;
          const isDimmed = i > 1;

          return (
            <div key={step} className="flex items-center">
              {i > 0 && (
                <div
                  className={`w-8 sm:w-12 h-px ${
                    isCompleted || isActive ? "bg-primary" : "bg-navy-border"
                  }`}
                />
              )}
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isCompleted
                      ? "bg-primary text-white"
                      : isActive
                        ? "bg-primary text-white ring-2 ring-primary/30 ring-offset-2 ring-offset-[#0B0F19]"
                        : "bg-navy-muted text-slate-500 border border-navy-border"
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={`text-sm font-medium whitespace-nowrap ${
                    isActive ? "text-white" : isDimmed ? "text-slate-500" : "text-slate-300"
                  }`}
                >
                  {step}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Heading */}
      <div className="mb-8">
        <h2 className="text-3xl font-black text-white">Break your project into milestones</h2>
        <p className="text-slate-400 mt-2 max-w-2xl">
          Each milestone has its own escrow. Funds are released only when you approve the deliverables — keeping both sides protected.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Collapsible Details Section */}
            <div className="bg-navy-muted rounded-xl border border-navy-border overflow-hidden">
              <button
                type="button"
                onClick={() => setDetailsOpen(!detailsOpen)}
                className="w-full flex items-center justify-between px-6 py-4 bg-white/5 hover:bg-white/[0.07] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-white font-semibold">Job Details</span>
                  {title && (
                    <span className="text-xs text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">
                      {title}
                    </span>
                  )}
                </div>
                <svg
                  className={`w-5 h-5 text-slate-400 transition-transform ${detailsOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {detailsOpen && (
                <div className="px-6 py-5 space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Job Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      placeholder="e.g., Build DApp Frontend"
                      className="w-full bg-navy-light border border-navy-border rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:border-primary focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                      rows={4}
                      placeholder="Describe the job requirements, scope, and expectations..."
                      className="w-full bg-navy-light border border-navy-border rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:border-primary focus:outline-none resize-none transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-navy-light border border-navy-border rounded-lg px-4 py-2.5 text-white focus:border-primary focus:outline-none transition-colors appearance-none"
                      >
                        {JOB_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Deadline
                      </label>
                      <input
                        type="date"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        required
                        min={new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0]}
                        className="w-full bg-navy-light border border-navy-border rounded-lg px-4 py-2.5 text-white focus:border-primary focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Milestone Cards */}
            <div className="space-y-4">
              {milestones.map((ms, i) => (
                <div
                  key={i}
                  className="bg-navy-muted rounded-xl border border-navy-border overflow-hidden"
                >
                  {/* Milestone Header */}
                  <div className="flex items-center justify-between px-5 py-3.5 bg-white/5">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      <span className="font-semibold text-white text-sm">
                        {ms.title || `Milestone ${i + 1}`}
                      </span>
                    </div>
                    {milestones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMilestone(i)}
                        className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-400/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Milestone Body */}
                  <div className="px-5 py-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                          Milestone Title
                        </label>
                        <input
                          type="text"
                          value={ms.title}
                          onChange={(e) => updateMilestone(i, "title", e.target.value)}
                          required
                          placeholder="e.g., UI Design Mockups"
                          className="w-full bg-[#101722] border border-navy-border rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:border-primary focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                          Amount (USDC)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                            $
                          </span>
                          <input
                            type="number"
                            value={ms.amount}
                            onChange={(e) => updateMilestone(i, "amount", e.target.value)}
                            required
                            min="1"
                            step="0.01"
                            placeholder="0.00"
                            className="w-full bg-[#101722] border border-navy-border rounded-lg pl-7 pr-4 py-2.5 text-white placeholder-slate-500 focus:border-primary focus:outline-none transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Description &amp; Deliverables
                      </label>
                      <textarea
                        value={ms.description}
                        onChange={(e) => updateMilestone(i, "description", e.target.value)}
                        rows={3}
                        placeholder="Describe what will be delivered in this milestone..."
                        className="w-full bg-[#101722] border border-navy-border rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:border-primary focus:outline-none resize-none transition-colors"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Milestone Button */}
            <button
              type="button"
              onClick={addMilestone}
              disabled={milestones.length >= 10}
              className="w-full border-2 border-dashed border-navy-border rounded-xl py-4 text-sm font-semibold text-slate-400 hover:text-primary hover:border-primary hover:bg-primary/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              ADD ANOTHER MILESTONE
            </button>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Save as Draft
                </button>
                <button
                  type="submit"
                  disabled={isPending || isConfirming}
                  className="flex items-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-bold transition-colors shadow-lg shadow-primary/20"
                >
                  {isPending
                    ? "Confirm in Wallet..."
                    : isConfirming
                      ? "Creating Job..."
                      : (
                          <>
                            Next: Review Posting
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                </button>
              </div>
            </div>

            <TransactionStatus
              isPending={isPending}
              isConfirming={isConfirming}
              isSuccess={isSuccess}
              hash={hash}
              label="Job creation"
            />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 space-y-5">
              {/* Job Summary Card */}
              <div className="bg-navy-muted rounded-xl border border-navy-border overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 bg-primary/10">
                  <Wallet className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-white text-sm">Job Summary</span>
                </div>

                <div className="px-5 py-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Total Job Value</span>
                    <span className="text-sm font-semibold text-white">
                      ${totalAmount.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400 flex items-center gap-1.5">
                      Platform Fee (2.5%)
                      <Info className="h-3.5 w-3.5 text-slate-500" />
                    </span>
                    <span className="text-sm font-semibold text-white">
                      ${platformFee.toFixed(2)}
                    </span>
                  </div>

                  <div className="border-t border-navy-border pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Total to Escrow
                      </span>
                      <span className="text-xl font-black text-primary">
                        ${totalRequired.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 pt-2 p-3 bg-white/[0.03] rounded-lg">
                    <ShieldCheck className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Funds are held in a secure smart contract escrow and only released when you approve each milestone delivery.
                    </p>
                  </div>
                </div>
              </div>

              {/* Pro Tip Card */}
              <div className="bg-primary/5 border border-primary/10 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-white mb-1">Pro Tip</p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Divide large projects into 3-4 milestones for better tracking and trust.
                      Smaller milestones mean faster feedback cycles and safer payments for everyone.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
