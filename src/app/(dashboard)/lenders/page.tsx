import { Suspense } from "react";
import { LifeLenderWorkspace } from "@/components/catalyst-one/life/life-lender-workspace";

export default function LendersPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-muted-foreground">
          Loading lender recommendations…
        </div>
      }
    >
      <LifeLenderWorkspace />
    </Suspense>
  );
}
