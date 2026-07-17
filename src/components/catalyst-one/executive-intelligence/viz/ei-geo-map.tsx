"use client";

import { formatINRCompact } from "@/lib/format-currency";
import { useEiVizInteractionOptional } from "@/components/catalyst-one/executive-intelligence/ei-viz-interaction-context";
import type { EiGeoRegion } from "@/types/executive-intelligence-platform";
import type { EiHoverInsight } from "@/types/executive-intelligence-capabilities";
import { cn } from "@/lib/utils";

/** Approximate India metro/state anchors for executive geographic encoding. */
const REGION_ANCHORS: Record<string, { x: number; y: number }> = {
  Maharashtra: { x: 28, y: 58 },
  "Maharashtra ": { x: 28, y: 58 },
  Mumbai: { x: 26, y: 56 },
  Pune: { x: 30, y: 60 },
  Delhi: { x: 42, y: 28 },
  "New Delhi": { x: 42, y: 28 },
  "NCR": { x: 43, y: 30 },
  Karnataka: { x: 38, y: 72 },
  Bengaluru: { x: 40, y: 74 },
  Bangalore: { x: 40, y: 74 },
  Telangana: { x: 48, y: 62 },
  Hyderabad: { x: 48, y: 64 },
  "Tamil Nadu": { x: 44, y: 82 },
  Chennai: { x: 48, y: 80 },
  Gujarat: { x: 22, y: 48 },
  Ahmedabad: { x: 24, y: 46 },
  Rajasthan: { x: 30, y: 36 },
  "West Bengal": { x: 68, y: 48 },
  Kolkata: { x: 70, y: 50 },
  "Uttar Pradesh": { x: 50, y: 36 },
  Haryana: { x: 40, y: 32 },
  Punjab: { x: 36, y: 24 },
  Kerala: { x: 36, y: 88 },
  Goa: { x: 28, y: 68 },
  Unknown: { x: 55, y: 55 },
};

function anchorFor(label: string): { x: number; y: number } {
  if (REGION_ANCHORS[label]) return REGION_ANCHORS[label]!;
  const hit = Object.keys(REGION_ANCHORS).find((k) =>
    label.toLowerCase().includes(k.toLowerCase()),
  );
  if (hit) return REGION_ANCHORS[hit]!;
  // Deterministic scatter for unknown regions (still geographic canvas, not a card grid)
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  return { x: 20 + (hash % 60), y: 20 + ((hash >> 6) % 65) };
}

/**
 * Regional Performance → Geographic Map
 * Proportional symbols on an India schematic — geography is the encoding, not a tile list.
 */
export function EiGeoMap({
  regions,
  onHover,
}: {
  regions: EiGeoRegion[];
  onHover?: (insight: EiHoverInsight | null) => void;
}) {
  const interaction = useEiVizInteractionOptional();

  if (regions.length === 0) {
    return null;
  }

  const maxVal = Math.max(...regions.map((r) => r.value), 1);

  return (
    <div className="relative">
      <svg viewBox="0 0 100 100" className="h-[260px] w-full overflow-visible">
        {/* India schematic silhouette (simplified path for executive orientation) */}
        <path
          d="M32 18 C38 12, 48 10, 55 14 C62 12, 68 18, 72 26 C78 32, 82 42, 80 52 C78 62, 72 68, 70 78 C66 88, 58 94, 48 92 C40 94, 34 88, 30 78 C24 70, 18 60, 16 48 C14 36, 20 24, 32 18 Z"
          fill="rgb(15 118 110 / 0.08)"
          stroke="rgb(15 118 110 / 0.35)"
          strokeWidth="0.6"
        />
        <path
          d="M48 14 C52 8, 56 6, 58 10 C60 14, 56 18, 52 16 C50 15, 48 14, 48 14 Z"
          fill="rgb(15 118 110 / 0.06)"
          stroke="rgb(15 118 110 / 0.25)"
          strokeWidth="0.4"
        />

        {regions.map((r) => {
          const { x, y } = anchorFor(r.label);
          const radius = 2.2 + (r.value / maxVal) * 7.5;
          const active = interaction?.filters.region === r.id;
          return (
            <g
              key={r.id}
              className="cursor-pointer"
              onMouseEnter={() =>
                onHover?.({
                  title: r.label,
                  detail: "Regional pipeline concentration on the map",
                  value: `${r.count} files · ${formatINRCompact(r.value)}`,
                })
              }
              onMouseLeave={() => onHover?.(null)}
              onClick={() =>
                interaction?.drillDown({
                  dimension: "region",
                  key: r.id,
                  label: r.label,
                })
              }
            >
              <circle
                cx={x}
                cy={y}
                r={radius}
                className={cn(active ? "stroke-teal-800" : "stroke-teal-900/20")}
                fill={`rgba(15, 118, 110, ${0.35 + r.intensity * 0.5})`}
                strokeWidth={active ? 0.8 : 0.35}
              />
              {radius > 4.5 ? (
                <text
                  x={x}
                  y={y + 0.8}
                  textAnchor="middle"
                  className="fill-white text-[2.4px] font-semibold"
                >
                  {r.label.slice(0, 8)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <p className="mt-1 text-center text-[10px] text-muted-foreground">
        Bubble size = pipeline value · position = geography
      </p>
    </div>
  );
}
