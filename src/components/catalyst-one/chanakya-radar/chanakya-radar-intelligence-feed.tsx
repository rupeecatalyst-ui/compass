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

  for (const intel of intelligence.slice(0, 4)) {
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

  return [...items, ...items.map((i) => ({ ...i, id: `${i.id}-loop` }))];
}

/**
 * CO-SPRINT-104 — Live scrolling CHANAKYA operational intelligence feed.
 * Guidance only — does not open the AI conversation.
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
    if (document.getElementById("chanakya-feed-keyframes")) return;
    const style = document.createElement("style");
    style.id = "chanakya-feed-keyframes";
    style.textContent = `
      @keyframes chanakya-feed-scroll {
        0% { transform: translateY(0); }
        100% { transform: translateY(-50%); }
      }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-violet-500/25 bg-gradient-to-r from-violet-950/40 via-zinc-950/80 to-zinc-950/60"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="CHANAKYA operational intelligence feed"
    >
      <div className="flex items-center gap-2 border-b border-violet-500/20 px-3 py-1.5">
        <Sparkles className="h-3.5 w-3.5 text-violet-300" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-200/90">
          CHANAKYA · Live Operational Feed
        </p>
        <span className="ml-auto text-[9px] text-muted-foreground">Hover to pause</span>
      </div>
      <div className="relative h-[4.25rem] overflow-hidden">
        <div
          className={cn("flex flex-col gap-2 px-3 py-2")}
          style={
            paused
              ? undefined
              : { animation: "chanakya-feed-scroll 28s linear infinite" }
          }
        >
          {items.map((item) => (
            <p
              key={item.id}
              className={cn(
                "text-[13px] font-medium leading-snug md:text-[14px]",
                item.tone === "danger" && "text-rose-300",
                item.tone === "warning" && "text-amber-300",
                item.tone === "success" && "text-emerald-300",
                item.tone === "info" && "text-sky-300",
                item.tone === "default" && "text-foreground/90",
              )}
            >
              {item.text}
            </p>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-zinc-950/90 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-zinc-950/90 to-transparent" />
      </div>
    </div>
  );
}
