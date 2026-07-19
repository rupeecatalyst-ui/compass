"use client";

import { Suspense } from "react";
import { ChanakyaRadarWorkspace } from "@/components/catalyst-one/chanakya-radar";

/**
 * CO-SPRINT-100 — Mission Control default landing = CHANAKYA Radar.
 * Matrix retired. Executive Briefing remains at /mission-control/executive-briefing.
 */
export default function MissionControlLandingPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-muted-foreground">Loading CHANAKYA Radar…</div>
      }
    >
      <ChanakyaRadarWorkspace />
    </Suspense>
  );
}
