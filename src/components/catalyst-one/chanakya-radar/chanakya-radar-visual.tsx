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

function blipPosition(
  quadrant: ChanakyaOperationalQuadrantId,
  index: number,
  total: number,
): { x: number; y: number } {
  const bearing =
    CHANAKYA_RADAR_QUADRANTS.find((q) => q.id === quadrant)?.bearingDeg ?? 0;
  const cols = Math.max(4, Math.ceil(Math.sqrt(Math.max(total, 1))));
  const ring = 26 + (Math.floor(index / cols) % 8) * 7 + (index % 3);
  const spread = ((index % cols) - (cols - 1) / 2) * Math.min(10, 48 / cols);
  const rad = ((bearing + spread - 90) * Math.PI) / 180;
  return {
    x: 100 + Math.min(82, ring) * Math.cos(rad),
    y: 100 + Math.min(82, ring) * Math.sin(rad),
  };
}

/**
 * CO-SPRINT-103 — Hero Operational Radar (Mission Control centrepiece).
 * Quadrant labels outside dial; supports dense portfolios.
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
  const [hovered, setHovered] = useState(false);
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
    return CHANAKYA_RADAR_QUADRANTS.flatMap((q) =>
      byQ[q.id].map((row, i) => {
        const pos = blipPosition(q.id, i, byQ[q.id].length);
        return { row, color: q.tone, ...pos, q: q.id, dense: byQ[q.id].length > 24 };
      }),
    );
  }, [rows]);

  const needleRad = ((displayBearing - 90) * Math.PI) / 180;
  const nx = 100 + 62 * Math.cos(needleRad);
  const ny = 100 + 62 * Math.sin(needleRad);

  const quadrantLabelClass =
    "pointer-events-none max-w-[8rem] text-center text-[11px] font-semibold uppercase leading-tight tracking-[0.14em]";

  return (
    <div className="mx-auto w-full max-w-[min(100%,720px)]">
      <div
        className="grid w-full grid-cols-[minmax(5.75rem,auto)_minmax(0,1fr)_minmax(5.75rem,auto)] grid-rows-[auto_auto_auto] items-center justify-items-center gap-x-5 gap-y-5"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <p className={cn(quadrantLabelClass, "col-start-2 row-start-1 text-emerald-400")}>
          On Track
        </p>

        <p className={cn(quadrantLabelClass, "col-start-1 row-start-2 text-orange-400")}>
          Needs
          <br />
          Attention
        </p>

        <div className="relative col-start-2 row-start-2 aspect-square w-full min-w-0 max-w-[min(100%,560px)]">
          <svg viewBox="0 0 200 200" className="h-full w-full drop-shadow-lg">
            <defs>
              <radialGradient id="radar-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(34,197,94,0.18)" />
                <stop offset="55%" stopColor="rgba(15,23,42,0.2)" />
                <stop offset="100%" stopColor="rgba(15,23,42,0)" />
              </radialGradient>
              <linearGradient id="sweep-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(52,211,153,0)" />
                <stop offset="100%" stopColor="rgba(52,211,153,0.35)" />
              </linearGradient>
            </defs>

            <circle cx="100" cy="100" r="92" fill="url(#radar-glow)" />
            <circle
              cx="100"
              cy="100"
              r="88"
              fill="rgba(9,12,20,0.92)"
              stroke="rgba(148,163,184,0.25)"
              strokeWidth="1"
            />
            {[22, 44, 66, 84].map((r) => (
              <circle
                key={r}
                cx="100"
                cy="100"
                r={r}
                fill="none"
                stroke="rgba(148,163,184,0.12)"
                strokeWidth="0.6"
              />
            ))}
            <line
              x1="100"
              y1="12"
              x2="100"
              y2="188"
              stroke="rgba(148,163,184,0.12)"
              strokeWidth="0.6"
            />
            <line
              x1="12"
              y1="100"
              x2="188"
              y2="100"
              stroke="rgba(148,163,184,0.12)"
              strokeWidth="0.6"
            />

            {CHANAKYA_RADAR_QUADRANTS.map((q) => {
              const start = ((q.bearingDeg - 45 - 90) * Math.PI) / 180;
              const end = ((q.bearingDeg + 45 - 90) * Math.PI) / 180;
              const x1 = 100 + 88 * Math.cos(start);
              const y1 = 100 + 88 * Math.sin(start);
              const x2 = 100 + 88 * Math.cos(end);
              const y2 = 100 + 88 * Math.sin(end);
              const active = activeQuadrant === q.id;
              return (
                <path
                  key={q.id}
                  d={`M100,100 L${x1},${y1} A88,88 0 0 1 ${x2},${y2} Z`}
                  fill={active ? `${q.tone}22` : `${q.tone}08`}
                  stroke={active ? q.tone : "transparent"}
                  strokeWidth={active ? 1.2 : 0}
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
              x1="100"
              y1="100"
              x2={nx}
              y2={ny}
              stroke="#34D399"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <circle cx={nx} cy={ny} r="3.2" fill="#34D399" />

            {blips.map((b) => {
              const selected = selectedRowId === b.row.id || selectedRowId === b.row.fileId;
              const dimmed = Boolean(activeQuadrant && activeQuadrant !== b.q);
              const r = selected ? 4.4 : b.dense ? 1.6 : 2.3;
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
                    opacity={dimmed && !selected ? 0.22 : 0.95}
                    stroke={selected ? "#fff" : "transparent"}
                    strokeWidth={selected ? 1.2 : 0}
                    className={selected ? undefined : "animate-pulse"}
                  />
                </g>
              );
            })}

            <circle
              cx="100"
              cy="100"
              r="28"
              fill="rgba(9,12,20,0.95)"
              stroke="rgba(52,211,153,0.45)"
              strokeWidth="1.2"
            />
            <text
              x="100"
              y="96"
              textAnchor="middle"
              className="fill-emerald-300"
              style={{ fontSize: "14px", fontWeight: 700 }}
            >
              {vector.healthScore}
            </text>
            <text
              x="100"
              y="108"
              textAnchor="middle"
              className="fill-slate-400"
              style={{ fontSize: "6px", letterSpacing: "0.08em" }}
            >
              / 100
            </text>
          </svg>

          {blipHover ? (
            <div
              className="pointer-events-none absolute z-20 w-[200px] -translate-x-1/2 -translate-y-[112%] rounded-md border border-border/80 bg-zinc-950/95 px-2.5 py-2 text-left shadow-xl backdrop-blur"
              style={{
                left: `${(blipHover.x / 200) * 100}%`,
                top: `${(blipHover.y / 200) * 100}%`,
              }}
            >
              <p className="truncate text-[11px] font-semibold">{blipHover.row.borrower}</p>
              <dl className="mt-1 space-y-0.5 text-[10px] text-muted-foreground">
                <div className="flex justify-between gap-2">
                  <dt>Product</dt>
                  <dd className="truncate font-medium text-foreground/90">
                    {blipHover.row.product}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Stage</dt>
                  <dd className="truncate font-medium text-foreground/90">
                    {blipHover.row.stageLabel}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>RM</dt>
                  <dd className="truncate font-medium text-foreground/90">
                    {blipHover.row.assignedRm}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Days in stage</dt>
                  <dd className="tabular-nums font-medium text-foreground/90">
                    {blipHover.row.daysInStage}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Health</dt>
                  <dd className="font-medium text-emerald-300">{blipHover.row.quadrantLabel}</dd>
                </div>
              </dl>
            </div>
          ) : null}

          {hovered && !blipHover && (
            <div className="pointer-events-none absolute left-1/2 top-0 z-10 w-[min(100%,220px)] -translate-x-1/2 -translate-y-[calc(100%+0.5rem)] rounded-md border border-border/80 bg-zinc-950/95 px-3 py-2 text-left shadow-xl backdrop-blur">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Portfolio pulse
              </p>
              <dl className="mt-1 space-y-0.5 text-[11px]">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Health</dt>
                  <dd className="tabular-nums font-medium">
                    {hoverSummary.healthScore}/100
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Direction</dt>
                  <dd className="font-medium">{hoverSummary.direction}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Largest concern</dt>
                  <dd className="font-medium text-amber-300">
                    {hoverSummary.largestConcern}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Active files</dt>
                  <dd className="tabular-nums font-medium">
                    {hoverSummary.totalActive}
                  </dd>
                </div>
              </dl>
            </div>
          )}
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
    </div>
  );
}
