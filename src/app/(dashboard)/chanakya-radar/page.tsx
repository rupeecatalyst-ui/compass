"use client";

import { Suspense } from "react";
import { ChanakyaRadarWorkspace } from "@/components/catalyst-one/chanakya-radar";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";

export default function ChanakyaRadarPage() {
  return (
    <Suspense
      fallback={
        <ChanakyaLoadingExperience
          module="mission-control"
          statusLabel="Preparing CHANAKYA Radar..."
          density="panel"
        />
      }
    >
      <ChanakyaRadarWorkspace />
    </Suspense>
  );
}
