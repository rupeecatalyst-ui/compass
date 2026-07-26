import { Suspense } from "react";
import { EnterpriseLenderWorkspace } from "@/components/catalyst-one/enterprise-lender-workspace";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";

type PageProps = {
  params: Promise<{ lenderId: string }>;
};

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
      <EnterpriseLenderWorkspace lenderId={decodeURIComponent(lenderId)} />
    </Suspense>
  );
}
