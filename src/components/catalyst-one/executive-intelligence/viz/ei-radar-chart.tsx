"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import type { EiRadarAxis } from "@/types/executive-intelligence-platform";

/** Risk Distribution → Radar */
export function EiRadarChart({ axes }: { axes: EiRadarAxis[] }) {
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={axes}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10 }} />
          <Radar
            name="Risk"
            dataKey="value"
            stroke="#0F766E"
            fill="#0F766E"
            fillOpacity={0.35}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
