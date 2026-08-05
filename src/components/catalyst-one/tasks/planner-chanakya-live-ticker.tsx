"use client";

/**
 * CO-TASKS-PLANNER-002 — Compact CHANAKYA LIVE ticker for Planner workspace.
 * Single horizontal strip · continuous scroll · no flash.
 */

import { useEffect } from "react";
import type { PlannerChanakyaLiveItem } from "@/lib/enterprise-planner/chanakya-live-ticker";
import { cn } from "@/lib/utils";

const STYLE_ID = "co-tasks-planner-002-chanakya-live-keyframes";

function ensureKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes co-planner-chanakya-live-scroll {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    @media (prefers-reduced-motion: reduce) {
      .co-planner-chanakya-track {
        animation: none !important;
        transform: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function Segment({ items, keyPrefix }: { items: PlannerChanakyaLiveItem[]; keyPrefix: string }) {
  return (
    <>
      {items.map((item) => (
        <span
          key={`${keyPrefix}-${item.id}`}
          className="inline-flex max-w-[min(420px,70vw)] shrink-0 items-baseline gap-1.5 px-4"
        >
          <span
            className={cn(
              "truncate text-[12px] font-semibold",
              item.priority === "critical" && "text-rose-200",
              item.priority === "action" && "text-amber-100",
              item.priority === "info" && "text-slate-100",
            )}
          >
            {item.subject}
          </span>
          <span className="shrink-0 text-[11px] text-teal-400/90" aria-hidden>
            →
          </span>
          <span className="truncate text-[11px] text-slate-400">{item.attention}</span>
          <span className="mx-1 shrink-0 text-white/15" aria-hidden>
            ·
          </span>
        </span>
      ))}
    </>
  );
}

export function PlannerChanakyaLiveTicker({
  items,
  className,
}: {
  items: PlannerChanakyaLiveItem[];
  className?: string;
}) {
  useEffect(() => {
    ensureKeyframes();
  }, []);

  const safe =
    items.length > 0
      ? items
      : [
          {
            id: "idle",
            subject: "CHANAKYA",
            attention: "No urgent planner attention right now — calendar is clear for focused work.",
            priority: "info" as const,
          },
        ];

  // Duplicate for seamless loop
  const durationSec = Math.max(28, safe.length * 7);

  return (
    <div
      className={cn(
        "flex h-9 min-h-9 items-center gap-2 overflow-hidden rounded-md border border-teal-500/25 bg-[#0a1520]",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label="CHANAKYA LIVE operational ticker"
    >
      <div className="flex shrink-0 items-center gap-1.5 border-r border-white/10 px-2.5 py-1">
        <span className="text-[10px] leading-none" aria-hidden>
          🟢
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-teal-300">
          CHANAKYA LIVE
        </span>
      </div>
      <div className="relative min-w-0 flex-1 overflow-hidden">
        <div
          className="co-planner-chanakya-track flex w-max whitespace-nowrap"
          style={{
            animation: `co-planner-chanakya-live-scroll ${durationSec}s linear infinite`,
          }}
        >
          <Segment items={safe} keyPrefix="a" />
          <Segment items={safe} keyPrefix="b" />
        </div>
      </div>
    </div>
  );
}
