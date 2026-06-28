"use client";

import { cn } from "@/lib/utils";
import { CloudOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import type { SyncStatus } from "@/types";

interface SyncStatusIndicatorProps {
  status: SyncStatus;
}

const CONFIG = {
  synced: {
    icon: CheckCircle2,
    label: "Synced",
    className: "text-green-600",
    dotClass: "bg-green-500",
  },
  syncing: {
    icon: Loader2,
    label: "Syncing…",
    className: "text-blue-600",
    dotClass: "bg-blue-500 animate-pulse-dot",
  },
  connecting: {
    icon: Loader2,
    label: "Connecting…",
    className: "text-yellow-600",
    dotClass: "bg-yellow-500 animate-pulse-dot",
  },
  offline: {
    icon: CloudOff,
    label: "Offline",
    className: "text-amber-600",
    dotClass: "bg-amber-500",
  },
  error: {
    icon: AlertCircle,
    label: "Sync error",
    className: "text-destructive",
    dotClass: "bg-destructive",
  },
} as const;

export function SyncStatusIndicator({ status }: SyncStatusIndicatorProps) {
  const config = CONFIG[status.state] ?? CONFIG.synced;
  const Icon = config.icon;
  const isSpinning = status.state === "syncing" || status.state === "connecting";

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full",
        "bg-background border border-border",
        config.className
      )}
      role="status"
      aria-live="polite"
      aria-label={`Sync status: ${config.label}${status.pendingOps > 0 ? `, ${status.pendingOps} pending operations` : ""}`}
      title={status.error ?? config.label}
    >
      <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", config.dotClass)} aria-hidden="true" />
      <Icon
        size={12}
        className={cn("flex-shrink-0", isSpinning && "animate-spin")}
        aria-hidden="true"
      />
      <span className="hidden sm:inline">{config.label}</span>
      {status.pendingOps > 0 && (
        <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1 rounded text-[10px]">
          {status.pendingOps}
        </span>
      )}
    </div>
  );
}

// Compact offline banner shown at top of page when offline
export function OfflineBanner() {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-center text-sm py-1 font-medium"
      role="alert"
      aria-live="assertive"
    >
      <CloudOff size={13} className="inline mr-1 -mt-0.5" />
      You&apos;re offline — edits are saved locally and will sync when reconnected
    </div>
  );
}
