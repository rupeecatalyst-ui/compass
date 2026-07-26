"use client";

import { Suspense } from "react";
import { DealWorkspaceHost } from "@/components/catalyst-one/deal-workspace/deal-workspace-host";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";

export default function DealWorkspacePage() {
  return (
    <Suspense
      fallback={
        <ChanakyaLoadingExperience
          module="deal"
          statusLabel="Opening Deal Workspace…"
        />
      }
    >
      <DealWorkspaceHost />
    </Suspense>
  );
}
