import { Suspense } from "react";
import { ExecutiveIntelligenceWorkspace } from "@/components/catalyst-one/executive-intelligence";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <ChanakyaLoadingExperience
          module="reports"
          statusLabel="Preparing Executive Intelligence..."
          density="panel"
        />
      }
    >
      <ExecutiveIntelligenceWorkspace />
    </Suspense>
  );
}
