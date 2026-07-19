"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Columns3, Radar } from "lucide-react";
import {
  getChanakyaRadarWorkspaceTab,
  setChanakyaRadarWorkspaceTab,
  subscribeChanakyaRadarWorkspaceTab,
  type ChanakyaRadarWorkspaceTab,
} from "@/lib/chanakya-radar/workspace-tab";
import { cn } from "@/lib/utils";

function isRadarWorkspaceRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname === "/mission-control" ||
    pathname === "/chanakya-radar" ||
    pathname.startsWith("/chanakya-radar/")
  );
}

/**
 * Compact Radar | Kanban segmented control for the global header.
 * Preserves filters / scope / selection in the workspace (tab state is shared only).
 */
export function ChanakyaRadarViewSwitcher({
  variant = "mission-control",
}: {
  variant?: "mission-control" | "dashboard";
}) {
  const pathname = usePathname();
  const [tab, setTab] = useState<ChanakyaRadarWorkspaceTab>("radar");
  const visible = isRadarWorkspaceRoute(pathname);

  useEffect(() => {
    setTab(getChanakyaRadarWorkspaceTab());
    return subscribeChanakyaRadarWorkspaceTab(setTab);
  }, []);

  if (!visible) return null;

  const mc = variant === "mission-control";

  return (
    <div
      role="tablist"
      aria-label="CHANAKYA Radar workspace view"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border p-0.5",
        mc
          ? "border-zinc-700 bg-zinc-900/80"
          : "border-border bg-muted/60",
      )}
    >
      <button
        type="button"
        role="tab"
        aria-selected={tab === "radar"}
        onClick={() => setChanakyaRadarWorkspaceTab("radar")}
        className={cn(
          "inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold transition-colors",
          tab === "radar"
            ? mc
              ? "bg-violet-600 text-white shadow-sm"
              : "bg-primary text-primary-foreground shadow-sm"
            : mc
              ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              : "text-muted-foreground hover:bg-background hover:text-foreground",
        )}
      >
        <Radar className="h-3 w-3" />
        Radar
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tab === "kanban"}
        onClick={() => setChanakyaRadarWorkspaceTab("kanban")}
        className={cn(
          "inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold transition-colors",
          tab === "kanban"
            ? mc
              ? "bg-violet-600 text-white shadow-sm"
              : "bg-primary text-primary-foreground shadow-sm"
            : mc
              ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              : "text-muted-foreground hover:bg-background hover:text-foreground",
        )}
      >
        <Columns3 className="h-3 w-3" />
        Kanban
      </button>
    </div>
  );
}
