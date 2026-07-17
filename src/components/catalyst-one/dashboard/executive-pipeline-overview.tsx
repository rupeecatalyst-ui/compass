"use client";

import { useRouter } from "next/navigation";
import { executivePipelineStages } from "@/data/catalyst-one/dashboard";
import { ROUTES } from "@/constants/routes";
import { useDashboardFilter } from "@/hooks/use-dashboard-filter";
import { formatINRCompact } from "@/lib/format-currency";
import { scaleCount } from "@/lib/dashboard-metrics";
import {
  DashboardCard,
  DashboardCardContent,
  DashboardCardHeader,
} from "@/components/catalyst-one/dashboard/dashboard-card";

export function ExecutivePipelineOverview() {
  const router = useRouter();
  const { dateRange } = useDashboardFilter();

  const stages = executivePipelineStages.map((stage) => ({
    ...stage,
    count: scaleCount(stage.count, dateRange.scaleFactor),
  }));

  const totalFiles = stages.reduce((sum, s) => sum + s.count, 0);

  return (
    <DashboardCard
      className="cursor-pointer transition-colors hover:border-slate-700"
      onClick={() => router.push(ROUTES.CHANAKYA_RADAR)}
    >
      <DashboardCardHeader
        title="Pipeline"
        description={`${totalFiles} active files across stages — tap to explore`}
      />
      <DashboardCardContent className="pt-0">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {stages.map((stage) => (
            <div
              key={stage.id}
              className="rounded-lg border border-slate-800/70 bg-slate-950/20 px-2 py-2.5 text-center"
            >
              <p className="text-[10px] font-medium text-slate-500 truncate">{stage.label}</p>
              <p className="text-lg font-semibold text-slate-100 tabular-nums mt-1">{stage.count}</p>
              <p className="text-[10px] text-slate-600 tabular-nums mt-0.5">
                {formatINRCompact(Math.round(stage.value * dateRange.scaleFactor))}
              </p>
              <div className="mt-2 h-0.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full opacity-80"
                  style={{
                    width: `${Math.max(8, (stage.count / Math.max(...stages.map((s) => s.count))) * 100)}%`,
                    backgroundColor: stage.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </DashboardCardContent>
    </DashboardCard>
  );
}
