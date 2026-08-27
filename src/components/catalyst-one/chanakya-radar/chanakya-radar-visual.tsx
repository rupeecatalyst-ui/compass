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
import { RadarStatusScrollCard } from "@/components/catalyst-one/chanakya-radar/radar-status-scroll-card";
import { cn } from "@/lib/utils";

interface ChanakyaRadarVisualProps {
  vector: OperationalVectorResult;
  rows: ChanakyaRadarDealRow[];
  activeQuadrant: ChanakyaOperationalQuadrantId | null;
  onQuadrantClick: (id: ChanakyaOperationalQuadrantId) => void;
  selectedRowId?: string | null;
  onBlipClick?: (row: ChanakyaRadarDealRow) => void;
  onBlipDoubleClick?: (row: ChanakyaRadarDealRow) => void;
  onDealOpen?: (row: ChanakyaRadarDealRow) => void;
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

function DealInsightPanel({ row }: { row: ChanakyaRadarDealRow }) {
  return (
    <div className="w-[240px] rounded-lg border border-zinc-600/80 bg-zinc-950/98 px-3 py-2 text-left shadow-2xl backdrop-blur">
      <p className="truncate text-[12px] font-semibold tracking-tight text-zinc-50">
        {row.borrower?.trim() || "Borrower not specified"}
      </p>
      <p className="mt-0.5 truncate font-mono text-[10px] text-zinc-400">
        {row.opportunityNumber?.trim() || row.dealId}
      </p>
      <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[10px] leading-snug">
        <dt className="text-zinc-500">Product</dt>
        <dd className="truncate text-right text-zinc-200">{row.product}</dd>
        <dt className="text-zinc-500">Lender</dt>
        <dd className="truncate text-right text-zinc-200">{row.lender}</dd>
        <dt className="text-zinc-500">Stage</dt>
        <dd className="truncate text-right text-zinc-200">{row.stageLabel}</dd>
        <dt className="text-zinc-500">Sub Stage</dt>
        <dd className="truncate text-right text-zinc-200">{row.subStageLabel || "—"}</dd>
        <dt className="text-zinc-500">Days in Stage</dt>
        <dd className="text-right tabular-nums text-zinc-200">{row.daysInStage}d</dd>
        <dt className="text-zinc-500">Deal Health</dt>
        <dd className="text-right tabular-nums text-emerald-300">{row.dealHealthScore}</dd>
        <dt className="text-zinc-500">Classification</dt>
        <dd className="truncate text-right font-medium text-zinc-100">{row.quadrantLabel}</dd>
        <dt className="text-zinc-500">Reason</dt>
        <dd className="text-right text-zinc-300">{row.classificationReason}</dd>
        <dt className="text-zinc-500">CHANAKYA</dt>
        <dd className="text-right text-sky-300/95">{row.recommendation}</dd>
      </dl>
    </div>
  );
}

/**
 * CO-CHANAKYA-RADAR-003 — Enterprise Deal Radar visualisation.
 * Active Deals only · outside glass status cards · Average Deal Health centre.
 */
export function ChanakyaRadarVisual({
  vector,
  rows,
  activeQuadrant,
  onQuadrantClick,
  selectedRowId = null,
  onBlipClick,
  onBlipDoubleClick,
  onDealOpen,
}: ChanakyaRadarVisualProps) {
  const [displayBearing, setDisplayBearing] = useState(vector.bearingDeg);
  const [hoverRow, setHoverRow] = useState<ChanakyaRadarDealRow | null>(null);
  const [blipAnchor, setBlipAnchor] = useState<{ x: number; y: number } | null>(null);
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

  const blips = useMemo(() => placeChanakyaRadarBlips(rows), [rows]);
  const ringGuides = useMemo(() => chanakyaRadarRingGuideRadii(), []);

  const byQuadrant = useMemo(() => {
    const map: Record<ChanakyaOperationalQuadrantId, ChanakyaRadarDealRow[]> = {
      on_track: [],
      follow_up_required: [],
      needs_attention: [],
      at_risk: [],
    };
    for (const row of rows) map[row.quadrant].push(row);
    return map;
  }, [rows]);

  const needleLen = 62;
  const needleRad = ((displayBearing - 90) * Math.PI) / 180;
  const nx = CX + needleLen * Math.cos(needleRad);
  const ny = CY + needleLen * Math.sin(needleRad);

  const dialSizeClass =
    "size-[min(100%,min(calc(100vh-12rem),760px))] md:size-[min(calc(100vw-26rem),min(calc(100vh-12rem),760px))]";

  const openDeal = (row: ChanakyaRadarDealRow) => {
    onDealOpen?.(row);
  };

  const handleBlipActivate = (row: ChanakyaRadarDealRow) => {
    onBlipClick?.(row);
    openDeal(row);
  };

  return (
    <div className="mx-auto w-full max-w-[min(100%,1180px)]">
      <div
        className={cn(
          "grid w-full items-start justify-items-center gap-3",
          "grid-cols-1",
          "md:grid-cols-[minmax(9.75rem,11rem)_minmax(0,1fr)_minmax(9.75rem,11rem)]",
          "md:grid-rows-[auto_auto]",
          "md:gap-x-5 md:gap-y-4",
        )}
      >
        {/* Top Left — ON TRACK */}
        <div className="hidden md:flex md:col-start-1 md:row-start-1 md:justify-self-start">
          <RadarStatusScrollCard
            quadrant="on_track"
            rows={byQuadrant.on_track}
            selectedRowId={selectedRowId}
            hoveredRowId={hoverRow?.id ?? null}
            onRowClick={openDeal}
            onRowHover={(row) => {
              setHoverRow(row);
              setBlipAnchor(null);
            }}
            onRowLeave={() => {
              setHoverRow(null);
              setBlipAnchor(null);
            }}
          />
        </div>

        {/* Top Right — FOLLOW-UP REQUIRED */}
        <div className="hidden md:flex md:col-start-3 md:row-start-1 md:justify-self-end">
          <RadarStatusScrollCard
            quadrant="follow_up_required"
            rows={byQuadrant.follow_up_required}
            selectedRowId={selectedRowId}
            hoveredRowId={hoverRow?.id ?? null}
            onRowClick={openDeal}
            onRowHover={(row) => {
              setHoverRow(row);
              setBlipAnchor(null);
            }}
            onRowLeave={() => {
              setHoverRow(null);
              setBlipAnchor(null);
            }}
          />
        </div>

        {/* Dial — hero */}
        <div
          className={cn(
            "relative col-start-1 row-start-1 mx-auto aspect-square max-w-full md:col-start-2 md:row-span-2 md:row-start-1",
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
                      handleBlipActivate(b.row);
                      clickTimer.current = null;
                    }, 180);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (clickTimer.current) clearTimeout(clickTimer.current);
                    clickTimer.current = null;
                    onBlipDoubleClick?.(b.row);
                    if (!onBlipDoubleClick) openDeal(b.row);
                  }}
                  onMouseEnter={() => {
                    setHoverRow(b.row);
                    setBlipAnchor({ x: b.x, y: b.y });
                  }}
                  onMouseLeave={() => {
                    setHoverRow(null);
                    setBlipAnchor(null);
                  }}
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
              AVG DEAL HEALTH
            </text>
          </svg>

          {hoverRow && blipAnchor ? (
            <div
              className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[108%]"
              style={{
                left: `${(blipAnchor.x / 200) * 100}%`,
                top: `${(blipAnchor.y / 200) * 100}%`,
              }}
            >
              <DealInsightPanel row={hoverRow} />
            </div>
          ) : null}
        </div>

        {/* Bottom Left — NEEDS ATTENTION */}
        <div className="hidden md:flex md:col-start-1 md:row-start-2 md:justify-self-start md:self-end">
          <RadarStatusScrollCard
            quadrant="needs_attention"
            rows={byQuadrant.needs_attention}
            selectedRowId={selectedRowId}
            hoveredRowId={hoverRow?.id ?? null}
            onRowClick={openDeal}
            onRowHover={(row) => {
              setHoverRow(row);
              setBlipAnchor(null);
            }}
            onRowLeave={() => {
              setHoverRow(null);
              setBlipAnchor(null);
            }}
          />
        </div>

        {/* Bottom Right — AT RISK */}
        <div className="hidden md:flex md:col-start-3 md:row-start-2 md:justify-self-end md:self-end">
          <RadarStatusScrollCard
            quadrant="at_risk"
            rows={byQuadrant.at_risk}
            selectedRowId={selectedRowId}
            hoveredRowId={hoverRow?.id ?? null}
            onRowClick={openDeal}
            onRowHover={(row) => {
              setHoverRow(row);
              setBlipAnchor(null);
            }}
            onRowLeave={() => {
              setHoverRow(null);
              setBlipAnchor(null);
            }}
          />
        </div>

        {/* Tablet / narrow — compact 2×2 under dial */}
        <div className="grid w-full max-w-lg grid-cols-2 gap-2 md:hidden">
          {(
            [
              "on_track",
              "follow_up_required",
              "needs_attention",
              "at_risk",
            ] as ChanakyaOperationalQuadrantId[]
          ).map((q) => (
            <RadarStatusScrollCard
              key={q}
              quadrant={q}
              rows={byQuadrant[q]}
              selectedRowId={selectedRowId}
              className="w-full max-w-none"
              onRowClick={openDeal}
              onRowHover={(row) => {
                setHoverRow(row);
                setBlipAnchor(null);
              }}
              onRowLeave={() => {
                setHoverRow(null);
                setBlipAnchor(null);
              }}
            />
          ))}
        </div>
      </div>

      {/* Card-hover insight (outside dial — no overlap) */}
      {hoverRow && !blipAnchor ? (
        <div className="pointer-events-none mt-2 flex justify-center md:mt-3">
          <DealInsightPanel row={hoverRow} />
        </div>
      ) : null}
    </div>
  );
}
