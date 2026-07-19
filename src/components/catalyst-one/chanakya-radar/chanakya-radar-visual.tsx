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
const INNER_R = 34;
const OUTER_R = 86;

/**
 * Distance from centre = operational ageing within status.
 * Colour (quadrant) = business status. On Track stays closer.
 */
function ageingRadius(row: ChanakyaRadarDealRow): number {
  const days = Math.max(row.daysInStage, row.idleDays, 0);
  let t = Math.min(1, days / 28);
  if (row.quadrant === "on_track") t = Math.min(t * 0.55, 0.42);
  if (row.quadrant === "needs_attention") t = Math.max(0.12, Math.min(t, 0.92));
  if (row.quadrant === "follow_up_required") t = Math.max(0.18, Math.min(t, 0.95));
  if (row.quadrant === "at_risk") t = Math.max(0.2, Math.min(t, 1));
  return INNER_R + 4 + t * (OUTER_R - INNER_R - 6);
}

/** Place blips: radius by ageing, angle in quadrant wedge, collision avoid. */
function placeBlips(
  rows: ChanakyaRadarDealRow[],
): { row: ChanakyaRadarDealRow; x: number; y: number; color: string; q: ChanakyaOperationalQuadrantId }[] {
  const byQ: Record<ChanakyaOperationalQuadrantId, ChanakyaRadarDealRow[]> = {
    on_track: [],
    needs_attention: [],
    follow_up_required: [],
    at_risk: [],
  };
  for (const r of rows) byQ[r.quadrant].push(r);

  const placed: { x: number; y: number }[] = [];
  const result: {
    row: ChanakyaRadarDealRow;
    x: number;
    y: number;
    color: string;
    q: ChanakyaOperationalQuadrantId;
  }[] = [];

  const minDistFor = (n: number) => (n > 50 ? 3.0 : n > 25 ? 3.8 : 4.8);

  const tooClose = (x: number, y: number, minDist: number) =>
    placed.some((p) => {
      const dx = p.x - x;
      const dy = p.y - y;
      return dx * dx + dy * dy < minDist * minDist;
    });

  for (const q of CHANAKYA_RADAR_QUADRANTS) {
    const list = [...byQ[q.id]].sort(
      (a, b) =>
        Math.max(a.daysInStage, a.idleDays) - Math.max(b.daysInStage, b.idleDays),
    );
    const halfWedge = 36;
    const bearing = q.bearingDeg;
    const minDist = minDistFor(list.length);

    list.forEach((row, i) => {
      const targetR = ageingRadius(row);
      const baseT = list.length <= 1 ? 0.5 : i / (list.length - 1);
      let deg = bearing - halfWedge + baseT * halfWedge * 2;
      let r = targetR;
      let x = CX + r * Math.cos(((deg - 90) * Math.PI) / 180);
      let y = CY + r * Math.sin(((deg - 90) * Math.PI) / 180);

      let attempts = 0;
      while (tooClose(x, y, minDist) && attempts < 36) {
        deg += attempts % 2 === 0 ? 2.2 : -2.2;
        if (Math.abs(deg - bearing) > halfWedge) {
          r = Math.min(OUTER_R, r + minDist * 0.35);
          deg = bearing - halfWedge + ((baseT + attempts * 0.07) % 1) * halfWedge * 2;
        }
        x = CX + r * Math.cos(((deg - 90) * Math.PI) / 180);
        y = CY + r * Math.sin(((deg - 90) * Math.PI) / 180);
        attempts += 1;
      }

      placed.push({ x, y });
      result.push({ row, x, y, color: q.tone, q: q.id });
    });
  }

  return result;
}

/**
 * CO-SPRINT-104 — Hero Radar: ageing radius, collision avoidance, worked-today tick.
 */
export function ChanakyaRadarVisual({
  vector,
  rows,
  activeQuadrant,
  onQuadrantClick,
  selectedRowId = null,
  onBlipClick,
  onBlipDoubleClick,
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

  const blips = useMemo(() => placeBlips(rows), [rows]);

  const needleRad = ((displayBearing - 90) * Math.PI) / 180;
  const nx = CX + 64 * Math.cos(needleRad);
  const ny = CY + 64 * Math.sin(needleRad);

  const quadrantLabelClass =
    "pointer-events-none max-w-[9rem] text-center text-[11px] font-semibold uppercase leading-tight tracking-[0.16em] md:text-[12px]";

  return (
    <div className="mx-auto w-full max-w-[min(100%,880px)]">
      <div className="grid w-full grid-cols-[minmax(5rem,auto)_minmax(0,1fr)_minmax(5rem,auto)] grid-rows-[auto_auto_auto] items-center justify-items-center gap-x-3 gap-y-3 md:gap-x-5 md:gap-y-4">
        <p className={cn(quadrantLabelClass, "col-start-2 row-start-1 text-emerald-400")}>
          On Track
        </p>

        <p className={cn(quadrantLabelClass, "col-start-1 row-start-2 text-orange-400")}>
          Needs
          <br />
          Attention
        </p>

        <div className="relative col-start-2 row-start-2 aspect-square w-full min-w-0 max-w-[min(100%,720px)]">
          <svg viewBox="0 0 200 200" className="h-full w-full drop-shadow-xl">
            <defs>
              <radialGradient id="radar-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(34,197,94,0.22)" />
                <stop offset="55%" stopColor="rgba(15,23,42,0.25)" />
                <stop offset="100%" stopColor="rgba(15,23,42,0)" />
              </radialGradient>
              <linearGradient id="sweep-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(52,211,153,0)" />
                <stop offset="100%" stopColor="rgba(52,211,153,0.4)" />
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
              const r = selected ? 4.4 : blips.length > 80 ? 1.8 : 2.5;
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
                  <circle cx={b.x} cy={b.y} r={9} fill="transparent" />
                  <circle
                    cx={b.x}
                    cy={b.y}
                    r={r}
                    fill={b.color}
                    opacity={dimmed && !selected ? 0.2 : 0.95}
                    stroke={selected ? "#fff" : "transparent"}
                    strokeWidth={selected ? 1.2 : 0}
                  />
                  {/* Daily action tick — worked today; resets next calendar day via lastActivity */}
                  {b.row.workedToday ? (
                    <g transform={`translate(${b.x + 3.2}, ${b.y - 4.2})`}>
                      <circle r="3.1" fill="#0f172a" stroke="#34D399" strokeWidth="0.6" />
                      <path
                        d="M-1.2,0.1 L-0.3,1.1 L1.4,-1.1"
                        fill="none"
                        stroke="#34D399"
                        strokeWidth="0.85"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  ) : null}
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
              style={{ fontSize: "16px", fontWeight: 700 }}
            >
              {vector.healthScore}
            </text>
            <text
              x={CX}
              y="108"
              textAnchor="middle"
              className="fill-slate-400"
              style={{ fontSize: "5.5px", letterSpacing: "0.1em" }}
            >
              AVG HEALTH
            </text>
          </svg>

          {blipHover ? (
            <div
              className="pointer-events-none absolute z-20 w-[220px] -translate-x-1/2 -translate-y-[112%] rounded-lg border border-zinc-600/80 bg-zinc-950/98 px-3 py-2 text-left shadow-2xl backdrop-blur"
              style={{
                left: `${(blipHover.x / 200) * 100}%`,
                top: `${(blipHover.y / 200) * 100}%`,
              }}
            >
              <p className="truncate text-[12px] font-semibold">{blipHover.row.borrower}</p>
              <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                {blipHover.row.product}
              </p>
              <dl className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
                <dt className="text-muted-foreground">Stage</dt>
                <dd className="truncate text-right font-medium">{blipHover.row.stageLabel}</dd>
                <dt className="text-muted-foreground">RM</dt>
                <dd className="truncate text-right font-medium">{blipHover.row.assignedRm}</dd>
                <dt className="text-muted-foreground">Days</dt>
                <dd className="text-right font-medium tabular-nums">
                  {blipHover.row.daysInStage}d
                </dd>
                <dt className="text-muted-foreground">Health</dt>
                <dd className="text-right font-medium text-emerald-300">
                  {blipHover.row.quadrantLabel}
                </dd>
                <dt className="text-muted-foreground">Today</dt>
                <dd className="text-right font-medium">
                  {blipHover.row.workedToday ? "Worked ✓" : "Pending"}
                </dd>
              </dl>
            </div>
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

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
        {[
          { label: "On Track", tone: "#22C55E" },
          { label: "Needs Attention", tone: "#FB923C" },
          { label: "At Risk", tone: "#EF4444" },
          { label: "Follow-up / Dormant", tone: "#F59E0B" },
          { label: "✓ Worked today", tone: "#34D399" },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.tone }} />
            {item.label}
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
        Colour = status · Distance from centre = stage ageing · Tick = worked today
      </p>
    </div>
  );
}
