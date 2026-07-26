"use client";

import { Suspense } from "react";
import { DocumentCenterWorkspace } from "@/components/catalyst-one/document-center/document-center-workspace";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";

export default function DocumentCenterPage() {
  return (
    <Suspense
      fallback={
        <ChanakyaLoadingExperience
          module="documents"
          statusLabel="Opening Document Center…"
        />
      }
    >
      <DocumentCenterWorkspace />
    </Suspense>
  );
}
