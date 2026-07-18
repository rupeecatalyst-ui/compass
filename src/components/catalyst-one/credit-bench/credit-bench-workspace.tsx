"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Building2, FileText, Home, UserRound, Wallet } from "lucide-react";
import { LeadOpportunityJourneyChrome } from "@/components/catalyst-one/shared/lead-opportunity-journey-chrome";
import { OpportunityContextPicker } from "@/components/catalyst-one/shared/opportunity-context-picker";
import { ChanakyaGuide } from "@/components/catalyst-one/chanakya-guide";
import {
  journeyContextFromLoanFile,
  loadLeadJourneyLoanFile,
} from "@/lib/lead-opportunity-journey/load-context";
import {
  businessProfileFromLoanFile,
  resolveStatedDraftForFile,
  saveStatedDraft,
} from "@/lib/lead-opportunity-journey/stated-draft";
import { formatINR } from "@/lib/format-currency";
import { getContextAwareVisibility } from "@/lib/context-aware-data-collection";
import { getJourneyStageDisplayLabel } from "@/constants/lead-opportunity-journey";
import { ROUTES } from "@/constants/routes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { EcwStatedInformationDraft } from "@/types/enterprise-credit-workspace";
import type { LoanFile } from "@/types/catalyst-one";

/**
 * Lead Stage — Opportunity Setup (formerly Credit Bench).
 * Capture/reuse profile context. Verification stays in Credit Workbench.
 * Context-Aware: Financial vs Business sections follow employment family.
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

  const entryParam = searchParams.get("entry");

  useEffect(() => {
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
    if (identityChanged) {
      if (next) setStated(resolveStatedDraftForFile(next));
      else setStated({});
    }
    setLoading(false);
  }, [fileParam, opportunityId, entryParam]);

  const context = useMemo(() => journeyContextFromLoanFile(file), [file]);
  const profile = useMemo(
    () => (file ? businessProfileFromLoanFile(file) : null),
    [file],
  );
  const categoryCtx = useMemo(
    () => getContextAwareVisibility(file?.employmentType),
    [file?.employmentType],
  );

  useEffect(() => {
    if (section === "financial" && !categoryCtx.isSalariedFamily && categoryCtx.isSelfEmployedFamily) {
      setSection("business");
    }
    if (section === "business" && !categoryCtx.isSelfEmployedFamily && categoryCtx.isSalariedFamily) {
      setSection("financial");
    }
  }, [categoryCtx.isSalariedFamily, categoryCtx.isSelfEmployedFamily, section]);

  const persistDraft = async () => {
    if (!file) return;
    setSaving(true);
    try {
      const sanitized = categoryCtx.isSalariedFamily
        ? {
            ...stated,
            statedTurnover: undefined,
            statedBusinessVintage: undefined,
            statedNatureOfBusiness: undefined,
          }
        : categoryCtx.isSelfEmployedFamily
          ? { ...stated, statedIncomeMonthly: undefined }
          : stated;
      saveStatedDraft(file.id, sanitized);
      setStated(sanitized);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
          <p className="text-xs text-muted-foreground">Loading Opportunity Setup…</p>
        </div>
      </div>
    );
  }

  if (!file) {
    return (
      <OpportunityContextPicker
        targetHref={ROUTES.CREDIT_BENCH}
        title="Select an opportunity to set up"
        description="Opportunity Setup needs an active case. Pick one below or continue from Contact while staying on the same transaction."
      />
    );
  }

  const sections = [
    { id: "customer" as const, label: "Customer", icon: UserRound },
    { id: "loan" as const, label: "Loan Details", icon: FileText },
    ...(categoryCtx.isSalariedFamily || categoryCtx.family === "unknown"
      ? [{ id: "financial" as const, label: "Financial", icon: Wallet }]
      : []),
    ...(categoryCtx.isSelfEmployedFamily || categoryCtx.family === "unknown"
      ? [{ id: "business" as const, label: "Business Profile", icon: Building2 }]
      : []),
    { id: "property" as const, label: "Property", icon: Home },
    { id: "eligibility" as const, label: "Eligibility", icon: FileText },
  ];

  const businessFromProfile = Boolean(
    profile &&
      profile.source !== "none" &&
      (profile.turnover || profile.vintage || profile.natureOfBusiness || profile.companyName),
  );

  return (
    <div className="-mx-4 flex min-h-0 flex-col md:-mx-6 lg:-mx-8">
      <LeadOpportunityJourneyChrome
        moduleId="credit_bench"
        density="compact"
        hideContextChips
        title={context.customer || "Opportunity Setup"}
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
        headerActions={
          <ChanakyaGuide
            offerTour={false}
            context={{
              platform: "catalyst_one",
              workspaceId: "opportunity_setup",
              section,
              moduleId: section,
              transactionLabel: context.customer
                ? `${context.customer}${context.opportunity ? ` · ${context.opportunity}` : ""}`
                : undefined,
            }}
          />
        }
        onSaveDraft={persistDraft}
        saving={saving}
      >
        <div className="mx-auto grid max-w-6xl gap-4 p-4 sm:p-5 lg:grid-cols-[200px_minmax(0,1fr)]">
          <aside className="h-fit rounded-2xl border border-border/70 bg-card/80 p-2 shadow-sm backdrop-blur">
            <p className="px-2 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Setup
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
                description="Reuse salary from Business Profile when present; only capture gaps here."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {profile?.monthlyIncome && !stated.statedIncomeMonthly?.startsWith("override:") ? (
                    <ReadOnly
                      label="Monthly Income (Business Profile)"
                      value={profile.monthlyIncome}
                      badge="Reused"
                    />
                  ) : (
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
                  )}
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
              <Panel
                title="Business Profile"
                description={
                  businessFromProfile
                    ? "Previously captured Business Profile fields are shown read-only — no re-entry required."
                    : "Capture business context when not already on the customer / company profile."
                }
              >
                {businessFromProfile ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {profile?.companyName && (
                      <ReadOnly label="Business / Company" value={profile.companyName} badge="Reused" />
                    )}
                    {profile?.constitution && (
                      <ReadOnly label="Constitution" value={profile.constitution} badge="Reused" />
                    )}
                    <ReadOnly
                      label="Annual Turnover"
                      value={stated.statedTurnover || profile?.turnover || "—"}
                      badge="Reused"
                    />
                    <ReadOnly
                      label="Business Vintage (years)"
                      value={stated.statedBusinessVintage || profile?.vintage || "—"}
                      badge="Reused"
                    />
                    <ReadOnly
                      label="Nature of Business"
                      value={stated.statedNatureOfBusiness || profile?.natureOfBusiness || "—"}
                      badge="Reused"
                    />
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Stated Annual Turnover">
                      <Input
                        className="h-9 text-sm"
                        value={stated.statedTurnover ?? ""}
                        onChange={(e) =>
                          setStated((p) => ({ ...p, statedTurnover: e.target.value }))
                        }
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
                )}
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
                    label="Income Context"
                    value={
                      stated.statedIncomeMonthly || profile?.monthlyIncome
                        ? "Available"
                        : "Pending"
                    }
                  />
                  <ReadOnly
                    label="Business Profile"
                    value={businessFromProfile ? "Reused from profile" : "Capture if required"}
                  />
                </div>
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  Save Draft keeps setup information. Continue to Strategic Workspace → advances this
                  opportunity without leaving the transaction.
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
    <section className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ReadOnly({
  label,
  value,
  badge,
}: {
  label: string;
  value?: string | null;
  badge?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {badge && (
          <span className="rounded-md border border-teal-500/30 bg-teal-500/10 px-1.5 py-px text-[9px] font-semibold text-teal-800 dark:text-teal-200">
            {badge}
          </span>
        )}
      </div>
      <p className="mt-0.5 truncate text-sm font-medium text-foreground">{value || "—"}</p>
    </div>
  );
}

