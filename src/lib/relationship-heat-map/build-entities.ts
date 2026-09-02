/**
 * Relationship Heat Map entities from ECM contacts + EAR meaningful interactions.
 * Colour = activity band from recency. Size = relationship score. Never use
 * modifiedOn / profile view / sync as the activity clock.
 */

import { ROUTES } from "@/constants/routes";
import {
  RELATIONSHIP_ENGAGEMENT_BAND_META,
  RELATIONSHIP_ENTITY_TYPE_LABELS,
} from "@/constants/relationship-heat-map";
import { listEcmContacts } from "@/lib/enterprise-contact-master";
import { listContactCompanyLinks } from "@/lib/enterprise-company-master";
import { isDemoSeedEnabled } from "@/lib/demo-seed";
import { listSessionEarEvents } from "@/lib/enterprise-activity-registry/session-registry";
import { enterpriseOpportunityApiClient } from "@/lib/enterprise-opportunity/opportunity-api-client";
import type { EnterpriseOpportunityApiRecord } from "@/lib/enterprise-opportunity/opportunity-api-client";
import { enterpriseDealApiClient } from "@/lib/enterprise-deal/deal-api-client";
import type { EnterpriseDealApiRecord } from "@/lib/enterprise-deal/deal-api-client";
import {
  countCanonicalGraphBooks,
  mergeRecordsById,
} from "@/lib/enterprise-contact-master/contact-360-relationship-graph";
import {
  createPlaceholderEngagementScoreEngine,
  statusMatchesBand,
} from "@/lib/relationship-heat-map/score-framework";
import {
  classifyMeaningfulInteractionChannel,
  daysSinceIso,
  latestMeaningfulInteraction,
} from "@/lib/relationship-heat-map/meaningful-interaction";
import { bandFromRecency } from "@/lib/relationship-heat-map/score-framework";
import type { EcmContact, EcmContactRole } from "@/types/enterprise-contact-master";
import type {
  RelationshipEntityType,
  RelationshipHeatMapEntity,
  RelationshipHeatMapFilters,
} from "@/types/relationship-heat-map";

export type AuthorisedRelationshipBooks = {
  opportunities: EnterpriseOpportunityApiRecord[];
  deals: EnterpriseDealApiRecord[];
};

const EMPTY_BOOKS: AuthorisedRelationshipBooks = { opportunities: [], deals: [] };

function formatActivity(iso?: string | null): string {
  if (!iso) return "No meaningful contact recorded";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "No meaningful contact recorded";
  }
}

function resolveEntityType(contact: EcmContact): RelationshipEntityType | null {
  const roles = contact.roles?.length ? contact.roles : [contact.primaryRole];
  const partnerCat = contact.roleProfiles?.partner?.partnerCategory?.toLowerCase() ?? "";
  const channel = contact.roleProfiles?.partner?.channelType?.toLowerCase() ?? "";

  if (
    partnerCat.includes("wealth") ||
    channel.includes("wealth") ||
    /wealth/i.test(contact.name)
  ) {
    return "wealth_partner";
  }

  const priority: EcmContactRole[] = [
    "customer",
    "investor",
    "partner",
    "lender_employee",
    "builder",
    "chartered_accountant",
    "employee",
  ];
  for (const role of priority) {
    if (!roles.includes(role)) continue;
    if (role === "customer") return "borrower";
    if (role === "investor") return "investor";
    if (role === "partner" || role === "builder" || role === "chartered_accountant") {
      return "channel_partner";
    }
    if (role === "lender_employee") return "lender_contact";
  }
  return null;
}

/** Permission-scoped Opportunity + Deal inventories. Never name/mobile/email joins. */
export async function loadAuthorisedRelationshipBooks(): Promise<AuthorisedRelationshipBooks> {
  try {
    const opportunityBatches: EnterpriseOpportunityApiRecord[][] = [];
    for (let offset = 0; offset < 400; offset += 100) {
      const page = await enterpriseOpportunityApiClient.searchOpportunities({
        limit: 100,
        offset,
      });
      const items = page.items ?? [];
      opportunityBatches.push(items);
      if (items.length < 100) break;
    }

    const dealBatches: EnterpriseDealApiRecord[][] = [];
    for (let page = 1; page <= 4; page += 1) {
      const result = await enterpriseDealApiClient.searchDeals({
        page,
        pageSize: 100,
        view: "full",
      });
      const items = result.items ?? [];
      dealBatches.push(items);
      if (items.length < 100) break;
    }

    return {
      opportunities: mergeRecordsById(opportunityBatches),
      deals: mergeRecordsById(dealBatches).filter((d) => !d.isDeleted),
    };
  } catch {
    return EMPTY_BOOKS;
  }
}

function classificationReason(input: {
  band: keyof typeof RELATIONSHIP_ENGAGEMENT_BAND_META;
  days: number;
  channel: string | null;
  lastAt: string | null;
  score: number;
}): string {
  const meta = RELATIONSHIP_ENGAGEMENT_BAND_META[input.band];
  if (!input.lastAt || !Number.isFinite(input.days)) {
    return `No meaningful interaction recorded. Profile views, sync events, drafts, and stage movement do not reset this clock. Classified ${meta.label}. Relationship score ${input.score} does not change the colour.`;
  }
  const rounded = Math.round(input.days);
  const channel = input.channel || "operational interaction";
  if (input.band === "dormant" && input.score >= 70) {
    return `Last ${channel.toLowerCase()} ${rounded} days ago. Colour is ${meta.label} (${meta.dayRange}) even though relationship score is ${input.score}.`;
  }
  return `Last meaningful interaction was a ${channel.toLowerCase()} ${rounded} day${rounded === 1 ? "" : "s"} ago (${meta.label}: ${meta.dayRange}). Score ${input.score} is independent of colour.`;
}

function toEntity(input: {
  id: string;
  name: string;
  entityType: RelationshipEntityType;
  score: number;
  lastAt: string | null;
  channel: string | null;
  assignedRcEmployee: string | null;
  opps: number;
  deals: number;
  workspaceHref: string;
  isFrameworkDemo?: boolean;
}): RelationshipHeatMapEntity {
  const days = daysSinceIso(input.lastAt);
  const band = bandFromRecency(days);
  const meta = RELATIONSHIP_ENGAGEMENT_BAND_META[band];
  const daysRounded = Number.isFinite(days) ? Math.round(days) : null;
  return {
    id: input.id,
    name: input.name,
    entityType: input.entityType,
    entityTypeLabel: RELATIONSHIP_ENTITY_TYPE_LABELS[input.entityType],
    engagementScore: input.score,
    band,
    fill: meta.fill,
    activeOpportunities: input.opps,
    dealCount: input.deals,
    lastActivityLabel: formatActivity(input.lastAt),
    lastActivityAt: input.lastAt,
    daysSinceMeaningfulContact: daysRounded,
    interactionChannel: input.channel,
    assignedRcEmployee: input.assignedRcEmployee,
    classificationReason: classificationReason({
      band,
      days,
      channel: input.channel,
      lastAt: input.lastAt,
      score: input.score,
    }),
    workspaceHref: input.workspaceHref,
    isFrameworkDemo: input.isFrameworkDemo,
    size: Math.max(12, input.score),
  };
}

const scoreEngine = createPlaceholderEngagementScoreEngine();

/** Framework demo tiles so executives always see a populated landscape when data is thin. */
function frameworkDemoEntities(): RelationshipHeatMapEntity[] {
  const demos: {
    name: string;
    entityType: RelationshipEntityType;
    score: number;
    daysAgo: number | null;
    opps: number;
    channel: string | null;
  }[] = [
    { name: "Peakprofits Family Office", entityType: "wealth_partner", score: 92, daysAgo: 1, opps: 2, channel: "Call" },
    { name: "Horizon Wealth Desk", entityType: "wealth_partner", score: 78, daysAgo: 5, opps: 1, channel: "Email" },
    { name: "Northstar Channel DSA", entityType: "channel_partner", score: 71, daysAgo: 6, opps: 3, channel: "WhatsApp" },
    { name: "Meridian Investors LLP", entityType: "investor", score: 64, daysAgo: 14, opps: 0, channel: "Meeting" },
    { name: "HDFC Bank · Bandra RM", entityType: "lender_contact", score: 88, daysAgo: 0, opps: 0, channel: "Call" },
    { name: "Axis Credit Desk", entityType: "lender_contact", score: 55, daysAgo: 32, opps: 0, channel: "Email" },
    { name: "Acme Homes · Director", entityType: "borrower", score: 81, daysAgo: 3, opps: 2, channel: "Follow-up" },
    { name: "Skyline Promoters", entityType: "borrower", score: 48, daysAgo: 28, opps: 1, channel: "Call" },
    { name: "Quiet Lane Holdings", entityType: "investor", score: 28, daysAgo: 70, opps: 0, channel: "Email" },
    { name: "High Score Dormant Desk", entityType: "channel_partner", score: 91, daysAgo: 112, opps: 1, channel: "Call" },
    { name: "Never Contacted Builder", entityType: "borrower", score: 74, daysAgo: null, opps: 0, channel: null },
  ];

  return demos.map((d, i) => {
    const last =
      d.daysAgo == null ? null : new Date(Date.now() - d.daysAgo * 86400000).toISOString();
    return toEntity({
      id: `rh-demo-${i}`,
      name: d.name,
      entityType: d.entityType,
      score: d.score,
      lastAt: last,
      channel: d.channel,
      assignedRcEmployee: "Demo coverage",
      opps: d.opps,
      deals: 0,
      workspaceHref: ROUTES.CONTACTS,
      isFrameworkDemo: true,
    });
  });
}

export function buildRelationshipHeatMapEntities(
  books: AuthorisedRelationshipBooks = EMPTY_BOOKS,
): RelationshipHeatMapEntity[] {
  const fromContacts: RelationshipHeatMapEntity[] = [];
  const earEvents = listSessionEarEvents();
  const opportunities = books.opportunities ?? [];
  const deals = books.deals ?? [];

  for (const contact of listEcmContacts()) {
    if (!contact.enabled || contact.status === "archived") continue;
    const entityType = resolveEntityType(contact);
    if (!entityType) continue;

    const latest = latestMeaningfulInteraction(earEvents, contact.id);
    const lastAt = latest?.occurredAt ?? null;
    const channel = latest ? classifyMeaningfulInteractionChannel(latest) : null;
    const scored = scoreEngine.score({
      factors: {},
      lastActivityAt: lastAt ?? undefined,
      contactScoreHint: contact.contactScore,
    });
    const companyIds = listContactCompanyLinks(contact.id, { includeInactive: true }).map(
      (link) => link.companyId,
    );
    const booksForContact = countCanonicalGraphBooks(
      contact.id,
      companyIds,
      opportunities,
      deals,
    );

    fromContacts.push(
      toEntity({
        id: contact.id,
        name: contact.name,
        entityType,
        score: scored.score,
        lastAt,
        channel,
        assignedRcEmployee: contact.ownerName?.trim() || "Not assigned",
        opps: booksForContact.opportunityCount,
        deals: booksForContact.dealCount,
        workspaceHref: `${ROUTES.CONTACTS}?contact=${encodeURIComponent(contact.id)}`,
      }),
    );
  }

  if (!isDemoSeedEnabled()) {
    return fromContacts;
  }

  const demos = frameworkDemoEntities();
  const hasWealth = fromContacts.some((e) => e.entityType === "wealth_partner");
  const merged = [
    ...fromContacts,
    ...demos.filter((d) => (hasWealth ? d.entityType !== "wealth_partner" : true)),
  ];

  if (fromContacts.length >= 10) {
    return [
      ...fromContacts,
      ...demos.filter((d) => d.entityType === "wealth_partner" && !hasWealth),
    ];
  }
  return merged;
}

export function filterRelationshipHeatMapEntities(
  entities: RelationshipHeatMapEntity[],
  filters: RelationshipHeatMapFilters,
): RelationshipHeatMapEntity[] {
  const q = filters.search.trim().toLowerCase();

  return entities
    .filter((e) => {
      if (filters.entityType !== "all" && e.entityType !== filters.entityType) return false;
      if (!statusMatchesBand(filters.status, e.band)) return false;
      if (q) {
        const hay = `${e.name} ${e.entityTypeLabel}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => b.engagementScore - a.engagementScore);
}
