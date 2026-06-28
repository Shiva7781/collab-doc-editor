"use client";
/**
 * LocalDBAdapter — IndexedDB wrapper for the local-first sync engine.
 *
 * Stores:
 *  - pending offline operations (OfflineOp queue)
 *  - sync metadata per document (lastSyncedAt, lastKnownTitle, etc.)
 *
 * Y.js document state itself is stored by y-indexeddb (separate store managed
 * by the Y.IndexeddbPersistence provider). This adapter only handles the
 * metadata and operation queue used by SyncManager.
 */

import { openDB, IDBPDatabase } from "idb";
import type { OfflineOp } from "@/types";

const DB_NAME = "collab-editor-sync";
const DB_VERSION = 1;

interface SyncMeta {
  documentId: string;
  lastSyncedAt: number;
  lastTitle: string;
}

interface SyncDB {
  ops: {
    key: string; // OfflineOp.id
    value: OfflineOp;
    indexes: { "by-doc": string; "by-created": number };
  };
  meta: {
    key: string; // documentId
    value: SyncMeta;
  };
}

let _db: IDBPDatabase<SyncDB> | null = null;

async function getDB(): Promise<IDBPDatabase<SyncDB>> {
  if (_db) return _db;
  _db = await openDB<SyncDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const opsStore = db.createObjectStore("ops", { keyPath: "id" });
      opsStore.createIndex("by-doc", "documentId");
      opsStore.createIndex("by-created", "createdAt");
      db.createObjectStore("meta", { keyPath: "documentId" });
    },
  });
  return _db;
}

export const LocalDBAdapter = {
  // ─── Operation queue ───────────────────────────────────────────────────────
  async enqueue(op: OfflineOp): Promise<void> {
    const db = await getDB();
    await db.put("ops", op);
  },

  async dequeue(id: string): Promise<void> {
    const db = await getDB();
    await db.delete("ops", id);
  },

  async getPendingOps(documentId: string): Promise<OfflineOp[]> {
    const db = await getDB();
    const ops = await db.getAllFromIndex("ops", "by-doc", documentId);
    return ops.sort((a, b) => a.createdAt - b.createdAt);
  },

  async getAllPendingOps(): Promise<OfflineOp[]> {
    const db = await getDB();
    const ops = await db.getAll("ops");
    return ops.sort((a, b) => a.createdAt - b.createdAt);
  },

  async clearOpsForDocument(documentId: string): Promise<void> {
    const db = await getDB();
    const ops = await db.getAllFromIndex("ops", "by-doc", documentId);
    const tx = db.transaction("ops", "readwrite");
    await Promise.all(ops.map((op) => tx.store.delete(op.id)));
    await tx.done;
  },

  async incrementRetry(id: string): Promise<void> {
    const db = await getDB();
    const op = await db.get("ops", id);
    if (op) {
      op.retryCount += 1;
      await db.put("ops", op);
    }
  },

  // ─── Sync metadata ─────────────────────────────────────────────────────────
  async getSyncMeta(documentId: string): Promise<SyncMeta | undefined> {
    const db = await getDB();
    return db.get("meta", documentId);
  },

  async setSyncMeta(meta: SyncMeta): Promise<void> {
    const db = await getDB();
    await db.put("meta", meta);
  },

  async updateLastSynced(documentId: string, title: string): Promise<void> {
    const db = await getDB();
    await db.put("meta", {
      documentId,
      lastSyncedAt: Date.now(),
      lastTitle: title,
    });
  },
};
