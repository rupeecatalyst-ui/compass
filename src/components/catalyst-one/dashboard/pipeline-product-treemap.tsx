"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { computeProductTreemap } from "@/lib/loan-board-utils";
import { loadLoanFiles } from "@/lib/loan-files-storage";
import { ROUTES } from "@/constants/routes";
import { useDashboardFilter } from "@/hooks/use-dashboard-filter";
import { formatINRCompact } from "@/lib/format-currency";
import {
  DashboardCard,
  DashboardCardContent,
  DashboardCardHeader,
} from "@/components/catalyst-one/dashboard/dashboard-card";

function TreemapContent(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  fill?: string;
  count?: number;
}) {
  const { x = 0, y = 0, width = 0, height = 0, name, fill, count } = props;
  if (width < 30 || height < 24) return null;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        fillOpacity={0.85}
        stroke="#0f172a"
        strokeWidth={2}
        rx={4}
        className="transition-opacity hover:opacity-100"
      />
      {width > 50 && height > 36 && (
        <>
          <text x={x + 6} y={y + 14} fill="#f1f5f9" fontSize={10} fontWeight={600}>
            {name}
          </text>
          <text x={x + 6} y={y + 28} fill="#94a3b8" fontSize={9}>
            {count} files
          </text>
        </>
      )}
    </g>
  );
}

export function PipelineProductTreemap() {
  const router = useRouter();
  const { dateRange } = useDashboardFilter();
  const [files, setFiles] = useState(() => (typeof window !== "undefined" ? loadLoanFiles() : []));

  useEffect(() => {
    setFiles(loadLoanFiles());
  }, []);

  const data = useMemo(() => {
    const factor = dateRange.scaleFactor;
    return computeProductTreemap(files).map((item) => ({
      ...item,
      size: Math.max(1, Math.round(item.value * factor)),
    }));
  }, [files, dateRange.scaleFactor]);

  const total = data.reduce((s, d) => s + d.size, 0);

  return (
    <DashboardCard>
      <DashboardCardHeader
        title="Pipeline Value by Product"
        description="Active cases · size = loan amount"
      />
      <DashboardCardContent
        className="pt-0 cursor-pointer"
        onClick={() => router.push(`${ROUTES.REPORTS}?tab=pipeline-products`)}
      >
        {total === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No active pipeline data</p>
        ) : (
          <ResponsiveContainer width="100%" height={140}>
            <Treemap
              data={data}
              dataKey="size"
              nameKey="name"
              stroke="#0f172a"
              content={<TreemapContent />}
            >
              <Tooltip
                content={({ payload }) => {
                  const item = payload?.[0]?.payload;
                  if (!item) return null;
                  return (
                    <div className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs shadow-lg">
                      <p className="font-medium text-slate-100">{item.name}</p>
                      <p className="text-slate-400 tabular-nums">{formatINRCompact(item.value)}</p>
                      <p className="text-slate-500">{item.count} files</p>
                    </div>
                  );
                }}
              />
            </Treemap>
          </ResponsiveContainer>
        )}
      </DashboardCardContent>
    </DashboardCard>
  );
}
