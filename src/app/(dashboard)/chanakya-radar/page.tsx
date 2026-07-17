"use client";

import { Suspense } from "react";
import { ChanakyaRadarWorkspace } from "@/components/catalyst-one/chanakya-radar";

export default function ChanakyaRadarPage() {
  return (
    <Suspense
      fallback={<div className="p-6 text-sm text-muted-foreground">Loading CHANAKYA Radar…</div>}
    >
      <ChanakyaRadarWorkspace />
    </Suspense>
  );
}
