"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";
import { ROUTES } from "@/constants/routes";

type Props = {
  lenderId: string;
};

/**
 * CO-LENDER-WORKSPACE-001 — Single Implementation.
 * Full-page `/lenders/[id]/workspace` deep-links into Enterprise Lender Directory
 * slide-over (canonical operational workspace). Embedded Analyze Deal overlay
 * continues to use `EnterpriseLenderWorkspace` presentation="embedded".
 */
export function LenderWorkspacePageRedirect({ lenderId }: Props) {
  const router = useRouter();

  useEffect(() => {
    const id = decodeURIComponent(lenderId).trim();
    if (!id) {
      router.replace(ROUTES.LENDERS);
      return;
    }
    const qs = new URLSearchParams({ workspace: id });
    router.replace(`${ROUTES.LENDERS}?${qs.toString()}`);
  }, [lenderId, router]);

  return (
    <ChanakyaLoadingExperience
      module="lenders"
      statusLabel="Opening lender workspace…"
      density="panel"
    />
  );
}
