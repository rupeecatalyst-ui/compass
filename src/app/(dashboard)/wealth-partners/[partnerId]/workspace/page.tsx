import { Suspense } from "react";
import { WealthPartnerWorkspace } from "@/components/catalyst-one/wealth-partner-registry";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";

type Props = { params: Promise<{ partnerId: string }> };

/** CO-WP-001 — Wealth Partner Workspace. */
export default async function WealthPartnerWorkspacePage({ params }: Props) {
  const { partnerId } = await params;
  return (
    <Suspense
      fallback={
        <ChanakyaLoadingExperience
          module="contacts"
          statusLabel="Opening Wealth Partner Workspace…"
          density="panel"
        />
      }
    >
      <WealthPartnerWorkspace partnerId={partnerId} />
    </Suspense>
  );
}
