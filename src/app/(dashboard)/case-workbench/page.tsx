"use client";

import { Suspense } from "react";
import { CaseWorkbench } from "@/components/catalyst-one/case-workbench/case-workbench";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";

export default function CaseWorkbenchPage() {
  return (
    <Suspense
      fallback={
        <ChanakyaLoadingExperience
          module="mission-control"
          statusLabel="Preparing Case Workbench..."
          density="panel"
        />
      }
    >
      <CaseWorkbench />
    </Suspense>
  );
}
