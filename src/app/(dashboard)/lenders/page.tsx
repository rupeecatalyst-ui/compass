import { Suspense } from "react";
import { LifeLenderWorkspace } from "@/components/catalyst-one/life/life-lender-workspace";
import { ElwLenderRegistry } from "@/components/catalyst-one/enterprise-lender-workspace";
import { PageHeader } from "@/components/design-system/page-header";

export default function LendersPage() {
  return (
    <div className="space-y-8">
      <Suspense
        fallback={
          <div className="p-6 text-sm text-muted-foreground">
            Loading lender recommendations…
          </div>
        }
      >
        <LifeLenderWorkspace />
      </Suspense>

      <section className="space-y-3 border-t border-border/60 pt-6">
        <PageHeader
          title="Lender Master"
          description="Open a dedicated Enterprise Lender Workspace to evaluate a lender without leaving your workflow."
        />
        <ElwLenderRegistry />
      </section>
    </div>
  );
}
