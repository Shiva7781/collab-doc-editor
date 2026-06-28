"use client";
import { useState, useEffect } from "react";
import { SyncManager } from "@/lib/sync-engine/SyncManager";
import type { SyncStatus } from "@/types";

export function useSyncEngine() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    state: "synced",
    pendingOps: 0,
  });

  useEffect(() => {
    SyncManager.init();
    const unsub = SyncManager.subscribe(setSyncStatus);
    return () => { unsub(); };
  }, []);

  const enqueueOp = (op: Parameters<typeof SyncManager.enqueue>[0]) =>
    SyncManager.enqueue(op);

  return { syncStatus, enqueueOp };
}
