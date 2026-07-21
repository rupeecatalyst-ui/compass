"use client";

/**
 * @deprecated EUX-007 — use `ChanakyaLiveIntelligenceBar` from
 * `@/components/enterprise/chanakya-live-intelligence` instead.
 * Thin compatibility wrapper for Radar-era call sites.
 */

import { ChanakyaLiveIntelligenceBar } from "@/components/enterprise/chanakya-live-intelligence";
import {
  buildMissionControlLiveMessages,
} from "@/lib/chanakya-live-intelligence";
import type {
  ChanakyaRadarDealRow,
  ChanakyaRadarIntelligenceItem,
} from "@/lib/chanakya-radar/derive-dashboard";

export type { ChanakyaLiveIntelligenceMessage as ChanakyaIntelligenceFeedItem } from "@/types/chanakya-live-intelligence";

export function ChanakyaRadarIntelligenceFeed({
  rows,
  intelligence,
  variant = "inline",
  source = "props",
}: {
  rows?: ChanakyaRadarDealRow[];
  intelligence?: ChanakyaRadarIntelligenceItem[];
  variant?: "inline" | "header";
  source?: "props" | "live";
}) {
  const messages =
    source === "props" && rows
      ? buildMissionControlLiveMessages(rows, intelligence ?? [])
      : undefined;

  return (
    <ChanakyaLiveIntelligenceBar
      messages={messages}
      appearance={variant === "header" ? "mission-control" : "dashboard"}
      className={variant === "inline" ? "mx-auto max-w-3xl rounded-full" : undefined}
    />
  );
}
