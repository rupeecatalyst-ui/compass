"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { pendingApprovals } from "@/data/catalyst-one/dashboard";
import { formatINRCompact } from "@/lib/format-currency";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  DashboardCard,
  DashboardCardContent,
  DashboardCardHeader,
} from "@/components/catalyst-one/dashboard/dashboard-card";
import { ROUTES } from "@/constants/routes";

const stageStyles = {
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  accent: "border-teal-500/30 bg-teal-500/10 text-teal-300",
  info: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  default: "border-slate-600/30 bg-slate-800/50 text-slate-300",
} as const;

export function PendingApprovalsPanel() {
  const router = useRouter();

  return (
    <DashboardCard>
      <DashboardCardHeader
        title="Pending Approvals"
        description="High-priority decisions waiting"
        action={
          <Link
            href={ROUTES.MY_DEALS}
            className="text-[10px] font-medium text-teal-400 hover:underline"
          >
            View all
          </Link>
        }
      />
      <DashboardCardContent className="pt-0 space-y-1">
        {pendingApprovals.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => router.push(`/loan-files?file=${item.fileId}`)}
            className="w-full flex items-start gap-2.5 rounded-lg border border-slate-800/80 bg-slate-950/20 px-2.5 py-2 text-left transition-colors hover:border-slate-700 hover:bg-slate-900/50"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">{item.customerName}</p>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                {item.product} · {formatINRCompact(item.loanAmount)}
              </p>
              <Badge
                variant="outline"
                className={cn(
                  "mt-1.5 h-4 px-1.5 text-[9px] font-medium border",
                  stageStyles[item.stageVariant],
                )}
              >
                {item.stage}
              </Badge>
            </div>
            <span className="text-[10px] text-slate-500 tabular-nums shrink-0 pt-0.5">
              {item.ageing}
            </span>
          </button>
        ))}
      </DashboardCardContent>
    </DashboardCard>
  );
}
