"use client";

import { useEffect, useMemo, useState } from "react";
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
  const spread = ((index % 5) - 2) * 8;
  const ring = 28 + (index % 4) * 12 + (total > 8 ? 4 : 0);
  const rad = ((bearing + spread - 90) * Math.PI) / 180;
  return {
    x: 100 + ring * Math.cos(rad),
    y: 100 + ring * Math.sin(rad),
  };
}

/**
 * CO-SPRINT-100 / 100A — Live operational radar (signature visual).
 * Four quadrant labels permanently visible; direction/trend sit below the dial.
 */
export function ChanakyaRadarVisual({
  vector,
  rows,
  activeQuadrant,
  onQuadrantClick,
  hoverSummary,
}: ChanakyaRadarVisualProps) {
  const [displayBearing, setDisplayBearing] = useState(vector.bearingDeg);
  const [hovered, setHovered] = useState(false);

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

  const blips = useMemo(() => {
    const byQ: Record<ChanakyaOperationalQuadrantId, ChanakyaRadarDealRow[]> = {
      on_track: [],
      needs_attention: [],
      follow_up_required: [],
      at_risk: [],
    };
    for (const r of rows) byQ[r.quadrant].push(r);
    return CHANAKYA_RADAR_QUADRANTS.flatMap((q) =>
      byQ[q.id].slice(0, 12).map((row, i) => {
        const pos = blipPosition(q.id, i, byQ[q.id].length);
        return { row, color: q.tone, ...pos, q: q.id };
      }),
    );
  }, [rows]);

  const needleRad = ((displayBearing - 90) * Math.PI) / 180;
  const nx = 100 + 62 * Math.cos(needleRad);
  const ny = 100 + 62 * Math.sin(needleRad);

  return (
    <div className="mx-auto w-full max-w-[420px]">
      <div
        className="relative mx-auto aspect-square w-full px-2 py-5 sm:px-3 sm:py-6"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
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

          {blips.map((b) => (
            <circle
              key={b.row.id}
              cx={b.x}
              cy={b.y}
              r={activeQuadrant && activeQuadrant !== b.q ? 1.4 : 2.4}
              fill={b.color}
              opacity={activeQuadrant && activeQuadrant !== b.q ? 0.25 : 0.9}
              className="animate-pulse"
            />
          ))}

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

        {/* Permanently visible quadrant labels */}
        <span className="pointer-events-none absolute left-1/2 top-0 z-[1] -translate-x-1/2 whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-400 sm:text-[10px]">
          On Track
        </span>
        <span className="pointer-events-none absolute bottom-0 left-1/2 z-[1] -translate-x-1/2 whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.12em] text-rose-400 sm:text-[10px]">
          At Risk
        </span>
        <span className="pointer-events-none absolute left-0 top-1/2 z-[1] -translate-y-1/2 text-left text-[8px] font-bold uppercase leading-tight tracking-wide text-amber-400 sm:text-[9px]">
          Needs
          <br />
          Attention
        </span>
        <span className="pointer-events-none absolute right-0 top-1/2 z-[1] -translate-y-1/2 text-right text-[8px] font-bold uppercase leading-tight tracking-wide text-sky-400 sm:text-[9px]">
          Follow-up
          <br />
          Required
        </span>

        {hovered && (
          <div className="absolute left-1/2 top-[42%] z-10 w-[220px] -translate-x-1/2 -translate-y-1/2 rounded-md border border-border/80 bg-zinc-950/95 px-3 py-2 text-left shadow-xl backdrop-blur">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Operational hover
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
                <dt className="text-muted-foreground">Dominant</dt>
                <dd className="font-medium">{hoverSummary.dominantCategory}</dd>
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

      <div className="mt-1 space-y-0.5 text-center">
        <p className="text-xs font-medium text-foreground">{vector.direction}</p>
        <p
          className={cn(
            "text-[11px]",
            vector.trend === "Improving" && "text-emerald-400",
            vector.trend === "Declining" && "text-rose-400",
            vector.trend === "Stable" && "text-muted-foreground",
          )}
        >
          Trend · {vector.trend}
        </p>
      </div>
    </div>
  );
}
