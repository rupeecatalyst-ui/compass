"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Building2, FileText, Home, UserRound, Wallet } from "lucide-react";
import { LeadOpportunityJourneyChrome } from "@/components/catalyst-one/shared/lead-opportunity-journey-chrome";
import {
  journeyContextFromLoanFile,
  loadLeadJourneyLoanFile,
} from "@/lib/lead-opportunity-journey/load-context";
import { formatINR } from "@/lib/format-currency";
import { getJourneyStageDisplayLabel } from "@/constants/lead-opportunity-journey";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { EcwStatedInformationDraft } from "@/types/enterprise-credit-workspace";
import type { LoanFile } from "@/types/catalyst-one";

const DRAFT_KEY = "catalyst.credit-bench.stated";

function loadStatedDraft(fileId: string): EcwStatedInformationDraft {
  try {
    const raw = localStorage.getItem(`${DRAFT_KEY}:${fileId}`);
    if (!raw) return {};
    return JSON.parse(raw) as EcwStatedInformationDraft;
  } catch {
    return {};
  }
}

function saveStatedDraft(fileId: string, draft: EcwStatedInformationDraft) {
  localStorage.setItem(`${DRAFT_KEY}:${fileId}`, JSON.stringify(draft));
}

/**
 * Lead Stage — Credit Bench.
 * Capture customer, loan, financial, business, property context (UI only).
 */
export function CreditBenchWorkspace() {
  const searchParams = useSearchParams();
  const fileParam = searchParams.get("file");
  const opportunityId = searchParams.get("opportunityId");
  const [file, setFile] = useState<LoanFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [stated, setStated] = useState<EcwStatedInformationDraft>({});
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState<
    "customer" | "loan" | "financial" | "business" | "property" | "eligibility"
  >("customer");

  useEffect(() => {
    setLoading(true);
    const next = loadLeadJourneyLoanFile(fileParam);
    setFile(next);
    if (next) setStated(loadStatedDraft(next.id));
    else setStated({});
    setLoading(false);
  }, [fileParam]);

  const context = useMemo(() => journeyContextFromLoanFile(file), [file]);

  const persistDraft = async () => {
    if (!file) return;
    setSaving(true);
    try {
      saveStatedDraft(file.id, stated);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
          <p className="text-xs text-muted-foreground">Loading Credit Bench…</p>
        </div>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center px-6">
        <div className="max-w-md rounded-2xl border border-border/70 bg-card p-8 text-center shadow-sm">
          <UserRound className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-semibold">No loan file in context</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Open Credit Bench from a loan file or Opportunity Workspace so customer and loan context
            load automatically.
          </p>
        </div>
      </div>
    );
  }

  const sections = [
    { id: "customer" as const, label: "Customer", icon: UserRound },
    { id: "loan" as const, label: "Loan Details", icon: FileText },
    { id: "financial" as const, label: "Financial", icon: Wallet },
    { id: "business" as const, label: "Business", icon: Building2 },
    { id: "property" as const, label: "Property", icon: Home },
    { id: "eligibility" as const, label: "Eligibility", icon: FileText },
  ];

  return (
    <div className="-mx-4 flex h-[calc(100vh-4rem)] flex-col md:-mx-6 lg:-mx-8">
      <LeadOpportunityJourneyChrome
        moduleId="credit_bench"
        context={context}
        fileId={file.id}
        opportunityId={opportunityId}
        onSaveDraft={persistDraft}
        saving={saving}
      >
        <div className="mx-auto grid max-w-6xl gap-4 p-4 sm:p-5 lg:grid-cols-[200px_minmax(0,1fr)]">
          <aside className="h-fit rounded-2xl border border-border/70 bg-card/80 p-2 shadow-sm backdrop-blur">
            <p className="px-2 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Capture
            </p>
            <nav className="space-y-0.5">
              {sections.map((s) => {
                const Icon = s.icon;
                const active = section === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSection(s.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium transition-colors",
                      active
                        ? "bg-teal-600 text-white shadow-sm"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                    {s.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="space-y-4">
            {section === "customer" && (
              <Panel
                title="Customer Information"
                description="Identity context captured once — reused across Document Center and Credit Workbench."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <ReadOnly label="Customer Name" value={file.customerName} />
                  <ReadOnly label="Mobile" value={file.customerMobile} />
                  <ReadOnly label="Email" value={file.customerEmail} />
                  <ReadOnly label="City" value={file.city} />
                  <ReadOnly label="State" value={file.state} />
                  <ReadOnly label="Employment Type" value={file.employmentType} />
                </div>
              </Panel>
            )}

            {section === "loan" && (
              <Panel title="Loan Details" description="Product and amount framing for this engagement.">
                <div className="grid gap-3 sm:grid-cols-2">
                  <ReadOnly label="Product" value={file.loanProduct} />
                  <ReadOnly
                    label="Required Amount"
                    value={formatINR(file.requiredAmount || file.loanAmount)}
                  />
                  <ReadOnly label="Lending Type" value={file.lendingType} />
                  <ReadOnly label="Transaction Type" value={file.transactionType} />
                  <ReadOnly label="Stage" value={getJourneyStageDisplayLabel(file.stage)} />
                  <ReadOnly label="Relationship Manager" value={file.relationshipManager} />
                </div>
              </Panel>
            )}

            {section === "financial" && (
              <Panel
                title="Financial Details"
                description="Stated financial parameters for planning — verification happens in Credit Workbench."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Stated Monthly Income">
                    <Input
                      className="h-9 text-sm"
                      value={stated.statedIncomeMonthly ?? ""}
                      onChange={(e) =>
                        setStated((p) => ({ ...p, statedIncomeMonthly: e.target.value }))
                      }
                      placeholder="e.g. 1,85,000"
                    />
                  </Field>
                  <Field label="Stated Obligations / EMIs">
                    <Input
                      className="h-9 text-sm"
                      value={stated.statedObligations ?? ""}
                      onChange={(e) =>
                        setStated((p) => ({ ...p, statedObligations: e.target.value }))
                      }
                      placeholder="Existing obligations"
                    />
                  </Field>
                </div>
              </Panel>
            )}

            {section === "business" && (
              <Panel title="Business Details" description="Stated business profile for self-employed paths.">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Stated Annual Turnover">
                    <Input
                      className="h-9 text-sm"
                      value={stated.statedTurnover ?? ""}
                      onChange={(e) => setStated((p) => ({ ...p, statedTurnover: e.target.value }))}
                    />
                  </Field>
                  <Field label="Business Vintage (years)">
                    <Input
                      className="h-9 text-sm"
                      value={stated.statedBusinessVintage ?? ""}
                      onChange={(e) =>
                        setStated((p) => ({ ...p, statedBusinessVintage: e.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Nature of Business">
                    <Input
                      className="h-9 text-sm"
                      value={stated.statedNatureOfBusiness ?? ""}
                      onChange={(e) =>
                        setStated((p) => ({ ...p, statedNatureOfBusiness: e.target.value }))
                      }
                    />
                  </Field>
                </div>
              </Panel>
            )}

            {section === "property" && (
              <Panel title="Property Details" description="Stated property context for secured products.">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Property Type">
                    <Input
                      className="h-9 text-sm"
                      value={stated.statedPropertyType ?? file.propertyType ?? ""}
                      onChange={(e) =>
                        setStated((p) => ({ ...p, statedPropertyType: e.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Property Value">
                    <Input
                      className="h-9 text-sm"
                      value={stated.statedPropertyValue ?? ""}
                      onChange={(e) =>
                        setStated((p) => ({ ...p, statedPropertyValue: e.target.value }))
                      }
                      placeholder="Approx. market value"
                    />
                  </Field>
                  <Field label="Property Location">
                    <Input
                      className="h-9 text-sm"
                      value={stated.statedPropertyLocation ?? ""}
                      onChange={(e) =>
                        setStated((p) => ({ ...p, statedPropertyLocation: e.target.value }))
                      }
                    />
                  </Field>
                </div>
              </Panel>
            )}

            {section === "eligibility" && (
              <Panel
                title="Basic Eligibility"
                description="Read-only context for early planning — credit assessment remains in Credit Workbench."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <ReadOnly label="Employment" value={file.employmentType || "—"} />
                  <ReadOnly label="Product Path" value={file.loanProduct} />
                  <ReadOnly
                    label="Stated Income Captured"
                    value={stated.statedIncomeMonthly ? "Yes" : "Pending"}
                  />
                  <ReadOnly
                    label="Property Stated"
                    value={
                      stated.statedPropertyType || file.propertyType
                        ? "Available"
                        : "Not required / pending"
                    }
                  />
                </div>
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  Save Draft keeps stated information in this workspace. Save & Continue opens Document
                  Center to collect the applicable checklist — not verify documents.
                </p>
              </Panel>
            )}
          </div>
        </div>
      </LeadOpportunityJourneyChrome>
    </div>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm sm:p-5">
      <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium capitalize text-foreground">{value || "—"}</p>
    </div>
  );
}
