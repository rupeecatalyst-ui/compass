/**
 * CO-WP-007 — Compliance projection + selectability + lifecycle transitions.
 */

import { WEALTH_PARTNER_LEGAL_ORG_POLICY } from "@/constants/enterprise-wealth-partner-legal-docket";
import type {
  WealthPartnerAgreementStatus,
  WealthPartnerComplianceStatus,
  WealthPartnerLegalComplianceProjection,
  WealthPartnerLegalDocumentKind,
  WealthPartnerLegalDocumentRecord,
  WealthPartnerLegalDocketState,
  WealthPartnerLegalLifecycleAction,
  WealthPartnerLegalOrgPolicy,
  WealthPartnerOpportunitySelectability,
  WealthPartnerRenewalStatus,
} from "@/types/enterprise-wealth-partner-legal-docket";
import { stampDigitalAcceptanceCertificate } from "./generate";
import { newId } from "./state";
import type { EnterpriseWealthPartnerRecord } from "@/types/enterprise-wealth-partner-registry";

function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso).getTime();
  const b = new Date(toIso).getTime();
  return Math.ceil((b - a) / (24 * 60 * 60 * 1000));
}

export function deriveAgreementRuntimeStatus(
  agreement: WealthPartnerLegalDocketState["agreement"],
  now = new Date(),
): WealthPartnerAgreementStatus {
  if (agreement.status === "suspended") return "suspended";
  if (agreement.status === "not_started") return "not_started";
  if (!agreement.effectiveUntil) return agreement.status;
  const nowMs = now.getTime();
  const until = new Date(agreement.effectiveUntil).getTime();
  if (until < nowMs) return "expired";
  if (agreement.status === "active" || agreement.status === "renewal_due") {
    const daysLeft = daysBetween(now.toISOString(), agreement.effectiveUntil);
    if (daysLeft <= 180) return "renewal_due";
    return "active";
  }
  return agreement.status;
}

export function deriveComplianceStatus(
  status: WealthPartnerAgreementStatus,
): WealthPartnerComplianceStatus {
  switch (status) {
    case "active":
      return "compliant";
    case "renewal_due":
      return "renewal_due";
    case "expired":
      return "expired";
    case "suspended":
      return "suspended";
    case "partner_signed":
    case "countersigned":
    case "sent":
    case "generated":
      return "pending_signature";
    default:
      return "incomplete";
  }
}

export function deriveRenewalStatus(
  status: WealthPartnerAgreementStatus,
  daysRemaining: number | null,
  policy: WealthPartnerLegalOrgPolicy = WEALTH_PARTNER_LEGAL_ORG_POLICY,
): WealthPartnerRenewalStatus {
  if (status === "not_started" || status === "generated" || status === "sent") {
    return "not_applicable";
  }
  if (status === "expired") return "expired";
  if (agreementRenewedRecently(status)) return "renewed";
  if (daysRemaining == null) return "not_applicable";
  const [d180, d90, d30] = policy.renewalReminderDays;
  if (daysRemaining <= d30) return "reminder_30";
  if (daysRemaining <= d90) return "reminder_90";
  if (daysRemaining <= d180) return "reminder_180";
  return "on_track";
}

function agreementRenewedRecently(status: WealthPartnerAgreementStatus): boolean {
  return status === "active" && false;
}

export function resolveWealthPartnerOpportunitySelectability(input: {
  lifecycleStatus: string;
  operationalStatus: string;
  agreementStatus: WealthPartnerAgreementStatus;
  /** Optional RegistryStatus (draft|active|inactive|archived). */
  registryStatus?: string;
  enabled?: boolean;
}): {
  selectability: WealthPartnerOpportunitySelectability;
  message: string;
} {
  const lifecycle = String(input.lifecycleStatus || "").toLowerCase();
  const registryStatus = String(input.registryStatus || "").toLowerCase();

  if (input.enabled === false) {
    return {
      selectability: "not_selectable",
      message: "Partner is disabled — not selectable for Opportunities.",
    };
  }
  if (registryStatus === "archived" || registryStatus === "inactive") {
    return {
      selectability: "not_selectable",
      message: `Registry status is ${registryStatus} — not selectable for Opportunities.`,
    };
  }
  if (
    lifecycle === "suspended" ||
    input.agreementStatus === "suspended" ||
    input.operationalStatus === "inactive"
  ) {
    return {
      selectability: "not_selectable",
      message: "Suspended — not selectable for Opportunities.",
    };
  }
  if (lifecycle === "retired") {
    return {
      selectability: "not_selectable",
      message: "Retired — not selectable for Opportunities.",
    };
  }
  if (input.agreementStatus === "expired") {
    return {
      selectability: "not_selectable",
      message:
        "Agreement Expired — existing Opportunities continue; new Opportunities cannot be sourced until renewal.",
    };
  }
  if (input.agreementStatus === "renewal_due") {
    return {
      selectability: "selectable_with_warning",
      message: "Renewal Due — selectable with warning until the agreement is renewed.",
    };
  }

  /** CO-WP-OPP-REFINEMENT-001 — Draft / Onboarding may source Opportunities (not payout). */
  if (lifecycle === "draft" || lifecycle === "onboarding") {
    const label = lifecycle === "draft" ? "Draft" : "Onboarding";
    return {
      selectability: "selectable",
      message: `${label} — selectable as Opportunity source. Payout remains subject to commercial / KYC eligibility.`,
    };
  }

  if (lifecycle === "active") {
    if (
      input.agreementStatus === "active" ||
      input.agreementStatus === "not_started" ||
      input.agreementStatus === "generated" ||
      input.agreementStatus === "sent" ||
      input.agreementStatus === "partner_signed" ||
      input.agreementStatus === "countersigned"
    ) {
      if (input.agreementStatus === "active") {
        return {
          selectability: "selectable",
          message: "Active — selectable for Opportunities.",
        };
      }
      return {
        selectability: "selectable",
        message: "Active partner — Legal Docket pending completion (does not block sourcing).",
      };
    }
    return {
      selectability: "selectable",
      message: "Active — selectable for Opportunities.",
    };
  }

  return {
    selectability: "not_selectable",
    message: `Partner lifecycle is ${input.lifecycleStatus} — not selectable for new Opportunities.`,
  };
}

export function composeWealthPartnerLegalCompliance(input: {
  partner: Pick<
    EnterpriseWealthPartnerRecord,
    "lifecycleStatus" | "operationalStatus" | "status" | "enabled"
  >;
  docket: WealthPartnerLegalDocketState;
  policy?: WealthPartnerLegalOrgPolicy;
  now?: Date;
}): WealthPartnerLegalComplianceProjection {
  const policy = input.policy ?? WEALTH_PARTNER_LEGAL_ORG_POLICY;
  const now = input.now ?? new Date();
  const agreementStatus = deriveAgreementRuntimeStatus(input.docket.agreement, now);
  const effectiveUntil = input.docket.agreement.effectiveUntil;
  const daysRemaining =
    effectiveUntil && agreementStatus !== "expired" && agreementStatus !== "not_started"
      ? Math.max(0, daysBetween(now.toISOString(), effectiveUntil))
      : agreementStatus === "expired"
        ? 0
        : null;

  const select = resolveWealthPartnerOpportunitySelectability({
    lifecycleStatus: input.partner.lifecycleStatus,
    operationalStatus: input.partner.operationalStatus,
    agreementStatus,
    registryStatus: input.partner.status,
    enabled: input.partner.enabled,
  });

  const currentDocs = input.docket.documents.filter((d) => d.status !== "archived");
  const signedDocuments = input.docket.documents.filter(
    (d) => d.status === "signed" || (d.signedAt && d.status !== "archived"),
  );

  const byKind = new Map<WealthPartnerLegalDocumentKind, WealthPartnerLegalDocumentRecord[]>();
  for (const doc of input.docket.documents) {
    const list = byKind.get(doc.documentKind) ?? [];
    list.push(doc);
    byKind.set(doc.documentKind, list);
  }
  const versionHistory = [...byKind.entries()].map(([documentKind, versions]) => ({
    documentKind,
    documentName: versions[0]?.documentName ?? documentKind,
    versions: [...versions].sort((a, b) => b.versionNumber - a.versionNumber),
  }));

  return {
    agreementStatus,
    agreementVersion: input.docket.agreement.version,
    effectiveFrom: input.docket.agreement.effectiveFrom,
    effectiveUntil: input.docket.agreement.effectiveUntil,
    daysRemaining,
    complianceStatus: deriveComplianceStatus(agreementStatus),
    renewalStatus: deriveRenewalStatus(agreementStatus, daysRemaining, policy),
    selectability: select.selectability,
    selectabilityMessage: select.message,
    documents: currentDocs,
    signedDocuments,
    versionHistory,
    timeline: [...input.docket.timeline].sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
    ),
    reminders: input.docket.reminders,
    audit: [...input.docket.audit].sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
    ),
    docketReady: currentDocs.length > 0,
    policy,
  };
}

export function applyWealthPartnerLegalLifecycle(input: {
  docket: WealthPartnerLegalDocketState;
  action: WealthPartnerLegalLifecycleAction;
  actorUserId: string;
  partner: EnterpriseWealthPartnerRecord;
  bankSummary?: string | null;
  documentId?: string | null;
  policy?: WealthPartnerLegalOrgPolicy;
  now?: Date;
}): WealthPartnerLegalDocketState {
  const nowIso = (input.now ?? new Date()).toISOString();
  let docket: WealthPartnerLegalDocketState = {
    ...input.docket,
    agreement: { ...input.docket.agreement },
    documents: [...input.docket.documents],
    timeline: [...input.docket.timeline],
    audit: [...input.docket.audit],
    reminders: [...input.docket.reminders],
  };

  const pushTimeline = (
    event: WealthPartnerLegalDocketState["timeline"][number]["event"],
    detail: string,
  ) => {
    docket.timeline.push({
      id: newId("tl"),
      event,
      at: nowIso,
      actorUserId: input.actorUserId,
      detail,
    });
  };
  const pushAudit = (
    action: WealthPartnerLegalDocketState["audit"][number]["action"],
    detail: string,
    documentId?: string | null,
  ) => {
    docket.audit.push({
      id: newId("aud"),
      action,
      at: nowIso,
      actorUserId: input.actorUserId,
      detail,
      documentId: documentId ?? null,
    });
  };

  switch (input.action) {
    case "mark_sent":
      docket.agreement.status = "sent";
      docket.agreement.sentAt = nowIso;
      docket.documents = docket.documents.map((d) =>
        d.status === "generated" && d.versionNumber === docket.agreement.versionNumber
          ? { ...d, status: "sent" }
          : d,
      );
      pushTimeline("agreement_sent", "Agreement sent to Wealth Partner");
      pushAudit("sent", "Legal Docket sent");
      break;
    case "mark_partner_signed":
      docket.agreement.status = "partner_signed";
      docket.agreement.partnerSignedAt = nowIso;
      pushTimeline("partner_signed", "Partner signed");
      pushAudit("signed", "Partner signed Legal Docket");
      break;
    case "mark_countersigned":
      docket.agreement.status = "countersigned";
      docket.agreement.companyCountersignedAt = nowIso;
      pushTimeline("company_countersigned", "Company counter-signed");
      pushAudit("countersigned", "Company counter-signed");
      break;
    case "activate":
      docket.agreement.status = "active";
      docket.agreement.activatedAt = nowIso;
      docket.agreement.activatedBy = input.actorUserId;
      docket = stampDigitalAcceptanceCertificate(docket, {
        partner: input.partner,
        actorUserId: input.actorUserId,
        bankSummary: input.bankSummary,
        policy: input.policy,
        now: input.now,
      });
      pushTimeline("agreement_activated", "Agreement activated");
      pushAudit("signed", "Agreement activated; Digital Acceptance Certificate issued");
      break;
    case "mark_expired":
      docket.agreement.status = "expired";
      docket.agreement.expiredAt = nowIso;
      docket.reminders = docket.reminders.map((r) =>
        r.kind === "expired" ? { ...r, status: "fired", firedAt: nowIso } : r,
      );
      pushTimeline("agreement_expired", "Agreement expired");
      pushAudit("expired", "Agreement expired — new Opportunities blocked until renewal");
      break;
    case "suspend":
      docket.agreement.status = "suspended";
      docket.agreement.suspendedAt = nowIso;
      pushTimeline("agreement_suspended", "Agreement suspended");
      pushAudit("suspended", "Agreement suspended — not selectable");
      break;
    case "record_view":
      pushTimeline("document_viewed", "Document viewed");
      pushAudit("viewed", "Document viewed", input.documentId);
      break;
    case "record_download":
      pushTimeline("document_downloaded", "Document downloaded");
      pushAudit("downloaded", "Document downloaded", input.documentId);
      break;
    default:
      break;
  }

  return docket;
}

/** Apply scheduled reminder firing / expiry based on clock (idempotent). */
export function advanceWealthPartnerLegalClock(
  docket: WealthPartnerLegalDocketState,
  now = new Date(),
): WealthPartnerLegalDocketState {
  const nowMs = now.getTime();
  const next = { ...docket, reminders: [...docket.reminders], agreement: { ...docket.agreement } };
  const runtime = deriveAgreementRuntimeStatus(next.agreement, now);
  if (runtime === "expired" && next.agreement.status !== "expired" && next.agreement.status !== "suspended") {
    next.agreement.status = "expired";
    next.agreement.expiredAt = now.toISOString();
    next.timeline = [
      ...next.timeline,
      {
        id: newId("tl"),
        event: "agreement_expired",
        at: now.toISOString(),
        actorUserId: null,
        detail: "Agreement validity window elapsed",
      },
    ];
    next.audit = [
      ...next.audit,
      {
        id: newId("aud"),
        action: "expired",
        at: now.toISOString(),
        actorUserId: null,
        detail: "Auto-expired by Organisation Policy validity window",
      },
    ];
  } else if (runtime === "renewal_due" && next.agreement.status === "active") {
    next.agreement.status = "renewal_due";
  }

  next.reminders = next.reminders.map((r) => {
    if (r.status !== "scheduled") return r;
    if (new Date(r.dueAt).getTime() <= nowMs) {
      return { ...r, status: "fired" as const, firedAt: now.toISOString() };
    }
    return r;
  });
  return next;
}
