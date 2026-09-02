/**
 * CO-C1-CONTACT-360 / UX-REFINEMENT-002 — Contact 360° relationship intelligence compose.
 * Graph: Contact → Company role → Opportunity → Deal (canonical IDs only).
 * Does not create a new relationship or activity store.
 */

import { formatINR } from "@/lib/format-currency";
import { computeEcmContactScore } from "@/lib/enterprise-contact-master/contact-score";
import {
  listEcmRelationshipsFrom,
  listEcmRelationshipsTo,
  listEcmContacts,
} from "@/lib/enterprise-contact-master";
import { getEcmCompany } from "@/lib/enterprise-company-master";
import type { EnterpriseOpportunityApiRecord } from "@/lib/enterprise-opportunity/opportunity-api-client";
import type { EnterpriseDealApiRecord } from "@/lib/enterprise-deal/deal-api-client";
import { listEnterpriseActivity } from "@/lib/enterprise-activity-registry/api-client";
import { listTasksForEntity } from "@/lib/enterprise-task-engine";
import { getAllDocumentRegistryRecords } from "@/lib/document-registry";
import { enterpriseAccountingCaseClient } from "@/lib/enterprise-accounting-case/client";
import { ROUTES } from "@/constants/routes";
import {
  buildDealWorkspaceHref,
  buildOpportunityWorkspaceEntryHref,
} from "@/lib/loan-journey/adr-018-routing";
import {
  archivedContactHasActiveTransaction,
  dedupeActivityEvents,
  deriveContact360BusinessValue,
  isActiveDeal,
  isCurrentOpportunityLifecycle,
  isDisbursedDeal,
  resolveContact360Graph,
  type Contact360TimelineRow,
} from "@/lib/enterprise-contact-master/contact-360-relationship-graph";
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
  | "accounting"
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
  | "communication"
  | "accounting";

export type Contact360SnapshotMeasureId =
  | "total_opportunities"
  | "current_opportunities"
  | "total_deals"
  | "active_deals"
  | "loans_disbursed"
  | "total_business_value"
  | "last_action"
  | "last_dialogue"
  | "last_opportunity";

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

export type { Contact360TimelineRow };

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
  lastOpportunityId: string | null;
  archivedReadOnly: boolean;
  activeTransactionWarning: string | null;
  graphOpportunityIds: string[];
  graphDealIds: string[];
  measureFocus: Partial<Record<Contact360SnapshotMeasureId, Contact360RelationshipCategory | "timeline">>;
  /** Flat list (compat) */
  derivedLinks: Contact360DerivedLink[];
  /** Grouped relationship intelligence sections */
  relationshipSections: Contact360RelationshipSection[];
  opportunities: EnterpriseOpportunityApiRecord[];
  deals: EnterpriseDealApiRecord[];
  recentActivity: EnterpriseActivityEvent[];
  unifiedTimeline: Contact360TimelineRow[];
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
  { category: "accounting", title: "Disbursement / Accounting" },
  { category: "explicit", title: "Explicit Relationships" },
];

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

function opportunityHref(opp: Pick<EnterpriseOpportunityApiRecord, "id" | "legacyLoanFileId">): string {
  return buildOpportunityWorkspaceEntryHref(opp);
}

function dealHref(deal: Pick<EnterpriseDealApiRecord, "id" | "opportunityId" | "legacyLoanFileId">): string {
  return buildDealWorkspaceHref({
    dealId: deal.id,
    opportunityId: deal.opportunityId,
    fileId: deal.legacyLoanFileId,
  });
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
  opportunityHrefHint: string,
): void {
  const participants = Array.isArray(ext.participants) ? ext.participants : [];
  for (const raw of participants) {
    const p = asRecord(raw);
    const role = (stringField(p, ["role", "participantRole"]) || "").toLowerCase();
    const entityId = stringField(p, ["contactId", "entityId"]);
    if (!entityId) continue;
    const name = contactNameById(entityId) || stringField(p, ["name", "displayName", "contactName"]) || entityId;
    if (role.includes("co_applicant") || role.includes("co-applicant") || role === "coapplicant") {
      pushUnique(list, seen, {
        id: `coapp:${opportunityId}:${entityId}`,
        kind: "co_applicant",
        category: "co_applicants",
        label: name,
        detail: "Co-applicant · Opportunity",
        derived: true,
        hrefHint: `${ROUTES.CONTACTS}?contact=${encodeURIComponent(entityId)}`,
      });
    } else if (role.includes("guarantor")) {
      pushUnique(list, seen, {
        id: `guar:${opportunityId}:${entityId}`,
        kind: "guarantor",
        category: "guarantors",
        label: name,
        detail: "Guarantor · Opportunity",
        derived: true,
        hrefHint: `${ROUTES.CONTACTS}?contact=${encodeURIComponent(entityId)}`,
      });
    }
  }

  const coId = stringField(ext, ["coApplicantId", "coApplicantContactId"]);
  if (coId) {
    pushUnique(list, seen, {
      id: `coapp:${opportunityId}:${coId}`,
      kind: "co_applicant",
      category: "co_applicants",
      label: contactNameById(coId) || "Co-applicant",
      detail: "Co-applicant · Opportunity",
      derived: true,
      hrefHint: `${ROUTES.CONTACTS}?contact=${encodeURIComponent(coId)}`,
    });
  }

  const guarId = stringField(ext, ["guarantorId", "guarantorContactId"]);
  if (guarId) {
    pushUnique(list, seen, {
      id: `guar:${opportunityId}:${guarId}`,
      kind: "guarantor",
      category: "guarantors",
      label: contactNameById(guarId) || "Guarantor",
      detail: "Guarantor · Opportunity",
      derived: true,
      hrefHint: `${ROUTES.CONTACTS}?contact=${encodeURIComponent(guarId)}`,
    });
  }

  void opportunityHrefHint;
}

function listDocumentsForGraph(input: {
  contactId: string;
  companyIds: string[];
  opportunityIds: string[];
  dealIds: string[];
}) {
  const companies = new Set(input.companyIds);
  const opps = new Set(input.opportunityIds);
  const deals = new Set(input.dealIds);
  return getAllDocumentRegistryRecords().filter((r) => {
    if (r.status === "deleted") return false;
    const links = r.links;
    if (links.contactId === input.contactId || links.customerId === input.contactId) return true;
    if (links.companyId && companies.has(links.companyId)) return true;
    if (links.opportunityId && opps.has(links.opportunityId)) return true;
    if (links.dealId && deals.has(links.dealId)) return true;
    if (links.loanFileId && deals.has(links.loanFileId)) return true;
    return false;
  });
}

function sourceWorkspaceForEvent(event: EnterpriseActivityEvent): string {
  if (event.dealId) return "Deal Workspace";
  if (event.documentId) return "Document Workspace";
  if (event.taskId) return "Tasks";
  if (event.eventKind === "dialogue" || event.eventKind === "communications") return "Activity & Dialogue";
  if (event.opportunityId) return "Opportunity Workspace";
  return "Contact 360";
}

function hrefForEvent(event: EnterpriseActivityEvent): string | undefined {
  if (event.dealId) return buildDealWorkspaceHref({ dealId: event.dealId, opportunityId: event.opportunityId });
  if (event.opportunityId) return buildOpportunityWorkspaceEntryHref({ id: event.opportunityId });
  if (event.documentId) return ROUTES.DOCUMENT_WORKSPACE;
  if (event.taskId) return ROUTES.TASKS;
  if (event.contactId) return `${ROUTES.CONTACTS}?contact=${encodeURIComponent(event.contactId)}`;
  return ROUTES.ACTIVITY;
}

export async function composeContact360Snapshot(
  contact: EcmContact,
): Promise<Contact360Snapshot> {
  const contactScore =
    typeof contact.contactScore === "number"
      ? contact.contactScore
      : computeEcmContactScore(contact);

  const graph = await resolveContact360Graph(contact);
  const opportunities = graph.opportunities;
  const deals = graph.deals;
  const companyById = new Map(
    graph.companyLinks.map((l) => [l.companyId, l.companyLabel] as const),
  );
  const oppById = new Map(opportunities.map((o) => [o.id, o] as const));
  const dealById = new Map(deals.map((d) => [d.id, d] as const));

  const activityBatches = await Promise.all([
    listEnterpriseActivity({ contactId: contact.id, limit: 80 }).catch(
      () => [] as EnterpriseActivityEvent[],
    ),
    ...graph.opportunityIds.slice(0, 24).map((opportunityId) =>
      listEnterpriseActivity({ opportunityId, limit: 40 }).catch(
        () => [] as EnterpriseActivityEvent[],
      ),
    ),
    ...graph.dealIds.slice(0, 24).map((dealId) =>
      listEnterpriseActivity({ dealId, limit: 40 }).catch(
        () => [] as EnterpriseActivityEvent[],
      ),
    ),
  ]);
  const activity = dedupeActivityEvents(activityBatches.flat());

  const currentOpportunities = opportunities.filter((o) =>
    isCurrentOpportunityLifecycle(o.lifecycleStatus),
  ).length;
  const activeDeals = deals.filter((d) => isActiveDeal(d)).length;
  const disbursedDeals = deals.filter((d) => isDisbursedDeal(d)).length;
  const totalBusinessValue = deriveContact360BusinessValue(opportunities, deals);

  const lastOpportunity =
    [...opportunities].sort((a, b) =>
      (b.createdAt || b.updatedAt || "").localeCompare(a.createdAt || a.updatedAt || ""),
    )[0] ?? null;
  const lastOpportunityAt = lastOpportunity?.createdAt || lastOpportunity?.updatedAt || null;

  const lastActionAt =
    activity.map((e) => e.occurredAt).filter(Boolean).sort().at(-1) ??
    deals.map((d) => d.updatedAt).filter(Boolean).sort().at(-1) ??
    lastOpportunityAt;

  const lastDialogueAt =
    activity
      .filter((e) => e.eventKind === "dialogue" || e.eventKind === "communications")
      .map((e) => e.occurredAt)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;

  const companyLabel = graph.companyLinks[0]?.companyLabel ?? null;
  const archivedReadOnly = contact.status === "archived";
  const activeTransactionWarning = archivedContactHasActiveTransaction(
    contact.status,
    opportunities,
    deals,
  )
    ? "Data quality: this archived Contact is still linked to an active Opportunity or Deal. History is visible. The Contact is not reactivated."
    : null;

  const seen = new Set<string>();
  const derivedLinks: Contact360DerivedLink[] = [];

  for (const link of graph.companyLinks) {
    pushUnique(derivedLinks, seen, {
      id: `company:${link.linkId}`,
      kind: "company",
      category: "companies",
      label: link.companyLabel,
      detail: `${link.relationRole.replace(/_/g, " ")}${link.status !== "active" ? " · historical" : ""}`,
      derived: true,
      hrefHint: `${ROUTES.CONTACTS}?company=${encodeURIComponent(link.companyId)}`,
    });
  }
  for (const o of opportunities) {
    if (o.companyId && !graph.companyIds.includes(o.companyId) && o.companyName?.trim()) {
      pushUnique(derivedLinks, seen, {
        id: `company:opp:${o.companyId}`,
        kind: "company",
        category: "companies",
        label: o.companyName.trim(),
        detail: "Company on Opportunity",
        derived: true,
        hrefHint: `${ROUTES.CONTACTS}?company=${encodeURIComponent(o.companyId)}`,
      });
    }
  }

  for (const o of opportunities) {
    const href = opportunityHref(o);
    pushUnique(derivedLinks, seen, {
      id: `opp:${o.id}`,
      kind: "opportunity",
      category: "opportunities",
      label: o.opportunityNumber || o.id,
      detail: [o.productLabel, o.lifecycleStatus || o.requirementStage, o.companyName]
        .filter(Boolean)
        .join(" · "),
      derived: true,
      hrefHint: href,
    });

    const ext = asRecord(o.lendingExtension);
    projectParticipantsFromExtension(ext, o.id, seen, derivedLinks, href);

    if (o.sourceWealthPartnerId) {
      const wpName = contactNameById(o.sourceWealthPartnerId) || "Wealth Partner";
      pushUnique(derivedLinks, seen, {
        id: `wp:${o.sourceWealthPartnerId}`,
        kind: "wealth_partner",
        category: "wealth_partners",
        label: wpName,
        detail: "Wealth Partner · Opportunity source",
        derived: true,
        hrefHint: `${ROUTES.CONTACTS}?contact=${encodeURIComponent(o.sourceWealthPartnerId)}`,
      });
    } else if (o.sourceContactId) {
      const refName = contactNameById(o.sourceContactId) || "Referrer";
      pushUnique(derivedLinks, seen, {
        id: `ref:${o.sourceContactId}`,
        kind: "referrer",
        category: "referrers",
        label: refName,
        detail: `Referrer / Introducer${o.sourceCode ? ` · ${o.sourceCode}` : ""}`,
        derived: true,
        hrefHint: `${ROUTES.CONTACTS}?contact=${encodeURIComponent(o.sourceContactId)}`,
      });
    }
  }

  for (const d of deals) {
    const stage = (d.grossStage || "").toLowerCase();
    const isLoan = isDisbursedDeal(d) || stage.includes("disburs");
    pushUnique(derivedLinks, seen, {
      id: `deal:${d.id}`,
      kind: isLoan ? "loan" : "deal",
      category: isLoan ? "loans" : "deals",
      label: d.dealNumber || d.id,
      detail: [d.primaryCounterpartyName, d.grossStage, d.opportunityNumber]
        .filter(Boolean)
        .join(" · ") || "Deal",
      derived: true,
      hrefHint: dealHref(d),
    });
    if (d.lenderId) {
      pushUnique(derivedLinks, seen, {
        id: `lender:${d.lenderId}`,
        kind: "lender",
        category: "lenders",
        label: d.primaryCounterpartyName?.trim() || d.lenderId,
        detail: "Lender on Deal",
        derived: true,
        hrefHint: dealHref(d),
      });
    }

    const snap = asRecord(d.snapshot);
    if (d.invoicePartyContactId) {
      const partnerName =
        contactNameById(d.invoicePartyContactId) ||
        stringField(snap, ["channelPartnerName", "partnerName", "wealthPartnerName"]) ||
        d.invoicePartySpecify ||
        "Wealth Partner";
      pushUnique(derivedLinks, seen, {
        id: `wp:deal:${d.invoicePartyContactId}`,
        kind: "wealth_partner",
        category: "wealth_partners",
        label: partnerName,
        detail: "Wealth Partner · Deal",
        derived: true,
        hrefHint: `${ROUTES.CONTACTS}?contact=${encodeURIComponent(d.invoicePartyContactId)}`,
      });
    }

    const refId = stringField(snap, ["referralSourceId", "sourceContactId"]);
    if (refId) {
      pushUnique(derivedLinks, seen, {
        id: `ref:deal:${refId}`,
        kind: "referrer",
        category: "referrers",
        label: contactNameById(refId) || "Referrer",
        detail: "Referrer · Deal",
        derived: true,
        hrefHint: `${ROUTES.CONTACTS}?contact=${encodeURIComponent(refId)}`,
      });
    }

    const lendExt = asRecord(d.lendingExtension);
    projectParticipantsFromExtension(lendExt, d.opportunityId || d.id, seen, derivedLinks, dealHref(d));
  }

  const documents = listDocumentsForGraph({
    contactId: contact.id,
    companyIds: graph.companyIds,
    opportunityIds: graph.opportunityIds,
    dealIds: graph.dealIds,
  });
  for (const doc of documents.slice(0, 40)) {
    const opp = doc.links.opportunityId ? oppById.get(doc.links.opportunityId) : null;
    pushUnique(derivedLinks, seen, {
      id: `doc:${doc.id}`,
      kind: "document",
      category: "documents",
      label: doc.displayName || doc.categoryLabel || doc.typeRef || "Document",
      detail: [
        opp?.opportunityNumber || opp?.id,
        doc.links.dealId ? dealById.get(doc.links.dealId)?.dealNumber : null,
      ]
        .filter(Boolean)
        .join(" · ") || "Document Registry",
      derived: true,
      hrefHint: ROUTES.DOCUMENT_WORKSPACE,
    });
  }

  const taskMap = new Map(
    [
      ...listTasksForEntity({ contactId: contact.id }),
      ...graph.opportunityIds.flatMap((id) => listTasksForEntity({ opportunityRef: id })),
      ...graph.dealIds.flatMap((id) => listTasksForEntity({ dealId: id })),
      ...graph.companyIds.flatMap((id) =>
        listTasksForEntity({ entityKind: "company", entityId: id }),
      ),
    ].map((t) => [t.id, t] as const),
  );
  for (const t of [...taskMap.values()].slice(0, 40)) {
    pushUnique(derivedLinks, seen, {
      id: `task:${t.id}`,
      kind: "task",
      category: "tasks",
      label: t.title || "Task",
      detail: [t.status, t.workType, t.opportunityRef].filter(Boolean).join(" · ") || "Task",
      derived: true,
      hrefHint: ROUTES.TASKS,
    });
  }

  for (const e of activity
    .filter((row) => row.eventKind === "communications" || row.eventKind === "dialogue")
    .slice(0, 20)) {
    pushUnique(derivedLinks, seen, {
      id: `comm:${e.id}`,
      kind: "communication",
      category: "communication",
      label: e.title || "Communication",
      detail: e.summary || e.eventKind,
      derived: true,
      hrefHint: hrefForEvent(e) || ROUTES.ACTIVITY,
    });
  }

  const accountingDeals = deals.filter((d) => isDisbursedDeal(d) || isActiveDeal(d)).slice(0, 12);
  const accountingPages = await Promise.all(
    accountingDeals.map((d) =>
      enterpriseAccountingCaseClient
        .list({ dealId: d.id, pageSize: 5 })
        .catch(() => ({ items: [] as Array<{ id: string; dealId: string }> })),
    ),
  );
  for (let i = 0; i < accountingDeals.length; i += 1) {
    const deal = accountingDeals[i];
    const items = accountingPages[i]?.items ?? [];
    if (items.length === 0 && isDisbursedDeal(deal)) {
      pushUnique(derivedLinks, seen, {
        id: `acct:deal:${deal.id}`,
        kind: "accounting",
        category: "accounting",
        label: deal.dealNumber || deal.id,
        detail: "Disbursement · Accounting read view",
        derived: true,
        hrefHint: `${ROUTES.ACCOUNTING}?dealId=${encodeURIComponent(deal.id)}`,
      });
      continue;
    }
    for (const row of items) {
      pushUnique(derivedLinks, seen, {
        id: `acct:${row.id}`,
        kind: "accounting",
        category: "accounting",
        label: deal.dealNumber || row.dealId,
        detail: "Accounting case · read only",
        derived: true,
        hrefHint: `${ROUTES.ACCOUNTING}?dealId=${encodeURIComponent(deal.id)}`,
      });
    }
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
      hrefHint: `${ROUTES.CONTACTS}?contact=${encodeURIComponent(otherId)}`,
    });
  }

  const relationshipSections: Contact360RelationshipSection[] = SECTION_META.map(
    (meta) => ({
      category: meta.category,
      title: meta.title,
      items: derivedLinks.filter((l) => l.category === meta.category),
    }),
  );

  const unifiedTimeline: Contact360TimelineRow[] = activity.map((event) => {
    const opp = event.opportunityId ? oppById.get(event.opportunityId) : undefined;
    const deal = event.dealId ? dealById.get(event.dealId) : undefined;
    const companyId = opp?.companyId || deal?.companyId || null;
    return {
      id: event.id,
      type: event.eventKind || "activity",
      summary: event.title || event.summary || "Activity",
      companyLabel: (companyId && (companyById.get(companyId) || getEcmCompany(companyId)?.companyName)) || opp?.companyName || null,
      opportunityRef: opp?.opportunityNumber || event.opportunityId,
      dealRef: deal?.dealNumber || event.dealId,
      employee: event.actorName,
      occurredAt: event.occurredAt,
      sourceWorkspace: sourceWorkspaceForEvent(event),
      href: hrefForEvent(event),
    };
  });

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
    lastOpportunityId: lastOpportunity?.id ?? null,
    archivedReadOnly,
    activeTransactionWarning,
    graphOpportunityIds: graph.opportunityIds,
    graphDealIds: graph.dealIds,
    measureFocus: {
      total_opportunities: "opportunities",
      current_opportunities: "opportunities",
      total_deals: "deals",
      active_deals: "deals",
      loans_disbursed: "loans",
      total_business_value: "opportunities",
      last_action: "timeline",
      last_dialogue: "communication",
      last_opportunity: "opportunities",
    },
    derivedLinks,
    relationshipSections,
    opportunities,
    deals,
    recentActivity: activity,
    unifiedTimeline,
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

export function snapshotItemsForMeasure(
  snapshot: Contact360Snapshot,
  measure: Contact360SnapshotMeasureId,
): Contact360DerivedLink[] | Contact360TimelineRow[] {
  if (measure === "last_action") return snapshot.unifiedTimeline;
  if (measure === "current_opportunities") {
    const currentIds = new Set(
      snapshot.opportunities
        .filter((o) => isCurrentOpportunityLifecycle(o.lifecycleStatus))
        .map((o) => `opp:${o.id}`),
    );
    return snapshot.derivedLinks.filter((l) => currentIds.has(l.id));
  }
  if (measure === "active_deals") {
    const ids = new Set(
      snapshot.deals.filter((d) => isActiveDeal(d)).map((d) => `deal:${d.id}`),
    );
    return snapshot.derivedLinks.filter((l) => ids.has(l.id));
  }
  if (measure === "loans_disbursed") {
    return snapshot.derivedLinks.filter((l) => l.category === "loans");
  }
  if (measure === "last_dialogue") {
    return snapshot.derivedLinks.filter((l) => l.category === "communication");
  }
  if (measure === "last_opportunity" || measure === "total_opportunities" || measure === "total_business_value") {
    return snapshot.derivedLinks.filter((l) => l.category === "opportunities");
  }
  if (measure === "total_deals") {
    return snapshot.derivedLinks.filter((l) => l.category === "deals" || l.category === "loans");
  }
  return snapshot.derivedLinks;
}
