"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Bell,
  Download,
  FolderUp,
  Mail,
  MessageSquare,
  Upload,
} from "lucide-react";
import { DocumentsWorkspace } from "@/components/catalyst-one/documents/documents-workspace";
import { LeadOpportunityJourneyChrome } from "@/components/catalyst-one/shared/lead-opportunity-journey-chrome";
import {
  journeyContextFromLoanFile,
  loadLeadJourneyLoanFile,
} from "@/lib/lead-opportunity-journey/load-context";
import {
  listEdieDocumentRules,
  registerEdieDocumentRule,
  resolveEdieDocumentRulesForContext,
} from "@/lib/enterprise-document-intelligence-engine";
import { resolveApplicableWeights, computeDocumentCompletionScore } from "@/lib/document-completion/score";
import { cn } from "@/lib/utils";
import type { LoanFile } from "@/types/catalyst-one";

const RECEIPT_KEY = "catalyst.document-center.receipts";

function seedDocumentRulesIfEmpty() {
  if (listEdieDocumentRules().length > 0) return;
  registerEdieDocumentRule({
    ruleCode: "EDIE-HL-SAL-001",
    ruleName: "Home loan salaried KYC pack",
    productRef: "product:home-loan",
    employmentType: "salaried",
    constitution: "individual",
    customerCategory: "standard",
    loanStage: "origination",
    documentTypeRefs: ["doc:pan", "doc:aadhaar", "doc:salary-slip", "doc:bank-statement", "doc:property-papers"],
    uploadMethod: "both",
    enabled: true,
    createdBy: "system",
  });
  registerEdieDocumentRule({
    ruleCode: "EDIE-HL-SE-001",
    ruleName: "Home loan self-employed pack",
    productRef: "product:home-loan",
    employmentType: "self_employed",
    constitution: "individual",
    customerCategory: "standard",
    loanStage: "origination",
    documentTypeRefs: ["doc:pan", "doc:itr", "doc:bank-statement", "doc:gst", "doc:property-papers"],
    uploadMethod: "individual",
    enabled: true,
    createdBy: "system",
  });
}

function loadReceipts(fileId: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(`${RECEIPT_KEY}:${fileId}`);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function saveReceipts(fileId: string, map: Record<string, boolean>) {
  localStorage.setItem(`${RECEIPT_KEY}:${fileId}`, JSON.stringify(map));
}

/**
 * Lead Stage — Document Center.
 * Collect documents via EDIE rules. Verification stays in Credit Workbench.
 */
export function DocumentCenterWorkspace() {
  const searchParams = useSearchParams();
  const fileParam = searchParams.get("file");
  const opportunityId = searchParams.get("opportunityId");
  const [file, setFile] = useState<LoanFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    seedDocumentRulesIfEmpty();
    const next = loadLeadJourneyLoanFile(fileParam);
    setFile(next);
    if (next) setReceipts(loadReceipts(next.id));
    setLoading(false);
  }, [fileParam]);

  const employmentKey = useMemo(() => {
    const e = (file?.employmentType || "salaried").toLowerCase();
    if (e.includes("self")) return "self_employed";
    return "salaried";
  }, [file?.employmentType]);

  const typeRefs = useMemo(() => {
    seedDocumentRulesIfEmpty();
    const rules = resolveEdieDocumentRulesForContext({
      productRef: file?.loanProduct?.toLowerCase().includes("lap")
        ? "product:lap"
        : "product:home-loan",
      employmentType: employmentKey,
      constitution: "individual",
      customerCategory: "standard",
      loanStage: "origination",
    });
    return [...new Set(rules.flatMap((r) => r.documentTypeRefs))];
  }, [file?.loanProduct, employmentKey]);

  const score = useMemo(() => {
    const weights = resolveApplicableWeights({
      documentTypeRefs: typeRefs,
      employmentType: employmentKey,
    });
    const items = weights.map((w) => ({
      typeRef: w.typeRef,
      label: w.label,
      weight: w.weight,
      mandatory: w.mandatory,
      critical: w.critical,
      complete: Boolean(receipts[w.typeRef]),
    }));
    // Also treat loan-file documents as received for back-compat
    if (file?.documents?.length) {
      for (const d of file.documents) {
        const name = d.name.toLowerCase();
        for (const item of items) {
          if (!item.complete && name.includes(item.label.toLowerCase().split(" ")[0]!)) {
            item.complete = d.status === "received" || d.status === "verified" || d.status === "pending";
          }
        }
      }
    }
    return computeDocumentCompletionScore({ items });
  }, [typeRefs, employmentKey, receipts, file?.documents]);

  const context = useMemo(() => journeyContextFromLoanFile(file), [file]);

  const markReceived = (typeRef: string) => {
    if (!file) return;
    const next = { ...receipts, [typeRef]: true };
    setReceipts(next);
    saveReceipts(file.id, next);
    setToast(`${typeRef.replace(/^doc:/, "")} marked received`);
    window.setTimeout(() => setToast(null), 2500);
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="-mx-4 flex h-[calc(100vh-4rem)] flex-col md:-mx-6 lg:-mx-8">
      <LeadOpportunityJourneyChrome
        moduleId="document_center"
        context={context}
        fileId={file?.id}
        opportunityId={opportunityId}
        onSaveDraft={async () => {
          if (file) saveReceipts(file.id, receipts);
        }}
      >
        <div className="space-y-4 p-4 sm:p-5">
          {toast && (
            <div className="rounded-lg border border-teal-500/25 bg-teal-500/10 px-3 py-2 text-xs text-teal-950 dark:text-teal-100">
              {toast}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ScoreTile label="Completion" value={`${score.overallPct}%`} accent />
            <ScoreTile label="Mandatory" value={`${score.mandatoryPct}%`} />
            <ScoreTile label="Conditional" value={`${score.conditionalPct}%`} />
            <ScoreTile
              label="Critical Missing"
              value={score.criticalMissing.length ? score.criticalMissing.join(", ") : "None"}
              warn={score.criticalMissing.length > 0}
            />
          </div>

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

          <section className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">Dynamic checklist</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Generated from EDIE rules for this product and employment — collection only.
                </p>
              </div>
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {score.uploadedCount}/{score.totalCount} collected
              </span>
            </div>
            <ul className="mt-3 divide-y divide-border/50 rounded-xl border border-border/50">
              {resolveApplicableWeights({
                documentTypeRefs: typeRefs,
                employmentType: employmentKey,
              }).map((w) => {
                const done = Boolean(receipts[w.typeRef]);
                return (
                  <li
                    key={w.typeRef}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{w.label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Weight {w.weight}
                        {w.mandatory ? " · Mandatory" : " · Conditional"}
                        {w.critical ? " · Critical" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                          done
                            ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                            : "bg-amber-500/15 text-amber-900 dark:text-amber-200",
                        )}
                      >
                        {done ? "Received" : "Pending"}
                      </span>
                      {!done && (
                        <button
                          type="button"
                          className="rounded-md border border-border/60 px-2 py-1 text-[10px] font-medium hover:bg-muted/50"
                          onClick={() => markReceived(w.typeRef)}
                        >
                          Mark received
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
              {typeRefs.length === 0 && (
                <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No documents on checklist for this context yet. Adjust product or employment context
                  below.
                </li>
              )}
            </ul>
          </section>

          <section className="rounded-2xl border border-border/70 bg-muted/10 p-4">
            <h2 className="text-sm font-semibold">EDIE rule intelligence</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Context-aware document rules power this checklist. Upload simulations log to Dialogue Center.
            </p>
            <div className="mt-4">
              <DocumentsWorkspace />
            </div>
          </section>
        </div>
      </LeadOpportunityJourneyChrome>
    </div>
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
