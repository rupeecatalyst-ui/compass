"use client";

import { Suspense } from "react";
import { DocumentWorkspace } from "@/components/catalyst-one/document-workspace/document-workspace";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";

export default function DocumentWorkspacePage() {
  return (
    <Suspense
      fallback={
        <ChanakyaLoadingExperience
          module="documents"
          statusLabel="Opening Document Workspace…"
        />
      }
    >
      <DocumentWorkspace />
    </Suspense>
  );
}
