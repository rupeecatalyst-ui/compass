import { Suspense } from "react";
import { EnterpriseLenderWorkspace } from "@/components/catalyst-one/enterprise-lender-workspace";

type PageProps = {
  params: Promise<{ lenderId: string }>;
};

export default async function LenderWorkspacePage({ params }: PageProps) {
  const { lenderId } = await params;

  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-muted-foreground">Loading lender workspace…</div>
      }
    >
      <EnterpriseLenderWorkspace lenderId={decodeURIComponent(lenderId)} />
    </Suspense>
  );
}
