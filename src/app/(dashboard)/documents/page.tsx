"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ROUTES } from "@/constants/routes";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";

/** Backward compatible: /documents → Document Center (preserve query). */
function DocumentsRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const q = searchParams.toString();
    router.replace(q ? `${ROUTES.DOCUMENT_CENTER}?${q}` : ROUTES.DOCUMENT_CENTER);
  }, [router, searchParams]);

  return (
    <ChanakyaLoadingExperience
      module="documents"
      statusLabel="Opening Document Center…"
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
