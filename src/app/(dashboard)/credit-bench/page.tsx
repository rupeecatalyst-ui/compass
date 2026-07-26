"use client";

import { Suspense } from "react";
import { CreditBenchWorkspace } from "@/components/catalyst-one/credit-bench/credit-bench-workspace";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";

export default function CreditBenchPage() {
  return (
    <Suspense
      fallback={
        <ChanakyaLoadingExperience
          module="opportunity"
          statusLabel="Opening Opportunity Setup…"
        />
      }
    >
      <CreditBenchWorkspace />
    </Suspense>
  );
}
