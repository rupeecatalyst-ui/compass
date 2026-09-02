/**
 * CO-C1-CONTACT-360-RELATIONSHIP-GRAPH-001
 * Canonical Contact → Company → Opportunity → Deal graph.
 * Joins only by stable IDs. Never display name, mobile, or email.
 */

import { listContactCompanyLinks, getEcmCompany } from "@/lib/enterprise-company-master";
import { enterpriseOpportunityApiClient } from "@/lib/enterprise-opportunity/opportunity-api-client";
import type { EnterpriseOpportunityApiRecord } from "@/lib/enterprise-opportunity/opportunity-api-client";
import { enterpriseDealApiClient } from "@/lib/enterprise-deal/deal-api-client";
import type { EnterpriseDealApiRecord } from "@/lib/enterprise-deal/deal-api-client";
import { readOpportunityParticipantsFromExtension } from "@/lib/lead-opportunity-journey/opportunity-loan-structure";
import type { EcmContact } from "@/types/enterprise-contact-master";
import type { EcmCompanyContactLink } from "@/types/enterprise-company-master";
import type { EnterpriseActivityEvent } from "@/types/enterprise-activity-registry";

export type Contact360CompanyLinkNode = {
  linkId: string;
  companyId: string;
  companyLabel: string;
  relationRole: string;
  status: string;
};

export type Contact360Graph = {
  contactId: string;
  companyLinks: Contact360CompanyLinkNode[];
  companyIds: string[];
  opportunities: EnterpriseOpportunityApiRecord[];
  deals: EnterpriseDealApiRecord[];
  opportunityIds: string[];
  dealIds: string[];
  /** Diagnostics only — never used as join keys. */
  missingLinkHints: string[];
};

export type Contact360TimelineRow = {
  id: string;
  type: string;
  summary: string;
  companyLabel: string | null;
  opportunityRef: string | null;
  dealRef: string | null;
  employee: string | null;
  occurredAt: string;
  sourceWorkspace: string;
  href?: string;
};

const GRAPH_OPP_LIMIT = 100;
const GRAPH_COMPANY_QUERY_CAP = 24;
const GRAPH_DEAL_CONCURRENCY = 6;

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

export function normalizePersonName(value: string | null | undefined): string {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Display-name lookup only — never a graph join key. */
export function namesLikelySamePerson(a: string, b: string): boolean {
  const left = normalizePersonName(a);
  const right = normalizePersonName(b);
  if (!left || !right) return false;
  if (left === right) return true;
  const compact = (s: string) => s.replace(/\s+/g, "");
  return compact(left) === compact(right);
}

export function isCurrentOpportunityLifecycle(status?: string | null): boolean {
  const s = (status || "").toLowerCase();
  return (
    s === "active" ||
    s === "requirement_captured" ||
    s === "on_hold" ||
    s === "in_progress" ||
    s === "draft"
  );
}

export function isDisbursedDeal(deal: Pick<EnterpriseDealApiRecord, "grossStage" | "disbursedAt">): boolean {
  const stage = (deal.grossStage || "").toLowerCase();
  return Boolean(deal.disbursedAt) || stage.includes("disburs");
}

export function isActiveDeal(deal: Pick<EnterpriseDealApiRecord, "grossStage" | "archived" | "lifecycleStatus">): boolean {
  if (deal.archived) return false;
  const stage = (deal.grossStage || "").toLowerCase();
  const life = (deal.lifecycleStatus || "").toLowerCase();
  if (stage.includes("lost") || stage.includes("disburs") || life === "lost" || life === "closed") {
    return false;
  }
  return true;
}

export function opportunityLinkedByCanonicalIds(
  opp: Pick<EnterpriseOpportunityApiRecord, "id" | "primaryContactId" | "companyId" | "lendingExtension">,
  contactId: string,
  companyIds: ReadonlySet<string>,
): boolean {
  if (opp.primaryContactId && opp.primaryContactId === contactId) return true;
  if (opp.companyId && companyIds.has(opp.companyId)) return true;
  const participants = readOpportunityParticipantsFromExtension(opp.lendingExtension);
  if (participants.some((p) => p.entityId === contactId && p.status !== "inactive")) return true;
  const ext = asRecord(opp.lendingExtension);
  const extraIds = [
    stringField(ext, ["coApplicantId", "coApplicantContactId"]),
    stringField(ext, ["guarantorId", "guarantorContactId"]),
  ];
  return extraIds.some((id) => id === contactId);
}

export type CanonicalGraphBookCounts = {
  opportunityCount: number;
  dealCount: number;
  opportunityIds: string[];
  dealIds: string[];
};

/**
 * Count authorised Opportunities and Deals for a Contact using canonical IDs only.
 * `opportunities` / `deals` must already be permission-scoped by the caller.
 */
export function countCanonicalGraphBooks(
  contactId: string,
  companyIds: Iterable<string>,
  opportunities: ReadonlyArray<
    Pick<EnterpriseOpportunityApiRecord, "id" | "primaryContactId" | "companyId" | "lendingExtension">
  >,
  deals: ReadonlyArray<
    Pick<
      EnterpriseDealApiRecord,
      "id" | "opportunityId" | "primaryContactId" | "companyId" | "isDeleted"
    >
  >,
): CanonicalGraphBookCounts {
  const companySet =
    companyIds instanceof Set ? companyIds : new Set([...companyIds].filter(Boolean));
  const linkedOpps = opportunities.filter((o) =>
    opportunityLinkedByCanonicalIds(o, contactId, companySet),
  );
  const oppIds = new Set(linkedOpps.map((o) => o.id));
  const linkedDeals = deals.filter((d) => {
    if (d.isDeleted) return false;
    if (d.primaryContactId === contactId) return true;
    if (d.companyId && companySet.has(d.companyId)) return true;
    if (d.opportunityId && oppIds.has(d.opportunityId)) return true;
    return false;
  });
  return {
    opportunityCount: linkedOpps.length,
    dealCount: linkedDeals.length,
    opportunityIds: [...oppIds],
    dealIds: linkedDeals.map((d) => d.id),
  };
}

export function mergeRecordsById<T extends { id: string }>(batches: T[][]): T[] {
  const map = new Map<string, T>();
  for (const batch of batches) {
    for (const row of batch) {
      if (!row?.id) continue;
      if (!map.has(row.id)) map.set(row.id, row);
    }
  }
  return Array.from(map.values());
}

export function deriveContact360BusinessValue(
  opportunities: ReadonlyArray<Pick<EnterpriseOpportunityApiRecord, "id" | "requestedAmount">>,
  deals: ReadonlyArray<Pick<EnterpriseDealApiRecord, "opportunityId" | "requestedAmount" | "approvedAmount" | "fulfilledAmount">>,
): number {
  const oppIdsWithDeals = new Set(
    deals.map((d) => d.opportunityId).filter((id): id is string => Boolean(id)),
  );
  const fromDeals = deals.reduce(
    (sum, d) => sum + (d.fulfilledAmount ?? d.approvedAmount ?? d.requestedAmount ?? 0),
    0,
  );
  const fromOrphanOpps = opportunities.reduce((sum, o) => {
    if (oppIdsWithDeals.has(o.id)) return sum;
    return sum + (o.requestedAmount ?? 0);
  }, 0);
  return fromDeals + fromOrphanOpps;
}

export function archivedContactHasActiveTransaction(
  contactStatus: string | null | undefined,
  opportunities: ReadonlyArray<Pick<EnterpriseOpportunityApiRecord, "lifecycleStatus">>,
  deals: ReadonlyArray<Pick<EnterpriseDealApiRecord, "grossStage" | "archived" | "lifecycleStatus">>,
): boolean {
  if ((contactStatus || "").toLowerCase() !== "archived") return false;
  if (opportunities.some((o) => isCurrentOpportunityLifecycle(o.lifecycleStatus))) return true;
  return deals.some((d) => isActiveDeal(d));
}

export function dedupeActivityEvents(
  events: EnterpriseActivityEvent[],
): EnterpriseActivityEvent[] {
  const byId = new Map<string, EnterpriseActivityEvent>();
  const bySource = new Map<string, string>();
  for (const event of events) {
    if (!event?.id) continue;
    if (byId.has(event.id)) continue;
    const sourceKey =
      event.sourceEventId && event.sourceSystem
        ? `${event.sourceSystem}:${event.sourceEventId}`
        : "";
    if (sourceKey) {
      const existingId = bySource.get(sourceKey);
      if (existingId && existingId !== event.id) continue;
      bySource.set(sourceKey, event.id);
    }
    byId.set(event.id, event);
  }
  return Array.from(byId.values()).sort((a, b) =>
    (b.occurredAt || "").localeCompare(a.occurredAt || ""),
  );
}

export function mapCompanyLinksForGraph(
  links: EcmCompanyContactLink[],
): Contact360CompanyLinkNode[] {
  return links.map((link) => {
    const company = getEcmCompany(link.companyId);
    return {
      linkId: link.id,
      companyId: link.companyId,
      companyLabel: company?.companyName?.trim() || link.companyId,
      relationRole: link.relationRole || "other",
      status: link.status || "active",
    };
  });
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit);
    out.push(...(await Promise.all(chunk.map(mapper))));
  }
  return out;
}

export async function resolveContact360Graph(contact: EcmContact): Promise<Contact360Graph> {
  const contactId = contact.id;
  const companyLinks = mapCompanyLinksForGraph(
    listContactCompanyLinks(contactId, { includeInactive: true }),
  );
  const companyIds = [...new Set(companyLinks.map((l) => l.companyId).filter(Boolean))];
  const companyIdSet = new Set(companyIds);
  const missingLinkHints: string[] = [];

  const oppSearches: Array<Promise<{ items: EnterpriseOpportunityApiRecord[] }>> = [
    enterpriseOpportunityApiClient
      .searchOpportunities({ primaryContactId: contactId, limit: GRAPH_OPP_LIMIT, offset: 0 })
      .catch(() => ({ items: [] })),
  ];
  for (const companyId of companyIds.slice(0, GRAPH_COMPANY_QUERY_CAP)) {
    oppSearches.push(
      enterpriseOpportunityApiClient
        .searchOpportunities({ companyId, limit: GRAPH_OPP_LIMIT, offset: 0 })
        .catch(() => ({ items: [] })),
    );
  }

  const oppPages = await Promise.all(oppSearches);
  let opportunities = mergeRecordsById(oppPages.map((p) => p.items ?? [])).filter((opp) =>
    opportunityLinkedByCanonicalIds(opp, contactId, companyIdSet),
  );

  const dealsFromContact = await enterpriseDealApiClient
    .searchDeals({
      pageSize: 200,
      view: "full",
      primaryContactId: contactId,
    })
    .catch(() => ({ items: [] as EnterpriseDealApiRecord[] }));

  const dealPages = await mapLimit(opportunities, GRAPH_DEAL_CONCURRENCY, async (opp) => {
    const page = await enterpriseDealApiClient
      .listDealsByOpportunity(opp.id)
      .catch(() => ({ items: [] as EnterpriseDealApiRecord[] }));
    return page.items ?? [];
  });

  let deals = mergeRecordsById([
    ...dealPages,
    (dealsFromContact.items ?? []).filter(
      (d) =>
        d.primaryContactId === contactId ||
        (d.companyId ? companyIdSet.has(d.companyId) : false) ||
        (d.opportunityId ? opportunities.some((o) => o.id === d.opportunityId) : false),
    ),
  ]).filter((d) => !d.isDeleted);

  const dealOpportunityIds = new Set(
    deals.map((d) => d.opportunityId).filter((id): id is string => Boolean(id)),
  );
  const missingOppIds = [...dealOpportunityIds].filter(
    (id) => !opportunities.some((o) => o.id === id),
  );
  if (missingOppIds.length) {
    const fetched = await mapLimit(missingOppIds.slice(0, 20), 4, async (id) => {
      try {
        return await enterpriseOpportunityApiClient.getOpportunity(id);
      } catch {
        return null;
      }
    });
    opportunities = mergeRecordsById([
      opportunities,
      fetched.filter((row): row is EnterpriseOpportunityApiRecord => Boolean(row)),
    ]);
  }

  for (const opp of opportunities) {
    if (opp.companyId && !companyIdSet.has(opp.companyId) && !opp.primaryContactId) {
      missingLinkHints.push("opportunity_company_without_contact_link");
    }
  }
  if (companyIds.length === 0 && opportunities.some((o) => o.companyId)) {
    missingLinkHints.push("missing_contact_company_persistence");
  }

  return {
    contactId,
    companyLinks,
    companyIds,
    opportunities,
    deals,
    opportunityIds: opportunities.map((o) => o.id),
    dealIds: deals.map((d) => d.id),
    missingLinkHints: [...new Set(missingLinkHints)],
  };
}
