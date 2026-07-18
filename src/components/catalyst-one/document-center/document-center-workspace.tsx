"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Bell,
  Download,
  Eye,
  FolderUp,
  History,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Replace,
  Upload,
} from "lucide-react";
import { LeadOpportunityJourneyChrome } from "@/components/catalyst-one/shared/lead-opportunity-journey-chrome";
import { OpportunityContextPicker } from "@/components/catalyst-one/shared/opportunity-context-picker";
import {
  DocumentReadinessCard,
  type DocumentKpiFilter,
} from "@/components/catalyst-one/document-center/document-readiness-card";
import { DocumentReadinessDrawer } from "@/components/catalyst-one/document-center/document-readiness-drawer";
import { DocumentViewerOverlay } from "@/components/catalyst-one/document-center/document-viewer-overlay";
import { DocumentVersionHistoryDrawer } from "@/components/catalyst-one/document-center/document-version-history-drawer";
import {
  journeyContextFromLoanFile,
  loadLeadJourneyLoanFile,
} from "@/lib/lead-opportunity-journey/load-context";
import {
  loadAddressProofSelection,
  loadEdieReceipts,
  resolveEdieChecklistForLoanFile,
  saveAddressProofSelection,
  saveEdieReceipts,
  seedEdieCertifiedRulesIfNeeded,
} from "@/lib/edie-certified";
import { computeDocumentCompletionScore } from "@/lib/document-completion/score";
import {
  appendDocumentVersion,
  loadDocumentVersions,
  reasonForDocument,
  type DocumentCenterVersion,
} from "@/lib/document-center/versions";
import { EDIE_ADDRESS_PROOF_GROUP } from "@/constants/edie-certified/document-catalog";
import { ROUTES } from "@/constants/routes";
import { useAuthContext } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import type { LoanFile } from "@/types/catalyst-one";
import type { EdieChecklistItem } from "@/types/edie-certified-rules";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Enterprise Document Center — workspace UX over EDIE (rules unchanged).
 */
export function DocumentCenterWorkspace() {
  const { user } = useAuthContext();
  const searchParams = useSearchParams();
  const fileParam = searchParams.get("file");
  const opportunityId = searchParams.get("opportunityId");
  const focusParam = searchParams.get("focus");
  const sectionParam = searchParams.get("section");
  const entryParam = searchParams.get("entry");

  const [file, setFile] = useState<LoanFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState<Record<string, boolean>>({});
  const [addressChoice, setAddressChoice] = useState<string | undefined>();
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

  const focusEl = useRef<HTMLLIElement | null>(null);
  const scrollRoot = useRef<HTMLDivElement | null>(null);
  const scrollPos = useRef(0);

  const uploaderName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "Relationship Manager";

  useEffect(() => {
    seedEdieCertifiedRulesIfNeeded();
    const next = loadLeadJourneyLoanFile(fileParam, opportunityId, {
      dashboardEntry: entryParam === "dashboard",
    });
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
      setVersionsMap(loadDocumentVersions(next.id));
    }
    setLoading(false);
  }, [fileParam, opportunityId, entryParam]);

  useEffect(() => {
    setLocalFocus(focusParam);
  }, [focusParam]);

  useEffect(() => {
    if (!localFocus || !focusEl.current) return;
    focusEl.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [localFocus, file?.id, receipts, kpiFilter]);

  const checklist = useMemo(() => {
    if (!file) return null;
    return resolveEdieChecklistForLoanFile(file, {
      receipts,
      addressProofSelection: addressChoice,
    });
  }, [file, receipts, addressChoice]);

  const score = useMemo(() => {
    if (!checklist) return computeDocumentCompletionScore({ items: [] });
    const scoringItems = checklist.items.filter(
      (i) => i.choiceGroupId !== EDIE_ADDRESS_PROOF_GROUP || !i.optional,
    );
    return computeDocumentCompletionScore({
      items: scoringItems.map((i) => ({
        typeRef: i.typeRef,
        label: i.label,
        weight: i.weight,
        mandatory: i.mandatory,
        critical: i.critical,
        complete: i.complete,
      })),
    });
  }, [checklist]);

  const context = useMemo(() => journeyContextFromLoanFile(file), [file]);

  const flatItems = useMemo(() => {
    if (!checklist) return [] as EdieChecklistItem[];
    return checklist.modules.flatMap((m) => {
      if (m.id === "address_proof") {
        const selected =
          addressChoice ||
          m.items.find((x) => !x.optional)?.typeRef ||
          m.items[0]?.typeRef;
        return m.items.filter((i) => i.typeRef === selected);
      }
      return m.items.filter(
        (i) => !i.optional || i.moduleId === "customer_kyc" || i.moduleId === "banking",
      );
    });
  }, [checklist, addressChoice]);

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

  const uploadDocument = (typeRef: string, label?: string) => {
    if (!file) return;
    preserveScroll();
    const key = typeRef;
    const next = { ...receipts, [key]: true };
    setReceipts(next);
    saveEdieReceipts(file.id, next);
    const list = appendDocumentVersion(file.id, key, uploaderName);
    setVersionsMap((prev) => ({ ...prev, [key]: list }));
    setDirty(false);
    setSavedOnce(true);
    flash(`${(label || key).replace(/^doc:/, "").replace(/-/g, " ")} uploaded`);
    restoreScroll();
  };

  const onAddressSelect = (typeRef: string) => {
    if (!file) return;
    setAddressChoice(typeRef);
    saveAddressProofSelection(file.id, typeRef);
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

  const viewerItem = flatItems.find((i) => i.typeRef === viewerTypeRef) ?? null;
  const historyItem = flatItems.find((i) => i.typeRef === historyTypeRef) ?? null;

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  if (!file || !checklist) {
    return (
      <OpportunityContextPicker
        targetHref={ROUTES.DOCUMENT_CENTER}
        title="Select an opportunity for Document Center"
        description="Document collection needs an active case. Choose one below or continue from Opportunity Setup."
      />
    );
  }

  return (
    <div className="-mx-4 flex min-h-0 flex-col md:-mx-6 lg:-mx-8">
      <LeadOpportunityJourneyChrome
        moduleId="document_center"
        density="compact"
        hideContextChips
        title={context.customer || "Document Center"}
        identityLine={[
          context.opportunity,
          context.product,
          context.amount,
          context.stage,
          context.rm ? `RM ${context.rm}` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        context={context}
        fileId={file.id}
        opportunityId={opportunityId}
        hasUnsavedChanges={dirty}
        acknowledgeCleanClose={!dirty && savedOnce}
        onSaveDraft={async () => {
          saveEdieReceipts(file.id, receipts);
          if (addressChoice) saveAddressProofSelection(file.id, addressChoice);
          setDirty(false);
          setSavedOnce(true);
        }}
      >
        <div ref={scrollRoot} className="space-y-4 p-4 sm:p-5">
          {toast ? (
            <div className="rounded-lg border border-teal-500/25 bg-teal-500/10 px-3 py-2 text-xs text-teal-950 dark:text-teal-100">
              {toast}
            </div>
          ) : null}

          <DocumentReadinessCard
            checklist={checklist}
            score={score}
            activeFilter={kpiFilter}
            onOpenReadiness={() => {
              setKpiFilter("readiness");
              setReadinessOpen(true);
            }}
            onKpiClick={(f) => {
              setKpiFilter(f);
              if (f === "readiness") setReadinessOpen(true);
              else setReadinessOpen(true);
            }}
          />

          <p className="text-[11px] text-muted-foreground">
            EDIE · {checklist.productRef.replace("product:", "")} ·{" "}
            {checklist.productFamily.replace("_", " ")} · stage{" "}
            {checklist.workflowStage.replace(/_/g, " ")}
            {kpiFilter !== "all" && kpiFilter !== "readiness" ? (
              <>
                {" · "}
                Filter{" "}
                <button
                  type="button"
                  className="font-medium text-teal-800 underline-offset-2 hover:underline dark:text-teal-200"
                  onClick={() => setKpiFilter("all")}
                >
                  {kpiFilter} · Clear
                </button>
              </>
            ) : null}
          </p>

          <div className="flex flex-wrap gap-2">
            {[
              { label: "Upload", icon: Upload },
              { label: "Bulk Upload", icon: FolderUp },
              { label: "WhatsApp Import", icon: MessageSquare },
              { label: "Email Import", icon: Mail },
              { label: "Request Documents", icon: Bell },
              { label: "Send Reminder", icon: Bell },
              { label: "Download", icon: Download },
            ].map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => flash(`${a.label} ready — stays in this workspace.`)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/70 bg-card px-2.5 text-[11px] font-medium shadow-sm transition-colors hover:bg-muted/50"
                >
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {a.label}
                </button>
              );
            })}
          </div>

          {checklist.modules.map((mod) => {
            const isOpen = expanded[mod.id] ?? true;
            const sectionFocus = sectionParam === mod.id || localFocus?.startsWith("doc:");
            let rows =
              mod.id === "address_proof"
                ? (() => {
                    const selected =
                      addressChoice ||
                      mod.items.find((x) => !x.optional)?.typeRef ||
                      mod.items[0]?.typeRef;
                    return mod.items.filter((i) => i.typeRef === selected);
                  })()
                : mod.items.filter(
                    (i) => !i.optional || i.moduleId === "customer_kyc" || i.moduleId === "banking",
                  );
            if (filteredTypeRefs) {
              rows = rows.filter((i) => filteredTypeRefs.has(i.typeRef));
            }
            if (filteredTypeRefs && rows.length === 0) return null;

            return (
              <section
                key={mod.id}
                id={`edie-section-${mod.id}`}
                className={cn(
                  "rounded-2xl border border-border/70 bg-card p-4 shadow-sm",
                  sectionParam === mod.id && "ring-2 ring-teal-500/40",
                )}
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 text-left"
                  onClick={() => setExpanded((e) => ({ ...e, [mod.id]: !isOpen }))}
                >
                  <div>
                    <h2 className="text-sm font-semibold">{mod.label}</h2>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {mod.id === "address_proof"
                        ? "Select one address proof — upload once."
                        : mod.id === "financial" && checklist.customerCategory !== "salaried"
                          ? "Unlimited files in Financial Documents Folder."
                          : mod.id === "property"
                            ? "Activated after Soft Approval — unlimited files."
                            : "Generated by EDIE — actions stay in this workspace."}
                    </p>
                  </div>
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {isOpen ? "Collapse" : "Expand"}
                  </span>
                </button>

                {isOpen ? (
                  <>
                    {mod.id === "address_proof" ? (
                      <div className="mt-3">
                        <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Address proof type
                          {checklist.productFamily === "asset_security" ? " (optional)" : ""}
                        </label>
                        <select
                          className="mt-1 h-8 w-full max-w-sm rounded-md border border-border bg-background px-2 text-xs"
                          value={
                            addressChoice ||
                            mod.items.find((i) => !i.optional)?.typeRef ||
                            mod.items[0]?.typeRef ||
                            "doc:address-electricity"
                          }
                          onChange={(e) => onAddressSelect(e.target.value)}
                        >
                          {mod.items.map((i) => (
                            <option key={i.typeRef} value={i.typeRef}>
                              {i.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    <ul className="mt-3 divide-y divide-border/50 rounded-xl border border-border/50">
                      {rows.map((item) => (
                        <DocumentActionRow
                          key={item.typeRef}
                          item={item}
                          focused={localFocus === item.typeRef}
                          rowRef={localFocus === item.typeRef ? focusEl : undefined}
                          hasVersions={(versionsMap[item.typeRef] ?? []).length > 0}
                          onView={() => openViewer(item.typeRef)}
                          onUpload={() => uploadDocument(item.folderId ?? item.typeRef, item.label)}
                          onReplace={() => uploadDocument(item.folderId ?? item.typeRef, item.label)}
                          onHistory={() => setHistoryTypeRef(item.typeRef)}
                        />
                      ))}
                      {rows.length === 0 ? (
                        <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                          No documents in this filter for {mod.label}.
                        </li>
                      ) : null}
                    </ul>
                  </>
                ) : null}
                {sectionFocus ? null : null}
              </section>
            );
          })}
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
    </div>
  );
}

function DocumentActionRow({
  item,
  focused,
  rowRef,
  hasVersions,
  onView,
  onUpload,
  onReplace,
  onHistory,
}: {
  item: EdieChecklistItem;
  focused?: boolean;
  rowRef?: React.RefObject<HTMLLIElement | null>;
  hasVersions: boolean;
  onView: () => void;
  onUpload: () => void;
  onReplace: () => void;
  onHistory: () => void;
}) {
  return (
    <li
      ref={rowRef}
      id={`edie-doc-${item.typeRef}`}
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-xs transition-colors",
        focused && "bg-teal-500/10 ring-1 ring-inset ring-teal-500/35",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground">
          {item.uploadMode === "folder" ? `📁 ${item.folderLabel || item.label}` : item.label}
          {item.optional ? (
            <span className="ml-1.5 text-[9px] font-medium text-muted-foreground">Optional</span>
          ) : null}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {item.critical ? "Critical" : item.mandatory ? "Mandatory" : "Required"}
          {" · "}
          {reasonForDocument(item)}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[9px] font-semibold",
            item.complete
              ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
              : item.critical
                ? "bg-rose-500/15 text-rose-800 dark:text-rose-200"
                : "bg-amber-500/15 text-amber-900 dark:text-amber-200",
          )}
        >
          {item.complete ? "Received" : item.critical ? "Critical" : "Pending"}
        </span>

        <RowAction label="View" onClick={onView} icon={<Eye className="h-3 w-3" />} />
        <RowAction
          label={item.complete ? "Replace" : "Upload"}
          onClick={item.complete ? onReplace : onUpload}
          icon={
            item.complete ? <Replace className="h-3 w-3" /> : <Upload className="h-3 w-3" />
          }
          primary={!item.complete}
          autoFocus={focused && !item.complete}
        />
        <RowAction label="History" onClick={onHistory} icon={<History className="h-3 w-3" />} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground hover:bg-muted/50"
              aria-label="More actions"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs">
            <DropdownMenuItem onClick={onView}>View</DropdownMenuItem>
            <DropdownMenuItem onClick={onUpload}>Upload</DropdownMenuItem>
            <DropdownMenuItem onClick={onReplace}>Replace</DropdownMenuItem>
            <DropdownMenuItem onClick={onHistory}>
              History {hasVersions ? "" : "(empty)"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
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
