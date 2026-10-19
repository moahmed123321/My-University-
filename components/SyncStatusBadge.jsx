"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { syncNow, getSyncState, initSyncListeners } from "@/lib/syncManager";
import { cn } from "@/lib/utils";

export default function SyncStatusBadge({ collapsed = false, className = "" }) {
  const [syncState, setSyncState] = useState({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    lastSynced: null,
  });

  useEffect(() => {
    // Initialize network connectivity listeners
    initSyncListeners();

    // Load initial state
    getSyncState().then(setSyncState);

    // Listen for sync status events from syncManager
    const handleStatus = (e) => {
      if (e.detail) {
        setSyncState((prev) => ({ ...prev, ...e.detail }));
      }
    };

    window.addEventListener("uni:sync-status", handleStatus);
    return () => window.removeEventListener("uni:sync-status", handleStatus);
  }, []);

  const handleManualSync = (e) => {
    e.preventDefault();
    if (!syncState.isSyncing) {
      syncNow();
    }
  };

  const { isOnline, isSyncing, pendingCount, lastSynced } = syncState;

  // Format relative last sync time
  const formattedTime = lastSynced
    ? new Date(lastSynced).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={handleManualSync}
        title={
          !isOnline
            ? `Offline mode (${pendingCount} pending changes)`
            : isSyncing
            ? "Syncing data with cloud..."
            : `Cloud synced ${formattedTime ? `at ${formattedTime}` : ""}`
        }
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
          !isOnline
            ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
            : isSyncing
            ? "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          className
        )}
      >
        {!isOnline ? (
          <CloudOff className="h-4 w-4 text-amber-500" />
        ) : isSyncing ? (
          <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
        ) : (
          <Cloud className="h-4 w-4 text-emerald-500" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleManualSync}
      title="Click to sync now"
      className={cn(
        "group flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors",
        !isOnline
          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15"
          : isSyncing
          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/15"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        className
      )}
    >
      <div className="flex items-center gap-2 truncate">
        {!isOnline ? (
          <CloudOff className="h-3.5 w-3.5 shrink-0 text-amber-500" />
        ) : isSyncing ? (
          <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin text-blue-500" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
        )}

        <span className="truncate font-medium">
          {!isOnline
            ? "Offline Mode"
            : isSyncing
            ? "Syncing data..."
            : "Cloud Synced"}
        </span>
      </div>

      <div className="flex items-center gap-1.5 pl-1 shrink-0">
        {!isOnline && pendingCount > 0 && (
          <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
            {pendingCount}
          </span>
        )}
        {isOnline && !isSyncing && formattedTime && (
          <span className="text-[10px] text-muted-foreground/80 group-hover:hidden">
            {formattedTime}
          </span>
        )}
        <RefreshCw className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  );
}

