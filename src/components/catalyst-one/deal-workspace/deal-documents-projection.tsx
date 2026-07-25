"use client";

/**
 * CO-ARCH — Deal Workspace Documents tab.
 * Read-only projection of Opportunity Document Center. No authoring.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Eye,
  FileText,
  FolderOpen,
  Printer,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEAL_DOCUMENTS_EDIT_BLOCK_MESSAGE,
  DOCUMENT_CENTER_SHARED_SCOPE_KEY,
  buildDocumentCenterScopeOptions,
  documentCenterActiveOwner,
  parseParticipantScopeKey,
  resolveDocumentScopeForTypeRef,
  type DocumentCenterScopeKey,
} from "@/constants/opportunity-document-center";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants/routes";
import { buildCanonicalJourneyStageHref } from "@/constants/canonical-journey-header";
import {
  getDocumentPreviewUrl,
  listDocumentsForLoanFile,
  subscribeDocumentRegistryUpdated,
} from "@/lib/document-registry";
import { resolveLoanParticipants } from "@/lib/loan-participants";
import type { LoanFile } from "@/types/catalyst-one";
import type { DocumentRegistryRecord } from "@/types/document-registry";
import { DocumentCenterParticipantSelector } from "@/components/catalyst-one/document-center/document-center-participant-selector";

function matchesScope(
  record: DocumentRegistryRecord,
  scope: DocumentCenterScopeKey,
  participants: ReturnType<typeof resolveLoanParticipants>,
): boolean {
  const docScope =
    record.links.documentScope ??
    resolveDocumentScopeForTypeRef(record.typeRef);
  const participantId = record.links.participantId?.trim();
  if (scope === DOCUMENT_CENTER_SHARED_SCOPE_KEY) {
    return docScope === "shared";
  }
  const selectedParticipant = parseParticipantScopeKey(scope);
  if (!selectedParticipant) return true;
  if (docScope === "shared") return false;
  if (!participantId) {
    const primary = participants.find((p) => p.role === "primary_applicant");
    return (
      selectedParticipant === "primary" ||
      selectedParticipant === primary?.id ||
      scope.endsWith(":primary")
    );
  }
  return participantId === selectedParticipant;
}

export function DealDocumentsProjection({
  file,
  opportunityId,
}: {
  file: LoanFile;
  opportunityId?: string | null;
}) {
  const router = useRouter();
  const participants = useMemo(() => resolveLoanParticipants(file), [file]);
  const [scope, setScope] = useState<DocumentCenterScopeKey>(() => {
    const opts = buildDocumentCenterScopeOptions(participants);
    return opts[0]?.key ?? DOCUMENT_CENTER_SHARED_SCOPE_KEY;
  });
  const [query, setQuery] = useState("");
  const [tick, setTick] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);

  useEffect(() => subscribeDocumentRegistryUpdated(() => setTick((t) => t + 1)), []);

  useEffect(() => {
    const opts = buildDocumentCenterScopeOptions(participants);
    if (!opts.some((o) => o.key === scope)) {
      setScope(opts[0]?.key ?? DOCUMENT_CENTER_SHARED_SCOPE_KEY);
    }
  }, [participants, scope]);

  const records = useMemo(() => {
    void tick;
    return listDocumentsForLoanFile(file.id).filter((r) => r.status === "active");
  }, [file.id, tick]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((r) => {
      if (!matchesScope(r, scope, participants)) return false;
      if (!q) return true;
      const hay = [r.displayName, r.originalFilename, r.categoryLabel, r.typeRef]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [records, scope, query, participants]);

  const goToDocumentCenter = () => {
    router.push(
      buildCanonicalJourneyStageHref("documents", {
        fileId: file.id,
        opportunityId: opportunityId || file.enterpriseOpportunityId || null,
      }),
    );
  };

  const openPreview = async (record: DocumentRegistryRecord) => {
    const url = await getDocumentPreviewUrl(record);
    if (!url) return;
    setPreviewUrl(url);
    setPreviewName(record.displayName || record.originalFilename);
  };

  const download = async (record: DocumentRegistryRecord) => {
    const url = await getDocumentPreviewUrl(record);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = record.displayName || record.originalFilename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPreview = () => {
    if (!previewUrl) return;
    const w = window.open(previewUrl, "_blank");
    w?.print();
  };

  return (
    <div className="space-y-3" data-surface="deal-documents-projection">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2.5">
        <p className="text-xs font-medium text-amber-950 dark:text-amber-100">
          {DEAL_DOCUMENTS_EDIT_BLOCK_MESSAGE}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          This tab is a read-only projection of the Opportunity Document Center — the
          only document authoring workspace in Catalyst One.
        </p>
        <Button
          type="button"
          size="sm"
          className="mt-2 h-8 gap-1.5 text-xs"
          onClick={goToDocumentCenter}
        >
          <FolderOpen className="h-3.5 w-3.5" />
          Go to Document Center
        </Button>
      </div>

      <DocumentCenterParticipantSelector
        participants={participants}
        value={scope}
        onChange={setScope}
      />

      {(() => {
        const owner = documentCenterActiveOwner(scope, participants);
        return (
          <div
            className={cn(
              "rounded-xl border px-3.5 py-3",
              owner.isShared
                ? "border-violet-500/30 bg-violet-500/5"
                : "border-teal-500/30 bg-teal-500/5",
            )}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Documents for
            </p>
            <p
              className={cn(
                "mt-1 text-sm font-semibold",
                owner.isShared
                  ? "text-violet-900 dark:text-violet-200"
                  : "text-teal-900 dark:text-teal-200",
              )}
            >
              {owner.roleLabel}
            </p>
            <p className="mt-0.5 text-xs text-foreground">{owner.name}</p>
          </div>
        );
      })()}

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search documents…"
          className="h-8 pl-8 text-xs"
        />
      </div>

      <ul className="max-h-[min(52vh,28rem)] space-y-1.5 overflow-y-auto overscroll-contain pr-0.5">
        {filtered.length === 0 ? (
          <li className="rounded-lg border border-dashed border-border/70 px-3 py-8 text-center text-xs text-muted-foreground">
            No documents in this scope yet. Upload them in Document Center.
          </li>
        ) : (
          filtered.map((record) => (
            <li
              key={record.id}
              className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/80 px-2.5 py-2"
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">
                  {record.displayName || record.originalFilename}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {record.categoryLabel} · v{record.version}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => void openPreview(record)}
                >
                  <Eye className="mr-1 h-3 w-3" />
                  Preview
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => void download(record)}
                >
                  <Download className="mr-1 h-3 w-3" />
                  Download
                </Button>
              </div>
            </li>
          ))
        )}
      </ul>

      {previewUrl ? (
        <div className="rounded-xl border border-border bg-background p-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="truncate text-xs font-medium">{previewName}</p>
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                onClick={printPreview}
              >
                <Printer className="mr-1 h-3 w-3" />
                Print
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-[11px]"
                onClick={() => {
                  if (previewUrl) URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                  setPreviewName(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
          <iframe
            title={previewName ?? "Document preview"}
            src={previewUrl}
            className={cn("h-[min(48vh,24rem)] w-full rounded-md border border-border")}
          />
        </div>
      ) : null}

      {/* Hidden route constant usage for tree-shaking clarity */}
      <span className="sr-only">{ROUTES.DOCUMENT_CENTER}</span>
    </div>
  );
}
