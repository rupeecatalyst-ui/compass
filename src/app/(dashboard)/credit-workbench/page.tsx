"use client";

import { Suspense } from "react";
import { EnterpriseCreditWorkspace } from "@/components/catalyst-one/enterprise-credit-workspace";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";

export default function CreditWorkbenchPage() {
  return (
    <Suspense
      fallback={
        <ChanakyaLoadingExperience
          module="credit"
          statusLabel="Opening Credit Workbench…"
        />
      }
    >
      <EnterpriseCreditWorkspace />
    </Suspense>
  );
}
