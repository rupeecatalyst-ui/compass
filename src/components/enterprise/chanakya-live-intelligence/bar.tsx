"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import {
  buildChanakyaLiveIntelligenceMessages,
  resolveChanakyaLiveEntityFromLocation,
  resolveChanakyaLiveIntelligenceWorkspace,
} from "@/lib/chanakya-live-intelligence";
import {
  hydrateLiveOpportunities,
} from "@/lib/chanakya-live-intelligence/live-ssot";
import {
  hydrateRadarDealFiles,
  subscribeRadarDealSource,
} from "@/lib/chanakya-radar/radar-deal-source";
import { subscribeOpportunitiesUpdated } from "@/lib/enterprise-opportunity/opportunity-data-sync";
import { cn } from "@/lib/utils";
import type { ChanakyaLiveIntelligenceMessage } from "@/types/chanakya-live-intelligence";

const TICKER_STYLE_ID = "eux007-chanakya-live-intelligence-keyframes";

function ensureTickerKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(TICKER_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = TICKER_STYLE_ID;
  style.textContent = `
    @keyframes eux007-chanakya-ticker-scroll {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
  `;
  document.head.appendChild(style);
}

function readLocationSearch(): string {
  if (typeof window === "undefined") return "";
  return window.location.search.replace(/^\?/, "");
}

function useLiveIntelligenceMessages(
  messagesProp: ChanakyaLiveIntelligenceMessage[] | undefined,
  pathname: string,
) {
  const [tick, setTick] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (messagesProp) return;
    let cancelled = false;
    const bump = () => {
      if (!cancelled) {
        setSearch(readLocationSearch());
        setTick((t) => t + 1);
      }
    };

    setSearch(readLocationSearch());

    // CO-CHANAKYA-007 — hydrate live Deal + Opportunity registries before advising.
    void hydrateRadarDealFiles().then(bump).catch(() => bump());
    void hydrateLiveOpportunities().then(bump).catch(() => bump());

    const unsubDeals = subscribeRadarDealSource(bump);
    const unsubOpps = subscribeOpportunitiesUpdated(bump);
    window.addEventListener("storage", bump);
    window.addEventListener("popstate", bump);
    const interval = window.setInterval(bump, 60_000);
    return () => {
      cancelled = true;
      unsubDeals();
      unsubOpps();
      window.removeEventListener("storage", bump);
      window.removeEventListener("popstate", bump);
      window.clearInterval(interval);
    };
  }, [messagesProp, pathname]);

  return useMemo(() => {
    if (messagesProp) return messagesProp;
    void tick;
    const workspace = resolveChanakyaLiveIntelligenceWorkspace(pathname);
    const entity = resolveChanakyaLiveEntityFromLocation(pathname, search);
    return buildChanakyaLiveIntelligenceMessages(workspace, { entity });
  }, [messagesProp, pathname, search, tick]);
}

/**
 * EUX-007 — CHANAKYA Live Intelligence Bar (Enterprise Header).
 * Single reusable component. Passive ticker; detail via CHANAKYA AI button.
 * CO-CHANAKYA-007 — messages hydrate from live Enterprise SSOTs only.
 */
export function ChanakyaLiveIntelligenceBar({
  messages: messagesProp,
  appearance = "dashboard",
  className,
}: {
  /** Optional override — otherwise messages resolve from the current route. */
  messages?: ChanakyaLiveIntelligenceMessage[];
  appearance?: "dashboard" | "mission-control";
  className?: string;
}) {
  const pathname = usePathname() || "/";
  const messages = useLiveIntelligenceMessages(messagesProp, pathname);
  const [paused, setPaused] = useState(false);
  const mc = appearance === "mission-control";

  useEffect(() => {
    ensureTickerKeyframes();
  }, []);

  return (
    <>
      {/* Mobile — compact indicator; full feed via CHANAKYA AI button */}
      <div
        title="CHANAKYA Live Intelligence — open CHANAKYA AI for full feed"
        aria-label="CHANAKYA live intelligence active"
        className={cn(
          "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2 md:hidden",
          mc
            ? "border-violet-500/35 bg-violet-950/40 text-violet-200"
            : "border-violet-500/30 bg-violet-500/10 text-violet-800 dark:text-violet-200",
          className,
        )}
      >
        <Sparkles className="h-3.5 w-3.5" />
        <span className="text-[10px] font-bold uppercase tracking-wider">Live</span>
      </div>

      {/* Tablet + desktop — single-line scrolling ticker */}
      <div
        className={cn(
          "hidden min-w-0 flex-1 items-center gap-2 overflow-hidden md:flex",
          "h-8 rounded-md border px-2.5",
          mc
            ? "border-violet-500/30 bg-violet-950/35"
            : "border-violet-500/25 bg-violet-500/5 dark:border-violet-500/30 dark:bg-violet-950/30",
          className,
        )}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        aria-label="CHANAKYA live operational intelligence"
        role="status"
      >
        <Sparkles
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            mc ? "text-violet-300" : "text-violet-600 dark:text-violet-300",
          )}
        />
        <span
          className={cn(
            "hidden shrink-0 text-[9px] font-bold uppercase tracking-[0.14em] lg:inline",
            mc ? "text-violet-200/90" : "text-violet-700 dark:text-violet-200/90",
          )}
        >
          CHANAKYA
        </span>
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <div
            className="pointer-events-none flex w-max max-w-none select-none items-center gap-6 whitespace-nowrap"
            style={
              paused
                ? undefined
                : { animation: "eux007-chanakya-ticker-scroll 42s linear infinite" }
            }
          >
            {messages.map((item) => (
              <span
                key={item.id}
                className={cn(
                  "text-[12px] font-medium md:text-[13px]",
                  item.tone === "danger" && (mc ? "text-rose-300" : "text-rose-600 dark:text-rose-300"),
                  item.tone === "warning" && (mc ? "text-amber-300" : "text-amber-700 dark:text-amber-300"),
                  item.tone === "success" && (mc ? "text-emerald-300" : "text-emerald-700 dark:text-emerald-300"),
                  item.tone === "info" && (mc ? "text-sky-300" : "text-sky-700 dark:text-sky-300"),
                  item.tone === "default" && (mc ? "text-zinc-200" : "text-foreground/85"),
                )}
              >
                <span className={cn("mr-2", mc ? "text-zinc-600" : "text-muted-foreground/50")} aria-hidden>
                  ·
                </span>
                {item.text}
              </span>
            ))}
          </div>
          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 w-5 bg-gradient-to-r to-transparent",
              mc ? "from-violet-950/90" : "from-background dark:from-violet-950/80",
            )}
          />
          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 right-0 w-5 bg-gradient-to-l to-transparent",
              mc ? "from-violet-950/90" : "from-background dark:from-violet-950/80",
            )}
          />
        </div>
      </div>
    </>
  );
}
