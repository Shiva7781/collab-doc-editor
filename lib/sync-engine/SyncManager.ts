"use client";
/**
 * SyncManager — orchestrates offline operation flushing.
 *
 * Responsibilities:
 *  1. Monitor network connectivity
 *  2. On reconnect, flush the OfflineOp queue (title changes, version creation,
 *     collaborator management) to the server REST API
 *  3. Expose sync status to UI components via a simple event emitter
 *
 * NOTE: Y.js document content sync is handled automatically by the
 * WebsocketProvider (y-websocket), which reconnects and re-syncs on its own.
 * SyncManager only handles metadata operations queued when offline.
 */

import { LocalDBAdapter } from "./LocalDBAdapter";
import type { OfflineOp, SyncStatus } from "@/types";
import { nanoid } from "nanoid";

type StatusListener = (status: SyncStatus) => void;

const MAX_RETRIES = 5;
const RETRY_BASE_MS = 1000;

class SyncManagerClass {
  private listeners: Set<StatusListener> = new Set();
  private status: SyncStatus = { state: "synced", pendingOps: 0 };
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private initialized = false;

  init() {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;

    window.addEventListener("online", () => this.onOnline());
    window.addEventListener("offline", () => this.onOffline());

    if (navigator.onLine) {
      this.flushAll();
    } else {
      this.setStatus({ state: "offline", pendingOps: 0 });
    }
  }

  // ─── Status ───────────────────────────────────────────────────────────────
  subscribe(fn: StatusListener): () => void {
    this.listeners.add(fn);
    fn(this.status); // emit current state immediately
    return () => { this.listeners.delete(fn); };
  }

  private setStatus(next: Partial<SyncStatus>) {
    this.status = { ...this.status, ...next };
    this.listeners.forEach((fn) => fn(this.status));
  }

  // ─── Queue helpers ────────────────────────────────────────────────────────
  async enqueue(op: Omit<OfflineOp, "id" | "retryCount" | "createdAt">) {
    const full: OfflineOp = { ...op, id: nanoid(), retryCount: 0, createdAt: Date.now() };
    await LocalDBAdapter.enqueue(full);
    const count = (await LocalDBAdapter.getAllPendingOps()).length;
    this.setStatus({ pendingOps: count });

    // If online, flush immediately
    if (navigator.onLine) this.scheduleFlush(200);
  }

  private scheduleFlush(delay = 0) {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => this.flushAll(), delay);
  }

  // ─── Flush ────────────────────────────────────────────────────────────────
  private async flushAll() {
    const ops = await LocalDBAdapter.getAllPendingOps();
    if (ops.length === 0) {
      this.setStatus({ state: "synced", pendingOps: 0, lastSyncedAt: new Date() });
      return;
    }

    this.setStatus({ state: "syncing", pendingOps: ops.length });

    for (const op of ops) {
      if (!navigator.onLine) {
        this.setStatus({ state: "offline", pendingOps: ops.length });
        return;
      }
      await this.executeOp(op);
    }

    const remaining = await LocalDBAdapter.getAllPendingOps();
    this.setStatus({
      state: remaining.length === 0 ? "synced" : "error",
      pendingOps: remaining.length,
      lastSyncedAt: new Date(),
    });
  }

  private async executeOp(op: OfflineOp): Promise<void> {
    try {
      const res = await this.dispatchOp(op);
      if (res.ok || res.status === 409) {
        // 409 = already done (idempotent), treat as success
        await LocalDBAdapter.dequeue(op.id);
      } else if (op.retryCount >= MAX_RETRIES) {
        await LocalDBAdapter.dequeue(op.id); // give up
      } else {
        await LocalDBAdapter.incrementRetry(op.id);
      }
    } catch {
      if (op.retryCount >= MAX_RETRIES) {
        await LocalDBAdapter.dequeue(op.id);
      } else {
        await LocalDBAdapter.incrementRetry(op.id);
      }
    }
  }

  private async dispatchOp(op: OfflineOp): Promise<Response> {
    const base = `/api/documents/${op.documentId}`;
    switch (op.type) {
      case "title_update":
        return fetch(base, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: op.payload.title }),
        });
      case "version_create":
        return fetch(`${base}/versions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: op.payload.title, description: op.payload.description }),
        });
      case "collaborator_add":
        return fetch(`${base}/collaborators`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: op.payload.email, role: op.payload.role }),
        });
      case "collaborator_remove":
        return fetch(`${base}/collaborators?userId=${op.payload.userId}`, { method: "DELETE" });
      case "collaborator_role_update":
        return fetch(`${base}/collaborators?userId=${op.payload.userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: op.payload.role }),
        });
      default:
        return new Response(null, { status: 400 });
    }
  }

  // ─── Network events ───────────────────────────────────────────────────────
  private onOnline() {
    this.setStatus({ state: "connecting" });
    this.scheduleFlush(500);
  }

  private onOffline() {
    this.setStatus({ state: "offline" });
    if (this.flushTimer) clearTimeout(this.flushTimer);
  }
}

export const SyncManager = new SyncManagerClass();
