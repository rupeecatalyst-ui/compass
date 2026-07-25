"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Eye,
  FilePlus2,
  FolderUp,
  Plus,
  Replace,
  Upload,
} from "lucide-react";
import { LeadOpportunityJourneyChrome } from "@/components/catalyst-one/shared/lead-opportunity-journey-chrome";
import { LoanStructureCommandControl } from "@/components/catalyst-one/shared/loan-structure-drawer";
import { OpportunityBoundStage } from "@/components/catalyst-one/opportunity-workspace/opportunity-bound-stage";
import { buildCanonicalJourneyStageHref } from "@/constants/canonical-journey-header";
import {
  getActiveOpportunityContext,
} from "@/lib/lead-opportunity-journey/active-context";
import { useRequirementCapturedGate } from "@/lib/loan-journey/use-requirement-captured-gate";
import {
  type DocumentKpiFilter,
} from "@/components/catalyst-one/document-center/document-readiness-card";
import { DocumentReadinessDrawer } from "@/components/catalyst-one/document-center/document-readiness-drawer";
import { DocumentRegistryPanel } from "@/components/catalyst-one/document-center/document-registry-panel";
import { DocumentUploadProgressBar } from "@/components/catalyst-one/document-center/document-upload-zone";
import { DocumentViewerOverlay } from "@/components/catalyst-one/document-center/document-viewer-overlay";
import { DocumentVersionHistoryDrawer } from "@/components/catalyst-one/document-center/document-version-history-drawer";
import { DocumentAttachmentsDrawer } from "@/components/catalyst-one/document-center/document-attachments-drawer";
import {
  journeyContextFromLoanFile,
  loadOpportunityJourneyRuntime,
} from "@/lib/lead-opportunity-journey/load-context";
import {
  loadAddressProofSelection,
  loadEdieReceipts,
  loadIdentityProofSelection,
  resolveEdieChecklistForLoanFile,
  saveAddressProofSelection,
  saveChoiceGroupSelection,
  saveEdieReceipts,
  saveIdentityProofSelection,
  seedEdieCertifiedRulesIfNeeded,
} from "@/lib/edie-certified";
import {
  computeCategoryReadiness,
  deriveDocumentCategoryRows,
  type DocumentCategoryRow,
} from "@/lib/document-center/derive-category-rows";
import {
  loadDocumentVersions,
  type DocumentCenterVersion,
} from "@/lib/document-center/versions";
import { classifyUploadsAgainstChecklist } from "@/lib/document-center/classify-upload";
import {
  createOtherDocumentEntry,
  loadOtherDocumentEntries,
  saveOtherDocumentEntries,
  type OtherDocumentEntry,
} from "@/lib/document-center/other-documents";
import {
  buildEntityLinksFromLoanFile,
  canUploadDocuments,
  listDocumentsByTypeRef,
  listDocumentsForLoanFile,
  replaceDocumentInRegistry,
  subscribeDocumentRegistryUpdated,
  uploadDocumentToRegistry,
} from "@/lib/document-registry";
import type { DocumentRegistryRecord, DocumentUploadProgress } from "@/types/document-registry";
import {
  EDIE_ADDRESS_PROOF_GROUP,
  EDIE_IDENTITY_PROOF_GROUP,
} from "@/constants/edie-certified/document-catalog";
import { DOCUMENT_REGISTRY_ACCEPT } from "@/constants/document-registry";
import {
  DOCUMENT_CENTER_SHARED_SCOPE_KEY,
  buildDocumentCenterScopeOptions,
  documentCenterActiveOwner,
  parseParticipantScopeKey,
  resolveDocumentScopeForModule,
  resolveDocumentScopeForTypeRef,
  type DocumentCenterScopeKey,
} from "@/constants/opportunity-document-center";
import { ROUTES } from "@/constants/routes";
import { useAuthContext } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { LoanFile } from "@/types/catalyst-one";
import type { EdieChecklistItem } from "@/types/edie-certified-rules";
import { DocumentCenterParticipantSelector } from "@/components/catalyst-one/document-center/document-center-participant-selector";
import { resolveLoanParticipants } from "@/lib/loan-participants";

/**
 * Enterprise Document Center — category-first UX over EDIE modules.
 */
export function DocumentCenterWorkspace() {
  const { user } = useAuthContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileParam = searchParams.get("file");
  const opportunityId = searchParams.get("opportunityId");
  const focusParam = searchParams.get("focus");
  const sectionParam = searchParams.get("section");
  const entryParam = searchParams.get("entry");
  const dashboardEntry = entryParam === "dashboard";
  const hasUrlContext = Boolean(fileParam || opportunityId);
  const requirementGate = useRequirementCapturedGate(
    dashboardEntry ? null : opportunityId,
  );

  const [file, setFile] = useState<LoanFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState<Record<string, boolean>>({});
  const [addressChoice, setAddressChoice] = useState<string | undefined>();
  const [identityChoice, setIdentityChoice] = useState<string | undefined>();
  const [categoryFocus, setCategoryFocus] = useState<Record<string, string>>({});
  const [versionsMap, setVersionsMap] = useState<Record<string, DocumentCenterVersion[]>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);

  const [kpiFilter, setKpiFilter] = useState<DocumentKpiFilter>("all");
  const [readinessOpen, setReadinessOpen] = useState(false);
  const [viewerTypeRef, setViewerTypeRef] = useState<string | null>(null);
  const [historyTypeRef, setHistoryTypeRef] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [localFocus, setLocalFocus] = useState<string | null>(focusParam);
  const [registryTick, setRegistryTick] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<DocumentUploadProgress | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [documentOwnerScope, setDocumentOwnerScope] =
    useState<DocumentCenterScopeKey>(DOCUMENT_CENTER_SHARED_SCOPE_KEY);
  const [pendingUpload, setPendingUpload] = useState<{
    typeRef: string;
    label: string;
    replaceRecordId?: string;
    /** single = first/replace one; add = allow multiple additional files */
    mode?: "single" | "add";
  } | null>(null);
  const [attachmentsTypeRef, setAttachmentsTypeRef] = useState<string | null>(null);
  const [attachmentsLabel, setAttachmentsLabel] = useState("");
  const [otherDocs, setOtherDocs] = useState<OtherDocumentEntry[]>([]);

  const focusEl = useRef<HTMLTableRowElement | null>(null);
  const scrollRoot = useRef<HTMLDivElement | null>(null);
  const scrollPos = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const multiFileInputRef = useRef<HTMLInputElement | null>(null);
  const bulkFilesInputRef = useRef<HTMLInputElement | null>(null);

  const uploaderName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "Relationship Manager";

  const participants = useMemo(
    () => (file ? resolveLoanParticipants(file) : []),
    [file],
  );

  useEffect(() => {
    const opts = buildDocumentCenterScopeOptions(participants);
    if (!opts.some((o) => o.key === documentOwnerScope)) {
      setDocumentOwnerScope(opts[0]?.key ?? DOCUMENT_CENTER_SHARED_SCOPE_KEY);
    }
  }, [participants, documentOwnerScope]);

  const recordMatchesOwnerScope = useCallback(
    (record: DocumentRegistryRecord) => {
      const docScope =
        record.links.documentScope ??
        resolveDocumentScopeForTypeRef(record.typeRef);
      const participantId = record.links.participantId?.trim();
      if (documentOwnerScope === DOCUMENT_CENTER_SHARED_SCOPE_KEY) {
        return docScope === "shared";
      }
      if (docScope === "shared") return false;
      const selected = parseParticipantScopeKey(documentOwnerScope);
      if (!selected) return true;
      if (!participantId) {
        const primary = participants.find((p) => p.role === "primary_applicant");
        return (
          selected === "primary" ||
          selected === primary?.id ||
          documentOwnerScope.endsWith(":primary")
        );
      }
      return participantId === selected;
    },
    [documentOwnerScope, participants],
  );

  useEffect(() => {
    let cancelled = false;
    seedEdieCertifiedRulesIfNeeded();
    setLoading(true);
    void loadOpportunityJourneyRuntime(fileParam, opportunityId, {
      dashboardEntry: entryParam === "dashboard",
    }).then((next) => {
      if (cancelled) return;
      let identityChanged = true;
      setFile((prev) => {
        if (prev?.id && next?.id && prev.id === next.id) {
          identityChanged = false;
          return prev;
        }
        return next;
      });
      if (identityChanged && next) {
        setReceipts(loadEdieReceipts(next.id));
        setAddressChoice(loadAddressProofSelection(next.id));
        setIdentityChoice(loadIdentityProofSelection(next.id));
        setCategoryFocus({});
        setVersionsMap(loadDocumentVersions(next.id));
        setOtherDocs(loadOtherDocumentEntries(next.id));
        const opts = buildDocumentCenterScopeOptions(
          resolveLoanParticipants(next),
        );
        setDocumentOwnerScope(opts[0]?.key ?? DOCUMENT_CENTER_SHARED_SCOPE_KEY);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [fileParam, opportunityId, entryParam]);

  useEffect(() => {
    if (dashboardEntry || hasUrlContext || file) return;
    const active = getActiveOpportunityContext();
    if (active?.fileId || active?.opportunityId) {
      router.replace(
        buildCanonicalJourneyStageHref("documents", {
          fileId: active.fileId ?? null,
          opportunityId: active.opportunityId ?? null,
        }),
      );
    }
  }, [dashboardEntry, hasUrlContext, file, router]);

  useEffect(() => {
    setLocalFocus(focusParam);
  }, [focusParam]);

  useEffect(() => {
    if (!localFocus || !focusEl.current) return;
    focusEl.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [localFocus, file?.id, receipts, kpiFilter]);

  const refreshRegistry = useCallback(() => {
    if (!file) return;
    setVersionsMap(loadDocumentVersions(file.id));
    const records = listDocumentsForLoanFile(file.id);
    const next: Record<string, boolean> = { ...loadEdieReceipts(file.id) };
    for (const r of records) {
      if (r.status === "active") next[r.typeRef] = true;
    }
    for (const key of Object.keys(next)) {
      if (!records.some((r) => r.typeRef === key && r.status === "active")) {
        delete next[key];
      }
    }
    setReceipts(next);
    saveEdieReceipts(file.id, next);
    setRegistryTick((t) => t + 1);
  }, [file]);

  useEffect(() => {
    return subscribeDocumentRegistryUpdated(() => {
      refreshRegistry();
    });
  }, [refreshRegistry]);

  const registryRecords = useMemo(() => {
    if (!file) return [];
    return listDocumentsForLoanFile(file.id).filter(recordMatchesOwnerScope);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file?.id, registryTick, recordMatchesOwnerScope]);

  const checklist = useMemo(() => {
    if (!file) return null;
    return resolveEdieChecklistForLoanFile(file, {
      receipts,
      addressProofSelection: addressChoice,
      identityProofSelection: identityChoice,
    });
  }, [file, receipts, addressChoice, identityChoice]);

  const attachmentCountFor = useCallback(
    (typeRef: string) =>
      listDocumentsByTypeRef(file?.id ?? "", typeRef)
        .filter((r) => r.status === "active")
        .filter(recordMatchesOwnerScope).length,
    [file?.id, registryTick, recordMatchesOwnerScope],
  );

  const categoryRows = useMemo(() => {
    if (!checklist) return [] as DocumentCategoryRow[];
    const rows = deriveDocumentCategoryRows(checklist, {
      focusByKey: {
        ...categoryFocus,
        ...(addressChoice ? { [EDIE_ADDRESS_PROOF_GROUP]: addressChoice } : {}),
        ...(identityChoice ? { [EDIE_IDENTITY_PROOF_GROUP]: identityChoice } : {}),
      },
      fileCountByType: attachmentCountFor,
    });
    const wantShared = documentOwnerScope === DOCUMENT_CENTER_SHARED_SCOPE_KEY;
    return rows.filter((row) => {
      const scope = resolveDocumentScopeForModule(row.moduleId);
      return wantShared ? scope === "shared" : scope === "applicant";
    });
  }, [
    checklist,
    categoryFocus,
    addressChoice,
    identityChoice,
    attachmentCountFor,
    documentOwnerScope,
  ]);

  const categoryReadiness = useMemo(
    () => computeCategoryReadiness(categoryRows),
    [categoryRows],
  );

  const context = useMemo(() => journeyContextFromLoanFile(file), [file]);

  /** Flat scoring / classify candidates from EDIE (selected choice variants only). */
  const flatItems = useMemo(() => {
    if (!checklist) return [] as EdieChecklistItem[];
    return checklist.items.filter((i) => !i.choiceGroupId || !i.optional);
  }, [checklist]);

  const filteredTypeRefs = useMemo(() => {
    if (kpiFilter === "all" || kpiFilter === "readiness") return null;
    const set = new Set<string>();
    for (const i of flatItems) {
      if (kpiFilter === "uploaded" && i.complete) set.add(i.typeRef);
      if (kpiFilter === "pending" && !i.complete) set.add(i.typeRef);
      if (kpiFilter === "critical" && i.critical && !i.complete) set.add(i.typeRef);
      if (kpiFilter === "optional" && i.optional) set.add(i.typeRef);
    }
    return set;
  }, [flatItems, kpiFilter]);

  const preserveScroll = useCallback(() => {
    scrollPos.current = scrollRoot.current?.scrollTop ?? window.scrollY;
  }, []);

  const restoreScroll = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRoot.current) scrollRoot.current.scrollTop = scrollPos.current;
      else window.scrollTo({ top: scrollPos.current });
    });
  }, []);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  const markReceipt = useCallback(
    (typeRef: string, folderId?: string) => {
      if (!file) return;
      const next = { ...receipts, [typeRef]: true };
      if (folderId) next[folderId] = true;
      setReceipts(next);
      saveEdieReceipts(file.id, next);
    },
    [file, receipts],
  );

  const processUpload = useCallback(
    async (
      uploadFile: File,
      typeRef: string,
      label: string,
      replaceRecordId?: string,
    ) => {
      if (!file || !canUploadDocuments(user)) {
        flash("Upload not permitted for your role.");
        return;
      }
      preserveScroll();
      setUploadBusy(true);
      setUploadProgress({ phase: "reading", percent: 5, message: `Uploading ${uploadFile.name}…` });

      try {
        const isShared = documentOwnerScope === DOCUMENT_CENTER_SHARED_SCOPE_KEY;
        const participantId = isShared
          ? null
          : parseParticipantScopeKey(documentOwnerScope);
        const ownerParticipant = participantId
          ? participants.find((p) => p.id === participantId)
          : undefined;
        const links = buildEntityLinksFromLoanFile(file, {
          documentScope: isShared ? "shared" : "applicant",
          participantId,
          // BAT #22 — stamp Contact / Company registry id for the selected owner.
          ownerEntityId: isShared
            ? null
            : ownerParticipant?.entityId?.trim() || file.customerId || null,
        });
        let result: DocumentRegistryRecord;
        if (replaceRecordId) {
          const replaced = await replaceDocumentInRegistry(
            replaceRecordId,
            uploadFile,
            uploaderName,
            setUploadProgress,
          );
          if (!replaced) throw new Error("Upload failed");
          result = replaced;
        } else {
          const uploaded = await uploadDocumentToRegistry(
            {
              file: uploadFile,
              typeRef,
              categoryLabel: label,
              uploadedBy: uploaderName,
              uploadedByUserId: user?.id,
              links,
            },
            setUploadProgress,
          );
          result = uploaded.record;
        }

        markReceipt(typeRef);
        refreshRegistry();
        setDirty(false);
        setSavedOnce(true);
        flash(
          replaceRecordId || (result.version > 1)
            ? `${label} replaced — version ${result.version}`
            : `${label} uploaded successfully`,
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Upload failed";
        setUploadProgress({ phase: "error", percent: 0, message: msg });
        flash(msg);
      } finally {
        setUploadBusy(false);
        window.setTimeout(() => setUploadProgress(null), 2400);
        restoreScroll();
      }
    },
    [file, user, uploaderName, markReceipt, refreshRegistry, preserveScroll, restoreScroll, documentOwnerScope, participants],
  );

  const promptUpload = (
    typeRef: string,
    label: string,
    replaceRecordId?: string,
    mode: "single" | "add" = "single",
  ) => {
    setPendingUpload({ typeRef, label, replaceRecordId, mode });
    window.setTimeout(() => {
      if (mode === "add") multiFileInputRef.current?.click();
      else fileInputRef.current?.click();
    }, 0);
  };

  const onFileInputChange = async (files: FileList | null) => {
    if (!files?.length || !pendingUpload) return;
    const list = Array.from(files);
    const target = pendingUpload;
    for (let i = 0; i < list.length; i++) {
      await processUpload(
        list[i]!,
        target.typeRef,
        target.label,
        i === 0 ? target.replaceRecordId : undefined,
      );
    }
    setPendingUpload(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (multiFileInputRef.current) multiFileInputRef.current.value = "";
  };

  const onFolderInputChange = async (files: FileList | null) => {
    if (!files?.length || !file || !checklist) return;
    const list = Array.from(files).filter((f) => f.size > 0);
    if (!list.length) {
      flash("No files found in the selected folder.");
      return;
    }

    const classified = classifyUploadsAgainstChecklist(list, flatItems);
    let mapped = 0;
    let otherCount = 0;
    const nextOther = [...otherDocs];

    for (const item of classified) {
      if (item.isOther) {
        const entry = createOtherDocumentEntry(item.label);
        nextOther.push(entry);
        await processUpload(item.file, entry.typeRef, entry.name);
        otherCount += 1;
      } else {
        await processUpload(item.file, item.typeRef, item.label);
        mapped += 1;
      }
    }

    setOtherDocs(nextOther);
    saveOtherDocumentEntries(file.id, nextOther);
    flash(
      `Folder upload complete — ${mapped} mapped to checklist, ${otherCount} placed in Other Documents.`,
    );
    if (folderInputRef.current) folderInputRef.current.value = "";
  };

  const onBulkFiles = async (files: File[]) => {
    if (!file || files.length === 0 || !checklist) return;
    const classified = classifyUploadsAgainstChecklist(files, flatItems);
    const nextOther = [...otherDocs];
    for (const item of classified) {
      if (item.isOther) {
        const entry = createOtherDocumentEntry(item.label);
        nextOther.push(entry);
        await processUpload(item.file, entry.typeRef, entry.name);
      } else {
        await processUpload(item.file, item.typeRef, item.label);
      }
    }
    setOtherDocs(nextOther);
    saveOtherDocumentEntries(file.id, nextOther);
  };

  const uploadDocument = (typeRef: string, label?: string) => {
    promptUpload(typeRef, label ?? typeRef.replace(/^doc:/, ""), undefined, "single");
  };

  const addDocuments = (typeRef: string, label: string) => {
    promptUpload(typeRef, label, undefined, "add");
  };

  const openAttachments = (typeRef: string, label: string) => {
    setAttachmentsTypeRef(typeRef);
    setAttachmentsLabel(label);
  };

  const addOtherDocumentRow = () => {
    if (!file) return;
    const entry = createOtherDocumentEntry("");
    const next = [...otherDocs, entry];
    setOtherDocs(next);
    saveOtherDocumentEntries(file.id, next);
  };

  const onCategoryTypeSelect = (row: DocumentCategoryRow, typeRef: string) => {
    if (!file) return;
    setCategoryFocus((prev) => ({ ...prev, [row.key]: typeRef, [row.moduleId]: typeRef }));
    if (row.choiceGroupId === EDIE_ADDRESS_PROOF_GROUP) {
      setAddressChoice(typeRef);
      saveAddressProofSelection(file.id, typeRef);
    } else if (row.choiceGroupId === EDIE_IDENTITY_PROOF_GROUP) {
      setIdentityChoice(typeRef);
      saveIdentityProofSelection(file.id, typeRef);
    } else if (row.choiceGroupId) {
      saveChoiceGroupSelection(file.id, row.choiceGroupId, typeRef);
    }
    setDirty(true);
  };

  const takeMeThere = (item: EdieChecklistItem) => {
    setReadinessOpen(false);
    setExpanded((e) => ({ ...e, [item.moduleId]: true }));
    setLocalFocus(item.typeRef);
    setKpiFilter("all");
  };

  const openViewer = (typeRef: string) => {
    preserveScroll();
    setViewerTypeRef(typeRef);
  };

  const closeViewer = () => {
    setViewerTypeRef(null);
    restoreScroll();
  };

  const viewerItem = useMemo((): EdieChecklistItem | null => {
    if (!viewerTypeRef) return null;
    const fromChecklist =
      flatItems.find(
        (i) => i.typeRef === viewerTypeRef || i.folderId === viewerTypeRef,
      ) ?? null;
    if (fromChecklist) return fromChecklist;
    const other = otherDocs.find((o) => o.typeRef === viewerTypeRef);
    if (!other) return null;
    return {
      typeRef: other.typeRef,
      label: other.name,
      moduleId: "customer_kyc",
      moduleLabel: "Other Documents",
      severity: "required",
      mandatory: false,
      critical: false,
      optional: true,
      uploadMode: "individual",
      weight: 0,
      complete: attachmentCountFor(other.typeRef) > 0,
    };
  }, [viewerTypeRef, flatItems, otherDocs, registryTick, file?.id]);

  const historyItem = flatItems.find((i) => i.typeRef === historyTypeRef) ?? null;

  if (requirementGate.status === "loading" || requirementGate.status === "redirecting") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  if (!file || !checklist) {
    return <OpportunityBoundStage stage="document_center" />;
  }

  return (
    <div className="-mx-4 flex min-h-0 flex-col md:-mx-6 lg:-mx-8">
      <LeadOpportunityJourneyChrome
        moduleId="document_center"
        density="compact"
        hideContextChips
        hidePhaseReadiness
        opportunityWorkspaceStage="document_center"
        title={context.customer || "Document Center"}
        identityLine={[context.opportunity, context.product, context.amount]
          .filter(Boolean)
          .join(" · ")}
        context={context}
        fileId={file.id}
        opportunityId={opportunityId}
        hasUnsavedChanges={dirty}
        acknowledgeCleanClose={!dirty && savedOnce}
        headerActions={
          <LoanStructureCommandControl
            file={file}
            participants={file.participants ?? []}
            onNavigate={() => {}}
          />
        }
        onSaveDraft={async () => {
          saveEdieReceipts(file.id, receipts);
          if (addressChoice) saveAddressProofSelection(file.id, addressChoice);
          if (identityChoice) saveIdentityProofSelection(file.id, identityChoice);
          setDirty(false);
          setSavedOnce(true);
        }}
        saveSuccessMessage="Document Center saved successfully."
      >
        <div ref={scrollRoot} className="space-y-3 p-3 sm:p-4">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={DOCUMENT_REGISTRY_ACCEPT}
            onChange={(e) => void onFileInputChange(e.target.files)}
          />
          <input
            ref={multiFileInputRef}
            type="file"
            className="hidden"
            multiple
            accept={DOCUMENT_REGISTRY_ACCEPT}
            onChange={(e) => void onFileInputChange(e.target.files)}
          />
          <input
            ref={bulkFilesInputRef}
            type="file"
            className="hidden"
            multiple
            accept={DOCUMENT_REGISTRY_ACCEPT}
            onChange={(e) => {
              const list = e.target.files ? Array.from(e.target.files) : [];
              void onBulkFiles(list);
              if (bulkFilesInputRef.current) bulkFilesInputRef.current.value = "";
            }}
          />
          <input
            ref={folderInputRef}
            type="file"
            className="hidden"
            multiple
            {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
            onChange={(e) => void onFolderInputChange(e.target.files)}
          />

          {toast ? (
            <div className="rounded-lg border border-teal-500/25 bg-teal-500/10 px-3 py-2 text-xs text-teal-950 dark:text-teal-100">
              {toast}
            </div>
          ) : null}

          {uploadProgress ? (
            <DocumentUploadProgressBar
              percent={uploadProgress.percent}
              message={uploadProgress.message}
            />
          ) : null}

          <DocumentCenterParticipantSelector
            participants={participants}
            value={documentOwnerScope}
            onChange={setDocumentOwnerScope}
          />

          {(() => {
            const owner = documentCenterActiveOwner(documentOwnerScope, participants);
            return (
              <div
                className={cn(
                  "rounded-xl border px-3.5 py-3 shadow-sm",
                  owner.isShared
                    ? "border-violet-500/30 bg-violet-500/5"
                    : "border-teal-500/30 bg-teal-500/5",
                )}
                data-surface="document-center-active-owner"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Currently Uploading For
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

          <DocumentReadinessBar
            percent={categoryReadiness.overallPct}
            categories={categoryReadiness.categories}
            onOpenDetails={() => setReadinessOpen(true)}
          />

          <div
            data-dc-layout="enterprise-v2"
            className="space-y-3 rounded-xl border border-border/70 bg-card p-3 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">
                  Enterprise Document Repository
                </p>
                <p className="text-sm font-semibold tracking-tight">
                  Business document categories
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {categoryReadiness.completeCount}/{categoryReadiness.totalCount} categories
                  complete · select acceptable proof per category
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  data-dc-action="upload-files"
                  onClick={() => bulkFilesInputRef.current?.click()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-teal-600/40 bg-gradient-to-r from-teal-700 to-cyan-700 px-3 text-[12px] font-semibold text-white shadow-sm"
                >
                  <Upload className="h-3.5 w-3.5" />
                  + Upload Files
                </button>
                <button
                  type="button"
                  data-dc-action="upload-folder"
                  onClick={() => folderInputRef.current?.click()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-[12px] font-semibold shadow-sm hover:bg-muted/50"
                >
                  <FolderUp className="h-3.5 w-3.5" />
                  + Upload Folder
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full min-w-[780px] border-collapse text-left text-xs">
                <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Category</th>
                    <th className="px-3 py-2.5 font-semibold">Selected Document</th>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                    <th className="px-3 py-2.5 font-semibold">Files</th>
                    <th className="px-3 py-2.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {categoryRows.map((row) => {
                    const item = row.activeItem;
                    const storageRef = item.folderId ?? item.typeRef;
                    const count = attachmentCountFor(storageRef);
                    const hasFiles = count > 0 || item.complete;
                    const statusLabel =
                      row.status === "complete"
                        ? "Complete"
                        : row.status === "partial"
                          ? "Partial"
                          : "Pending";
                    return (
                      <tr
                        key={row.key}
                        id={`edie-cat-${row.key}`}
                        ref={
                          localFocus === item.typeRef || localFocus === row.key
                            ? focusEl
                            : undefined
                        }
                        className={cn(
                          "bg-card hover:bg-muted/20",
                          (localFocus === item.typeRef || localFocus === row.key) &&
                            "bg-teal-500/10",
                        )}
                      >
                        <td className="px-3 py-2.5">
                          <p className="font-semibold text-foreground">{row.label}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {row.fulfillment === "choice_one"
                              ? "One acceptable document"
                              : row.fulfillment === "folder"
                                ? "Folder upload"
                                : row.requiredItems.length > 1
                                  ? `${row.requiredItems.length} required documents`
                                  : "Required document"}
                          </p>
                        </td>
                        <td className="px-3 py-2.5">
                          <select
                            className="h-8 w-full min-w-[11rem] max-w-[16rem] rounded-md border border-border bg-background px-2 text-xs"
                            value={row.selectedTypeRef}
                            onChange={(e) => onCategoryTypeSelect(row, e.target.value)}
                            aria-label={`${row.label} document type`}
                          >
                            {row.options.map((opt) => (
                              <option key={opt.typeRef} value={opt.typeRef}>
                                {opt.folderLabel || opt.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                              row.status === "complete"
                                ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                                : row.status === "partial"
                                  ? "bg-amber-500/15 text-amber-900 dark:text-amber-200"
                                  : "bg-rose-500/15 text-rose-800 dark:text-rose-200",
                            )}
                          >
                            {statusLabel}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 tabular-nums font-medium text-foreground">
                          {count}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap justify-end gap-1">
                            {!hasFiles ? (
                              <RowAction
                                label="Upload"
                                onClick={() =>
                                  uploadDocument(storageRef, item.folderLabel || item.label)
                                }
                                icon={<Upload className="h-3 w-3" />}
                                primary
                              />
                            ) : (
                              <>
                                <RowAction
                                  label="Add"
                                  onClick={() =>
                                    addDocuments(storageRef, item.folderLabel || item.label)
                                  }
                                  icon={<FilePlus2 className="h-3 w-3" />}
                                />
                                <RowAction
                                  label="View"
                                  onClick={() =>
                                    openAttachments(
                                      storageRef,
                                      item.folderLabel || item.label,
                                    )
                                  }
                                  icon={<Eye className="h-3 w-3" />}
                                />
                                <RowAction
                                  label="Replace"
                                  onClick={() => {
                                    const records = listDocumentsByTypeRef(
                                      file.id,
                                      storageRef,
                                    ).filter((r) => r.status === "active");
                                    if (records.length <= 1) {
                                      promptUpload(
                                        storageRef,
                                        item.folderLabel || item.label,
                                        records[0]?.id,
                                        "single",
                                      );
                                      return;
                                    }
                                    openAttachments(
                                      storageRef,
                                      item.folderLabel || item.label,
                                    );
                                  }}
                                  icon={<Replace className="h-3 w-3" />}
                                />
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <section
            data-dc-section="other-documents"
            className="rounded-xl border border-border/70 bg-card p-3 shadow-sm"
          >
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">Other Documents</h2>
                <p className="text-[11px] text-muted-foreground">
                  Custom supporting documents — unlimited. Checklist unchanged.
                </p>
              </div>
              <Button type="button" size="sm" className="h-8" onClick={addOtherDocumentRow}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add row
              </Button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full min-w-[520px] border-collapse text-left text-xs">
                <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Document Name</th>
                    <th className="px-3 py-2 font-semibold text-right">Upload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {otherDocs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={2}
                        className="px-3 py-6 text-center text-muted-foreground"
                      >
                        No custom documents yet. Add a row and name it (e.g. Builder Letter).
                      </td>
                    </tr>
                  ) : (
                    otherDocs.map((entry) => {
                      const count = attachmentCountFor(entry.typeRef);
                      return (
                        <tr key={entry.id} className="hover:bg-muted/20">
                          <td className="px-3 py-2">
                            <Input
                              className="h-8 text-xs"
                              value={entry.name}
                              placeholder="e.g. CA Declaration"
                              onChange={(e) => {
                                const name = e.target.value;
                                setOtherDocs((prev) => {
                                  const next = prev.map((row) =>
                                    row.id === entry.id ? { ...row, name } : row,
                                  );
                                  saveOtherDocumentEntries(file.id, next);
                                  return next;
                                });
                              }}
                            />
                            {count > 0 ? (
                              <p className="mt-1 text-[10px] text-muted-foreground">
                                {count} file{count === 1 ? "" : "s"} attached
                              </p>
                            ) : null}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex justify-end">
                              <RowAction
                                label="Upload"
                                onClick={() =>
                                  uploadDocument(
                                    entry.typeRef,
                                    entry.name.trim() || "Supporting Document",
                                  )
                                }
                                icon={<Upload className="h-3 w-3" />}
                                primary={count === 0}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <DocumentRegistryPanel
            file={file}
            records={registryRecords}
            customerLabel={context.customer ?? file.customerName}
            onPreview={(record) => openViewer(record.typeRef)}
            onReplace={(record) =>
              promptUpload(record.typeRef, record.categoryLabel, record.id)
            }
            onRefresh={refreshRegistry}
          />
        </div>
      </LeadOpportunityJourneyChrome>

      <DocumentReadinessDrawer
        open={readinessOpen}
        onOpenChange={setReadinessOpen}
        checklist={checklist}
        filter={kpiFilter}
        onUpload={(item) => {
          uploadDocument(item.folderId ?? item.typeRef, item.label);
          setReadinessOpen(false);
        }}
        onTakeMeThere={takeMeThere}
      />

      <DocumentViewerOverlay
        open={Boolean(viewerItem)}
        onClose={closeViewer}
        item={viewerItem}
        versions={viewerItem ? versionsMap[viewerItem.typeRef] ?? [] : []}
        allItems={flatItems}
        workflowStage={checklist.workflowStage}
        onNavigate={(typeRef) => setViewerTypeRef(typeRef)}
        onReplace={(item) => uploadDocument(item.folderId ?? item.typeRef, item.label)}
        onShowHistory={(item) => setHistoryTypeRef(item.typeRef)}
      />

      <DocumentVersionHistoryDrawer
        open={Boolean(historyItem)}
        onOpenChange={(o) => !o && setHistoryTypeRef(null)}
        label={historyItem?.label ?? "Document"}
        versions={historyItem ? versionsMap[historyItem.typeRef] ?? [] : []}
        onViewVersion={() => {
          if (historyItem) openViewer(historyItem.typeRef);
        }}
      />

      <DocumentAttachmentsDrawer
        open={Boolean(attachmentsTypeRef)}
        onClose={() => setAttachmentsTypeRef(null)}
        categoryLabel={attachmentsLabel}
        records={
          attachmentsTypeRef && file
            ? listDocumentsByTypeRef(file.id, attachmentsTypeRef).filter(
                recordMatchesOwnerScope,
              )
            : []
        }
        onReplace={(record) => {
          promptUpload(record.typeRef, record.categoryLabel, record.id, "single");
        }}
        onPreview={(record) => {
          setAttachmentsTypeRef(null);
          openViewer(record.typeRef);
        }}
      />
    </div>
  );
}

function readinessBarTone(percent: number): {
  track: string;
  fill: string;
  label: string;
} {
  if (percent <= 30) {
    return {
      track: "bg-rose-500/15",
      fill: "bg-rose-500",
      label: "text-rose-800 dark:text-rose-200",
    };
  }
  if (percent <= 60) {
    return {
      track: "bg-orange-500/15",
      fill: "bg-orange-500",
      label: "text-orange-900 dark:text-orange-200",
    };
  }
  if (percent <= 80) {
    return {
      track: "bg-amber-500/15",
      fill: "bg-amber-400",
      label: "text-amber-950 dark:text-amber-100",
    };
  }
  return {
    track: "bg-emerald-500/15",
    fill: "bg-emerald-500",
    label: "text-emerald-900 dark:text-emerald-200",
  };
}

function DocumentReadinessBar({
  percent,
  categories,
  onOpenDetails,
}: {
  percent: number;
  categories?: Array<{ label: string; status: "complete" | "partial" | "pending" }>;
  onOpenDetails: () => void;
}) {
  const tone = readinessBarTone(percent);
  return (
    <button
      type="button"
      onClick={onOpenDetails}
      className="flex w-full flex-col gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-2 text-left shadow-sm hover:bg-muted/20"
      aria-label={`Document readiness ${percent} percent`}
    >
      <span className="flex w-full items-center gap-3">
        <span className={cn("shrink-0 text-[11px] font-semibold tabular-nums", tone.label)}>
          Readiness {percent}%
        </span>
        <span className={cn("h-2 min-w-0 flex-1 overflow-hidden rounded-full", tone.track)}>
          <span
            className={cn("block h-full rounded-full transition-[width] duration-300", tone.fill)}
            style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
          />
        </span>
      </span>
      {categories && categories.length > 0 ? (
        <span className="flex flex-wrap gap-1">
          {categories.map((c) => (
            <span
              key={c.label}
              className={cn(
                "rounded px-1.5 py-0.5 text-[9px] font-medium",
                c.status === "complete"
                  ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                  : c.status === "partial"
                    ? "bg-amber-500/15 text-amber-900 dark:text-amber-200"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {c.label}
              {c.status === "complete" ? " ✓" : c.status === "partial" ? " ·" : ""}
            </span>
          ))}
        </span>
      ) : null}
    </button>
  );
}

function RowAction({
  label,
  onClick,
  icon,
  primary,
  autoFocus,
}: {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
  primary?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <button
      type="button"
      autoFocus={autoFocus}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[10px] font-medium transition-colors",
        primary
          ? "border-teal-500/35 bg-teal-500/10 text-teal-900 hover:bg-teal-500/15 dark:text-teal-100"
          : "border-border/60 text-foreground hover:bg-muted/50",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
