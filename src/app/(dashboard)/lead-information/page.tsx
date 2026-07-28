"use client";

import { Suspense } from "react";
import { LeadInformationWorkspace } from "@/components/catalyst-one/lead-information/lead-information-workspace";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";

export default function LeadInformationPage() {
  return (
    <Suspense
      fallback={
        <ChanakyaLoadingExperience
          module="opportunity"
          statusLabel="Preparing Lead Information..."
          density="panel"
        />
      }
    >
      <LeadInformationWorkspace />
    </Suspense>
  );
}
