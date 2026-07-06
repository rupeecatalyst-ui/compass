"use client";

import { Suspense } from "react";
import { LoanBoardWorkspace } from "@/components/catalyst-one/loan-board/loan-board-workspace";

export default function PipelinePage() {
  return (
    <Suspense fallback={null}>
      <LoanBoardWorkspace />
    </Suspense>
  );
}
