"use client";

import type { ReactNode } from "react";
import { EnterpriseChartFrame } from "@/components/enterprise/charts/enterprise-chart-frame";
import { buildEnterpriseChartMeta } from "@/lib/enterprise-chart-readability";
import type { EnterpriseChartMeta } from "@/types/enterprise-chart-readability";
import { cn } from "@/lib/utils";

export function DashboardVizCard({
  title,
  children,
  className,
  action,
  meta,
  loading,
  error,
  empty,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  meta?: EnterpriseChartMeta;
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
}) {
  const resolved =
    meta ??
    buildEnterpriseChartMeta({
      id: title.toLowerCase().replace(/\s+/g, "-"),
      title,
      measurementDefinition: title,
      unit: "count",
      dataSource: "Catalyst One operational snapshot",
      kind: "bar",
    });

  return (
    <div className={cn("ei-card flex min-h-0 flex-col p-3.5 md:p-4", className)}>
      {action ? <div className="mb-1 flex justify-end">{action}</div> : null}
      <EnterpriseChartFrame
        meta={{ ...resolved, title: resolved.title || title }}
        loading={loading}
        error={error}
        empty={empty}
        className="min-h-0 flex-1"
      >
        {children}
      </EnterpriseChartFrame>
    </div>
  );
}
