"use client";

import Link from "next/link";
import { Bell, User } from "lucide-react";
import type { MissionControlEnvironment } from "../shared/constants";
import { cn } from "../shared/cn";
import { ChanakyaLiveIntelligenceBar } from "@/components/enterprise/chanakya-live-intelligence";
import { ChanakyaRadarViewSwitcher } from "@/components/catalyst-one/chanakya-radar/chanakya-radar-view-switcher";
import { GlobalChanakyaMcButton } from "@/components/layout/global-chanakya-assistant";

/**
 * CO-SPRINT-105 / EUX-007 Mission Control header.
 * Rupee Catalyst · Live Intelligence · Notifications · Radar|Kanban · CHANAKYA AI · Profile
 */
export function McEnterpriseHeader({
  environment = "development",
}: {
  environment?: MissionControlEnvironment;
  currentModule?: string;
  workspaceTitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  onRefresh?: () => void;
}) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 overflow-hidden border-b border-zinc-800 bg-zinc-950 px-3 sm:gap-3 md:h-14 md:px-4">
      <Link href="/mission-control" className="flex shrink-0 items-center gap-2">
        <span className="text-sm font-semibold tracking-tight text-zinc-50">
          Rupee Catalyst
        </span>
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
            environment === "production"
              ? "border border-rose-500/40 bg-rose-500/10 text-rose-200"
              : "border border-amber-500/40 bg-amber-500/10 text-amber-200",
          )}
          title="Mission Control environment"
        >
          {environment === "production" ? "PROD" : "DEV"}
        </span>
      </Link>

      <ChanakyaLiveIntelligenceBar appearance="mission-control" />

      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
        <IconButton label="Notifications">
          <Bell className="h-4 w-4" />
        </IconButton>
        <ChanakyaRadarViewSwitcher variant="mission-control" />
        <GlobalChanakyaMcButton />
        <IconButton label="User Profile">
          <User className="h-4 w-4" />
        </IconButton>
      </div>
    </header>
  );
}

function IconButton({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className="rounded-md p-2 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
    >
      {children}
    </button>
  );
}
