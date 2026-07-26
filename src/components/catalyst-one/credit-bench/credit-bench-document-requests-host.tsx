"use client";

/**
 * CO-DOC-001 / CO-OPP-SSOT-001 — Document Requests host.
 * Operational only after Enterprise Opportunity Registry load.
 */

import Link from "next/link";
import { OpportunityWorkspaceProvider, useOpportunityWorkspace } from "@/components/catalyst-one/opportunity-workspace/opportunity-workspace-context";
import { WorkspaceDocumentRequestsPanel } from "@/components/catalyst-one/opportunity-workspace/workspace-document-requests-panel";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

function DocumentRequestsRegistryGate({ children }: { children: React.ReactNode }) {
  const { workspaceReady, registryLoadStatus, registryLoadError, registryOpportunity } =
    useOpportunityWorkspace();

  if (registryLoadStatus === "failed") {
    return (
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-6 text-center">
        <p className="text-sm font-semibold text-foreground">Opportunity could not be loaded</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {registryLoadError ||
            "Document Requests require a successful Enterprise Opportunity Registry load."}
        </p>
        <Button asChild size="sm" className="mt-4">
          <Link href={ROUTES.MY_OPPORTUNITIES}>My Opportunities</Link>
        </Button>
      </div>
    );
  }

  if (!workspaceReady || !registryOpportunity?.id) {
    return (
      <div className="rounded-2xl border border-border/70 p-6 text-center text-xs text-muted-foreground">
        Loading Opportunity from Enterprise Opportunity Registry…
      </div>
    );
  }

  return <>{children}</>;
}

export function CreditBenchDocumentRequestsHost({
  fileId,
  opportunityId,
}: {
  fileId?: string | null;
  opportunityId?: string | null;
}) {
  return (
    <OpportunityWorkspaceProvider fileId={fileId} opportunityId={opportunityId}>
      <div className="rounded-2xl border border-border/70 bg-zinc-950 text-zinc-100 shadow-sm">
        <div className="p-1 sm:p-2">
          <DocumentRequestsRegistryGate>
            <WorkspaceDocumentRequestsPanel />
          </DocumentRequestsRegistryGate>
        </div>
      </div>
    </OpportunityWorkspaceProvider>
  );
}
