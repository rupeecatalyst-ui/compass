/**
 * CO-SPRINT-095 — Build Relationship Heat Map entities from ECM contacts.
 */

import { ROUTES } from "@/constants/routes";
import {
  RELATIONSHIP_ENGAGEMENT_BAND_META,
  RELATIONSHIP_ENTITY_TYPE_LABELS,
} from "@/constants/relationship-heat-map";
import { listEcmContacts } from "@/lib/enterprise-contact-master";
import { isDemoSeedEnabled } from "@/lib/demo-seed";
import { listEoleOpportunitiesByCustomer } from "@/lib/enterprise-opportunity-lifecycle-engine";
import {
  createPlaceholderEngagementScoreEngine,
  statusMatchesBand,
  timeWindowMaxDays,
} from "@/lib/relationship-heat-map/score-framework";
import type { EcmContact, EcmContactRole } from "@/types/enterprise-contact-master";
import type {
  RelationshipEntityType,
  RelationshipHeatMapEntity,
  RelationshipHeatMapFilters,
} from "@/types/relationship-heat-map";

function formatActivity(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function daysSince(iso?: string): number {
  if (!iso) return 999;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 999;
  return Math.max(0, (Date.now() - t) / 86400000);
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

function opportunityCount(contactId: string): number {
  try {
    const a = listEoleOpportunitiesByCustomer(contactId);
    const b = listEoleOpportunitiesByCustomer(`ecm:contact:${contactId}`);
    return new Set([...a, ...b].map((o) => o.id)).size;
  } catch {
    return 0;
  }
}

const scoreEngine = createPlaceholderEngagementScoreEngine();

/** Framework demo tiles so executives always see a populated landscape when data is thin. */
function frameworkDemoEntities(): RelationshipHeatMapEntity[] {
  const demos: {
    name: string;
    entityType: RelationshipEntityType;
    score: number;
    band: keyof typeof RELATIONSHIP_ENGAGEMENT_BAND_META;
    daysAgo: number;
    opps: number;
  }[] = [
    { name: "Peakprofits Family Office", entityType: "wealth_partner", score: 92, band: "very_active", daysAgo: 1, opps: 2 },
    { name: "Horizon Wealth Desk", entityType: "wealth_partner", score: 78, band: "active", daysAgo: 5, opps: 1 },
    { name: "Northstar Channel DSA", entityType: "channel_partner", score: 71, band: "active", daysAgo: 6, opps: 3 },
    { name: "Meridian Investors LLP", entityType: "investor", score: 64, band: "moderate", daysAgo: 14, opps: 0 },
    { name: "HDFC Bank · Bandra RM", entityType: "lender_contact", score: 88, band: "very_active", daysAgo: 0, opps: 0 },
    { name: "Axis Credit Desk", entityType: "lender_contact", score: 55, band: "needs_attention", daysAgo: 32, opps: 0 },
    { name: "Acme Homes · Director", entityType: "borrower", score: 81, band: "active", daysAgo: 3, opps: 2 },
    { name: "Skyline Promoters", entityType: "borrower", score: 48, band: "needs_attention", daysAgo: 28, opps: 1 },
    { name: "Quiet Lane Holdings", entityType: "investor", score: 28, band: "dormant", daysAgo: 70, opps: 0 },
  ];

  return demos.map((d, i) => {
    const last = new Date(Date.now() - d.daysAgo * 86400000).toISOString();
    const meta = RELATIONSHIP_ENGAGEMENT_BAND_META[d.band];
    return {
      id: `rh-demo-${i}`,
      name: d.name,
      entityType: d.entityType,
      entityTypeLabel: RELATIONSHIP_ENTITY_TYPE_LABELS[d.entityType],
      engagementScore: d.score,
      band: d.band,
      fill: meta.fill,
      activeOpportunities: d.opps,
      lastActivityLabel: formatActivity(last),
      lastActivityAt: last,
      workspaceHref: ROUTES.CONTACTS,
      isFrameworkDemo: true,
      size: Math.max(12, d.score),
    };
  });
}

export function buildRelationshipHeatMapEntities(): RelationshipHeatMapEntity[] {
  const fromContacts: RelationshipHeatMapEntity[] = [];

  for (const contact of listEcmContacts()) {
    if (!contact.enabled || contact.status === "archived") continue;
    const entityType = resolveEntityType(contact);
    if (!entityType) continue;

    const scored = scoreEngine.score({
      factors: {},
      lastActivityAt: contact.lastActiveOn || contact.modifiedOn,
      contactScoreHint: contact.contactScore,
    });
    const meta = RELATIONSHIP_ENGAGEMENT_BAND_META[scored.band];
    const lastAt = contact.lastActiveOn || contact.modifiedOn;

    fromContacts.push({
      id: contact.id,
      name: contact.name,
      entityType,
      entityTypeLabel: RELATIONSHIP_ENTITY_TYPE_LABELS[entityType],
      engagementScore: scored.score,
      band: scored.band,
      fill: meta.fill,
      activeOpportunities: opportunityCount(contact.id),
      lastActivityLabel: formatActivity(lastAt),
      lastActivityAt: lastAt,
      workspaceHref: `${ROUTES.CONTACTS}?contact=${encodeURIComponent(contact.id)}`,
      size: Math.max(12, scored.score),
    });
  }

  // Demo tiles only in local development — never on production/prisma.
  if (!isDemoSeedEnabled()) {
    return fromContacts;
  }

  const demos = frameworkDemoEntities();
  const hasWealth = fromContacts.some((e) => e.entityType === "wealth_partner");
  const merged = [
    ...fromContacts,
    ...demos.filter((d) => (hasWealth ? d.entityType !== "wealth_partner" : true)),
  ];

  // Prefer real contacts; keep demos that add type coverage when thin
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
  const maxDays = timeWindowMaxDays(filters.timeWindow);
  const q = filters.search.trim().toLowerCase();

  return entities
    .filter((e) => {
      if (filters.entityType !== "all" && e.entityType !== filters.entityType) return false;
      if (!statusMatchesBand(filters.status, e.band)) return false;
      if (daysSince(e.lastActivityAt) > maxDays) return false;
      if (q) {
        const hay = `${e.name} ${e.entityTypeLabel}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => b.engagementScore - a.engagementScore);
}
