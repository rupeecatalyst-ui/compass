/**
 * CO-CHANAKYA-003A — Read-only evidence projections for Opportunity / Deal 360.
 * Consumes existing SSOTs and derive engines only — no new formulas.
 */

import "server-only";

import { enterpriseActivityService } from "@server/services/enterprise-activity/enterprise-activity.service";
import { prisma, isDatabaseAvailable } from "@server/lib/prisma";
import {
  classifyEarEvent,
  isOperationalTimelineEvent,
  mapEarEventToTimelineItem,
} from "@/lib/enterprise-activity-registry/transaction-timeline";
import { listEdcTimelineByContext } from "@/lib/enterprise-dialogue-center/timeline-registry";
import { deriveOpportunityDocumentReadiness } from "@/lib/document-requests/readiness";
import { evaluateDocumentRequestLodReadiness } from "@/lib/document-requests/lod-readiness";
import { derivePhaseReadiness } from "@/lib/enterprise-phase-readiness/derive";
import {
  POST_DISBURSEMENT_CONFIRMATION_STAGE,
  POST_DISBURSEMENT_CONFIRMATION_SUB_STAGES,
  POST_DISBURSEMENT_EVENT_SOURCE,
} from "@/constants/post-disbursement-confirmation";
import type { DocumentRequestItemState } from "@/types/document-requests";
import { CHANAKYA_FIELD_AVAILABILITY } from "@/types/chanakya-enterprise-read-context";
import { redactCustomerContactPiiForAiContext } from "./redact-pii";

const EAR_LIMIT = 40;
const EDC_LIMIT = 25;

function stageChangeEvents(
  events: Awaited<ReturnType<typeof enterpriseActivityService.list>>,
) {
  return events
    .filter((e) => {
      const cat = classifyEarEvent(e);
      return cat === "stage_change" || cat === "approval" || cat === "disbursement";
    })
    .slice(0, 20)
    .map((e) => {
      const item = mapEarEventToTimelineItem(e, { mode: "global" });
      return {
        entityId: e.id,
        title: item.title,
        eventKind: e.eventKind,
        category: item.category,
        previousValue: item.previousValue,
        newValue: item.newValue,
        occurredAt: e.occurredAt,
        sourceSystem: e.sourceSystem,
        opportunityId: e.opportunityId,
        dealId: e.dealId,
        provenance: "enterprise_activity_registry",
      };
    });
}

export async function projectEarEvidence(input: {
  organizationId: string;
  opportunityId?: string | null;
  dealId?: string | null;
}): Promise<Record<string, unknown>> {
  if (!isDatabaseAvailable()) {
    return {
      status: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
      note: "Database unavailable — EAR chronology NOT AVAILABLE.",
      provenance: "enterprise_activity_registry",
    };
  }

  try {
    const [byOpp, byDeal] = await Promise.all([
      input.opportunityId
        ? enterpriseActivityService.list({
            opportunityId: input.opportunityId,
            limit: EAR_LIMIT,
          })
        : Promise.resolve([]),
      input.dealId
        ? enterpriseActivityService.list({
            dealId: input.dealId,
            limit: EAR_LIMIT,
          })
        : Promise.resolve([]),
    ]);

    const map = new Map<string, (typeof byOpp)[number]>();
    for (const e of [...byOpp, ...byDeal]) map.set(e.id, e);
    const merged = Array.from(map.values())
      .filter(isOperationalTimelineEvent)
      .sort(
        (a, b) =>
          new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
      );

    if (merged.length === 0) {
      return {
        status: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
        count: 0,
        recent: [],
        stageChanges: [],
        note: "No operational EAR events for this entity scope.",
        provenance: "enterprise_activity_registry",
      };
    }

    const recent = merged.slice(0, EAR_LIMIT).map((e) => {
      const item = mapEarEventToTimelineItem(e, { mode: "global" });
      return {
        entityId: e.id,
        title: item.title,
        description: item.description || null,
        category: item.category,
        eventKind: e.eventKind,
        actorLabel: item.actorLabel,
        occurredAt: e.occurredAt,
        sourceSystem: e.sourceSystem,
        opportunityId: e.opportunityId,
        dealId: e.dealId,
        previousValue: item.previousValue,
        newValue: item.newValue,
        provenance: "enterprise_activity_registry",
      };
    });

    return redactCustomerContactPiiForAiContext({
      status: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
      count: merged.length,
      recent,
      stageChanges: stageChangeEvents(merged),
      latestOccurredAt: recent[0]?.occurredAt ?? null,
      provenance: "enterprise_activity_registry (server list)",
    });
  } catch {
    return {
      status: CHANAKYA_FIELD_AVAILABILITY.UNKNOWN,
      note: "EAR list failed — UNKNOWN.",
      provenance: "enterprise_activity_registry",
    };
  }
}

export function projectDialogueEvidence(input: {
  opportunityId?: string | null;
  dealId?: string | null;
}): Record<string, unknown> {
  try {
    const entries = [
      ...(input.opportunityId
        ? listEdcTimelineByContext("opportunity", input.opportunityId)
        : []),
      ...(input.dealId ? listEdcTimelineByContext("deal", input.dealId) : []),
    ];

    const byId = new Map(entries.map((e) => [e.id, e]));
    const unique = Array.from(byId.values()).sort(
      (a, b) =>
        new Date(b.occurredOn).getTime() - new Date(a.occurredOn).getTime(),
    );

    if (unique.length === 0) {
      return {
        status: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
        count: 0,
        latest: null,
        entries: [],
        note: "No EDC timeline entries for this context (EAR remains durable SSOT).",
        provenance: "enterprise_dialogue_center (projection; durable SSOT = EAR)",
      };
    }

    const projected = unique.slice(0, EDC_LIMIT).map((e) => ({
      entityId: e.id,
      contextType: e.contextRef.type,
      contextId: e.contextRef.id,
      eventType: e.eventType,
      title: e.title,
      description: e.description || null,
      occurredOn: e.occurredOn,
      actorId: e.actorId || null,
      // expandablePayload may contain PII — omit raw payload from AI context
      provenance: "enterprise_dialogue_center",
    }));

    return redactCustomerContactPiiForAiContext({
      status: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
      count: unique.length,
      latest: projected[0] ?? null,
      entries: projected,
      provenance: "enterprise_dialogue_center timeline registry",
      note: "EDC is a projection surface; EAR is durable chronology SSOT.",
    });
  } catch {
    return {
      status: CHANAKYA_FIELD_AVAILABILITY.UNKNOWN,
      note: "EDC projection failed — UNKNOWN.",
      provenance: "enterprise_dialogue_center",
    };
  }
}

export function projectDocumentReadinessEvidence(input: {
  lodItems: DocumentRequestItemState[];
  opportunity: {
    primaryContactName?: unknown;
    primaryContactId?: unknown;
    productLabel?: unknown;
    employmentTypeCode?: unknown;
    companyName?: unknown;
  };
  documentIntelligenceSummary: Record<string, unknown>;
}): Record<string, unknown> {
  const readiness = deriveOpportunityDocumentReadiness(input.lodItems);

  const hasContactIdentity = Boolean(
    (typeof input.opportunity.primaryContactId === "string" &&
      input.opportunity.primaryContactId.trim()) ||
      (typeof input.opportunity.primaryContactName === "string" &&
        input.opportunity.primaryContactName.trim()),
  );

  // Do not feed real mobile/email into AI path. Placeholders satisfy contact-channel
  // checks when identity exists so LOD gate does not invent false "missing mobile" gaps.
  const lodGate = evaluateDocumentRequestLodReadiness({
    customerName:
      typeof input.opportunity.primaryContactName === "string"
        ? input.opportunity.primaryContactName
        : typeof input.opportunity.companyName === "string"
          ? input.opportunity.companyName
          : null,
    mobile: hasContactIdentity ? "[REDACTED]" : null,
    email: hasContactIdentity ? "[REDACTED]" : null,
    productLabel:
      typeof input.opportunity.productLabel === "string"
        ? input.opportunity.productLabel
        : null,
    employmentType:
      typeof input.opportunity.employmentTypeCode === "string"
        ? input.opportunity.employmentTypeCode
        : null,
    entityHint:
      typeof input.opportunity.companyName === "string"
        ? input.opportunity.companyName
        : null,
  });

  const safeGaps = (lodGate.gaps ?? []).filter(
    (g) => g.field !== "mobile" && g.field !== "email",
  );

  return redactCustomerContactPiiForAiContext({
    status:
      input.lodItems.length > 0
        ? CHANAKYA_FIELD_AVAILABILITY.AVAILABLE
        : CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
    documentReadiness: {
      state: readiness.state,
      label: readiness.label,
      total: readiness.total,
      uploaded: readiness.uploaded,
      verified: readiness.verified,
      pending: readiness.pending,
      criticalPending: readiness.criticalPending,
      journeyPending: readiness.journeyPending,
      completionPct: readiness.completionPct,
      criticalComplete: readiness.criticalComplete,
      provenance: "document_requests/readiness.deriveOpportunityDocumentReadiness",
    },
    lodGateReadiness: {
      canGenerate: lodGate.canGenerate,
      gaps: safeGaps.map((g) => ({
        field: g.field,
        label: g.label,
        detail: g.detail ?? null,
      })),
      contactChannels: CHANAKYA_FIELD_AVAILABILITY.REDACTED,
      note: "Mobile/email channel completeness is REDACTED in AI context; EDIE/product gaps retained.",
      provenance: "document_requests/lod-readiness.evaluateDocumentRequestLodReadiness",
    },
    documentIntelligenceAvailability: {
      status:
        input.documentIntelligenceSummary.status ??
        CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
      documentsWithReadableText:
        input.documentIntelligenceSummary.documentsWithReadableText ?? null,
      documentsRequiringOcr:
        input.documentIntelligenceSummary.documentsRequiringOcr ?? null,
      structuredFactCount:
        input.documentIntelligenceSummary.structuredFactCount ?? null,
      provenance:
        (input.documentIntelligenceSummary.provenance as string) ||
        "chanakya_document_intelligence",
    },
    provenance: "document_requests + chanakya_document_intelligence",
  });
}

export function projectPhaseReadinessEvidence(input: {
  hasContact: boolean;
  hasOpportunity: boolean;
  customerName?: string | null;
  productLabel?: string | null;
  lifeFinalized?: boolean;
}): Record<string, unknown> {
  try {
    const snap = derivePhaseReadiness({
      hasContact: input.hasContact,
      hasOpportunity: input.hasOpportunity,
      customerName: input.customerName ?? null,
      productLabel: input.productLabel ?? null,
      lifeFinalized: Boolean(input.lifeFinalized),
      file: null,
    });

    return redactCustomerContactPiiForAiContext({
      status: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
      advisoryOnly: true,
      overallPct: snap.overallPct,
      nextBusinessAction: snap.nextBusinessAction,
      chanakyaMessage: snap.chanakyaMessage,
      phases: (snap.phases ?? []).map((p) => ({
        phaseId: p.phaseId,
        label: p.label,
        pct: p.pct,
        tone: p.tone,
        tip: p.chanakyaTip ?? null,
        criticalMissingCount: p.criticalMissing?.length ?? 0,
      })),
      note: "Advisory evidence from derivePhaseReadiness — never blocks workflow.",
      provenance: "enterprise_phase_readiness/derive.derivePhaseReadiness",
    });
  } catch {
    return {
      status: CHANAKYA_FIELD_AVAILABILITY.UNKNOWN,
      note: "Phase readiness derive failed — UNKNOWN.",
      provenance: "enterprise_phase_readiness",
    };
  }
}

export async function projectPostDisbursementConfirmationEvidence(input: {
  organizationId: string;
  dealId: string;
  grossStage: string | null | undefined;
  subStage: string | null | undefined;
  disbursedAt: Date | string | null | undefined;
}): Promise<Record<string, unknown>> {
  const stage = String(input.grossStage || "");
  const sub = String(input.subStage || "");

  const isPdcStage = stage === POST_DISBURSEMENT_CONFIRMATION_STAGE;
  const pending =
    isPdcStage && sub === POST_DISBURSEMENT_CONFIRMATION_SUB_STAGES.pending;
  const received =
    isPdcStage && sub === POST_DISBURSEMENT_CONFIRMATION_SUB_STAGES.received;

  let accountingCase: Record<string, unknown> | null = null;
  let accountingStatus: string = CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE;

  if (isDatabaseAvailable()) {
    try {
      const row = await prisma.enterpriseAccountingCase.findFirst({
        where: {
          organizationId: input.organizationId,
          dealId: input.dealId,
        },
        select: {
          id: true,
          status: true,
          confirmedAt: true,
          confirmationSource: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      if (row) {
        accountingStatus = CHANAKYA_FIELD_AVAILABILITY.AVAILABLE;
        accountingCase = {
          entityId: row.id,
          status: row.status,
          confirmedAt: row.confirmedAt,
          confirmationSource: row.confirmationSource,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          provenance: "enterprise_accounting_case (created by post-disbursement confirmation service)",
        };
      }
    } catch {
      accountingStatus = CHANAKYA_FIELD_AVAILABILITY.UNKNOWN;
    }
  }

  let serviceEvents: unknown[] = [];
  try {
    const events = await enterpriseActivityService.list({
      dealId: input.dealId,
      sourceSystem: POST_DISBURSEMENT_EVENT_SOURCE,
      limit: 10,
    });
    serviceEvents = events.map((e) => ({
      entityId: e.id,
      title: e.title,
      eventKind: e.eventKind,
      occurredAt: e.occurredAt,
      sourceSystem: e.sourceSystem,
      provenance: "enterprise_activity_registry + post_disbursement_confirmation",
    }));
  } catch {
    /* optional */
  }

  let confirmationState: string;
  if (received || accountingCase) {
    confirmationState = "confirmation_received";
  } else if (pending) {
    confirmationState = "confirmation_pending";
  } else if (input.disbursedAt && !isPdcStage) {
    confirmationState = "not_in_confirmation_stage";
  } else if (!input.disbursedAt && !isPdcStage) {
    confirmationState = CHANAKYA_FIELD_AVAILABILITY.NOT_APPLICABLE;
  } else {
    confirmationState = CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE;
  }

  return redactCustomerContactPiiForAiContext({
    status:
      isPdcStage || accountingCase
        ? CHANAKYA_FIELD_AVAILABILITY.AVAILABLE
        : confirmationState === CHANAKYA_FIELD_AVAILABILITY.NOT_APPLICABLE
          ? CHANAKYA_FIELD_AVAILABILITY.NOT_APPLICABLE
          : CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
    entityId: input.dealId,
    confirmationState,
    dealStage: {
      grossStage: input.grossStage ?? null,
      subStage: input.subStage ?? null,
      note: "Stage values are those persisted by post-disbursement-confirmation service transitions — not string heuristics inventing confirmation.",
    },
    disbursedAt: input.disbursedAt ?? null,
    accountingCaseStatus: accountingStatus,
    accountingCase,
    serviceEvents,
    provenance:
      "post-disbursement-confirmation service SSOT (deal stage sub-stages + accounting case + EAR sourceSystem)",
  });
}
