"use client";

import { Suspense } from "react";
import { LoanInformationWorkspace } from "@/components/catalyst-one/loan-files/loan-information-workspace";

export default function LoanInformationPage() {
  return (
    <Suspense fallback={null}>
      <LoanInformationWorkspace />
    </Suspense>
  );
}
