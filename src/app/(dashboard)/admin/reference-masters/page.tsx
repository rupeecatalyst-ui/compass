"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ReferenceMasterAdminWorkspace } from "@/components/catalyst-one/reference-master-admin";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";
import type { ReferenceMasterDomainCode } from "@/constants/enterprise-master-data";
import { REFERENCE_MASTER_DOMAINS } from "@/constants/enterprise-master-data";

function ReferenceMastersInner() {
  const params = useSearchParams();
  const raw = params.get("domain");
  const initialDomain =
    raw && (REFERENCE_MASTER_DOMAINS as readonly string[]).includes(raw)
      ? (raw as ReferenceMasterDomainCode)
      : undefined;

  return <ReferenceMasterAdminWorkspace initialDomain={initialDomain} />;
}

export default function AdminReferenceMastersPage() {
  return (
    <Suspense
      fallback={
        <ChanakyaLoadingExperience
          module="administration"
          statusLabel="Preparing Lookup Masters..."
          density="panel"
        />
      }
    >
      <ReferenceMastersInner />
    </Suspense>
  );
}
