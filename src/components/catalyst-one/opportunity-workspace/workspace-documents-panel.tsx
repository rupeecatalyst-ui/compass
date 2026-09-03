"use client";

/**
 * CO-ARCH — Opportunity Workspace Documents tab is not a second repository.
 * Authoring lives only in Opportunity Document Center (canonical journey stage).
 */

import { useRouter } from "next/navigation";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEAL_DOCUMENTS_EDIT_BLOCK_MESSAGE } from "@/constants/opportunity-document-center";
import { buildCanonicalJourneyStageHref } from "@/constants/canonical-journey-header";
import { buildDocumentWorkspaceHref } from "@/lib/document-workspace/context-lock";
import { OwGlassPanel, OwPanelHeader } from "./workspace-design";
import { useOpportunityWorkspace } from "./opportunity-workspace-context";

export function WorkspaceDocumentsPanel() {
  const router = useRouter();
  const { opportunityId, contactId, documentStats } = useOpportunityWorkspace();

  const goToDocumentCenter = () => {
    router.push(
      buildCanonicalJourneyStageHref("documents", {
        opportunityId: opportunityId || null,
      }),
    );
  };

  const goToDocumentWorkspace = () => {
    router.push(
      buildDocumentWorkspaceHref({
        opportunityId: opportunityId || null,
        contactId: contactId || null,
      }),
    );
  };

  return (
    <OwGlassPanel className="h-full">
      <OwPanelHeader
        title="Documents"
        badge="SSOT"
        description="Opportunity Document Center is the only authoring workspace"
      />

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-3">
        <p className="text-xs font-medium text-amber-950 dark:text-amber-100">
          {DEAL_DOCUMENTS_EDIT_BLOCK_MESSAGE}
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
          Upload, replace, delete, rename, and version documents only in Document
          Center. This panel is a readiness summary — not a separate document store.
        </p>
        <Button
          type="button"
          size="sm"
          className="mt-3 h-8 gap-1.5 text-xs"
          onClick={goToDocumentCenter}
        >
          <FolderOpen className="h-3.5 w-3.5" />
          Go to Document Center
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-2 h-8 gap-1.5 text-xs"
          onClick={goToDocumentWorkspace}
        >
          Open Document Workspace
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <Stat label="Required" value={documentStats.requiredCount} />
        <Stat label="Uploaded" value={documentStats.uploadedCount} />
        <Stat label="Verified" value={documentStats.verifiedCount} />
        <Stat label="Pending" value={documentStats.pendingCount} />
      </div>
    </OwGlassPanel>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
