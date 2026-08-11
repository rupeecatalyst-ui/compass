import { Suspense } from "react";
import { LenderWorkspacePageRedirect } from "@/components/catalyst-one/enterprise-lender-directory/lender-workspace-page-redirect";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";

type PageProps = {
  params: Promise<{ lenderId: string }>;
};

/**
 * CO-LENDER-WORKSPACE-001 — route preserves `/lenders/[lenderId]/workspace`
 * but activates the canonical Directory Lender Workspace slide-over.
 */
export default async function LenderWorkspacePage({ params }: PageProps) {
  const { lenderId } = await params;

  return (
    <Suspense
      fallback={
        <ChanakyaLoadingExperience
          module="lenders"
          statusLabel="Opening lender workspace…"
          density="panel"
        />
      }
    >
      <LenderWorkspacePageRedirect lenderId={lenderId} />
    </Suspense>
  );
}
