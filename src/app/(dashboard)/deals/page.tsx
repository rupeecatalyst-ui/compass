"use client";

/**
 * CO-UX-002 — Bare `/deals` is not a workspace.
 * Registry-first: redirect to Enterprise Deal Registry (My Deals).
 * Deep links with ?dealId= / ?file= open Deal Workspace.
 */

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { buildDealWorkspaceHref } from "@/lib/loan-journey/adr-018-routing";

function DealsIndexRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const dealId = searchParams.get("dealId")?.trim() || null;
    const fileId = searchParams.get("file")?.trim() || null;
    const opportunityId = searchParams.get("opportunityId")?.trim() || null;
    const tab = searchParams.get("tab")?.trim() || null;
    const lenderId = searchParams.get("lenderId")?.trim() || null;

    if (dealId || fileId) {
      router.replace(
        buildDealWorkspaceHref({
          dealId,
          fileId,
          opportunityId,
          tab: tab || "lenders",
          lenderId,
        }),
      );
      return;
    }

    const filter = searchParams.get("filter")?.trim();
    if (filter) {
      router.replace(`${ROUTES.MY_DEALS}?filter=${encodeURIComponent(filter)}`);
      return;
    }
    if (opportunityId) {
      router.replace(
        `${ROUTES.MY_DEALS}?opportunityId=${encodeURIComponent(opportunityId)}`,
      );
      return;
    }
    router.replace(ROUTES.MY_DEALS);
  }, [router, searchParams]);

  return (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center text-xs text-muted-foreground">
      Opening Deal Registry…
    </div>
  );
}

export default function DealsIndexPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center text-xs text-muted-foreground">
          Opening Deal Registry…
        </div>
      }
    >
      <DealsIndexRedirectInner />
    </Suspense>
  );
}
