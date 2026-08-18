"use client";

/**
 * BAT #23 — Deal / Lender Pipeline Documents tab.
 * Reuses the canonical Document Registry (Opportunity Document Center SSOT).
 * Customer docs: View Mode (view / download / verify / replace if authorised).
 * Lender docs: Deal + selected Lender scope (upload / view / replace / download).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Download,
  Eye,
  FileText,
  FolderOpen,
  Printer,
  Replace,
  Search,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEAL_DOCUMENTS_EDIT_BLOCK_MESSAGE,
  DOCUMENT_CENTER_SHARED_SCOPE_KEY,
  buildDocumentCenterScopeOptions,
  documentCenterActiveOwner,
  parseParticipantScopeKey,
  type DocumentCenterScopeKey,
} from "@/constants/opportunity-document-center";
import {
  LENDER_DOCUMENT_CATEGORY_LABEL,
  LENDER_PIPELINE_DOCUMENT_TYPES,
  isLenderDocumentRecord,
  resolveLenderDocumentsKey,
} from "@/constants/lender-pipeline-documents";
import { cn } from "@/lib/utils";
import { documentRegistrySourceLabel } from "@/constants/document-intake";
import { ROUTES } from "@/constants/routes";
import { buildCanonicalJourneyStageHref } from "@/constants/canonical-journey-header";
import {
  buildEntityLinksFromLoanFile,
  canDownloadDocuments,
  canReplaceDocuments,
  canUploadDocuments,
  getDocumentPreviewUrl,
  healDocumentOwnerAssociations,
  listDocumentsForOpportunityRuntime,
  markDocumentVerified,
  recordMatchesDocumentOwnerScope,
  replaceDocumentInRegistry,
  subscribeDocumentRegistryUpdated,
  uploadDocumentToRegistry,
} from "@/lib/document-registry";
import { resolveLoanParticipants } from "@/lib/loan-participants";
import { useAuthContext } from "@/components/providers/auth-provider";
import type { LoanFile, LoanLenderExecution } from "@/types/catalyst-one";
import type { DocumentRegistryRecord } from "@/types/document-registry";
import { DocumentCenterParticipantSelector } from "@/components/catalyst-one/document-center/document-center-participant-selector";

type DocumentsPanelMode = "customer" | "lender";

function matchesCustomerScope(
  record: DocumentRegistryRecord,
  scope: DocumentCenterScopeKey,
  participants: ReturnType<typeof resolveLoanParticipants>,
): boolean {
  if (
    isLenderDocumentRecord({
      documentScope: record.links.documentScope,
      lenderId: record.links.lenderId,
      typeRef: record.typeRef,
    })
  ) {
    return false;
  }
  return recordMatchesDocumentOwnerScope(record, scope, participants);
}

function lenderLabel(c: LoanLenderExecution): string {
  return c.lenderDisplayName || c.lenderLegalName || c.lender || "Lender";
}

export function DealDocumentsProjection({
  file,
  opportunityId,
  initialMode = "customer",
  initialLenderId = null,
}: {
  file: LoanFile;
  opportunityId?: string | null;
  /** BAT #23 — default View Mode (customer). */
  initialMode?: DocumentsPanelMode;
  /** Prefill Lender Documents lender when opened from pipeline card. */
  initialLenderId?: string | null;
}) {
  const router = useRouter();
  const { user } = useAuthContext();
  const uploaderName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "Relationship Manager";
  const allowUpload = canUploadDocuments(user);
  const allowReplace = canReplaceDocuments(user);
  const allowDownload = canDownloadDocuments(user);

  const participants = useMemo(() => resolveLoanParticipants(file), [file]);
  const lenders = useMemo(() => file.lenders ?? [], [file.lenders]);

  const [mode, setMode] = useState<DocumentsPanelMode>(initialMode);
  const [scope, setScope] = useState<DocumentCenterScopeKey>(() => {
    const opts = buildDocumentCenterScopeOptions(participants);
    return opts[0]?.key ?? DOCUMENT_CENTER_SHARED_SCOPE_KEY;
  });
  const [selectedLenderKey, setSelectedLenderKey] = useState<string>(() => {
    if (initialLenderId) return initialLenderId;
    const first = lenders[0];
    return first ? resolveLenderDocumentsKey(first) : "";
  });
  const [query, setQuery] = useState("");
  const [tick, setTick] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [uploadingTypeRef, setUploadingTypeRef] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadRef = useRef<{
    typeRef: string;
    replaceRecordId?: string;
  } | null>(null);

  useEffect(() => subscribeDocumentRegistryUpdated(() => setTick((t) => t + 1)), []);

  useEffect(() => {
    if (initialMode) setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (initialLenderId) {
      setSelectedLenderKey(initialLenderId);
      setMode("lender");
    }
  }, [initialLenderId]);

  useEffect(() => {
    const opts = buildDocumentCenterScopeOptions(participants);
    if (!opts.some((o) => o.key === scope)) {
      setScope(opts[0]?.key ?? DOCUMENT_CENTER_SHARED_SCOPE_KEY);
    }
  }, [participants, scope]);

  useEffect(() => {
    if (!selectedLenderKey && lenders[0]) {
      setSelectedLenderKey(resolveLenderDocumentsKey(lenders[0]!));
    }
  }, [lenders, selectedLenderKey]);

  const oppId = opportunityId || file.enterpriseOpportunityId || null;

  useEffect(() => {
    healDocumentOwnerAssociations({
      runtimeKey: file.id,
      opportunityId: oppId,
      customerId: file.customerId,
      participants: participants.map((p) => ({
        id: p.id,
        entityId: p.entityId,
        role: p.role,
      })),
    });
  }, [file.id, file.customerId, oppId, participants]);

  const records = useMemo(() => {
    void tick;
    return listDocumentsForOpportunityRuntime(file.id, oppId, {
      customerId: file.customerId,
      contactId: file.customerId,
    }).filter((r) => r.status === "active");
  }, [file.id, file.customerId, oppId, tick]);

  const customerFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((r) => {
      if (!matchesCustomerScope(r, scope, participants)) return false;
      if (!q) return true;
      const hay = [r.displayName, r.originalFilename, r.categoryLabel, r.typeRef]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [records, scope, query, participants]);

  const lenderFiltered = useMemo(() => {
    if (!selectedLenderKey) return [];
    const q = query.trim().toLowerCase();
    return records.filter((r) => {
      if (
        !isLenderDocumentRecord({
          documentScope: r.links.documentScope,
          lenderId: r.links.lenderId,
          typeRef: r.typeRef,
        })
      ) {
        return false;
      }
      if ((r.links.lenderId?.trim() || "") !== selectedLenderKey) return false;
      if (!q) return true;
      const hay = [r.displayName, r.originalFilename, r.categoryLabel, r.typeRef]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [records, selectedLenderKey, query]);

  const lenderDocsByType = useMemo(() => {
    const map = new Map<string, DocumentRegistryRecord>();
    for (const r of lenderFiltered) {
      const prev = map.get(r.typeRef);
      if (!prev || r.updatedAt > prev.updatedAt) map.set(r.typeRef, r);
    }
    return map;
  }, [lenderFiltered]);

  const goToDocumentCenter = () => {
    router.push(
      buildCanonicalJourneyStageHref("documents", {
        fileId: file.id,
        opportunityId: oppId,
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
    if (!allowDownload) {
      toast.error("You do not have permission to download documents.");
      return;
    }
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

  const verify = (record: DocumentRegistryRecord) => {
    const updated = markDocumentVerified(record.id, uploaderName);
    if (!updated) {
      toast.error("Could not verify document.");
      return;
    }
    toast.success("Document verified.");
    setTick((t) => t + 1);
  };

  const startReplace = (record: DocumentRegistryRecord) => {
    if (!allowReplace) {
      toast.error("You do not have permission to replace documents.");
      return;
    }
    pendingUploadRef.current = {
      typeRef: record.typeRef,
      replaceRecordId: record.id,
    };
    fileInputRef.current?.click();
  };

  const startLenderUpload = (typeRef: string, replaceRecordId?: string) => {
    if (!allowUpload && !replaceRecordId) {
      toast.error("You do not have permission to upload documents.");
      return;
    }
    if (replaceRecordId && !allowReplace) {
      toast.error("You do not have permission to replace documents.");
      return;
    }
    if (!selectedLenderKey) {
      toast.error("Select a lender before uploading.");
      return;
    }
    pendingUploadRef.current = { typeRef, replaceRecordId };
    fileInputRef.current?.click();
  };

  const onFileChosen = async (fileList: FileList | null) => {
    const chosen = fileList?.[0];
    const pending = pendingUploadRef.current;
    pendingUploadRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!chosen || !pending) return;

    try {
      setUploadingTypeRef(pending.typeRef);
      if (pending.replaceRecordId) {
        const replaced = await replaceDocumentInRegistry(
          pending.replaceRecordId,
          chosen,
          uploaderName,
        );
        if (!replaced) throw new Error("Replace failed");
        toast.success("Document replaced.");
      } else {
        const typeDef = LENDER_PIPELINE_DOCUMENT_TYPES.find(
          (t) => t.typeRef === pending.typeRef,
        );
        const links = buildEntityLinksFromLoanFile(file, {
          documentScope: "lender",
          lenderId: selectedLenderKey,
        });
        await uploadDocumentToRegistry({
          file: chosen,
          typeRef: pending.typeRef,
          categoryLabel: LENDER_DOCUMENT_CATEGORY_LABEL,
          uploadedBy: uploaderName,
          uploadedByUserId: user?.id,
          links,
        });
        toast.success(`${typeDef?.label ?? "Document"} uploaded.`);
      }
      setTick((t) => t + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingTypeRef(null);
    }
  };

  const activeList = mode === "customer" ? customerFiltered : lenderFiltered;

  return (
    <div className="space-y-3" data-surface="deal-documents-projection">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => void onFileChosen(e.target.files)}
      />

      <div className="flex flex-wrap gap-1.5 rounded-lg border border-border/60 bg-muted/20 p-1">
        <Button
          type="button"
          size="sm"
          variant={mode === "customer" ? "default" : "ghost"}
          className="h-8 flex-1 text-xs sm:flex-none"
          onClick={() => setMode("customer")}
        >
          Customer Documents
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "lender" ? "default" : "ghost"}
          className="h-8 flex-1 text-xs sm:flex-none"
          onClick={() => setMode("lender")}
        >
          Lender Documents
        </Button>
      </div>

      {mode === "customer" ? (
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 px-3 py-2.5">
          <p className="text-xs font-medium text-sky-950 dark:text-sky-100">
            View Mode · Document Review
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {DEAL_DOCUMENTS_EDIT_BLOCK_MESSAGE}
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
      ) : (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2.5">
          <p className="text-xs font-medium text-amber-950 dark:text-amber-100">
            Lender Documents · Deal + Selected Lender
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Sanction letters, conditions, legal / technical reports, and lender
            correspondence stay under this category — separate from customer KYC
            and Shared Opportunity documents.
          </p>
        </div>
      )}

      {mode === "customer" ? (
        <>
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
        </>
      ) : (
        <div className="space-y-2">
          <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Selected lender
          </label>
          {lenders.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/70 px-3 py-4 text-center text-xs text-muted-foreground">
              Add a lender on the Lender Pipeline before uploading lender
              documents.
            </p>
          ) : (
            <Select value={selectedLenderKey} onValueChange={setSelectedLenderKey}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Choose lender" />
              </SelectTrigger>
              <SelectContent>
                {lenders.map((c) => {
                  const key = resolveLenderDocumentsKey(c);
                  return (
                    <SelectItem key={c.id} value={key} className="text-xs">
                      {lenderLabel(c)}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search documents…"
          className="h-8 pl-8 text-xs"
        />
      </div>

      {mode === "lender" && selectedLenderKey ? (
        <ul className="space-y-1.5">
          {LENDER_PIPELINE_DOCUMENT_TYPES.map((def) => {
            const existing = lenderDocsByType.get(def.typeRef);
            const busy = uploadingTypeRef === def.typeRef;
            return (
              <li
                key={def.typeRef}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-card/80 px-2.5 py-2"
              >
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">
                    {def.label}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {existing
                      ? `${existing.displayName || existing.originalFilename} · v${existing.version}`
                      : def.description}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1">
                  {existing ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => void openPreview(existing)}
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        View
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[11px]"
                        disabled={!allowDownload}
                        onClick={() => void download(existing)}
                      >
                        <Download className="mr-1 h-3 w-3" />
                        Download
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[11px]"
                        disabled={!allowReplace || busy}
                        onClick={() => startLenderUpload(def.typeRef, existing.id)}
                      >
                        <Replace className="mr-1 h-3 w-3" />
                        Replace
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[11px]"
                      disabled={!allowUpload || busy || !selectedLenderKey}
                      onClick={() => startLenderUpload(def.typeRef)}
                    >
                      <Upload className="mr-1 h-3 w-3" />
                      {busy ? "Uploading…" : "Upload"}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {mode === "customer" ? (
        <ul className="max-h-[min(52vh,28rem)] space-y-1.5 overflow-y-auto overscroll-contain pr-0.5">
          {activeList.length === 0 ? (
            <li className="rounded-lg border border-dashed border-border/70 px-3 py-8 text-center text-xs text-muted-foreground">
              No documents in this scope yet. Collect them in Document Center.
            </li>
          ) : (
            activeList.map((record) => (
              <li
                key={record.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-card/80 px-2.5 py-2"
              >
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">
                    {record.displayName || record.originalFilename}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {record.categoryLabel} · v{record.version}
                    {` · ${documentRegistrySourceLabel(record.uploadSource)}`}
                    {record.uploadSource === "wealth_partner" && record.uploadedBy
                      ? ` · ${record.uploadedBy}`
                      : ""}
                    {record.verifiedAt
                      ? ` · Verified${record.verifiedBy ? ` by ${record.verifiedBy}` : ""}`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[11px]"
                    onClick={() => void openPreview(record)}
                  >
                    <Eye className="mr-1 h-3 w-3" />
                    View
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[11px]"
                    disabled={!allowDownload}
                    onClick={() => void download(record)}
                  >
                    <Download className="mr-1 h-3 w-3" />
                    Download
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[11px]"
                    onClick={() => verify(record)}
                  >
                    <BadgeCheck className="mr-1 h-3 w-3" />
                    Verify
                  </Button>
                  {allowReplace ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => startReplace(record)}
                    >
                      <Replace className="mr-1 h-3 w-3" />
                      Replace
                    </Button>
                  ) : null}
                </div>
              </li>
            ))
          )}
        </ul>
      ) : null}

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

      <span className="sr-only">{ROUTES.DOCUMENT_CENTER}</span>
    </div>
  );
}
