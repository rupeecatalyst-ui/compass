"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import type {
  ChanakyaRadarDealRow,
  ChanakyaRadarIntelligenceItem,
} from "@/lib/chanakya-radar/derive-dashboard";
import { cn } from "@/lib/utils";

export interface ChanakyaIntelligenceFeedItem {
  id: string;
  text: string;
  tone: "danger" | "warning" | "success" | "info" | "default";
}

function buildFeedItems(
  rows: ChanakyaRadarDealRow[],
  intelligence: ChanakyaRadarIntelligenceItem[],
): ChanakyaIntelligenceFeedItem[] {
  const items: ChanakyaIntelligenceFeedItem[] = [];

  const atRisk = rows
    .filter((r) => r.quadrant === "at_risk")
    .sort((a, b) => b.daysInStage - a.daysInStage);
  for (const r of atRisk.slice(0, 4)) {
    items.push({
      id: `risk-${r.id}`,
      text: `${r.borrower} requires immediate attention.`,
      tone: "danger",
    });
  }

  const sla = rows.filter((r) => r.idleDays >= 7 || r.daysInStage >= 14).length;
  if (sla > 0) {
    items.push({
      id: "sla",
      text: `${sla} opportunit${sla === 1 ? "y has" : "ies have"} crossed SLA.`,
      tone: "danger",
    });
  }

  const followUp = rows.filter((r) => r.quadrant === "follow_up_required").length;
  if (followUp > 0) {
    items.push({
      id: "fu",
      text: `${followUp} case${followUp === 1 ? "" : "s"} need follow-up today.`,
      tone: "warning",
    });
  }

  const docs = rows.filter((r) => r.pendingDocs > 0).length;
  if (docs > 0) {
    items.push({
      id: "docs",
      text: `${docs} file${docs === 1 ? "" : "s"} awaiting document action.`,
      tone: "warning",
    });
  }

  const worked = rows.filter((r) => r.workedToday).length;
  if (worked > 0) {
    items.push({
      id: "worked",
      text: `${worked} opportunit${worked === 1 ? "y was" : "ies were"} worked today.`,
      tone: "success",
    });
  }

  const rmAction = rows.filter(
    (r) => r.openTasks > 0 && (r.quadrant === "at_risk" || r.quadrant === "needs_attention"),
  ).length;
  if (rmAction > 0) {
    items.push({
      id: "rm",
      text: `${rmAction} file${rmAction === 1 ? " is" : "s are"} awaiting RM action.`,
      tone: "info",
    });
  }

  for (const intel of intelligence.slice(0, 3)) {
    items.push({
      id: `intel-${intel.id}`,
      text: `${intel.label}: ${intel.value}`,
      tone: (intel.tone as ChanakyaIntelligenceFeedItem["tone"]) ?? "default",
    });
  }

  if (items.length === 0) {
    items.push({
      id: "empty",
      text: "Portfolio is quiet — no urgent operational signals right now.",
      tone: "success",
    });
  }

  // Duplicate for seamless horizontal marquee
  return [...items, ...items.map((i) => ({ ...i, id: `${i.id}-loop` }))];
}

/**
 * Compact centre ticker — minimal vertical footprint so Radar stays hero.
 */
export function ChanakyaRadarIntelligenceFeed({
  rows,
  intelligence,
}: {
  rows: ChanakyaRadarDealRow[];
  intelligence: ChanakyaRadarIntelligenceItem[];
}) {
  const items = useMemo(() => buildFeedItems(rows, intelligence), [rows, intelligence]);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("chanakya-ticker-keyframes")) return;
    const style = document.createElement("style");
    style.id = "chanakya-ticker-keyframes";
    style.textContent = `
      @keyframes chanakya-ticker-scroll {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <div
      className="mx-auto flex w-full max-w-3xl items-center gap-2 rounded-full border border-violet-500/30 bg-violet-950/40 px-3 py-1.5 shadow-sm shadow-violet-950/20"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="CHANAKYA operational intelligence ticker"
    >
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-300" />
      <span className="hidden shrink-0 text-[9px] font-bold uppercase tracking-[0.14em] text-violet-200/90 sm:inline">
        CHANAKYA
      </span>
      <div className="relative min-w-0 flex-1 overflow-hidden">
        <div
          className="flex w-max items-center gap-6 whitespace-nowrap"
          style={
            paused
              ? undefined
              : { animation: "chanakya-ticker-scroll 40s linear infinite" }
          }
        >
          {items.map((item) => (
            <span
              key={item.id}
              className={cn(
                "text-[12px] font-medium md:text-[13px]",
                item.tone === "danger" && "text-rose-300",
                item.tone === "warning" && "text-amber-300",
                item.tone === "success" && "text-emerald-300",
                item.tone === "info" && "text-sky-300",
                item.tone === "default" && "text-foreground/90",
              )}
            >
              <span className="mr-2 text-zinc-600" aria-hidden>
                ·
              </span>
              {item.text}
            </span>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-violet-950/80 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-violet-950/80 to-transparent" />
      </div>
    </div>
  );
}
