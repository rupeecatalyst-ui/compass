"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { computeFunnelFromActiveFiles } from "@/lib/loan-board-utils";
import { loadLoanFiles } from "@/lib/loan-files-storage";
import { ROUTES } from "@/constants/routes";
import { useDashboardFilter } from "@/hooks/use-dashboard-filter";
import { formatINRCompact } from "@/lib/format-currency";
import { scaleCount } from "@/lib/dashboard-metrics";
import { cn } from "@/lib/utils";
import {
  DashboardCard,
  DashboardCardContent,
  DashboardCardHeader,
} from "@/components/catalyst-one/dashboard/dashboard-card";
import type { PipelineStage } from "@/types/catalyst-one";

export function PipelineFunnel() {
  const router = useRouter();
  const { dateRange } = useDashboardFilter();
  const [files, setFiles] = useState(() => (typeof window !== "undefined" ? loadLoanFiles() : []));

  useEffect(() => {
    setFiles(loadLoanFiles());
  }, []);

  const stages = useMemo(() => {
    const computed = computeFunnelFromActiveFiles(files);
    return computed.map((stage) => ({
      ...stage,
      count: scaleCount(stage.count, dateRange.scaleFactor),
      value: Math.round(stage.value * dateRange.scaleFactor),
    }));
  }, [files, dateRange.scaleFactor]);

  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  const handleStageClick = (stageId: PipelineStage, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(ROUTES.MY_DEALS);
  };

  return (
    <DashboardCard className="h-full">
      <DashboardCardHeader
        title="Pipeline Funnel"
        description="Active cases only · click stage to open My Deals"
      />
      <DashboardCardContent className="pt-0">
        <div className="flex flex-col items-center gap-0.5 py-1">
          {stages.map((stage, index) => {
            const widthPct = 40 + (stage.count / maxCount) * 55;

            return (
              <button
                key={stage.id}
                type="button"
                onClick={(e) => handleStageClick(stage.id as PipelineStage, e)}
                className="group relative w-full flex justify-center focus:outline-none focus-visible:ring-1 focus-visible:ring-teal-500 rounded"
                style={{ zIndex: stages.length - index }}
              >
                <div
                  className={cn(
                    "relative transition-all duration-200 rounded-md border border-slate-800/80",
                    "bg-slate-950/40 backdrop-blur-sm px-3 py-1.5",
                    "hover:border-teal-500/30 hover:bg-slate-900/60",
                  )}
                  style={{
                    width: `${widthPct}%`,
                    borderLeftWidth: 3,
                    borderLeftColor: stage.color,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-medium text-slate-200 truncate">{stage.label}</p>
                    <span className="text-[10px] text-teal-400/90 tabular-nums shrink-0">{stage.conversion}%</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5 text-[9px] text-slate-500">
                    <span className="tabular-nums">{stage.count} files</span>
                    <span className="tabular-nums">{formatINRCompact(stage.value)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </DashboardCardContent>
    </DashboardCard>
  );
}
