"use client";

import Link from "next/link";
import { Bell, User } from "lucide-react";
import type { MissionControlEnvironment } from "../shared/constants";
import { cn } from "../shared/cn";
import { ChanakyaLiveIntelligenceBar } from "@/components/enterprise/chanakya-live-intelligence";
import { ChanakyaRadarViewSwitcher } from "@/components/catalyst-one/chanakya-radar/chanakya-radar-view-switcher";
import { GlobalChanakyaMcButton } from "@/components/layout/global-chanakya-assistant";
import {
  CloseWorkspaceButton,
  EnterpriseBreadcrumbs,
} from "@/components/enterprise/navigation";
import type { BreadcrumbItem } from "@/types/navigation";
import { ROUTES } from "@/constants/routes";

/**
 * CO-SPRINT-105 / EUX-007 / CO-UX-115 / CO-UX-116 Mission Control header.
 * Brand (→ User Home Dashboard) · Live Intelligence · Notifications · Radar|Kanban · CHANAKYA AI · Profile
 * Exit band: breadcrumbs (left) + ✕ Close (top-right) → User Home Dashboard.
 * Applies to Radar, Executive Briefing, and all Mission Control modules via the shared shell.
 */
export function McEnterpriseHeader({
  environment = "development",
  breadcrumbs = [],
}: {
  environment?: MissionControlEnvironment;
  currentModule?: string;
  workspaceTitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  onRefresh?: () => void;
}) {
  return (
    <div className="shrink-0 border-b border-zinc-800 bg-zinc-950">
      <header className="flex h-12 items-center gap-2 overflow-hidden px-3 sm:gap-3 md:h-14 md:px-4">
        <Link
          href={ROUTES.DASHBOARD}
          className="flex shrink-0 items-center gap-2"
          aria-label="Rupee Catalyst — User Home Dashboard"
          title="Go to User Home Dashboard"
        >
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

      <div
        className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/80 px-3 py-1.5 md:px-4"
        data-enterprise-exit-nav="mission-control"
      >
        <EnterpriseBreadcrumbs items={breadcrumbs} appearance="mission-control" />
        <CloseWorkspaceButton appearance="mission-control" />
      </div>
    </div>
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
