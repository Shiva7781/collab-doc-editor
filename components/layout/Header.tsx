"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { FileText, LogOut, User, ChevronDown, Plus } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { OfflineBanner } from "@/components/sync/SyncStatusIndicator";
import { initials } from "@/lib/utils";

interface HeaderProps {
  showNewDoc?: boolean;
  onNewDoc?: () => void;
}

export function Header({ showNewDoc, onNewDoc }: HeaderProps) {
  const { data: session } = useSession();
  const { isOnline } = useNetworkStatus();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const name = session?.user?.name ?? "User";

  return (
    <>
      {!isOnline && <OfflineBanner />}
      <header
        className="sticky top-0 z-10 border-b border-border/60 bg-white/90 backdrop-blur-md shadow-sm"
        style={{ top: isOnline ? 0 : "30px" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link
            href="/documents"
            className="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition-opacity"
            aria-label="Go to documents"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-200">
              <FileText size={15} className="text-white" />
            </div>
            <span className="hidden sm:inline bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
              CollabDocs
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {/* New document button */}
            {showNewDoc && onNewDoc && (
              <button
                onClick={onNewDoc}
                className="hidden sm:flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-lg hover:opacity-90 transition-opacity shadow-sm shadow-blue-200"
                aria-label="Create new document"
              >
                <Plus size={14} />
                New Document
              </button>
            )}

            {/* User menu */}
            {session?.user && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="flex items-center gap-2 hover:bg-muted rounded-lg px-2 py-1.5 transition-colors"
                  aria-expanded={dropdownOpen}
                  aria-haspopup="menu"
                  aria-label="User menu"
                >
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-semibold">
                    {initials(name)}
                  </div>
                  <span className="hidden md:inline text-sm font-medium max-w-[120px] truncate">{name}</span>
                  <ChevronDown size={14} className="text-muted-foreground" />
                </button>

                {dropdownOpen && (
                  <div
                    className="absolute right-0 mt-1 w-48 bg-background border border-border rounded-xl shadow-lg py-1 z-50 animate-fade-in"
                    role="menu"
                  >
                    <div className="px-3 py-2 border-b border-border">
                      <p className="text-sm font-medium truncate">{name}</p>
                      <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
                    </div>
                    <Link
                      href="/documents"
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors w-full text-left"
                      role="menuitem"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <FileText size={14} className="text-muted-foreground" />
                      My Documents
                    </Link>
                    <button
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors w-full text-left"
                      role="menuitem"
                    >
                      <LogOut size={14} />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
