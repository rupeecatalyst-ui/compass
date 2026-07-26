/**
 * CO-SPRINT-119 — Aggregate New Arrivals counts (creation date SSOT).
 * Prefer pageSize=1 + total; avoid loading full datasets into the dashboard.
 */

import { NEW_ARRIVALS_KPI_CARDS } from "@/constants/user-home-dashboard/new-arrivals";
import { listEcmContacts } from "@/lib/enterprise-contact-master";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { ecmApiClient } from "@/lib/enterprise-persistence/ecm-api-client";
import { getAccessToken } from "@/lib/api-client";
import { isCreatedOnInNewArrivalsRange } from "@/lib/user-home-dashboard/new-arrivals/date-range";
import type { EcmContactRole } from "@/types/enterprise-contact-master";
import type {
  NewArrivalsCountsResult,
  NewArrivalsDateRange,
  NewArrivalsKpiCardDef,
} from "@/types/user-home-new-arrivals";

function enabledCards(): NewArrivalsKpiCardDef[] {
  return NEW_ARRIVALS_KPI_CARDS.filter((c) => c.enabled);
}

function countLocalEcmRole(
  roles: EcmContactRole[],
  range: Pick<NewArrivalsDateRange, "from" | "to">,
): number {
  const contacts = listEcmContacts();
  return contacts.filter((c) => {
    if (!roles.some((r) => c.roles.includes(r))) return false;
    return isCreatedOnInNewArrivalsRange(c.createdOn, range);
  }).length;
}

async function countPrismaEcmRole(
  roles: EcmContactRole[],
  range: Pick<NewArrivalsDateRange, "from" | "to">,
): Promise<number> {
  const result = await ecmApiClient.queryContacts({
    page: 1,
    pageSize: 1,
    status: "all",
    roles,
    sortBy: "createdOn",
    sortDir: "desc",
    createdFrom: range.from,
    createdTo: range.to,
  });
  return result.total;
}

async function countForCard(
  card: NewArrivalsKpiCardDef,
  range: Pick<NewArrivalsDateRange, "from" | "to">,
): Promise<number> {
  if (card.source.type === "ecm_role") {
    if (isEnterprisePersistencePrisma() && getAccessToken()) {
      try {
        return await countPrismaEcmRole(card.source.roles, range);
      } catch {
        return countLocalEcmRole(card.source.roles, range);
      }
    }
    return countLocalEcmRole(card.source.roles, range);
  }

  // Future custom sources register here (loan files, opportunities, etc.)
  return 0;
}

/** Client-side aggregate for all enabled KPI cards in the selected range */
export async function loadNewArrivalsCounts(
  range: Pick<NewArrivalsDateRange, "from" | "to" | "label">,
): Promise<NewArrivalsCountsResult> {
  const cards = enabledCards();
  const counts = await Promise.all(
    cards.map(async (card) => ({
      id: card.id,
      count: await countForCard(card, range),
    })),
  );

  return {
    range: { from: range.from, to: range.to, label: range.label },
    counts,
    computedAt: new Date().toISOString(),
  };
}

/** Synchronous local-only path (tests / offline demo) */
export function computeNewArrivalsCountsLocal(
  range: Pick<NewArrivalsDateRange, "from" | "to" | "label">,
): NewArrivalsCountsResult {
  const counts = enabledCards().map((card) => ({
    id: card.id,
    count:
      card.source.type === "ecm_role"
        ? countLocalEcmRole(card.source.roles, range)
        : 0,
  }));
  return {
    range: { from: range.from, to: range.to, label: range.label },
    counts,
    computedAt: new Date().toISOString(),
  };
}
