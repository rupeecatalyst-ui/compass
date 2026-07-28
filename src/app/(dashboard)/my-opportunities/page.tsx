"use client";

import { Suspense } from "react";
import { MyOpportunitiesWorkspace } from "@/components/catalyst-one/my-opportunities";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";

export default function MyOpportunitiesPage() {
  return (
    <Suspense
      fallback={
        <ChanakyaLoadingExperience
          module="my-opportunities"
          statusLabel="Loading Opportunities..."
          density="panel"
        />
      }
    >
      <MyOpportunitiesWorkspace />
    </Suspense>
  );
}
