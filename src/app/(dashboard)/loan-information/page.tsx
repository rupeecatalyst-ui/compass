"use client";

import { Suspense } from "react";
import { LoanInformationWorkspace } from "@/components/catalyst-one/loan-files/loan-information-workspace";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";

export default function LoanInformationPage() {
  return (
    <Suspense
      fallback={
        <ChanakyaLoadingExperience
          module="loan-journey"
          statusLabel="Preparing Loan Information..."
          density="panel"
        />
      }
    >
      <LoanInformationWorkspace />
    </Suspense>
  );
}
