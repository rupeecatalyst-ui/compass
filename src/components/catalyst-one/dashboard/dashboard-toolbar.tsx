"use client";

import { useEffect, useState } from "react";
import { Bell, RefreshCw } from "lucide-react";
import { DashboardDateFilter } from "@/components/catalyst-one/dashboard/dashboard-date-filter";
import { NotificationsPanel } from "@/components/layout/notifications-panel";
import { UserMenu } from "@/components/layout/user-menu";
import { useDashboardFilter } from "@/hooks/use-dashboard-filter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function formatDateRangeLabel(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const sameYear = start.getFullYear() === end.getFullYear();
  const startStr = start.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const endStr = fmt(end);
  return `${startStr} – ${endStr}`;
}

export function DashboardToolbar() {
  const { dateRange } = useDashboardFilter();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const periodKey = `${dateRange.preset}-${dateRange.start.toISOString()}-${dateRange.end.toISOString()}`;

  useEffect(() => {
    setLastUpdated(new Date());
  }, [periodKey]);

  const refresh = () => setLastUpdated(new Date());

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 min-h-[36px] pb-1 border-b border-slate-800/60">
      <div className="flex flex-wrap items-center gap-2">
        <DashboardDateFilter compact />
        <span className="hidden sm:inline text-[10px] text-slate-500 tabular-nums">
          {formatDateRangeLabel(dateRange.start, dateRange.end)}
        </span>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {lastUpdated && (
          <button
            type="button"
            onClick={refresh}
            className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-400 tabular-nums transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Last updated{" "}
            {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-8 w-8 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
                12
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <NotificationsPanel />
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="[&_button]:h-8 [&_button]:w-8 [&_.h-9]:h-8 [&_.w-9]:w-8">
          <UserMenu />
        </div>
      </div>
    </div>
  );
}
