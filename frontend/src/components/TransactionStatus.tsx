"use client";

import { Loader2, CheckCircle2 } from "lucide-react";

interface TransactionStatusProps {
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  hash?: `0x${string}`;
  label?: string;
}

export function TransactionStatus({
  isPending,
  isConfirming,
  isSuccess,
  hash,
  label = "Transaction",
}: TransactionStatusProps) {
  if (!isPending && !isConfirming && !isSuccess) return null;

  return (
    <div className="rounded-lg border border-navy-border bg-navy-muted/50 p-4 mt-4">
      {isPending && (
        <div className="flex items-center gap-3 text-yellow-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Waiting for wallet confirmation...</span>
        </div>
      )}

      {isConfirming && (
        <div className="flex items-center gap-3 text-primary">
          <Loader2 className="h-5 w-5 animate-spin" />
          <div>
            <p>Confirming {label}...</p>
            {hash && (
              <a
                href={`https://sepolia.basescan.org/tx/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary/70 underline"
              >
                View on Basescan
              </a>
            )}
          </div>
        </div>
      )}

      {isSuccess && (
        <div className="flex items-center gap-3 text-green-400">
          <CheckCircle2 className="h-5 w-5" />
          <div>
            <p>{label} confirmed!</p>
            {hash && (
              <a
                href={`https://sepolia.basescan.org/tx/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-green-300 underline"
              >
                View on Basescan
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
