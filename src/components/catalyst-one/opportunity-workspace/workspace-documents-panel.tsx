"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listEdieDocumentRules,
  registerEdieDocumentRule,
  resolveEdieDocumentRulesForContext,
} from "@/lib/enterprise-document-intelligence-engine";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OwCircularProgress, OwGlassPanel, OwPanelHeader } from "./workspace-design";
import { useOpportunityWorkspace } from "./opportunity-workspace-context";
import {
  getPlaceholderDocument,
  getQuickIntent,
  isDocumentMandatory,
  placeholderConsumeQuickIntent,
  placeholderPreviewDocument,
  placeholderSetDocumentCategory,
  placeholderTriggerMockDownload,
  type PlaceholderDocCategory,
} from "./providers/workspace-placeholder-provider";

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
    markDocumentDeleted,
    lastPlaceholderStatus,
  } = useOpportunityWorkspace();
  const [previewDoc, setPreviewDoc] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState("");
  const [highlightUpload, setHighlightUpload] = useState(false);

  useEffect(() => {
    seedDocumentRulesIfEmpty();
  }, []);

  useEffect(() => {
    if (!opportunityId) return;
    if (getQuickIntent(opportunityId) !== "focus_document_upload") return;
    placeholderConsumeQuickIntent(opportunityId);
    setHighlightUpload(true);
  }, [opportunityId, refreshKey]);

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

  const completionPct = documentStats.completionPct;

  return (
    <OwGlassPanel className={`h-full ${highlightUpload ? "ring-2 ring-cyan-400/40" : ""}`}>
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

      {lastPlaceholderStatus && (
        <p className="mb-2 text-[10px] text-muted-foreground">{lastPlaceholderStatus}</p>
      )}

      <div className="space-y-2">
        {requiredDocs.map((docRef) => {
          const meta = opportunityId ? getPlaceholderDocument(opportunityId, docRef) : null;
          if (meta?.deleted) return null;
          const isUploaded = documentStats.uploaded.has(docRef);
          const isVerified = documentStats.verified.has(docRef);
          const mandatory = isDocumentMandatory(docRef);
          const statusLabel = isVerified
            ? "Verified"
            : isUploaded
              ? meta?.uploadStatus === "uploaded"
                ? "Uploaded"
                : "Uploaded"
              : "Pending";
          return (
            <div
              key={docRef}
              className="rounded-xl border border-zinc-200/70 bg-zinc-50/50 p-2.5 dark:border-white/10 dark:bg-zinc-950/40"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium">
                  {docRef}
                  {mandatory && (
                    <span className="ml-1 text-[10px] font-semibold text-rose-500" title="Mandatory">
                      *
                    </span>
                  )}
                </p>
                <span className="text-[10px] text-muted-foreground">
                  {statusLabel}
                  {meta && meta.version > 0 ? ` · v${meta.version}` : ""}
                </span>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">Category</span>
                <Select
                  value={meta?.category ?? "kyc"}
                  onValueChange={(v) => {
                    if (!opportunityId) return;
                    placeholderSetDocumentCategory(opportunityId, docRef, v as PlaceholderDocCategory);
                    refresh();
                  }}
                >
                  <SelectTrigger className="h-7 w-[8rem] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kyc">kyc</SelectItem>
                    <SelectItem value="income">income</SelectItem>
                    <SelectItem value="property">property</SelectItem>
                    <SelectItem value="other">other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-2 flex flex-wrap gap-1">
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 text-xs"
                  onClick={() => markDocumentUploaded(docRef)}
                >
                  Upload
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => {
                    if (!opportunityId) return;
                    setPreviewDoc(docRef);
                    setPreviewText(placeholderPreviewDocument(opportunityId, docRef));
                    refresh();
                  }}
                >
                  Preview
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => markDocumentReplaced(docRef)}
                >
                  Replace
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => {
                    if (!opportunityId) return;
                    placeholderTriggerMockDownload(opportunityId, docRef);
                    refresh();
                  }}
                >
                  Download
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => markDocumentVerified(docRef)}
                >
                  Verify
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 text-xs"
                  onClick={() => {
                    markDocumentDeleted(docRef);
                    if (previewDoc === docRef) {
                      setPreviewDoc(null);
                      setPreviewText("");
                    }
                  }}
                >
                  Delete
                </Button>
              </div>

              {previewDoc === docRef && (
                <pre className="mt-2 overflow-auto rounded-lg bg-muted/60 p-2 text-[11px]">
                  {previewText}
                </pre>
              )}
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
