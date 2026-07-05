"use client";

import { Suspense } from "react";
import { LoanFilesWorkspace } from "@/components/catalyst-one/loan-files/loan-files-workspace";

export default function LoanFilesPage() {
  return (
    <Suspense fallback={null}>
      <LoanFilesWorkspace />
    </Suspense>
  );
}
