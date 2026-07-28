"use client";

import { useEffect, useState } from "react";
import { LeadOpportunityJourneyChrome } from "@/components/catalyst-one/shared/lead-opportunity-journey-chrome";
import {
  enterpriseOpportunityApiClient,
  type EnterpriseOpportunityApiRecord,
} from "@/lib/enterprise-opportunity/opportunity-api-client";
import { peekSessionOpportunity } from "@/lib/enterprise-session/opportunity-runtime-cache";
import { findOperationalEcmContactById } from "@/lib/enterprise-registry";
import { formatINR } from "@/lib/format-currency";
import {
  displayOpportunityEnumLabel,
  displayOpportunityRequirementStageLabel,
} from "@/lib/lead-opportunity-journey/opportunity-field-display";
import { resolveOpportunityBorrowerIdentity } from "@/lib/enterprise-borrower-identity";
import { formatOpportunitySourceDisplay } from "@/constants/opportunity-business-source";
import { opportunityLifecycleLabel } from "@/constants/opportunity-lifecycle";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";
import { WorkspaceBorrowerPartySections } from "./workspace-borrower-party-sections";
import { isCompanyPrimaryBorrower } from "@/constants/opportunity-primary-borrower";

/**
 * Opportunity Creation stage when an Enterprise Opportunity exists without a Loan File yet.
 * Landing surface after Start Loan Journey — Opportunity Workspace Stage 1 (Lead Creation).
 * Collect loan-specific information here; no intermediate Loan Journey form.
 */
export function OpportunityCreationStage({
  opportunityId,
  fileId,
}: {
  opportunityId: string;
  fileId?: string | null;
}) {
  const [opp, setOpp] = useState<EnterpriseOpportunityApiRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const warm = peekSessionOpportunity(opportunityId);
    if (warm?.id) {
      setOpp(warm);
      setError(null);
      setLoading(false);
      // CO-PERF-002 — background revalidate; avoid blocking Creation stage remount.
      void enterpriseOpportunityApiClient
        .getOpportunity(opportunityId)
        .then((row) => {
          if (!cancelled) {
            setOpp(row);
            setError(null);
          }
        })
        .catch(() => {
          /* keep warm */
        });
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    void enterpriseOpportunityApiClient
      .getOpportunity(opportunityId)
      .then((row) => {
        if (!cancelled) {
          setOpp(row);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setOpp(null);
          setError(err instanceof Error ? err.message : "Failed to load Opportunity");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [opportunityId]);

  const companyBorrower = opp ? isCompanyPrimaryBorrower(opp) : false;
  const contact = opp?.primaryContactId
    ? findOperationalEcmContactById(opp.primaryContactId)
    : null;
  const borrower = opp ? resolveOpportunityBorrowerIdentity(opp) : null;
  const customerName =
    borrower?.displayName ||
    (!companyBorrower ? contact?.name?.trim() : "") ||
    "Not Specified";
  const product =
    opp?.productLabel?.trim() ||
    (opp?.productCode?.trim()
      ? opp.productCode.trim()
      : opp?.productFamily
        ? String(opp.productFamily).replace(/_/g, " ")
        : "Not Specified");
  const amount =
    opp?.requestedAmount != null ? formatINR(opp.requestedAmount) : "Not Specified";
  const status = opportunityLifecycleLabel(opp?.lifecycleStatus);
  const stage = displayOpportunityRequirementStageLabel(opp?.requirementStage);

  if (loading) {
    return (
      <ChanakyaLoadingExperience
        module="opportunity"
        density="panel"
        statusLabel="Opening Opportunity Creation…"
      />
    );
  }

  if (error || !opp) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-amber-500/40 bg-amber-500/5 p-6 text-center">
        <p className="text-sm font-medium text-foreground">Opportunity not available</p>
        <p className="mt-2 text-xs text-muted-foreground">{error ?? "Unknown error"}</p>
      </div>
    );
  }

  return (
    <div className="-mx-4 flex flex-col md:-mx-6 lg:-mx-8">
      <LeadOpportunityJourneyChrome
        moduleId="credit_bench"
        density="compact"
        hideContextChips
        hidePhaseReadiness
        opportunityWorkspaceStage="opportunity_creation"
        title={customerName}
        identityLine={[opp.opportunityNumber, product, amount, status]
          .filter(Boolean)
          .join(" · ")}
        context={{
          opportunity: opp.opportunityNumber,
          customer: customerName,
          product,
          amount,
          stage: status,
        }}
        fileId={fileId ?? opp.legacyLoanFileId}
        opportunityId={opp.id}
      >
        <div className="space-y-4 px-4 pb-8 pt-3 sm:px-5">
          <p className="text-xs text-muted-foreground">
            Opportunity Creation — capture and maintain the customer requirement. Continue to
            Document Center when ready. Context stays on this Opportunity.
          </p>

          <section className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground">Opportunity Details</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Reference, status, and metadata for this Opportunity.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Opportunity Reference">
                <Input readOnly value={opp.opportunityNumber} className="h-9 font-mono text-xs" />
              </Field>
              <Field label="Opportunity Status">
                <Input readOnly value={status} className="h-9 capitalize text-xs" />
              </Field>
              <Field label="Requirement Stage">
                <Input readOnly value={stage} className="h-9 capitalize text-xs" />
              </Field>
              <Field label="Product Family">
                <Input
                  readOnly
                  value={String(opp.productFamily || "lending")}
                  className="h-9 capitalize text-xs"
                />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground">Customer Information</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Linked Contact — identity remains in Contacts; do not re-enter person data here.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Customer Name">
                <Input readOnly value={customerName} className="h-9 text-xs" />
              </Field>
              <Field label="Mobile">
                <Input
                  readOnly
                  value={opp.primaryContactMobile || contact?.mobilePrimary || "—"}
                  className="h-9 text-xs"
                />
              </Field>
              <Field label="Email">
                <Input
                  readOnly
                  value={
                    opp.primaryContactEmail ||
                    contact?.personalEmail ||
                    contact?.officialEmail ||
                    "—"
                  }
                  className="h-9 text-xs"
                />
              </Field>
              <Field label="Relationship Manager">
                <Input
                  readOnly
                  value={opp.relationshipManagerName || contact?.ownerName || "—"}
                  className="h-9 text-xs"
                />
              </Field>
              <Field label="Employment Type">
                <Input
                  readOnly
                  value={displayOpportunityEnumLabel(opp.employmentTypeCode)}
                  className="h-9 capitalize text-xs"
                />
              </Field>
            </div>
          </section>

          <WorkspaceBorrowerPartySections opportunity={opp} />

          <section className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground">Loan Requirement & Product</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Product selection and requested amount for this Opportunity. Refine here before
              documents and credit evaluation.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Product">
                <Input readOnly value={product} className="h-9 text-xs" />
              </Field>
              <Field label="Requested Amount">
                <Input readOnly value={amount} className="h-9 text-xs" />
              </Field>
              <Field label="Lending Type">
                <Input
                  readOnly
                  value={displayOpportunityEnumLabel(
                    typeof opp.lendingExtension === "object" &&
                      opp.lendingExtension &&
                      "lendingType" in opp.lendingExtension
                      ? String(
                          (opp.lendingExtension as { lendingType?: string | null })
                            .lendingType ?? "",
                        )
                      : "",
                  )}
                  className="h-9 capitalize text-xs"
                />
              </Field>
              <Field label="Transaction Type">
                <Input
                  readOnly
                  value={displayOpportunityEnumLabel(opp.transactionType)}
                  className="h-9 capitalize text-xs"
                />
              </Field>
              <Field label="SOURCE">
                <Input
                  readOnly
                  value={formatOpportunitySourceDisplay(
                    opp.sourceCode,
                    opp.sourceContactName,
                  )}
                  className="h-9 text-xs"
                />
              </Field>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Editable product and amount capture continues in this stage as Opportunity
              fields are extended — navigation already preserves this Opportunity.
            </p>
          </section>
        </div>
      </LeadOpportunityJourneyChrome>
    </div>
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
