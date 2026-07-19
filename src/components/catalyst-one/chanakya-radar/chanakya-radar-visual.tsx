"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CHANAKYA_RADAR_QUADRANTS,
  type ChanakyaOperationalQuadrantId,
} from "@/constants/chanakya-radar";
import type { ChanakyaRadarDealRow } from "@/lib/chanakya-radar/derive-dashboard";
import type { OperationalVectorResult } from "@/lib/chanakya-radar/operational-vector";
import { cn } from "@/lib/utils";

interface ChanakyaRadarVisualProps {
  vector: OperationalVectorResult;
  rows: ChanakyaRadarDealRow[];
  activeQuadrant: ChanakyaOperationalQuadrantId | null;
  onQuadrantClick: (id: ChanakyaOperationalQuadrantId) => void;
  selectedRowId?: string | null;
  onBlipClick?: (row: ChanakyaRadarDealRow) => void;
  onBlipDoubleClick?: (row: ChanakyaRadarDealRow) => void;
  hoverSummary: {
    healthScore: number;
    direction: string;
    largestConcern: string;
    dominantCategory: string;
    totalActive: number;
  };
}

const CX = 100;
const CY = 100;
const INNER_R = 32;
const OUTER_R = 84;

/** Place blips in a quadrant wedge with minimum distance — no overlaps. */
function placeBlipsInQuadrant(
  quadrant: ChanakyaOperationalQuadrantId,
  count: number,
): { x: number; y: number }[] {
  const bearing =
    CHANAKYA_RADAR_QUADRANTS.find((q) => q.id === quadrant)?.bearingDeg ?? 0;
  const halfWedge = 38; // degrees each side of bearing (keep clear of axes)
  const minDist = count > 60 ? 3.2 : count > 30 ? 4 : count > 12 ? 5 : 6;
  const positions: { x: number; y: number }[] = [];

  const tooClose = (x: number, y: number) =>
    positions.some((p) => {
      const dx = p.x - x;
      const dy = p.y - y;
      return dx * dx + dy * dy < minDist * minDist;
    });

  let placed = 0;
  let ring = 0;
  const maxRings = 48;

  while (placed < count && ring < maxRings) {
    const r = INNER_R + 4 + ring * Math.max(minDist * 0.85, 3.2);
    if (r > OUTER_R) break;
    const circumference = 2 * Math.PI * r * (halfWedge * 2) / 360;
    const slots = Math.max(2, Math.floor(circumference / minDist));
    for (let s = 0; s < slots && placed < count; s++) {
      const t = slots === 1 ? 0.5 : s / (slots - 1);
      const deg = bearing - halfWedge + t * halfWedge * 2;
      // slight jitter per ring for organic packing without collision
      const jitter = ((placed * 17) % 7) - 3;
      const rad = ((deg + jitter * 0.15 - 90) * Math.PI) / 180;
      const x = CX + r * Math.cos(rad);
      const y = CY + r * Math.sin(rad);
      if (tooClose(x, y)) continue;
      positions.push({ x, y });
      placed += 1;
    }
    ring += 1;
  }

  // Fallback spiral if still short (very dense portfolios)
  let angle = 0;
  let spiralR = INNER_R + 6;
  while (placed < count && spiralR <= OUTER_R) {
    const deg = bearing + Math.sin(angle) * halfWedge;
    const rad = ((deg - 90) * Math.PI) / 180;
    const x = CX + spiralR * Math.cos(rad);
    const y = CY + spiralR * Math.sin(rad);
    if (!tooClose(x, y)) {
      positions.push({ x, y });
      placed += 1;
    }
    angle += 0.55;
    spiralR += minDist * 0.12;
  }

  return positions;
}

/**
 * CO-SPRINT-103 UI — Hero Operational Radar with collision-safe blips.
 */
export function ChanakyaRadarVisual({
  vector,
  rows,
  activeQuadrant,
  onQuadrantClick,
  selectedRowId = null,
  onBlipClick,
  onBlipDoubleClick,
  hoverSummary,
}: ChanakyaRadarVisualProps) {
  const [displayBearing, setDisplayBearing] = useState(vector.bearingDeg);
  const [blipHover, setBlipHover] = useState<{
    row: ChanakyaRadarDealRow;
    x: number;
    y: number;
  } | null>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let frame = 0;
    const from = displayBearing;
    const to = vector.bearingDeg;
    const delta = ((to - from + 540) % 360) - 180;
    const start = performance.now();
    const duration = 900;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayBearing((from + delta * eased + 360) % 360);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animate only when vector bearing changes
  }, [vector.bearingDeg]);

  useEffect(() => {
    return () => {
      if (clickTimer.current) clearTimeout(clickTimer.current);
    };
  }, []);

  const blips = useMemo(() => {
    const byQ: Record<ChanakyaOperationalQuadrantId, ChanakyaRadarDealRow[]> = {
      on_track: [],
      needs_attention: [],
      follow_up_required: [],
      at_risk: [],
    };
    for (const r of rows) byQ[r.quadrant].push(r);

    return CHANAKYA_RADAR_QUADRANTS.flatMap((q) => {
      const list = byQ[q.id];
      const spots = placeBlipsInQuadrant(q.id, list.length);
      return list.map((row, i) => ({
        row,
        color: q.tone,
        x: spots[i]?.x ?? CX,
        y: spots[i]?.y ?? CY,
        q: q.id,
        dense: list.length > 24,
      }));
    });
  }, [rows]);

  const needleRad = ((displayBearing - 90) * Math.PI) / 180;
  const nx = CX + 62 * Math.cos(needleRad);
  const ny = CY + 62 * Math.sin(needleRad);

  const quadrantLabelClass =
    "pointer-events-none max-w-[8.5rem] text-center text-[11px] font-semibold uppercase leading-tight tracking-[0.16em]";

  return (
    <div className="mx-auto w-full max-w-[min(100%,760px)]">
      <div className="grid w-full grid-cols-[minmax(5.5rem,auto)_minmax(0,1fr)_minmax(5.5rem,auto)] grid-rows-[auto_auto_auto] items-center justify-items-center gap-x-4 gap-y-4">
        <p className={cn(quadrantLabelClass, "col-start-2 row-start-1 text-emerald-400")}>
          On Track
        </p>

        <p className={cn(quadrantLabelClass, "col-start-1 row-start-2 text-orange-400")}>
          Needs
          <br />
          Attention
        </p>

        <div className="relative col-start-2 row-start-2 aspect-square w-full min-w-0 max-w-[min(100%,620px)]">
          <svg viewBox="0 0 200 200" className="h-full w-full drop-shadow-xl">
            <defs>
              <radialGradient id="radar-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(34,197,94,0.2)" />
                <stop offset="55%" stopColor="rgba(15,23,42,0.25)" />
                <stop offset="100%" stopColor="rgba(15,23,42,0)" />
              </radialGradient>
              <linearGradient id="sweep-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(52,211,153,0)" />
                <stop offset="100%" stopColor="rgba(52,211,153,0.38)" />
              </linearGradient>
            </defs>

            <circle cx={CX} cy={CY} r="94" fill="url(#radar-glow)" />
            <circle
              cx={CX}
              cy={CY}
              r="88"
              fill="rgba(9,12,20,0.94)"
              stroke="rgba(148,163,184,0.28)"
              strokeWidth="1"
            />
            {[22, 44, 66, 84].map((r) => (
              <circle
                key={r}
                cx={CX}
                cy={CY}
                r={r}
                fill="none"
                stroke="rgba(148,163,184,0.14)"
                strokeWidth="0.6"
              />
            ))}
            <line
              x1={CX}
              y1="12"
              x2={CX}
              y2="188"
              stroke="rgba(148,163,184,0.14)"
              strokeWidth="0.6"
            />
            <line
              x1="12"
              y1={CY}
              x2="188"
              y2={CY}
              stroke="rgba(148,163,184,0.14)"
              strokeWidth="0.6"
            />

            {CHANAKYA_RADAR_QUADRANTS.map((q) => {
              const start = ((q.bearingDeg - 45 - 90) * Math.PI) / 180;
              const end = ((q.bearingDeg + 45 - 90) * Math.PI) / 180;
              const x1 = CX + 88 * Math.cos(start);
              const y1 = CY + 88 * Math.sin(start);
              const x2 = CX + 88 * Math.cos(end);
              const y2 = CY + 88 * Math.sin(end);
              const active = activeQuadrant === q.id;
              return (
                <path
                  key={q.id}
                  d={`M${CX},${CY} L${x1},${y1} A88,88 0 0 1 ${x2},${y2} Z`}
                  fill={active ? `${q.tone}28` : `${q.tone}0A`}
                  stroke={active ? q.tone : "transparent"}
                  strokeWidth={active ? 1.3 : 0}
                  className="cursor-pointer transition-opacity"
                  onClick={() => onQuadrantClick(q.id)}
                />
              );
            })}

            <g
              className="origin-center animate-[spin_4.5s_linear_infinite]"
              style={{ transformOrigin: "100px 100px" }}
            >
              <path
                d="M100,100 L100,16 A84,84 0 0 1 168,52 Z"
                fill="url(#sweep-grad)"
                opacity="0.85"
              />
            </g>

            <line
              x1={CX}
              y1={CY}
              x2={nx}
              y2={ny}
              stroke="#34D399"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <circle cx={nx} cy={ny} r="3.2" fill="#34D399" />

            {blips.map((b) => {
              const selected =
                selectedRowId === b.row.id || selectedRowId === b.row.fileId;
              const dimmed = Boolean(activeQuadrant && activeQuadrant !== b.q);
              const r = selected ? 4.2 : b.dense ? 1.7 : 2.4;
              return (
                <g
                  key={b.row.id}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (clickTimer.current) clearTimeout(clickTimer.current);
                    clickTimer.current = setTimeout(() => {
                      onBlipClick?.(b.row);
                      clickTimer.current = null;
                    }, 220);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (clickTimer.current) clearTimeout(clickTimer.current);
                    clickTimer.current = null;
                    onBlipDoubleClick?.(b.row);
                  }}
                  onMouseEnter={() => setBlipHover({ row: b.row, x: b.x, y: b.y })}
                  onMouseLeave={() => setBlipHover(null)}
                >
                  <circle cx={b.x} cy={b.y} r={8} fill="transparent" />
                  <circle
                    cx={b.x}
                    cy={b.y}
                    r={r}
                    fill={b.color}
                    opacity={dimmed && !selected ? 0.2 : 0.95}
                    stroke={selected ? "#fff" : "transparent"}
                    strokeWidth={selected ? 1.2 : 0}
                  />
                </g>
              );
            })}

            <circle
              cx={CX}
              cy={CY}
              r="30"
              fill="rgba(9,12,20,0.97)"
              stroke="rgba(52,211,153,0.5)"
              strokeWidth="1.3"
            />
            <text
              x={CX}
              y="94"
              textAnchor="middle"
              className="fill-emerald-300"
              style={{ fontSize: "15px", fontWeight: 700 }}
            >
              {vector.healthScore}
            </text>
            <text
              x={CX}
              y="107"
              textAnchor="middle"
              className="fill-slate-400"
              style={{ fontSize: "5.5px", letterSpacing: "0.1em" }}
            >
              AVG HEALTH
            </text>
          </svg>

          {blipHover ? (
            <div
              className="pointer-events-none absolute z-20 w-[210px] -translate-x-1/2 -translate-y-[112%] rounded-lg border border-zinc-600/80 bg-zinc-950/98 px-3 py-2 text-left shadow-2xl backdrop-blur"
              style={{
                left: `${(blipHover.x / 200) * 100}%`,
                top: `${(blipHover.y / 200) * 100}%`,
              }}
            >
              <p className="truncate text-[12px] font-semibold text-foreground">
                {blipHover.row.borrower}
              </p>
              <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                {blipHover.row.product}
              </p>
              <dl className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
                <dt className="text-muted-foreground">Stage</dt>
                <dd className="truncate text-right font-medium">
                  {blipHover.row.stageLabel}
                </dd>
                <dt className="text-muted-foreground">RM</dt>
                <dd className="truncate text-right font-medium">
                  {blipHover.row.assignedRm}
                </dd>
                <dt className="text-muted-foreground">Days</dt>
                <dd className="text-right font-medium tabular-nums">
                  {blipHover.row.daysInStage}d
                </dd>
                <dt className="text-muted-foreground">Health</dt>
                <dd className="text-right font-medium text-emerald-300">
                  {blipHover.row.quadrantLabel}
                </dd>
              </dl>
            </div>
          ) : null}

          {!blipHover ? (
            <p className="pointer-events-none absolute -top-1 left-1/2 sr-only">
              {hoverSummary.direction}
            </p>
          ) : null}
        </div>

        <p className={cn(quadrantLabelClass, "col-start-3 row-start-2 text-amber-400")}>
          Follow-up
          <br />
          Required
        </p>

        <p className={cn(quadrantLabelClass, "col-start-2 row-start-3 text-rose-400")}>
          At Risk
        </p>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
        {[
          { label: "On Track", tone: "#22C55E" },
          { label: "Needs Attention", tone: "#FB923C" },
          { label: "At Risk", tone: "#EF4444" },
          { label: "Follow-up / Dormant", tone: "#F59E0B" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: item.tone }}
            />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
