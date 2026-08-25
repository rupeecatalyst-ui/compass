"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EnterpriseFinancialInput } from "@/components/catalyst-one/shared/enterprise-financial-input";
import {
  absoluteRupeesFromStoredString,
  absoluteRupeesToStoredString,
} from "@/lib/enterprise-financial-input";
import { PropertyTypeSelect } from "@/components/catalyst-one/shared/property-type-select";
import { getProposalButtonLabel } from "@/lib/chanakya-phase5-intelligence";
import { CHANAKYA_EVIDENCE_VISIBILITY_LABEL } from "@/constants/chanakya-credit-proposal";
import { buildJourneyHref } from "@/constants/lead-opportunity-journey";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import type { PropertyType } from "@/constants/loan-stage-master";
import type { LoanFile, LoanFileDocument, LoanFileTimelineEvent } from "@/types/catalyst-one";
import type {
  EcwLeftSectionId,
  EcwStatedInformationDraft,
} from "@/types/enterprise-credit-workspace";
import { ECW_LEFT_SECTIONS } from "@/types/enterprise-credit-workspace";
import type { ChanakyaProposalEvidenceReadiness } from "@/types/chanakya-credit-proposal";
import type { ChanakyaInternalStrengtheningRecommendation } from "@/types/chanakya-credit-proposal";
import { getContextAwareVisibility } from "@/lib/context-aware-data-collection";
import {
  NATURE_OF_BUSINESS_NOT_AVAILABLE,
  resolveNatureOfBusinessFromProfile,
} from "@/lib/lead-opportunity-journey/nature-of-business";
import { Mic } from "lucide-react";
import { useEffect, useMemo } from "react";

export function EcwSectionTabs({
  active,
  onChange,
  employmentType,
}: {
  active: EcwLeftSectionId;
  onChange: (id: EcwLeftSectionId) => void;
  employmentType?: string;
}) {
  const ctx = useMemo(() => getContextAwareVisibility(employmentType), [employmentType]);
  const sections = useMemo(
    () =>
      ECW_LEFT_SECTIONS.filter((s) => {
        if (s.id === "stated_financial") {
          return ctx.isSalariedFamily || ctx.family === "unknown";
        }
        if (s.id === "stated_business") {
          return ctx.isSelfEmployedFamily || ctx.family === "unknown";
        }
        return true;
      }),
    [ctx.family, ctx.isSalariedFamily, ctx.isSelfEmployedFamily],
  );

  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b border-border/50 bg-muted/10 px-2 py-1.5"
      aria-label="Verification sections"
    >
      {sections.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onChange(s.id)}
          className={cn(
            "shrink-0 rounded-md px-2.5 py-1.5 text-[11px] font-medium leading-snug transition-colors",
            active === s.id
              ? "bg-teal-600 text-white shadow-sm"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
        >
          {s.label}
        </button>
      ))}
    </nav>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function EcwLeftPanel({
  file,
  opportunityNumber: _opportunityNumber,
  lenderName,
  section,
  onSectionChange,
  stated,
  onStatedChange,
  documents,
  evidenceReadiness,
  internalRecommendations,
  rmNote,
  onRmNoteChange,
  canMakeProposal,
  onMakeProposal,
}: {
  file: LoanFile;
  opportunityNumber: string;
  lenderName: string;
  section: EcwLeftSectionId;
  onSectionChange: (id: EcwLeftSectionId) => void;
  stated: EcwStatedInformationDraft;
  onStatedChange: (patch: Partial<EcwStatedInformationDraft>) => void;
  documents: LoanFileDocument[];
  evidenceReadiness: ChanakyaProposalEvidenceReadiness;
  internalRecommendations: ChanakyaInternalStrengtheningRecommendation[];
  rmNote: string;
  onRmNoteChange: (value: string) => void;
  /** Opportunity context present — evidence readiness never blocks. */
  canMakeProposal: boolean;
  /** CO-CHANAKYA-CREDIT-WORKBENCH-004 — opens streaming generation (read-only). */
  onMakeProposal?: () => void;
}) {
  const categoryCtx = useMemo(
    () => getContextAwareVisibility(file.employmentType),
    [file.employmentType],
  );
  const natureOfBusiness = useMemo(
    () => resolveNatureOfBusinessFromProfile(file),
    [file, stated.statedNatureOfBusiness],
  );

  useEffect(() => {
    if (section === "stated_financial" && categoryCtx.isSelfEmployedFamily) {
      onSectionChange("stated_business");
    }
    if (section === "stated_business" && categoryCtx.isSalariedFamily) {
      onSectionChange("stated_financial");
    }
  }, [
    categoryCtx.isSalariedFamily,
    categoryCtx.isSelfEmployedFamily,
    onSectionChange,
    section,
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex h-9 shrink-0 items-center border-b border-border/50 px-2.5">
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Verification Form
          </p>
          <p className="truncate text-[10px] text-muted-foreground">
            Context-aware ·{" "}
            {categoryCtx.isSalariedFamily
              ? "salaried fields"
              : categoryCtx.isSelfEmployedFamily
                ? "self-employed fields"
                : "select employment context"}{" "}
            only
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-2">
          {section === "customer_snapshot" && (
            <div className="space-y-1.5 text-[11px]">
              <p className="text-[10px] text-muted-foreground">
                Identity lives in the workspace header. Below are verification-only facts.
              </p>
              <dl className="divide-y divide-border/50 rounded-md border border-border/60 bg-muted/10">
                {(
                  [
                    ["Employment", file.employmentType || "—"],
                    ["City", file.city || "—"],
                    ["File number", file.fileNumber || "—"],
                    ["Priority", file.priority || "—"],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-2 px-2 py-1">
                    <dt className="shrink-0 text-[9px] uppercase tracking-wide text-muted-foreground">
                      {label}
                    </dt>
                    <dd className="min-w-0 truncate text-right font-medium capitalize text-foreground">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {section === "stated_financial" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Stated Financial Information — completeness only. Open a category with View to
                verify figures while editing this form.
              </p>
              <Field label="Stated Monthly Income">
                <EnterpriseFinancialInput
                  value={absoluteRupeesFromStoredString(stated.statedIncomeMonthly)}
                  onChange={(absolute) =>
                    onStatedChange({
                      statedIncomeMonthly: absoluteRupeesToStoredString(absolute),
                    })
                  }
                  placeholder="e.g. 1.85"
                  defaultUnit="lakh"
                />
              </Field>
              <Field label="Stated Obligations / EMIs">
                <Input
                  className="h-8 text-xs"
                  value={stated.statedObligations ?? ""}
                  onChange={(e) => onStatedChange({ statedObligations: e.target.value })}
                  placeholder="Existing obligations"
                />
              </Field>
              <Field label="Notes">
                <textarea
                  className={cn(
                    "flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm",
                    "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  )}
                  value={stated.notes ?? ""}
                  onChange={(e) => onStatedChange({ notes: e.target.value })}
                  placeholder="Working notes for proposal framing"
                />
              </Field>
            </div>
          )}

          {section === "stated_business" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Business figures reused from Business Profile / Opportunity Setup — verify against the open document.
              </p>
              <Field label="Annual Turnover (from profile)">
                <EnterpriseFinancialInput
                  value={absoluteRupeesFromStoredString(stated.statedTurnover)}
                  onChange={(absolute) =>
                    onStatedChange({ statedTurnover: absoluteRupeesToStoredString(absolute) })
                  }
                  placeholder="e.g. 2.5"
                  defaultUnit="crore"
                />
              </Field>
              <Field label="Business Vintage (years)">
                <Input
                  className="h-8 text-xs"
                  value={stated.statedBusinessVintage ?? ""}
                  onChange={(e) => onStatedChange({ statedBusinessVintage: e.target.value })}
                />
              </Field>
              <Field label="Nature of Business">
                <Input
                  className="h-8 text-xs bg-muted/30"
                  value={
                    natureOfBusiness.source === "none"
                      ? NATURE_OF_BUSINESS_NOT_AVAILABLE
                      : natureOfBusiness.label
                  }
                  readOnly
                  aria-readonly="true"
                  title="Maintained on Customer / Company Profile"
                />
                <p className="text-[10px] text-muted-foreground">
                  From Customer / Company Profile — not edited on this desk.
                </p>
              </Field>
            </div>
          )}

          {section === "stated_property" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Stated Property Information</p>
              <Field label="Stated Property Type">
                <PropertyTypeSelect
                  value={stated.statedPropertyType ?? file.propertyType}
                  onSelect={(type: PropertyType) =>
                    onStatedChange({ statedPropertyType: type })
                  }
                />
              </Field>
              <Field label="Stated Property Value">
                <EnterpriseFinancialInput
                  value={absoluteRupeesFromStoredString(stated.statedPropertyValue)}
                  onChange={(absolute) =>
                    onStatedChange({
                      statedPropertyValue: absoluteRupeesToStoredString(absolute),
                    })
                  }
                  placeholder="e.g. 1.2"
                  defaultUnit="crore"
                />
              </Field>
              <Field label="Stated Property Location">
                <Input
                  className="h-8 text-xs"
                  value={stated.statedPropertyLocation ?? ""}
                  onChange={(e) => onStatedChange({ statedPropertyLocation: e.target.value })}
                />
              </Field>
            </div>
          )}

          {section === "document_checklist" && (
            <div className="space-y-3 text-xs">
              <p className="leading-relaxed text-muted-foreground">
                Document collection belongs in Document Center. This desk is for verification against
                the open viewer.
              </p>
              <Button asChild size="sm" className="h-8 text-xs">
                <Link
                  href={buildJourneyHref(ROUTES.DOCUMENT_CENTER, {
                    fileId: file.id,
                    opportunityId: null,
                  })}
                >
                  Open Document Center
                </Link>
              </Button>
              <ul className="space-y-2">
                {documents.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-2.5 py-2 text-xs"
                  >
                    <span className="min-w-0 truncate font-medium">{d.name}</span>
                    <span className="shrink-0 capitalize text-muted-foreground">{d.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {section === "proposal_readiness" && (
            <div className="space-y-3 text-xs">
              <div className="rounded-md border border-border/60 bg-muted/15 px-2.5 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  CHANAKYA Proposal Readiness
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {CHANAKYA_EVIDENCE_VISIBILITY_LABEL[evidenceReadiness.overall]}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  Evidence base for preparing the proposal — not a lender approval probability.
                  Does not block MAKE PROPOSAL.
                </p>
              </div>
              <ul className="space-y-1.5">
                {(
                  [
                    ["Evidence coverage", evidenceReadiness.evidenceCoverage],
                    ["Financial visibility", evidenceReadiness.financialVisibility],
                    ["Banking visibility", evidenceReadiness.bankingVisibility],
                    ["Property visibility", evidenceReadiness.propertyVisibility],
                    ["Business visibility", evidenceReadiness.businessVisibility],
                  ] as const
                ).map(([label, level]) => (
                  <li
                    key={label}
                    className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-2 py-1.5"
                  >
                    <span className="font-medium">{label}</span>
                    <span className="text-muted-foreground">
                      {CHANAKYA_EVIDENCE_VISIBILITY_LABEL[level]}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                {evidenceReadiness.capabilityNote}
              </p>
              {internalRecommendations.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Additional information that could strengthen the assessment
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Internal only — never sent to lenders automatically.
                  </p>
                  <ul className="space-y-1.5">
                    {internalRecommendations.slice(0, 5).map((r) => (
                      <li
                        key={r.id}
                        className="rounded-md border border-amber-500/25 bg-amber-500/5 px-2 py-1.5"
                      >
                        <span className="font-medium">{r.title}</span>
                        <span className="mt-0.5 block text-muted-foreground">{r.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}

          {section === "proposal" && (
            <div className="space-y-3 text-xs">
              <p className="leading-relaxed text-muted-foreground">
                Evidence-first draft from Opportunity, document presence, Credit Workbench, and your
                note. No auto-send. Readiness never blocks generation.
              </p>
              <Field label="RM / Credit Officer Note to CHANAKYA">
                <textarea
                  className={cn(
                    "flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm",
                    "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  )}
                  value={rmNote}
                  onChange={(e) => onRmNoteChange(e.target.value)}
                  placeholder="Add any context you want CHANAKYA to consider…"
                  aria-label="RM / Credit Officer Note to CHANAKYA"
                />
              </Field>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 text-xs"
                  disabled
                  title="Voice dictation coming soon"
                >
                  <Mic className="h-3 w-3" aria-hidden />
                  Dictate
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={!canMakeProposal || !onMakeProposal}
                  onClick={() => onMakeProposal?.()}
                >
                  {getProposalButtonLabel()}
                </Button>
              </div>
              {!canMakeProposal ? (
                <p className="text-[11px] text-muted-foreground">
                  Opportunity context is required before MAKE PROPOSAL.
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Your note is user-provided context — CHANAKYA will not treat it as document
                  evidence.
                </p>
              )}
            </div>
          )}

          {section === "communication" && (
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>
                Batch document requests and lender packs launch from the top action bar. Email / WhatsApp channels will
                attach here later — recipients are never typed manually.
              </p>
              <p>
                Assigned lender contact for outbound packs:{" "}
                <span className="font-medium text-foreground">{lenderName}</span>
              </p>
            </div>
          )}

          {section === "timeline" && (
            <TimelineList events={file.timeline ?? []} />
          )}
      </div>
    </div>
  );
}

function TimelineList({ events }: { events: LoanFileTimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-xs text-muted-foreground">No timeline events yet.</p>;
  }
  return (
    <ul className="space-y-2">
      {events.map((ev) => (
        <li key={ev.id} className="rounded-lg border border-border/60 px-2.5 py-2 text-xs">
          <p className="font-medium">{ev.title}</p>
          {ev.description && <p className="mt-0.5 text-muted-foreground">{ev.description}</p>}
          <p className="mt-1 text-[10px] text-muted-foreground">
            {new Date(ev.timestamp).toLocaleString("en-IN")}
          </p>
        </li>
      ))}
    </ul>
  );
}
