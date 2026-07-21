"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CHANAKYA_RADAR_PLACEMENT,
  CHANAKYA_RADAR_QUADRANTS,
  type ChanakyaOperationalQuadrantId,
} from "@/constants/chanakya-radar";
import type { ChanakyaRadarDealRow } from "@/lib/chanakya-radar/derive-dashboard";
import type { OperationalVectorResult } from "@/lib/chanakya-radar/operational-vector";
import {
  chanakyaRadarRingGuideRadii,
  placeChanakyaRadarBlips,
} from "@/lib/chanakya-radar/place-blips";
import {
  OperationalMovementFeed,
  useOperationalMovements,
} from "@/components/catalyst-one/chanakya-radar/operational-movement-feed";
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

const CX = CHANAKYA_RADAR_PLACEMENT.centerX;
const CY = CHANAKYA_RADAR_PLACEMENT.centerY;

/**
 * CO-SPRINT-107 / 113 — Operational Radar visualization.
 * Colour = status · Ring = stage ageing · Vector = management focus.
 * Movement Feeds = recent operational transitions (outside dial, desktop+tablet).
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
  const movements = useOperationalMovements(rows);

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

  const blips = useMemo(() => placeChanakyaRadarBlips(rows), [rows]);
  const ringGuides = useMemo(() => chanakyaRadarRingGuideRadii(), []);

  const needleLen = 62;
  const needleRad = ((displayBearing - 90) * Math.PI) / 180;
  const nx = CX + needleLen * Math.cos(needleRad);
  const ny = CY + needleLen * Math.sin(needleRad);

  const quadrantLabelClass =
    "pointer-events-none max-w-[9rem] text-center text-[11px] font-semibold uppercase leading-tight tracking-[0.16em] md:text-[12px]";

  /**
   * Dial size is viewport-locked (not % of side columns) so Movement Feeds
   * never shrink the Radar. Side columns are fixed width on md+.
   */
  const dialSizeClass =
    "size-[min(100%,min(calc(100vh-11rem),820px))] md:size-[min(calc(100vw-16rem),min(calc(100vh-11rem),820px))]";

  return (
    <div className="mx-auto flex w-full max-w-[min(100%,960px)] justify-center">
      <div className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] grid-rows-[auto_auto_auto] items-center justify-items-center gap-x-1 gap-y-1.5 md:grid-cols-[6.5rem_auto_6.5rem] md:gap-x-3 md:gap-y-2">
        {/* Top — On Track; feed overlays gap (does not push dial down) */}
        <div className="relative col-start-2 row-start-1 flex flex-col items-center">
          <p className={cn(quadrantLabelClass, "text-emerald-400")}>On Track</p>
          <div className="pointer-events-none absolute left-1/2 top-full z-[5] hidden -translate-x-1/2 md:block">
            <OperationalMovementFeed destination="on_track" events={movements} />
          </div>
        </div>

        {/* Left — Needs Attention */}
        <div className="col-start-1 row-start-2 flex max-w-[4.5rem] flex-col items-center justify-center gap-1.5 self-center md:max-w-none md:gap-2">
          <p className={cn(quadrantLabelClass, "text-orange-400")}>
            Needs
            <br />
            Attention
          </p>
          <OperationalMovementFeed
            destination="needs_attention"
            events={movements}
            compact
            className="hidden md:block"
          />
        </div>

        {/* Dial — hero; size not driven by feed column width */}
        <div
          className={cn(
            "relative col-start-2 row-start-2 mx-auto aspect-square max-w-full",
            dialSizeClass,
          )}
        >
          <svg
            viewBox="0 0 200 200"
            className="h-full w-full drop-shadow-xl"
            role="img"
            aria-label={vector.vectorPurpose}
          >
            <title>{vector.vectorPurpose}</title>
            <defs>
              <radialGradient id="radar-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(34,197,94,0.14)" />
                <stop offset="55%" stopColor="rgba(15,23,42,0.2)" />
                <stop offset="100%" stopColor="rgba(15,23,42,0)" />
              </radialGradient>
              <linearGradient id="sweep-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(52,211,153,0)" />
                <stop offset="100%" stopColor="rgba(52,211,153,0.22)" />
              </linearGradient>
            </defs>

            <circle cx={CX} cy={CY} r="94" fill="url(#radar-glow)" />
            <circle
              cx={CX}
              cy={CY}
              r="88"
              fill="rgba(9,12,20,0.94)"
              stroke="rgba(148,163,184,0.16)"
              strokeWidth="0.7"
            />

            {ringGuides.map((r) => (
              <circle
                key={r}
                cx={CX}
                cy={CY}
                r={r}
                fill="none"
                stroke="rgba(148,163,184,0.1)"
                strokeWidth="0.55"
                strokeDasharray="1.2 2.4"
              />
            ))}

            <line
              x1={CX}
              y1="12"
              x2={CX}
              y2="188"
              stroke="rgba(148,163,184,0.1)"
              strokeWidth="0.5"
            />
            <line
              x1="12"
              y1={CY}
              x2="188"
              y2={CY}
              stroke="rgba(148,163,184,0.1)"
              strokeWidth="0.5"
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
                  fill={active ? `${q.tone}14` : `${q.tone}05`}
                  stroke={active ? `${q.tone}66` : `${q.tone}18`}
                  strokeWidth={active ? 0.9 : 0.45}
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
                opacity="0.7"
              />
            </g>

            <g aria-label="Operational Vector">
              <line
                x1={CX}
                y1={CY}
                x2={nx}
                y2={ny}
                stroke="#34D399"
                strokeWidth="2.4"
                strokeLinecap="round"
                opacity="0.95"
              />
              <circle cx={nx} cy={ny} r="3.4" fill="#34D399" />
              <circle
                cx={nx}
                cy={ny}
                r="5.2"
                fill="none"
                stroke="#34D399"
                strokeWidth="0.7"
                opacity="0.45"
              />
            </g>

            {blips.map((b) => {
              const selected =
                selectedRowId === b.row.id || selectedRowId === b.row.fileId;
              const dimmed = Boolean(activeQuadrant && activeQuadrant !== b.q);
              const r = selected ? 4.2 : blips.length > 80 ? 1.9 : 2.55;
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
                    opacity={dimmed && !selected ? 0.22 : 0.96}
                    stroke={selected ? "#fff" : "rgba(15,23,42,0.55)"}
                    strokeWidth={selected ? 1.15 : 0.35}
                  />
                  {b.row.workedToday ? (
                    <g
                      transform={`translate(${b.x + 3.2}, ${b.y - 4.2})`}
                      aria-label="Meaningful work completed today"
                    >
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
              stroke="rgba(52,211,153,0.4)"
              strokeWidth="1.1"
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
                <dt className="text-muted-foreground">Status</dt>
                <dd className="text-right font-medium text-emerald-300">
                  {blipHover.row.quadrantLabel}
                </dd>
                <dt className="text-muted-foreground">Daily work</dt>
                <dd className="text-right font-medium">
                  {blipHover.row.workedToday ? "✓ Worked today" : "Not yet today"}
                </dd>
              </dl>
            </div>
          ) : null}
        </div>

        {/* Right — Follow-up Required */}
        <div className="col-start-3 row-start-2 flex max-w-[4.5rem] flex-col items-center justify-center gap-1.5 self-center md:max-w-none md:gap-2">
          <p className={cn(quadrantLabelClass, "text-sky-400")}>
            Follow-up
            <br />
            Required
          </p>
          <OperationalMovementFeed
            destination="follow_up_required"
            events={movements}
            compact
            className="hidden md:block"
          />
        </div>

        {/* Bottom — At Risk; feed overlays gap above label */}
        <div className="relative col-start-2 row-start-3 flex flex-col items-center">
          <div className="pointer-events-none absolute bottom-full left-1/2 z-[5] mb-0.5 hidden -translate-x-1/2 md:block">
            <OperationalMovementFeed destination="at_risk" events={movements} />
          </div>
          <p className={cn(quadrantLabelClass, "text-rose-400")}>At Risk</p>
        </div>
      </div>
    </div>
  );
}
