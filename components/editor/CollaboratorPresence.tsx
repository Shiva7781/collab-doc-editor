"use client";

import { cn } from "@/lib/utils";

interface AwarenessState {
  user: { name: string; color: string; userId: string };
}

interface CollaboratorPresenceProps {
  users: AwarenessState[];
}

export function CollaboratorPresence({ users }: CollaboratorPresenceProps) {
  if (users.length === 0) return null;

  const visible = users.slice(0, 5);
  const overflow = users.length - 5;

  return (
    <div
      className="flex items-center -space-x-2"
      role="group"
      aria-label={`${users.length} collaborator${users.length !== 1 ? "s" : ""} online`}
    >
      {visible.map((u, i) => (
        <div
          key={u.user.userId + i}
          className="relative group"
          style={{ zIndex: visible.length - i }}
        >
          <div
            className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center",
              "text-white text-xs font-semibold ring-2 ring-background",
              "cursor-default"
            )}
            style={{ backgroundColor: u.user.color }}
            aria-label={u.user.name}
          >
            {u.user.name.slice(0, 1).toUpperCase()}
          </div>
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-foreground text-background rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {u.user.name}
          </div>
        </div>
      ))}
      {overflow > 0 && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center bg-muted text-muted-foreground text-xs font-semibold ring-2 ring-background"
          aria-label={`${overflow} more collaborators`}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
