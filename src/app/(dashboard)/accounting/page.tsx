import { Suspense } from "react";
import { AccountingWorkspace } from "@/components/catalyst-one/accounting";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";

/** CO-SPRINT-095 — Accounting Workspace & Invoice Management. */
export default function AccountingPage() {
  return (
    <Suspense
      fallback={
        <ChanakyaLoadingExperience
          module="accounting"
          statusLabel="Opening Accounting…"
          density="panel"
        />
      }
    >
      <AccountingWorkspace />
    </Suspense>
  );
}
