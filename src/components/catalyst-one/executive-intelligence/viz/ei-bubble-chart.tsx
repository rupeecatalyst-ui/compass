"use client";

import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { EiBubblePoint } from "@/types/executive-intelligence-platform";

/** Relationship → Bubble */
export function EiBubbleChart({ points }: { points: EiBubblePoint[] }) {
  if (points.length === 0) {
    return <p className="text-xs text-muted-foreground">No relationship points yet.</p>;
  }

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
          <XAxis type="number" dataKey="x" name="Amount (L)" tick={{ fontSize: 10 }} />
          <YAxis type="number" dataKey="y" name="Revenue" tick={{ fontSize: 10 }} width={36} />
          <ZAxis type="number" dataKey="z" range={[40, 280]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={({ payload }) => {
              const p = payload?.[0]?.payload as EiBubblePoint | undefined;
              if (!p) return null;
              return (
                <div className="rounded-md border bg-popover px-2 py-1 text-[10px] shadow">
                  <p className="font-semibold">{p.label}</p>
                  <p>Amount {p.x.toFixed(1)}L · Rev {p.y.toFixed(1)} · Days {p.z}</p>
                </div>
              );
            }}
          />
          <Scatter data={points} fill="#0F766E" fillOpacity={0.65} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
