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
import type { EiForecastPoint } from "@/types/executive-intelligence-platform";

/**
 * Forecast → Forecast Bands
 * True confidence band (low→high) with actual + forecast lines — not a white-mask hack.
 */
export function EiForecastBands({ points }: { points: EiForecastPoint[] }) {
  const data = points.map((p) => ({
    label: p.label,
    actual: p.actual,
    forecast: p.forecast,
    low: p.low,
    /** Stacked band height so Area(low)+Area(band) draws low→high envelope */
    band: Math.max(0, p.high - p.low),
  }));

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="eiForecastBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0F766E" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#0F766E" stopOpacity={0.06} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10 }} width={34} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              fontSize: 11,
              borderRadius: 12,
              border: "1px solid rgb(15 23 42 / 0.08)",
              boxShadow: "0 12px 32px rgb(15 23 42 / 0.12)",
            }}
          />
          <Area
            type="monotone"
            dataKey="low"
            stackId="confidence"
            stroke="transparent"
            fill="transparent"
            name="Low"
            isAnimationActive
          />
          <Area
            type="monotone"
            dataKey="band"
            stackId="confidence"
            stroke="transparent"
            fill="url(#eiForecastBand)"
            name="Confidence band"
            isAnimationActive
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#0F766E"
            strokeWidth={2.5}
            dot={{ r: 3.5, fill: "#0F766E", strokeWidth: 0 }}
            connectNulls={false}
            name="Actual"
            isAnimationActive
          />
          <Line
            type="monotone"
            dataKey="forecast"
            stroke="#C4A35A"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            name="Forecast"
            isAnimationActive
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="mt-1 text-center text-[10px] text-muted-foreground">
        Teal = actual · Gold dashed = forecast · Shade = confidence band
      </p>
    </div>
  );
}
