"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ROUTES } from "@/constants/routes";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";

/** Backward compatible: /documents → Document Workspace (preserve query). */
function DocumentsRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const q = searchParams.toString();
    router.replace(q ? `${ROUTES.DOCUMENT_WORKSPACE}?${q}` : ROUTES.DOCUMENT_WORKSPACE);
  }, [router, searchParams]);

  return (
    <ChanakyaLoadingExperience
      module="documents"
      statusLabel="Opening Document Workspace…"
    />
  );
}

export default function DocumentsPage() {
  return (
    <Suspense
      fallback={
        <ChanakyaLoadingExperience
          module="documents"
          statusLabel="Opening Document Center…"
        />
      }
    >
      <DocumentsRedirectInner />
    </Suspense>
  );
}
