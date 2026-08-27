"use client";

import { useMemo } from "react";
import {
  CHANAKYA_RADAR_STATUS_CARD_META,
  type ChanakyaOperationalQuadrantId,
} from "@/constants/chanakya-radar";
import type { ChanakyaRadarDealRow } from "@/lib/chanakya-radar/derive-dashboard";
import { cn } from "@/lib/utils";

const STYLE_ID = "co-radar-003-status-scroll-keyframes";

/** Continuous bottom→top loop duration (ms) — scales gently with list length. */
function scrollDurationMs(count: number): number {
  const n = Math.max(count, 1);
  return Math.min(48_000, Math.max(14_000, n * 3_200));
}

function ensureKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes co-radar-003-status-rise {
      0% { transform: translate3d(0, 0, 0); }
      100% { transform: translate3d(0, -50%, 0); }
    }
  `;
  document.head.appendChild(style);
}

function StatusRow({
  row,
  selected,
  onHover,
  onLeave,
  onClick,
}: {
  row: ChanakyaRadarDealRow;
  selected: boolean;
  onHover: (row: ChanakyaRadarDealRow) => void;
  onLeave: () => void;
  onClick: (row: ChanakyaRadarDealRow) => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "group relative w-full rounded-md px-1.5 py-1 text-left transition-colors",
        "hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500/50",
        selected && "bg-white/[0.08]",
      )}
      onMouseEnter={() => onHover(row)}
      onMouseLeave={onLeave}
      onFocus={() => onHover(row)}
      onBlur={onLeave}
      onClick={() => onClick(row)}
      aria-label={`Open Deal Workspace for ${row.borrower || row.dealId}`}
    >
      <p className="truncate text-[11px] font-semibold leading-tight tracking-tight text-zinc-50">
        {row.borrower?.trim() || "Borrower not specified"}
      </p>
      <p className="mt-0.5 truncate font-mono text-[9px] leading-tight text-zinc-400">
        {row.opportunityNumber?.trim() || row.dealId}
      </p>
      <p className="mt-0.5 truncate text-[8px] leading-tight text-zinc-500">
        {row.product}
        {row.lender && row.lender !== "—" ? ` · ${row.lender}` : ""}
      </p>
      <p className="mt-0.5 truncate text-[8px] font-medium uppercase tracking-wide text-zinc-400">
        {row.stageLabel}
      </p>
    </button>
  );
}

interface RadarStatusScrollCardProps {
  quadrant: ChanakyaOperationalQuadrantId;
  rows: ChanakyaRadarDealRow[];
  selectedRowId?: string | null;
  onRowClick: (row: ChanakyaRadarDealRow) => void;
  onRowHover: (row: ChanakyaRadarDealRow) => void;
  onRowLeave: () => void;
  hoveredRowId?: string | null;
  className?: string;
}

/**
 * CO-CHANAKYA-RADAR-003 — Outside premium glass status card.
 * Continuous bottom→top auto-scroll · no scrollbar · no manual scroll.
 */
export function RadarStatusScrollCard({
  quadrant,
  rows,
  selectedRowId = null,
  onRowClick,
  onRowHover,
  onRowLeave,
  className,
}: RadarStatusScrollCardProps) {
  ensureKeyframes();
  const meta = CHANAKYA_RADAR_STATUS_CARD_META[quadrant];

  /** Oldest first so newest enters from bottom as the strip rises. */
  const ordered = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const ta = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
        const tb = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
        return ta - tb;
      }),
    [rows],
  );

  const loop = ordered.length > 0 ? [...ordered, ...ordered] : [];
  const duration = scrollDurationMs(ordered.length);
  const animate = ordered.length > 1;

  return (
    <div
      className={cn(
        "flex w-[9.75rem] flex-col overflow-hidden rounded-xl border bg-zinc-950/55 shadow-[0_8px_28px_rgba(0,0,0,0.35)] backdrop-blur-md md:w-[11rem]",
        meta.borderClass,
        className,
      )}
      aria-label={`${meta.title} active deals`}
    >
      <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-2 py-1.5">
        <span className="text-[10px]" aria-hidden>
          {meta.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-[9px] font-semibold uppercase tracking-[0.12em]",
              meta.accentClass,
            )}
          >
            {meta.title}
          </p>
          <p className="text-[8px] tabular-nums text-zinc-500">{ordered.length} active</p>
        </div>
      </div>

      <div className="relative h-[7.5rem] overflow-hidden md:h-[8.25rem]">
        {ordered.length === 0 ? (
          <p className="px-2 py-3 text-center text-[9px] text-zinc-600">No active deals</p>
        ) : (
          <div
            className="will-change-transform"
            style={
              animate
                ? {
                    animation: `co-radar-003-status-rise ${duration}ms linear infinite`,
                  }
                : undefined
            }
          >
            {loop.map((row, idx) => (
              <div key={`${row.id}-${idx}`} className="border-b border-white/[0.03]">
                <StatusRow
                  row={row}
                  selected={selectedRowId === row.id || selectedRowId === row.fileId}
                  onHover={onRowHover}
                  onLeave={onRowLeave}
                  onClick={onRowClick}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
