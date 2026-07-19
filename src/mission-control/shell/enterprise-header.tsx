"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  Bell,
  Search,
  ShieldAlert,
  User,
  Users,
} from "lucide-react";
import type { MissionControlEnvironment } from "../shared/constants";
import { cn } from "../shared/cn";
import { WorkspacePrimaryActions } from "@/components/catalyst-one/shared/workspace-primary-actions";
import { ChanakyaRadarViewSwitcher } from "@/components/catalyst-one/chanakya-radar/chanakya-radar-view-switcher";
import { GlobalChanakyaMcButton } from "@/components/layout/global-chanakya-assistant";
import { ROUTES } from "@/constants/routes";

export function McEnterpriseHeader({
  environment = "development",
  currentModule,
  workspaceTitle,
  breadcrumbs = [],
  onRefresh,
}: {
  environment?: MissionControlEnvironment;
  currentModule: string;
  workspaceTitle: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  onRefresh?: () => void;
}) {
  const router = useRouter();

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-zinc-800 bg-zinc-950 px-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Link href="/mission-control" className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-semibold tracking-tight text-zinc-50">Catalyst One</span>
          <span className="rounded border border-teal-500/40 bg-teal-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-teal-200">
            Mission Control
          </span>
        </Link>
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
            environment === "production"
              ? "border border-rose-500/40 bg-rose-500/10 text-rose-200"
              : "border border-amber-500/40 bg-amber-500/10 text-amber-200",
          )}
        >
          {environment}
        </span>
        <Link
          href="/mission-control/search"
          className="hidden max-w-xs flex-1 items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-1.5 text-xs text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-300 lg:flex"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Enterprise Search Center</span>
        </Link>
      </div>

      <div className="hidden min-w-0 flex-1 flex-col items-center md:flex">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500">{currentModule}</p>
        <p className="truncate text-sm font-medium text-zinc-100">{workspaceTitle}</p>
        {breadcrumbs.length > 0 && (
          <p className="truncate text-[10px] text-zinc-500">
            {breadcrumbs.map((b) => b.label).join(" / ")}
          </p>
        )}
      </div>

      <div className="flex flex-1 items-center justify-end gap-1.5">
        <IconButton label="Notifications">
          <Bell className="h-4 w-4" />
        </IconButton>
        <ChanakyaRadarViewSwitcher variant="mission-control" />
        <GlobalChanakyaMcButton />
        <IconButton label="System Health">
          <Activity className="h-4 w-4" />
        </IconButton>
        <IconButton label="Active Users">
          <Users className="h-4 w-4" />
        </IconButton>
        <IconButton label="User Profile">
          <User className="h-4 w-4" />
        </IconButton>
        <IconButton label="Emergency Controls">
          <ShieldAlert className="h-4 w-4 text-amber-400" />
        </IconButton>
        <WorkspacePrimaryActions
          mode="readonly"
          onClose={() => router.push(ROUTES.DASHBOARD)}
          onRefresh={onRefresh}
          density="compact"
          className="ml-1 [&_button]:border-zinc-700 [&_button]:text-zinc-300 [&_button:hover]:bg-zinc-900 [&_button:hover]:text-zinc-50"
        />
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
