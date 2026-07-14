import { Suspense } from "react";
import { LifeLenderWorkspace } from "@/components/catalyst-one/life/life-lender-workspace";
import { ElwLenderRegistry } from "@/components/catalyst-one/enterprise-lender-workspace";
import { PageHeader } from "@/components/design-system/page-header";

/**
 * Prompt 011 — Lender Master (Enterprise Data Grid) is primary.
 * LIFE recommendations remain available as an intelligence strip when loan context is present.
 */
export default function LendersPage() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <PageHeader
          title="Lender Master"
          description="Evaluate lenders in the Enterprise Data Grid, then open Enterprise Lender Workspace without leaving your workflow."
        />
        <ElwLenderRegistry />
      </section>

      <section className="space-y-3 border-t border-border/60 pt-6">
        <Suspense
          fallback={
            <div className="p-6 text-sm text-muted-foreground">
              Loading lender recommendations…
            </div>
          }
        >
          <LifeLenderWorkspace />
        </Suspense>
      </section>
    </div>
  );
}
