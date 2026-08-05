"use client";

/**
 * CO-UX-017 — Enterprise Deal Control Panel (Kanban right drawer).
 * Operational control for the selected lender Deal — not Strategy Workspace.
 * Reuses ECM · ECIE · EDC · Deal Registry. No new registries.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Mic,
  Phone,
  UserRound,
  CalendarClock,
  ExternalLink,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { LenderLogo } from "@/components/catalyst-one/shared/lender-logo";
import { ChanakyaMark } from "@/components/layout/chanakya-mark";
import { LenderSalesContactCapture } from "@/components/catalyst-one/execution/lender-sales-contact-capture";
import { EnterpriseActivityComposer } from "@/components/catalyst-one/action-center/workspaces/enterprise-activity-composer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INRCurrencyInput } from "@/components/catalyst-one/shared/inr-currency-input";
import {
  LENDER_CASE_STAGES,
  LENDER_CASE_STAGE_LABELS,
  LENDER_PROBABILITY_LABELS,
  normalizeLenderCaseStage,
} from "@/constants/lender-pipeline";
import {
  listLenderSubStagesForStage,
  lenderSubStageLabel,
} from "@/constants/enterprise-stage-transition";
import { ROUTES } from "@/constants/routes";
import {
  listConversationActivities,
  subscribeConversationActivitiesUpdated,
} from "@/lib/enterprise-conversation-intelligence";
import { listEdcTimelineByContext } from "@/lib/enterprise-dialogue-center";
import { findOperationalEcmContactById } from "@/lib/enterprise-registry";
import type { LenderSalesContactLink } from "@/lib/lender-sales-contact";
import type {
  LenderCaseStage,
  LenderProbability,
  LoanLenderExecution,
} from "@/types/catalyst-one";
import type { DealPipelineContext } from "@/types/deal-pipeline-runtime";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type DealParticipant = {
  id: string;
  name: string;
  role: string;
  mobile?: string;
  contactId?: string;
};

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-1.5", className)}>
      <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function toDateInput(value?: string | null): string {
  if (!value?.trim()) return "";
  const d = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : "";
}

export function DealControlPanel({
  open,
  onOpenChange,
  caseExecution,
  context,
  productFallback,
  actorUserId,
  actorLabel,
  onPatch,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseExecution: LoanLenderExecution | null;
  context: DealPipelineContext;
  productFallback?: string;
  actorUserId: string;
  actorLabel?: string;
  onPatch: (caseId: string, patch: Partial<LoanLenderExecution>) => void;
}) {
  const router = useRouter();
  const [strategyOpen, setStrategyOpen] = useState(false);
  const [timelineTick, setTimelineTick] = useState(0);

  const [loanAmount, setLoanAmount] = useState(0);
  const [product, setProduct] = useState("");
  const [stage, setStage] = useState<LenderCaseStage>("identified");
  const [subStage, setSubStage] = useState("");
  const [expectedLoginDate, setExpectedLoginDate] = useState("");
  const [expectedDisbursementDate, setExpectedDisbursementDate] = useState("");
  const [priority, setPriority] = useState<LenderProbability | "">("");

  useEffect(() => {
    if (!caseExecution || !open) return;
    setLoanAmount(caseExecution.expectedLoanAmount ?? context.requiredAmount ?? 0);
    setProduct(caseExecution.product ?? productFallback ?? context.loanProduct ?? "");
    setStage(normalizeLenderCaseStage(caseExecution.caseStage));
    setSubStage(caseExecution.caseSubStage ?? "");
    setExpectedLoginDate(toDateInput(caseExecution.loginDate));
    setExpectedDisbursementDate(toDateInput(caseExecution.disbursementDate));
    setPriority(caseExecution.probability ?? "");
    setStrategyOpen(false);
  }, [caseExecution, open, context.requiredAmount, context.loanProduct, productFallback]);

  useEffect(() => {
    return subscribeConversationActivitiesUpdated(() => {
      setTimelineTick((n) => n + 1);
    });
  }, []);

  const subStages = useMemo(() => listLenderSubStagesForStage(stage), [stage]);

  const salesLink: LenderSalesContactLink | null = useMemo(() => {
    if (!caseExecution?.lenderSalesContactId) return null;
    return {
      contactId: caseExecution.lenderSalesContactId,
      contactName: caseExecution.lenderSalesContactName || "Sales Contact",
      mobile: caseExecution.lenderSalesContactMobile,
      designationId: caseExecution.lenderSalesContactDesignationId,
      designationLabel: caseExecution.lenderSalesContactDesignationLabel,
      officialEmail: caseExecution.lenderSalesContactOfficialEmail,
      institutionId: caseExecution.lenderSalesContactInstitutionId,
      institutionLabel:
        caseExecution.lenderSalesContactInstitutionLabel ||
        caseExecution.lender ||
        undefined,
    };
  }, [caseExecution]);

  const participants = useMemo((): DealParticipant[] => {
    if (!caseExecution) return [];
    const rows: DealParticipant[] = [];

    if (context.customerName?.trim()) {
      rows.push({
        id: "customer",
        name: context.customerName,
        role: "Customer",
        contactId: context.customerId ?? undefined,
      });
    }

    if (context.relationshipManager?.trim()) {
      rows.push({
        id: "rm",
        name: context.relationshipManager,
        role: "Relationship Manager",
      });
    }

    if (caseExecution.relationshipManager?.trim() &&
      caseExecution.relationshipManager !== context.relationshipManager) {
      rows.push({
        id: "lender-rm",
        name: caseExecution.relationshipManager,
        role: "Lender Relationship Manager",
      });
    }

    if (caseExecution.lenderSalesContactName?.trim()) {
      rows.push({
        id: "sales",
        name: caseExecution.lenderSalesContactName,
        role: caseExecution.lenderSalesContactDesignationLabel || "Lender Sales Contact",
        mobile: caseExecution.lenderSalesContactMobile,
        contactId: caseExecution.lenderSalesContactId,
      });
    }

    if (caseExecution.identifiedBy?.trim()) {
      rows.push({
        id: "identified-by",
        name: caseExecution.identifiedBy,
        role: "Internal User",
      });
    }

    return rows;
  }, [caseExecution, context]);

  const timeline = useMemo(() => {
    void timelineTick;
    if (!caseExecution) return [];
    const dealId = caseExecution.enterpriseDealId || caseExecution.id;
    const rows: Array<{ id: string; title: string; at: string; kind: string }> = [];

    for (const a of listConversationActivities()) {
      if (a.isDeleted) continue;
      const match =
        a.dealId === dealId ||
        (a.contextType === "deal" && a.contextId === dealId) ||
        (caseExecution.lenderSalesContactId &&
          a.contactId === caseExecution.lenderSalesContactId);
      if (!match) continue;
      rows.push({
        id: a.id,
        title: a.title || a.bodyText || "Activity",
        at: a.recordedAt || a.createdAt,
        kind: a.channel === "in_app_mic" ? "Voice Note" : "Activity",
      });
    }

    if (context.opportunityId) {
      for (const e of listEdcTimelineByContext("opportunity", context.opportunityId).slice(0, 12)) {
        rows.push({
          id: e.id,
          title: e.title || e.description || e.eventType || "Event",
          at: e.occurredOn || "",
          kind: e.eventType || "Timeline",
        });
      }
    }

    return rows
      .sort((a, b) => (b.at || "").localeCompare(a.at || ""))
      .slice(0, 12);
  }, [caseExecution, context.opportunityId, timelineTick]);

  if (!caseExecution) return null;

  const dealId = caseExecution.enterpriseDealId || caseExecution.id;
  const salesMobile = caseExecution.lenderSalesContactMobile;

  const saveOperational = () => {
    onPatch(caseExecution.id, {
      expectedLoanAmount: loanAmount || undefined,
      product: product.trim() || undefined,
      caseStage: stage,
      caseSubStage: subStage || undefined,
      loginDate: expectedLoginDate || undefined,
      disbursementDate: expectedDisbursementDate || undefined,
      probability: priority || undefined,
    });
    toast.success("Deal control fields saved.");
  };

  const openContact = (contactId?: string) => {
    if (!contactId) {
      toast.message("Contact not linked", {
        description: "This participant is not linked to an Enterprise Contact record.",
      });
      return;
    }
    const exists = findOperationalEcmContactById(contactId);
    if (!exists) {
      toast.message("Contact not found", {
        description: "The linked contact could not be resolved in ECM.",
      });
      return;
    }
    router.push(`${ROUTES.CONTACTS}?contactId=${encodeURIComponent(contactId)}`);
  };

  const strategyRows: { label: string; value: string }[] = [
    {
      label: "Strategic Score",
      value:
        caseExecution.strategicScore != null ? `${caseExecution.strategicScore}` : "Not Specified",
    },
    {
      label: "Recommendation Rank",
      value:
        caseExecution.strategicRank != null ? `#${caseExecution.strategicRank}` : "Not Specified",
    },
    { label: "FOIR Assessment", value: caseExecution.foirAssessment ?? "Not Specified" },
    { label: "CIBIL Assessment", value: caseExecution.cibilAssessment ?? "Not Specified" },
    { label: "Income Fit", value: caseExecution.incomeFit ?? "Not Specified" },
    { label: "Policy Fit", value: caseExecution.policyFit ?? "Not Specified" },
    {
      label: "Expected ROI",
      value:
        caseExecution.expectedRoi != null ? `${caseExecution.expectedRoi}%` : "Not Specified",
    },
    { label: "Expected Turnaround", value: caseExecution.expectedTurnaround ?? "Not Specified" },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md"
        data-surface="deal-control-panel"
        data-sprint="CO-UX-017"
      >
        <SheetHeader className="space-y-1.5 border-b border-border/60 px-4 py-3 text-left">
          <div className="flex items-center gap-2.5">
            <LenderLogo lender={caseExecution.lender} size="lg" className="rounded-md" />
            <div className="min-w-0">
              <SheetTitle className="text-base leading-snug">{caseExecution.lender}</SheetTitle>
              <SheetDescription className="text-xs">
                Deal Control · {LENDER_CASE_STAGE_LABELS[normalizeLenderCaseStage(caseExecution.caseStage)]}
                {caseExecution.caseSubStage
                  ? ` · ${lenderSubStageLabel(caseExecution.caseStage, caseExecution.caseSubStage) || caseExecution.caseSubStage}`
                  : ""}
              </SheetDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-[10px] font-normal">
              {context.dealNumber || dealId.slice(0, 8)}
            </Badge>
            <Badge variant="secondary" className="text-[10px] font-normal">
              {context.customerName || "Customer"}
            </Badge>
          </div>
        </SheetHeader>

        <div className="space-y-4 px-4 py-3">
          <Section title="Primary Deal Information">
            <div className="grid gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Loan Amount</Label>
                <INRCurrencyInput
                  value={loanAmount}
                  onChange={(v) => setLoanAmount(v ?? 0)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Product</Label>
                <Input
                  className="h-8 text-xs"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  placeholder="Product"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Current Stage</Label>
                  <Select
                    value={stage}
                    onValueChange={(v) => {
                      const next = v as LenderCaseStage;
                      setStage(next);
                      const allowed = listLenderSubStagesForStage(next);
                      if (!allowed.some((s) => s.id === subStage)) {
                        setSubStage(allowed[0]?.id ?? "");
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LENDER_CASE_STAGES.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">
                          {LENDER_CASE_STAGE_LABELS[s.id]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Current Sub-Stage</Label>
                  <Select
                    value={subStage || "__none__"}
                    onValueChange={(v) => setSubStage(v === "__none__" ? "" : v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Sub-stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" className="text-xs">
                        Not Specified
                      </SelectItem>
                      {subStages.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Expected Login Date</Label>
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    value={expectedLoginDate}
                    onChange={(e) => setExpectedLoginDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">
                    Expected Disbursement Date
                  </Label>
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    value={expectedDisbursementDate}
                    onChange={(e) => setExpectedDisbursementDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Priority</Label>
                <Select
                  value={priority || "__none__"}
                  onValueChange={(v) =>
                    setPriority(v === "__none__" ? "" : (v as LenderProbability))
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" className="text-xs">
                      Not Specified
                    </SelectItem>
                    {(Object.keys(LENDER_PROBABILITY_LABELS) as LenderProbability[]).map((p) => (
                      <SelectItem key={p} value={p} className="text-xs">
                        {LENDER_PROBABILITY_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" size="sm" className="h-8 text-xs" onClick={saveOperational}>
                Save Deal Fields
              </Button>
            </div>
          </Section>

          <Section title="Lender Sales Contact">
            <LenderSalesContactCapture
              lenderId={caseExecution.lenderRegistryId}
              lenderName={caseExecution.lender}
              lenderCode={caseExecution.lenderCode}
              productCode={context.productCode ?? caseExecution.product ?? productFallback}
              value={salesLink}
              actorId={actorUserId}
              onChange={(link) => {
                onPatch(caseExecution.id, {
                  lenderSalesContactId: link?.contactId,
                  lenderSalesContactName: link?.contactName,
                  lenderSalesContactMobile: link?.mobile,
                  lenderSalesContactDesignationId: link?.designationId,
                  lenderSalesContactDesignationLabel: link?.designationLabel,
                  lenderSalesContactOfficialEmail: link?.officialEmail,
                  lenderSalesContactInstitutionId: link?.institutionId,
                  lenderSalesContactInstitutionLabel: link?.institutionLabel,
                });
              }}
            />
            <p className="text-[10px] text-muted-foreground">
              Enterprise Contact Registry · Lender Contact · Active · lender + product scoped.
            </p>
          </Section>

          <Section title="Participants">
            {participants.length === 0 ? (
              <p className="text-xs text-muted-foreground">No participants linked yet.</p>
            ) : (
              <ul className="space-y-1">
                {participants.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-start justify-between gap-2 rounded-md border border-border/60 px-2 py-1.5 text-left text-xs hover:bg-muted/40",
                        p.contactId ? "cursor-pointer" : "cursor-default",
                      )}
                      onClick={() => openContact(p.contactId)}
                    >
                      <span className="min-w-0">
                        <span className="block font-medium">{p.name}</span>
                        <span className="block text-[10px] text-muted-foreground">
                          {p.role}
                          {p.mobile ? ` · ${p.mobile}` : ""}
                        </span>
                      </span>
                      {p.contactId ? (
                        <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Quick Actions">
            <div className="grid grid-cols-2 gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 justify-start gap-1.5 text-xs"
                disabled={!salesMobile}
                onClick={() => {
                  if (!salesMobile) return;
                  window.open(`tel:${salesMobile.replace(/\D/g, "")}`, "_self");
                }}
              >
                <Phone className="h-3.5 w-3.5" />
                Call Lender
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 justify-start gap-1.5 text-xs"
                disabled={!salesMobile}
                onClick={() => {
                  if (!salesMobile) return;
                  const digits = salesMobile.replace(/\D/g, "");
                  window.open(
                    `https://wa.me/91${digits.slice(-10)}`,
                    "_blank",
                    "noopener,noreferrer",
                  );
                }}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp Lender
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 justify-start gap-1.5 text-xs"
                onClick={() => openContact(caseExecution.lenderSalesContactId)}
              >
                <UserRound className="h-3.5 w-3.5" />
                View Contact
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 justify-start gap-1.5 text-xs"
                onClick={() =>
                  toast.message("Schedule Follow-up", {
                    description: "Use Create Activity → Schedule, or Tasks (ETE).",
                  })
                }
              >
                <CalendarClock className="h-3.5 w-3.5" />
                Schedule Follow-up
              </Button>
            </div>
            <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Mic className="h-3 w-3" />
              Voice notes &amp; activities use the composer below (ECIE).
            </p>
          </Section>

          <Section title="Notes & Activity">
            <EnterpriseActivityComposer
              presentation="inline"
              heading="Create Activity"
              composer={{
                contextType: "deal",
                contextId: dealId,
                entityLabel: caseExecution.lender,
                dealId,
                opportunityId: context.opportunityId ?? caseExecution.opportunityId,
                contactId: caseExecution.lenderSalesContactId,
                product: caseExecution.product ?? productFallback,
                stage: LENDER_CASE_STAGE_LABELS[normalizeLenderCaseStage(caseExecution.caseStage)],
                customerName: context.customerName,
              }}
              actorUserId={actorUserId}
              actorLabel={actorLabel}
              onSaved={() => setTimelineTick((n) => n + 1)}
            />
          </Section>

          <Section title="Recent Timeline">
            {timeline.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No recent activities for this deal yet.
              </p>
            ) : (
              <ul className="max-h-40 space-y-1 overflow-y-auto">
                {timeline.map((t) => (
                  <li
                    key={t.id}
                    className="rounded border border-border/50 px-2 py-1.5 text-[11px]"
                  >
                    <span className="font-medium text-foreground">{t.title}</span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">
                      {t.kind}
                      {t.at ? ` · ${new Date(t.at).toLocaleString()}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <section className="rounded-md border border-border/60">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left"
              onClick={() => setStrategyOpen((v) => !v)}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Strategic Analysis (read-only)
              </span>
              {strategyOpen ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
            {strategyOpen ? (
              <div className="space-y-2 border-t border-border/50 px-2.5 py-2">
                <p className="text-[10px] text-muted-foreground">
                  Strategy / Credit Decision workspaces own these assessments. Shown here for
                  reference only.
                </p>
                <dl className="grid gap-1.5">
                  {strategyRows.map((r) => (
                    <div
                      key={r.label}
                      className="flex items-start justify-between gap-2 rounded border border-border/40 bg-muted/10 px-2 py-1.5 text-[11px]"
                    >
                      <dt className="text-muted-foreground">{r.label}</dt>
                      <dd className="max-w-[55%] text-right font-medium">{r.value}</dd>
                    </div>
                  ))}
                </dl>
                {(caseExecution.chanakyaRecommendation ||
                  caseExecution.recommendationNotes ||
                  caseExecution.reasonForRecommendation) && (
                  <div className="flex gap-2 rounded-lg border border-border/60 bg-muted/15 px-2.5 py-2">
                    <ChanakyaMark size="sm" status="insights" className="mt-0.5" />
                    <p className="text-[11px] leading-relaxed text-foreground/90">
                      {caseExecution.chanakyaRecommendation ||
                        caseExecution.recommendationNotes ||
                        caseExecution.reasonForRecommendation}
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** @deprecated CO-UX-017 — use DealControlPanel */
export { DealControlPanel as LenderStrategyDrawer };
