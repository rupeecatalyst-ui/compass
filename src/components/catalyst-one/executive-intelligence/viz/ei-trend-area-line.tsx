"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EiTrendPoint } from "@/types/executive-intelligence-platform";

/** Trend → Area + Line */
export function EiTrendAreaLine({ points }: { points: EiTrendPoint[] }) {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} width={32} />
          <Tooltip contentStyle={{ fontSize: 11 }} />
          <Area
            type="monotone"
            dataKey="actual"
            fill="#0F766E33"
            stroke="transparent"
            name="Actual"
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#0F766E"
            strokeWidth={2}
            dot={{ r: 3 }}
            name="Actual"
          />
          <Line
            type="monotone"
            dataKey="prior"
            stroke="#94A3B8"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            name="Prior"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
