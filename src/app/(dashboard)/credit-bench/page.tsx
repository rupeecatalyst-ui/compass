"use client";

import { Suspense } from "react";
import { CreditBenchWorkspace } from "@/components/catalyst-one/credit-bench/credit-bench-workspace";

export default function CreditBenchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
        </div>
      }
    >
      <CreditBenchWorkspace />
    </Suspense>
  );
}
