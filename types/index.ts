export type UserRole = "owner" | "editor" | "viewer";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
}

export interface CollaboratorInfo {
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
  joinedAt: string;
}

export interface DocumentMeta {
  id: string;
  title: string;
  ownerId: string;
  ownerName: string;
  collaboratorCount: number;
  myRole: UserRole;
  createdAt: string;
  updatedAt: string;
  wordCount?: number;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  title: string;
  description?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  snapshotSize: number;
}

export interface SyncStatus {
  state: "synced" | "syncing" | "offline" | "error" | "connecting";
  pendingOps: number;
  lastSyncedAt?: Date;
  error?: string;
}

export interface AwarenessUser {
  clientId: number;
  userId: string;
  name: string;
  color: string;
  avatar?: string;
  cursor?: { anchor: number; head: number };
}

// Offline operation queue entry
export interface OfflineOp {
  id: string;
  type: "title_update" | "version_create" | "collaborator_add" | "collaborator_remove" | "collaborator_role_update";
  documentId: string;
  payload: Record<string, unknown>;
  retryCount: number;
  createdAt: number;
}

// Sync payload validated server-side
export interface SyncPayload {
  documentId: string;
  update: string; // base64-encoded Y.js binary update
  stateVector?: string; // base64-encoded state vector
  clientId: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// AI feature types
export type AIFeature = "complete" | "summarize" | "grammar" | "rewrite" | "translate";

export interface AIRequest {
  documentId: string;
  feature: AIFeature;
  content: string;
  prompt?: string;
  language?: string;
}

export interface AIResponse {
  result: string;
  tokensUsed?: number;
}
