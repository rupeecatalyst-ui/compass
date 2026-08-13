/**
 * CO-C1-CONTACT-360 / UX-REFINEMENT-002 — Contact 360° relationship intelligence compose.
 * Derives from Opportunity / Deal / ECM / Company / ETE / Document Registry / EAR.
 * Does not create a new relationship or activity store.
 */

import { formatINR } from "@/lib/format-currency";
import { computeEcmContactScore } from "@/lib/enterprise-contact-master/contact-score";
import {
  listEcmRelationshipsFrom,
  listEcmRelationshipsTo,
  listEcmContacts,
} from "@/lib/enterprise-contact-master";
import { listContactCompanyLinks, getEcmCompany } from "@/lib/enterprise-company-master";
import { enterpriseOpportunityApiClient } from "@/lib/enterprise-opportunity/opportunity-api-client";
import type { EnterpriseOpportunityApiRecord } from "@/lib/enterprise-opportunity/opportunity-api-client";
import { enterpriseDealApiClient } from "@/lib/enterprise-deal/deal-api-client";
import type { EnterpriseDealApiRecord } from "@/lib/enterprise-deal/deal-api-client";
import { listEnterpriseActivity } from "@/lib/enterprise-activity-registry/api-client";
import { listTasksForEntity } from "@/lib/enterprise-task-engine";
import { listDocumentsForOpportunityRuntime } from "@/lib/document-registry";
import type { EcmContact } from "@/types/enterprise-contact-master";
import type { EnterpriseActivityEvent } from "@/types/enterprise-activity-registry";

export type Contact360RelationshipCategory =
  | "companies"
  | "opportunities"
  | "deals"
  | "loans"
  | "lenders"
  | "wealth_partners"
  | "co_applicants"
  | "guarantors"
  | "referrers"
  | "documents"
  | "tasks"
  | "communication"
  | "explicit";

export type Contact360DerivedLinkKind =
  | "opportunity"
  | "deal"
  | "loan"
  | "company"
  | "explicit_contact"
  | "lender"
  | "wealth_partner"
  | "co_applicant"
  | "guarantor"
  | "referrer"
  | "document"
  | "task"
  | "communication";

export interface Contact360DerivedLink {
  id: string;
  kind: Contact360DerivedLinkKind;
  category: Contact360RelationshipCategory;
  label: string;
  detail: string;
  derived: boolean;
  hrefHint?: string;
}

export interface Contact360RelationshipSection {
  category: Contact360RelationshipCategory;
  title: string;
  items: Contact360DerivedLink[];
}

export interface Contact360Snapshot {
  contactScore: number;
  companyLabel: string | null;
  totalOpportunities: number;
  currentOpportunities: number;
  totalDeals: number;
  activeDeals: number;
  disbursedDeals: number;
  totalBusinessValue: number;
  totalBusinessValueLabel: string;
  lastActionAt: string | null;
  lastDialogueAt: string | null;
  lastOpportunityAt: string | null;
  /** Flat list (compat) */
  derivedLinks: Contact360DerivedLink[];
  /** Grouped relationship intelligence sections */
  relationshipSections: Contact360RelationshipSection[];
  opportunities: EnterpriseOpportunityApiRecord[];
  deals: EnterpriseDealApiRecord[];
  recentActivity: EnterpriseActivityEvent[];
}

const SECTION_META: ReadonlyArray<{
  category: Contact360RelationshipCategory;
  title: string;
}> = [
  { category: "companies", title: "Companies" },
  { category: "opportunities", title: "Opportunities" },
  { category: "deals", title: "Deals" },
  { category: "loans", title: "Loans / Disbursed" },
  { category: "lenders", title: "Lenders" },
  { category: "wealth_partners", title: "Wealth Partners" },
  { category: "co_applicants", title: "Co-applicants" },
  { category: "guarantors", title: "Guarantors" },
  { category: "referrers", title: "Referrers / Introducers" },
  { category: "documents", title: "Documents" },
  { category: "tasks", title: "Tasks" },
  { category: "communication", title: "Communication" },
  { category: "explicit", title: "Explicit Relationships" },
];

function isActiveLifecycle(status?: string | null): boolean {
  const s = (status || "").toLowerCase();
  return (
    s === "active" ||
    s === "requirement_captured" ||
    s === "on_hold" ||
    s === "in_progress"
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function stringField(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function contactNameById(id: string | null | undefined): string | null {
  if (!id?.trim()) return null;
  const hit = listEcmContacts().find((c) => c.id === id);
  return hit?.name?.trim() || null;
}

function pushUnique(
  list: Contact360DerivedLink[],
  seen: Set<string>,
  item: Contact360DerivedLink,
): void {
  if (seen.has(item.id)) return;
  seen.add(item.id);
  list.push(item);
}

function projectParticipantsFromExtension(
  ext: Record<string, unknown>,
  opportunityId: string,
  seen: Set<string>,
  list: Contact360DerivedLink[],
): void {
  const participants = Array.isArray(ext.participants) ? ext.participants : [];
  for (const raw of participants) {
    const p = asRecord(raw);
    const role = (stringField(p, ["role", "participantRole"]) || "").toLowerCase();
    const name =
      stringField(p, ["name", "displayName", "contactName"]) ||
      contactNameById(stringField(p, ["contactId", "entityId", "id"]));
    if (!name) continue;
    const idBase = stringField(p, ["contactId", "entityId", "id"]) || name;
    if (role.includes("co_applicant") || role.includes("co-applicant") || role === "coapplicant") {
      pushUnique(list, seen, {
        id: `coapp:${opportunityId}:${idBase}`,
        kind: "co_applicant",
        category: "co_applicants",
        label: name,
        detail: `Co-applicant · Opportunity`,
        derived: true,
      });
    } else if (role.includes("guarantor")) {
      pushUnique(list, seen, {
        id: `guar:${opportunityId}:${idBase}`,
        kind: "guarantor",
        category: "guarantors",
        label: name,
        detail: `Guarantor · Opportunity`,
        derived: true,
      });
    }
  }

  const coName =
    stringField(ext, ["coApplicantName", "coApplicant", "co_applicant_name"]) ||
    contactNameById(stringField(ext, ["coApplicantId", "coApplicantContactId"]));
  if (coName) {
    pushUnique(list, seen, {
      id: `coapp:${opportunityId}:${coName}`,
      kind: "co_applicant",
      category: "co_applicants",
      label: coName,
      detail: "Co-applicant · Opportunity",
      derived: true,
    });
  }

  const guarName =
    stringField(ext, ["guarantorName", "guarantor", "guarantor_name"]) ||
    contactNameById(stringField(ext, ["guarantorId", "guarantorContactId"]));
  if (guarName) {
    pushUnique(list, seen, {
      id: `guar:${opportunityId}:${guarName}`,
      kind: "guarantor",
      category: "guarantors",
      label: guarName,
      detail: "Guarantor · Opportunity",
      derived: true,
    });
  }
}

export async function composeContact360Snapshot(
  contact: EcmContact,
): Promise<Contact360Snapshot> {
  const contactScore =
    typeof contact.contactScore === "number"
      ? contact.contactScore
      : computeEcmContactScore(contact);

  const [oppPage, dealPage, activity] = await Promise.all([
    enterpriseOpportunityApiClient
      .searchOpportunities({
        primaryContactId: contact.id,
        limit: 100,
        offset: 0,
      })
      .catch(() => ({ items: [] as EnterpriseOpportunityApiRecord[], total: 0 })),
    enterpriseDealApiClient
      .searchDeals({ archived: false, pageSize: 200, view: "full", q: contact.name })
      .catch(() => ({ items: [] as EnterpriseDealApiRecord[], total: 0 })),
    listEnterpriseActivity({ contactId: contact.id, limit: 60 }).catch(
      () => [] as EnterpriseActivityEvent[],
    ),
  ]);

  const opportunities = oppPage.items ?? [];
  const contactDealIds = new Set(opportunities.map((o) => o.id).filter(Boolean));
  const deals = (dealPage.items ?? []).filter(
    (d) =>
      (d.primaryContactId && d.primaryContactId === contact.id) ||
      (d.opportunityId && contactDealIds.has(d.opportunityId)) ||
      (d.primaryContactName || "")
        .toLowerCase()
        .includes(contact.name.trim().toLowerCase()),
  );

  const currentOpportunities = opportunities.filter((o) =>
    isActiveLifecycle(o.lifecycleStatus),
  ).length;
  const activeDeals = deals.filter((d) => {
    const stage = (d.grossStage || "").toLowerCase();
    return stage && stage !== "lost" && stage !== "disbursed" && !d.archived;
  }).length;
  const disbursedDeals = deals.filter((d) =>
    (d.grossStage || "").toLowerCase().includes("disburs"),
  ).length;
  const totalBusinessValue = deals.reduce(
    (sum, d) => sum + (d.requestedAmount ?? d.approvedAmount ?? 0),
    0,
  );

  const lastOpportunityAt =
    opportunities
      .map((o) => o.createdAt)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;

  const lastActionAt =
    activity.map((e) => e.occurredAt).filter(Boolean).sort().at(-1) ??
    deals.map((d) => d.updatedAt).filter(Boolean).sort().at(-1) ??
    null;

  const lastDialogueAt =
    activity
      .filter((e) => e.eventKind === "dialogue" || e.eventKind === "communications")
      .map((e) => e.occurredAt)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;

  const companyLinks = listContactCompanyLinks(contact.id);
  const companyNames = companyLinks
    .map((link) => getEcmCompany(link.companyId)?.companyName?.trim())
    .filter(Boolean) as string[];
  for (const o of opportunities) {
    if (o.companyName?.trim()) companyNames.push(o.companyName.trim());
  }
  const companyLabel = companyNames[0] ?? null;

  const seen = new Set<string>();
  const derivedLinks: Contact360DerivedLink[] = [];

  for (const link of companyLinks) {
    const company = getEcmCompany(link.companyId);
    pushUnique(derivedLinks, seen, {
      id: `company:${link.id}`,
      kind: "company",
      category: "companies",
      label: company?.companyName || link.companyId,
      detail: link.relationRole || "Company link",
      derived: true,
    });
  }
  for (const o of opportunities) {
    if (o.companyId && o.companyName?.trim()) {
      pushUnique(derivedLinks, seen, {
        id: `company:opp:${o.companyId}`,
        kind: "company",
        category: "companies",
        label: o.companyName.trim(),
        detail: "Company on Opportunity",
        derived: true,
      });
    }
  }

  for (const o of opportunities.slice(0, 20)) {
    pushUnique(derivedLinks, seen, {
      id: `opp:${o.id}`,
      kind: "opportunity",
      category: "opportunities",
      label: o.opportunityNumber || o.id,
      detail: [o.productLabel, o.lifecycleStatus || o.requirementStage]
        .filter(Boolean)
        .join(" · "),
      derived: true,
    });

    const ext = asRecord(o.lendingExtension);
    projectParticipantsFromExtension(ext, o.id, seen, derivedLinks);

    if (o.sourceWealthPartnerId || o.sourceContactName) {
      const wpName =
        contactNameById(o.sourceWealthPartnerId) ||
        o.sourceContactName?.trim() ||
        null;
      if (o.sourceWealthPartnerId && wpName) {
        pushUnique(derivedLinks, seen, {
          id: `wp:${o.sourceWealthPartnerId}`,
          kind: "wealth_partner",
          category: "wealth_partners",
          label: wpName,
          detail: "Wealth Partner · Opportunity source",
          derived: true,
        });
      } else if (wpName && (o.sourceCode || "").toLowerCase().includes("partner")) {
        pushUnique(derivedLinks, seen, {
          id: `wp:${wpName}`,
          kind: "wealth_partner",
          category: "wealth_partners",
          label: wpName,
          detail: "Wealth Partner · Opportunity source",
          derived: true,
        });
      } else if (wpName && o.sourceContactName?.trim()) {
        pushUnique(derivedLinks, seen, {
          id: `ref:${o.sourceContactId || wpName}`,
          kind: "referrer",
          category: "referrers",
          label: wpName,
          detail: `Referrer / Introducer${o.sourceCode ? ` · ${o.sourceCode}` : ""}`,
          derived: true,
        });
      }
    }

    const docs = listDocumentsForOpportunityRuntime(o.id, o.id, {
      contactId: contact.id,
      opportunityNumber: o.opportunityNumber,
    });
    for (const doc of docs.slice(0, 8)) {
      pushUnique(derivedLinks, seen, {
        id: `doc:${doc.id}`,
        kind: "document",
        category: "documents",
        label: doc.displayName || doc.categoryLabel || doc.typeRef || "Document",
        detail: `Document · ${o.opportunityNumber || "Opportunity"}`,
        derived: true,
      });
    }
  }

  for (const d of deals.slice(0, 20)) {
    const stage = (d.grossStage || "").toLowerCase();
    const isDisbursed = stage.includes("disburs");
    pushUnique(derivedLinks, seen, {
      id: `deal:${d.id}`,
      kind: isDisbursed ? "loan" : "deal",
      category: isDisbursed ? "loans" : "deals",
      label: d.dealNumber || d.id,
      detail: [d.primaryCounterpartyName, d.grossStage].filter(Boolean).join(" · ") || "Deal",
      derived: true,
    });
    if (d.primaryCounterpartyName?.trim()) {
      pushUnique(derivedLinks, seen, {
        id: `lender:${d.lenderId || d.primaryCounterpartyName}`,
        kind: "lender",
        category: "lenders",
        label: d.primaryCounterpartyName.trim(),
        detail: "Lender on Deal",
        derived: true,
      });
    }

    const snap = asRecord(d.snapshot);
    const partnerName =
      stringField(snap, [
        "channelPartnerName",
        "partnerName",
        "wealthPartnerName",
      ]) ||
      (d.invoicePartyType === "channel_partner" ||
      d.invoicePartyType === "wealth_partner"
        ? d.invoicePartySpecify
        : null);
    if (partnerName?.trim()) {
      pushUnique(derivedLinks, seen, {
        id: `wp:deal:${d.invoicePartyContactId || partnerName}`,
        kind: "wealth_partner",
        category: "wealth_partners",
        label: partnerName.trim(),
        detail: "Wealth Partner · Deal",
        derived: true,
      });
    }

    const refName = stringField(snap, [
      "referralSourceName",
      "leadSource",
      "sourceName",
    ]);
    if (refName) {
      pushUnique(derivedLinks, seen, {
        id: `ref:deal:${refName}`,
        kind: "referrer",
        category: "referrers",
        label: refName,
        detail: "Referrer · Deal",
        derived: true,
      });
    }

    const lendExt = asRecord(d.lendingExtension);
    projectParticipantsFromExtension(lendExt, d.id, seen, derivedLinks);
  }

  const tasks = listTasksForEntity({ contactId: contact.id });
  for (const t of tasks.slice(0, 12)) {
    pushUnique(derivedLinks, seen, {
      id: `task:${t.id}`,
      kind: "task",
      category: "tasks",
      label: t.title || "Task",
      detail: [t.status, t.workType].filter(Boolean).join(" · ") || "Task",
      derived: true,
    });
  }

  for (const e of activity.filter(
    (row) => row.eventKind === "communications" || row.eventKind === "dialogue",
  ).slice(0, 12)) {
    pushUnique(derivedLinks, seen, {
      id: `comm:${e.id}`,
      kind: "communication",
      category: "communication",
      label: e.title || "Communication",
      detail: e.summary || e.eventKind,
      derived: true,
    });
  }

  for (const rel of [
    ...listEcmRelationshipsFrom(contact.id),
    ...listEcmRelationshipsTo(contact.id),
  ]) {
    const otherId =
      rel.fromContactId === contact.id ? rel.toContactId : rel.fromContactId;
    const otherName = contactNameById(otherId) || `${otherId.slice(0, 8)}…`;
    pushUnique(derivedLinks, seen, {
      id: `rel:${rel.id}`,
      kind: "explicit_contact",
      category: "explicit",
      label: otherName,
      detail: rel.relationshipType.replace(/_/g, " "),
      derived: false,
    });
  }

  const relationshipSections: Contact360RelationshipSection[] = SECTION_META.map(
    (meta) => ({
      category: meta.category,
      title: meta.title,
      items: derivedLinks.filter((l) => l.category === meta.category),
    }),
  );

  return {
    contactScore,
    companyLabel,
    totalOpportunities: opportunities.length,
    currentOpportunities,
    totalDeals: deals.length,
    activeDeals,
    disbursedDeals,
    totalBusinessValue,
    totalBusinessValueLabel: formatINR(totalBusinessValue),
    lastActionAt,
    lastDialogueAt,
    lastOpportunityAt,
    derivedLinks,
    relationshipSections,
    opportunities,
    deals,
    recentActivity: [...activity].sort((a, b) =>
      (b.occurredAt || "").localeCompare(a.occurredAt || ""),
    ),
  };
}

export function formatContact360When(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function formatContact360DateOnly(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}
