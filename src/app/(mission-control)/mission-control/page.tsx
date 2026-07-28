"use client";

import { Suspense } from "react";
import { ChanakyaRadarWorkspace } from "@/components/catalyst-one/chanakya-radar";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";

/**
 * CO-SPRINT-100 — `/mission-control` remains CHANAKYA Radar inside the MC shell
 * (rail item + deep links). Primary sidebar "Mission Control" opens Executive Briefing.
 * Matrix retired.
 */
export default function MissionControlLandingPage() {
  return (
    <Suspense
      fallback={
        <ChanakyaLoadingExperience
          module="mission-control"
          surface="command"
          statusLabel="Preparing Mission Control..."
          density="panel"
        />
      }
    >
      <ChanakyaRadarWorkspace />
    </Suspense>
  );
}
