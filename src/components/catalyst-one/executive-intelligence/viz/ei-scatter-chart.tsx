"use client";

import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EiScatterPoint } from "@/types/executive-intelligence-platform";

/** Correlation → Scatter */
export function EiScatterChart({ points }: { points: EiScatterPoint[] }) {
  if (points.length === 0) {
    return <p className="text-xs text-muted-foreground">No correlation points yet.</p>;
  }

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
          <XAxis type="number" dataKey="x" name="Days in stage" tick={{ fontSize: 10 }} />
          <YAxis type="number" dataKey="y" name="Progress %" tick={{ fontSize: 10 }} width={36} />
          <Tooltip
            content={({ payload }) => {
              const p = payload?.[0]?.payload as EiScatterPoint | undefined;
              if (!p) return null;
              return (
                <div className="rounded-md border bg-popover px-2 py-1 text-[10px] shadow">
                  <p className="font-semibold">{p.label}</p>
                  <p>{p.x} days · {p.y}% progress</p>
                </div>
              );
            }}
          />
          <Scatter data={points} fill="#0369A1" fillOpacity={0.7} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
