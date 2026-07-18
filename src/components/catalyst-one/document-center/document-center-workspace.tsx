"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Bell,
  Download,
  FolderUp,
  Mail,
  MessageSquare,
  Upload,
} from "lucide-react";
import { LeadOpportunityJourneyChrome } from "@/components/catalyst-one/shared/lead-opportunity-journey-chrome";
import { OpportunityContextPicker } from "@/components/catalyst-one/shared/opportunity-context-picker";
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
import { EDIE_ADDRESS_PROOF_GROUP } from "@/constants/edie-certified/document-catalog";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import type { LoanFile } from "@/types/catalyst-one";
import type { EdieChecklistItem } from "@/types/edie-certified-rules";

/**
 * Document Center — Document Readiness Dashboard driven entirely by EDIE.
 */
export function DocumentCenterWorkspace() {
  const searchParams = useSearchParams();
  const fileParam = searchParams.get("file");
  const opportunityId = searchParams.get("opportunityId");
  const focusRef = searchParams.get("focus");
  const sectionParam = searchParams.get("section");
  const [file, setFile] = useState<LoanFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState<Record<string, boolean>>({});
  const [addressChoice, setAddressChoice] = useState<string | undefined>();
  const [toast, setToast] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);
  const focusEl = useRef<HTMLLIElement | null>(null);
  const entryParam = searchParams.get("entry");

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
    }
    setLoading(false);
  }, [fileParam, opportunityId, entryParam]);

  useEffect(() => {
    if (!focusRef || !focusEl.current) return;
    focusEl.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusRef, file?.id, receipts]);

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

  const markReceived = (typeRef: string) => {
    if (!file) return;
    const next = { ...receipts, [typeRef]: true };
    setReceipts(next);
    saveEdieReceipts(file.id, next);
    setDirty(false);
    setSavedOnce(true);
    setToast(`${typeRef.replace(/^doc:/, "").replace(/-/g, " ")} marked received`);
    window.setTimeout(() => setToast(null), 2500);
  };

  const onAddressSelect = (typeRef: string) => {
    if (!file) return;
    setAddressChoice(typeRef);
    saveAddressProofSelection(file.id, typeRef);
    setDirty(true);
  };

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
        <div className="space-y-4 p-4 sm:p-5">
          {toast && (
            <div className="rounded-lg border border-teal-500/25 bg-teal-500/10 px-3 py-2 text-xs text-teal-950 dark:text-teal-100">
              {toast}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ScoreTile label="Required" value={String(checklist.counts.mandatory + checklist.counts.required)} />
            <ScoreTile label="Received" value={String(checklist.counts.received)} accent />
            <ScoreTile label="Pending" value={String(checklist.counts.pending)} />
            <ScoreTile
              label="Critical Now"
              value={
                checklist.counts.criticalPending
                  ? String(checklist.counts.criticalPending)
                  : "None"
              }
              warn={checklist.counts.criticalPending > 0}
            />
          </div>

          <p className="text-[11px] text-muted-foreground">
            EDIE · {checklist.productRef.replace("product:", "")} · {checklist.customerCategory.replace("_", " ")} ·{" "}
            {checklist.transactionType.replace("_", " ")} · stage {checklist.workflowStage.replace(/_/g, " ")}
            {" · "}
            Completion {score.overallPct}%
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
                  onClick={() => {
                    setToast(`${a.label} ready — collection channel recorded for this file.`);
                    window.setTimeout(() => setToast(null), 2500);
                  }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/70 bg-card px-2.5 text-[11px] font-medium text-foreground shadow-sm transition-colors hover:bg-muted/50"
                >
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {a.label}
                </button>
              );
            })}
          </div>

          {checklist.modules.map((mod) => {
            const sectionFocus = sectionParam === mod.id;
            return (
              <section
                key={mod.id}
                id={`edie-section-${mod.id}`}
                className={cn(
                  "rounded-2xl border border-border/70 bg-card p-4 shadow-sm",
                  sectionFocus && "ring-2 ring-teal-500/40",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold">{mod.label}</h2>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {mod.id === "address_proof"
                        ? "Select one address proof — upload once."
                        : mod.id === "financial" && checklist.customerCategory !== "salaried"
                          ? "Upload all financial papers into one folder."
                          : mod.id === "property"
                            ? "Activated after Soft Approval — multiple files allowed."
                            : "Generated by EDIE certified rules."}
                    </p>
                  </div>
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {mod.items.filter((i) => i.complete || (i.choiceGroupId && i.optional)).length}/
                    {mod.items.filter((i) => !i.optional || !i.choiceGroupId).length}
                  </span>
                </div>

                {mod.id === "address_proof" ? (
                  <div className="mt-3 space-y-2">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Address proof type
                    </label>
                    <select
                      className="h-8 w-full max-w-sm rounded-md border border-border bg-background px-2 text-xs"
                      value={
                        addressChoice ||
                        mod.items.find((i) => !i.optional)?.typeRef ||
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
                    <ul className="divide-y divide-border/50 rounded-xl border border-border/50">
                      {mod.items
                        .filter((i) => !i.optional)
                        .map((item) => (
                          <ChecklistRow
                            key={item.typeRef}
                            item={item}
                            focused={focusRef === item.typeRef}
                            rowRef={focusRef === item.typeRef ? focusEl : undefined}
                            onMark={() => markReceived(item.typeRef)}
                          />
                        ))}
                    </ul>
                  </div>
                ) : (
                  <ul className="mt-3 divide-y divide-border/50 rounded-xl border border-border/50">
                    {mod.items
                      .filter((i) => !i.optional || i.moduleId === "customer_kyc" || i.moduleId === "banking")
                      .map((item) => (
                        <ChecklistRow
                          key={item.typeRef}
                          item={item}
                          focused={focusRef === item.typeRef}
                          rowRef={focusRef === item.typeRef ? focusEl : undefined}
                          onMark={() => markReceived(item.folderId ?? item.typeRef)}
                        />
                      ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </LeadOpportunityJourneyChrome>
    </div>
  );
}

function ChecklistRow({
  item,
  focused,
  rowRef,
  onMark,
}: {
  item: EdieChecklistItem;
  focused?: boolean;
  rowRef?: React.RefObject<HTMLLIElement | null>;
  onMark: () => void;
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
      <div className="min-w-0">
        <p className="font-semibold text-foreground">
          {item.uploadMode === "folder" ? `📁 ${item.folderLabel || item.label}` : item.label}
          {item.optional ? (
            <span className="ml-1.5 text-[9px] font-medium text-muted-foreground">Optional</span>
          ) : null}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {item.severity === "critical"
            ? "Critical"
            : item.mandatory
              ? "Mandatory"
              : "Required"}
          {item.uploadMode === "folder" ? " · Folder upload (unlimited files)" : ""}
          {item.criticalFromStage ? ` · Critical from ${item.criticalFromStage.replace(/_/g, " ")}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
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
          {item.complete ? "Received" : item.critical ? "Critical · Pending" : "Pending"}
        </span>
        {!item.complete && (
          <button
            type="button"
            className="rounded-md border border-border/60 px-2 py-1 text-[10px] font-medium hover:bg-muted/50"
            onClick={onMark}
            autoFocus={focused}
          >
            {item.uploadMode === "folder" ? "Upload to folder" : "Mark received"}
          </button>
        )}
      </div>
    </li>
  );
}

function ScoreTile({
  label,
  value,
  accent,
  warn,
}: {
  label: string;
  value: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-3 py-3 shadow-sm",
        accent
          ? "border-teal-500/30 bg-teal-500/10"
          : warn
            ? "border-amber-500/30 bg-amber-500/10"
            : "border-border/70 bg-card",
      )}
    >
      <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
