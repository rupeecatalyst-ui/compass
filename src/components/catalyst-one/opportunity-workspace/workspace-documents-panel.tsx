"use client";

import { useEffect, useMemo } from "react";
import { appendEdcTimelineEntry } from "@/lib/enterprise-dialogue-center";
import {
  listEdieDocumentRules,
  registerEdieDocumentRule,
  resolveEdieDocumentRulesForContext,
} from "@/lib/enterprise-document-intelligence-engine";
import { Button } from "@/components/ui/button";
import { OwCircularProgress, OwGlassPanel, OwPanelHeader } from "./workspace-design";
import { useOpportunityWorkspace } from "./opportunity-workspace-context";

function seedDocumentRulesIfEmpty() {
  if (listEdieDocumentRules().length > 0) return;

  registerEdieDocumentRule({
    ruleCode: "EDIE-HL-SAL-PROC-001",
    ruleName: "Home loan salaried · processing",
    productRef: "product:home-loan",
    employmentType: "salaried",
    loanStage: "processing",
    documentTypeRefs: ["doc:pan", "doc:aadhaar", "doc:salary-slip", "doc:bank-statement"],
    uploadMethod: "both",
    enabled: true,
    createdBy: "system",
  });

  registerEdieDocumentRule({
    ruleCode: "EDIE-HL-SAL-DOC-001",
    ruleName: "Home loan salaried · document collection",
    productRef: "product:home-loan",
    employmentType: "salaried",
    loanStage: "document_collection",
    documentTypeRefs: ["doc:pan", "doc:aadhaar", "doc:photo"],
    uploadMethod: "individual",
    enabled: true,
    createdBy: "system",
  });
}

export function WorkspaceDocumentsPanel() {
  const {
    opportunityId,
    refresh,
    refreshKey,
    documentStats,
    markDocumentUploaded,
    markDocumentVerified,
    markDocumentReplaced,
  } = useOpportunityWorkspace();

  useEffect(() => {
    seedDocumentRulesIfEmpty();
  }, []);

  const requiredDocs = useMemo(() => {
    if (documentStats.requiredDocs.length > 0) return documentStats.requiredDocs;
    const processing = resolveEdieDocumentRulesForContext({
      productRef: "product:home-loan",
      employmentType: "salaried",
      loanStage: "processing",
    });
    const collection = resolveEdieDocumentRulesForContext({
      productRef: "product:home-loan",
      employmentType: "salaried",
      loanStage: "document_collection",
    });
    const refs = new Set<string>();
    for (const rule of [...processing, ...collection]) {
      for (const ref of rule.documentTypeRefs) refs.add(ref);
    }
    return [...refs];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, documentStats.requiredDocs]);

  const completionPct =
    documentStats.requiredCount === 0
      ? 0
      : Math.round((documentStats.verifiedCount / documentStats.requiredCount) * 100);

  const logAction = (
    eventType: "document_upload" | "document_verification",
    title: string,
    docRef: string,
  ) => {
    if (!opportunityId) return;
    appendEdcTimelineEntry({
      contextRef: { type: "opportunity", id: opportunityId },
      eventType,
      title,
      description: `${title} simulated for ${docRef}`,
      actorId: "workspace",
      expandablePayload: { docRef, simulated: true, source: "opportunity-workspace-documents" },
    });
    refresh();
  };

  return (
    <OwGlassPanel className="h-full">
      <OwPanelHeader title="Documents · EDIE" badge="EDIE" description="Document completion" />

      <div className="mb-4 flex items-center gap-4">
        <OwCircularProgress value={completionPct} label="Done" colour="stroke-cyan-500" />
        <div className="grid flex-1 grid-cols-2 gap-2 text-xs">
          <Stat label="Required" value={documentStats.requiredCount} />
          <Stat label="Uploaded" value={documentStats.uploadedCount} />
          <Stat label="Verified" value={documentStats.verifiedCount} />
          <Stat label="Pending" value={documentStats.pendingCount} />
        </div>
      </div>

      <div className="space-y-2">
        {requiredDocs.map((docRef) => {
          const isUploaded = documentStats.uploaded.has(docRef);
          const isVerified = documentStats.verified.has(docRef);
          return (
            <div
              key={docRef}
              className="rounded-xl border border-zinc-200/70 bg-zinc-50/50 p-2.5 dark:border-white/10 dark:bg-zinc-950/40"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium">{docRef}</p>
                <span className="text-[10px] text-muted-foreground">
                  {isVerified ? "Verified" : isUploaded ? "Uploaded" : "Pending"}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 text-xs"
                  onClick={() => {
                    markDocumentUploaded(docRef);
                    logAction("document_upload", "Document uploaded", docRef);
                  }}
                >
                  Upload
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => logAction("document_upload", "Document viewed", docRef)}
                >
                  View
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => {
                    markDocumentReplaced(docRef);
                    logAction("document_upload", "Document replaced", docRef);
                  }}
                >
                  Replace
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => logAction("document_upload", "Document downloaded", docRef)}
                >
                  Download
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => {
                    markDocumentVerified(docRef);
                    logAction("document_verification", "Document verified", docRef);
                  }}
                >
                  Verify
                </Button>
              </div>
            </div>
          );
        })}
        {requiredDocs.length === 0 && (
          <p className="text-xs text-muted-foreground">No matching document rules for this context.</p>
        )}
      </div>
    </OwGlassPanel>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-200/60 px-2 py-1.5 dark:border-white/10">
      <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
