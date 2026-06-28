import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Safely converts a Mongoose Buffer field to a Node.js Buffer.
 * When using .lean(), Mongoose returns BSON Binary objects instead of Buffers.
 * Binary objects have a `.buffer` property containing the actual bytes.
 */
export function toBuffer(val: unknown): Buffer {
  if (Buffer.isBuffer(val)) return val;
  // BSON Binary (returned by .lean())
  const b = val as { buffer?: Buffer };
  if (b?.buffer && Buffer.isBuffer(b.buffer)) return b.buffer;
  return Buffer.from(val as ArrayBufferLike);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatRelative(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = Date.now();
  const diff = now - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// Generate a deterministic avatar color for a user
const AVATAR_COLORS = [
  "#7C3AED", "#2563EB", "#059669", "#D97706",
  "#DC2626", "#0891B2", "#7C3AED", "#DB2777",
  "#4F46E5", "#065F46",
];

export function userColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + "…" : str;
}
