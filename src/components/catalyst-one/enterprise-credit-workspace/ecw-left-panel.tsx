"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getProposalButtonLabel } from "@/lib/chanakya-phase5-intelligence";
import { formatINR } from "@/lib/format-currency";
import { STAGE_LABELS } from "@/constants/loan-stage-master";
import { cn } from "@/lib/utils";
import type { LoanFile, LoanFileDocument, LoanFileTimelineEvent } from "@/types/catalyst-one";
import type {
  EcwLeftSectionId,
  EcwStatedInformationDraft,
} from "@/types/enterprise-credit-workspace";
import { ECW_LEFT_SECTIONS } from "@/types/enterprise-credit-workspace";
import type { ChanakyaProposalReadinessReview } from "@/types/chanakya-phase5-intelligence";

function SectionNav({
  active,
  onChange,
}: {
  active: EcwLeftSectionId;
  onChange: (id: EcwLeftSectionId) => void;
}) {
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border/50 px-2 py-2 lg:flex-col lg:overflow-visible">
      {ECW_LEFT_SECTIONS.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onChange(s.id)}
          className={cn(
            "shrink-0 rounded-lg px-2.5 py-1.5 text-left text-[11px] font-medium transition-colors",
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
  opportunityNumber,
  lenderName,
  section,
  onSectionChange,
  stated,
  onStatedChange,
  documents,
  readiness,
}: {
  file: LoanFile;
  opportunityNumber: string;
  lenderName: string;
  section: EcwLeftSectionId;
  onSectionChange: (id: EcwLeftSectionId) => void;
  stated: EcwStatedInformationDraft;
  onStatedChange: (patch: Partial<EcwStatedInformationDraft>) => void;
  documents: LoanFileDocument[];
  readiness: ChanakyaProposalReadinessReview;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col border-r border-border/60 bg-background">
      <div className="border-b border-border/50 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Credit Working Area
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Enter Stated Information while reviewing documents.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="lg:w-[168px] lg:shrink-0 lg:border-r lg:border-border/50">
          <SectionNav active={section} onChange={onSectionChange} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {section === "customer_snapshot" && (
            <div className="space-y-3 text-xs">
              <p className="text-sm font-semibold">{file.customerName}</p>
              <dl className="grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-[10px] uppercase text-muted-foreground">Opportunity</dt>
                  <dd className="font-medium">{opportunityNumber}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase text-muted-foreground">Product</dt>
                  <dd className="font-medium">{file.loanProduct}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase text-muted-foreground">Loan Amount</dt>
                  <dd className="font-medium tabular-nums">{formatINR(file.requiredAmount || file.loanAmount)}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase text-muted-foreground">Selected Lender</dt>
                  <dd className="font-medium">{lenderName}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase text-muted-foreground">Stage</dt>
                  <dd className="font-medium capitalize">{STAGE_LABELS[file.stage] ?? file.stage}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase text-muted-foreground">Mobile</dt>
                  <dd className="font-medium">{file.customerMobile}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase text-muted-foreground">Employment</dt>
                  <dd className="font-medium">{file.employmentType}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase text-muted-foreground">City</dt>
                  <dd className="font-medium">{file.city}</dd>
                </div>
              </dl>
            </div>
          )}

          {section === "stated_financial" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Stated Financial Information — completeness only. View bank statements in the centre panel.
              </p>
              <Field label="Stated Monthly Income">
                <Input
                  className="h-8 text-xs"
                  value={stated.statedIncomeMonthly ?? ""}
                  onChange={(e) => onStatedChange({ statedIncomeMonthly: e.target.value })}
                  placeholder="e.g. 1,85,000"
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
              <p className="text-xs text-muted-foreground">Stated Business Information</p>
              <Field label="Stated Annual Turnover">
                <Input
                  className="h-8 text-xs"
                  value={stated.statedTurnover ?? ""}
                  onChange={(e) => onStatedChange({ statedTurnover: e.target.value })}
                />
              </Field>
              <Field label="Stated Business Vintage (years)">
                <Input
                  className="h-8 text-xs"
                  value={stated.statedBusinessVintage ?? ""}
                  onChange={(e) => onStatedChange({ statedBusinessVintage: e.target.value })}
                />
              </Field>
              <Field label="Stated Nature of Business">
                <Input
                  className="h-8 text-xs"
                  value={stated.statedNatureOfBusiness ?? ""}
                  onChange={(e) => onStatedChange({ statedNatureOfBusiness: e.target.value })}
                />
              </Field>
            </div>
          )}

          {section === "stated_property" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Stated Property Information</p>
              <Field label="Stated Property Type">
                <Input
                  className="h-8 text-xs"
                  value={stated.statedPropertyType ?? file.propertyType ?? ""}
                  onChange={(e) => onStatedChange({ statedPropertyType: e.target.value })}
                />
              </Field>
              <Field label="Stated Property Value">
                <Input
                  className="h-8 text-xs"
                  value={stated.statedPropertyValue ?? ""}
                  onChange={(e) => onStatedChange({ statedPropertyValue: e.target.value })}
                  placeholder="Approx. market value"
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
              {documents.length === 0 && (
                <p className="text-xs text-muted-foreground">Checklist will populate from the loan file documents.</p>
              )}
            </ul>
          )}

          {section === "proposal_readiness" && (
            <div className="space-y-3 text-xs">
              <p className="font-semibold">Completeness · {readiness.completenessPct}%</p>
              <p className="leading-relaxed text-muted-foreground">{readiness.conversationalPrompt}</p>
              <ul className="space-y-1.5">
                {readiness.fields.map((f) => (
                  <li
                    key={f.key}
                    className={cn(
                      "rounded-md border px-2 py-1.5",
                      f.complete
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : "border-amber-500/30 bg-amber-500/5",
                    )}
                  >
                    <span className="font-medium">{f.label}</span>
                    <span className="ml-2 text-muted-foreground">{f.complete ? "Complete" : "Missing"}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {section === "proposal" && (
            <div className="space-y-3 text-xs">
              <p className="leading-relaxed text-muted-foreground">
                Proposal generation will run from this workspace after readiness is met. Keep reviewing statements on the
                right while refining Stated Information here.
              </p>
              <Button type="button" size="sm" className="h-8 text-xs" disabled={!readiness.ready}>
                {getProposalButtonLabel()}
              </Button>
              {!readiness.ready && (
                <p className="text-[11px] text-muted-foreground">
                  Button enables after Proposal Readiness reaches the required completeness.
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
